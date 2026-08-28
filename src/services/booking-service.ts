import { runInTransaction } from '@/db/client';
import { bookingRepository } from '@/db/repository';
import { AppError, ErrorCodes, ok, toErrorResponse } from '@/domain/errors';
import { searchServices } from '@/domain/search';
import {
  checkServiceArea,
  findAvailability,
  newAppointmentId,
  revalidateSlot,
  requirementSummary,
} from '@/domain/scheduler';
import {
  Appointment,
  AvailabilityQuery,
  CustomerInput,
  AppointmentNotes,
} from '@/domain/types';
import { buildIdempotencyScope } from '@/lib/idempotency';
import { log } from '@/lib/logging';
import { addMinutes } from '@/lib/time';

const SLOT_TTL_MINUTES = 30;

async function buildSchedulerContext(businessId: string, serviceId: string) {
  const business = await bookingRepository.getBusinessById(businessId);
  if (!business) {
    throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessId} was not found.`);
  }
  const service = await bookingRepository.getService(businessId, serviceId);
  if (!service) {
    throw new AppError(ErrorCodes.SERVICE_NOT_FOUND, `Service ${serviceId} was not found.`, false, 'service_id');
  }
  return {
    business,
    service,
    resources: await bookingRepository.listResources(businessId),
    appointments: await bookingRepository.listAppointments(businessId),
    blockedTimes: await bookingRepository.listBlockedTimes(businessId),
  };
}

async function serviceAreaMap(businessId: string) {
  const zones = await bookingRepository.listServiceAreaZones(businessId);
  const map = new Map<string, string[]>();
  for (const zone of zones) {
    map.set(zone.zone_id, zone.postal_codes);
  }
  return map;
}

function resolveEffectivePostalCode(input: { postal_code?: string; customer: CustomerInput }) {
  return input.postal_code ?? input.customer.service_address?.postal_code;
}

async function assertServiceAreaEligible(
  businessId: string,
  service: Awaited<ReturnType<typeof buildSchedulerContext>>['service'],
  postalCode: string | undefined,
) {
  if (!service.service_area_required) return;

  if (!postalCode) {
    throw new AppError(
      ErrorCodes.LOCATION_REQUIRED,
      'Postal code is required for this service.',
      false,
      'postal_code',
    );
  }

  const area = checkServiceArea(businessId, service, await serviceAreaMap(businessId), postalCode);
  if (area.status === 'ineligible') {
    throw new AppError(ErrorCodes.OUTSIDE_SERVICE_AREA, area.message, false, 'postal_code');
  }
}

function assertAppointmentInBusiness(
  businessSlug: string,
  businessId: string,
  appointment: Appointment | null,
  appointmentId: string,
) {
  if (!appointment) {
    throw new AppError(ErrorCodes.APPOINTMENT_NOT_FOUND, `Appointment ${appointmentId} was not found.`);
  }
  if (appointment.business_id !== businessId) {
    throw new AppError(
      ErrorCodes.APPOINTMENT_NOT_FOUND,
      `Appointment ${appointmentId} was not found for business ${businessSlug}.`,
    );
  }
}

export class BookingService {
  async searchServices(businessSlug: string, query?: string) {
    const business = await bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);
    const services = await bookingRepository.listServices(business.id);
    const results = searchServices(services, query);
    log('info', { business_id: business.id, operation: 'search_services', query, count: results.length });
    return ok({
      business: { id: business.id, slug: business.slug, name: business.name },
      services: results,
    });
  }

  async getServiceDetails(businessSlug: string, serviceId: string) {
    const business = await bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);
    const service = await bookingRepository.getService(business.id, serviceId);
    if (!service) throw new AppError(ErrorCodes.SERVICE_NOT_FOUND, `Service ${serviceId} was not found.`);

    return ok({
      service_id: service.id,
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price: { amount: service.price_cents, currency: service.currency },
      location_policy: service.location_policy,
      service_area_required: service.service_area_required,
      required_resources: requirementSummary(service.resource_requirements),
      intake_fields: service.intake_fields,
      keywords: service.keywords,
    });
  }

  async checkServiceArea(businessSlug: string, postalCode?: string, serviceId?: string) {
    const business = await bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);

    const service =
      serviceId != null
        ? await bookingRepository.getService(business.id, serviceId)
        : (await bookingRepository.listServices(business.id))[0];
    if (!service) throw new AppError(ErrorCodes.SERVICE_NOT_FOUND, 'No services configured for this business.');

    const result = checkServiceArea(
      business.id,
      service,
      await serviceAreaMap(business.id),
      postalCode,
    );

    if (result.status === 'ineligible') {
      throw new AppError(ErrorCodes.OUTSIDE_SERVICE_AREA, result.message, false, 'postal_code');
    }

    return ok({
      status: result.status,
      zone_id: result.zone_id ?? null,
      message: result.message,
    });
  }

  async getAvailability(businessSlug: string, query: AvailabilityQuery) {
    const business = await bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);

    const ctx = await buildSchedulerContext(business.id, query.service_id);

    await assertServiceAreaEligible(business.id, ctx.service, query.postal_code);

    const slots = findAvailability(ctx, query);
    const expiresAt = addMinutes(new Date(), SLOT_TTL_MINUTES).toISOString();
    for (const slot of slots) {
      await bookingRepository.saveSlotToken(business.id, slot, expiresAt);
    }

    log('info', {
      business_id: business.id,
      operation: 'get_availability',
      service_id: query.service_id,
      slot_count: slots.length,
    });

    if (!slots.length) {
      throw new AppError(ErrorCodes.NO_AVAILABILITY, 'No availability found for the requested range.', true);
    }

    return ok({ slots });
  }

  async createAppointment(input: {
    businessSlug: string;
    service_id: string;
    slot_id: string;
    customer: CustomerInput;
    notes?: AppointmentNotes;
    idempotency_key: string;
    postal_code?: string;
  }) {
    const scopeKey = buildIdempotencyScope('create_appointment', input.businessSlug, input.idempotency_key);
    const cached = await bookingRepository.getIdempotencyResponse(scopeKey);
    if (cached) return cached as ReturnType<typeof ok>;

    const business = await bookingRepository.getBusinessBySlug(input.businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${input.businessSlug} was not found.`);

    const slot = await bookingRepository.getSlotTokenForBusiness(business.id, input.slot_id);
    if (!slot) {
      throw new AppError(ErrorCodes.SLOT_UNAVAILABLE, 'Slot is expired or invalid. Query availability again.', true);
    }

    const ctx = await buildSchedulerContext(business.id, input.service_id);
    if (slot.service_id !== input.service_id) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'slot_id does not match service_id.', false, 'slot_id');
    }

    const effectivePostalCode = resolveEffectivePostalCode(input);

    if (ctx.service.location_policy === 'CUSTOMER' && !input.customer.service_address && !effectivePostalCode) {
      throw new AppError(ErrorCodes.LOCATION_REQUIRED, 'Customer service address or postal code is required.', false);
    }

    await assertServiceAreaEligible(business.id, ctx.service, effectivePostalCode);

    const query: AvailabilityQuery = {
      service_id: input.service_id,
      start_date: slot.starts_at.slice(0, 10),
      end_date: slot.ends_at.slice(0, 10),
      postal_code: effectivePostalCode,
    };

    if (!revalidateSlot(ctx, slot, query)) {
      throw new AppError(ErrorCodes.SLOT_UNAVAILABLE, 'Slot is no longer available.', true);
    }

    const appointment: Appointment = {
      id: newAppointmentId(),
      business_id: business.id,
      service_id: input.service_id,
      status: 'confirmed',
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      customer: {
        ...input.customer,
        service_address:
          input.customer.service_address ??
          (effectivePostalCode
            ? {
                line1: 'Customer location',
                city: 'Unknown',
                region: 'TX',
                postal_code: effectivePostalCode,
              }
            : undefined),
      },
      notes: input.notes,
      price_cents: slot.price.amount,
      currency: slot.price.currency,
      idempotency_key: scopeKey,
      resource_allocations: slot.resources,
    };

    try {
      const response = await runInTransaction(async () => {
        // Acquire resource locks first so concurrent same-key retries serialize,
        // then re-check idempotency before treating a conflict as failure.
        await this.lockResourcesForAppointment(appointment);
        const raced = await bookingRepository.getIdempotencyResponse(scopeKey);
        if (raced) return raced as ReturnType<typeof ok>;

        await this.assertResourcesFree(business.id, appointment, appointment.id, { alreadyLocked: true });
        await bookingRepository.insertAppointment(appointment);
        const created = ok(this.toPublicAppointment(appointment, ctx.service.name, business.name));
        await bookingRepository.saveIdempotencyResponse(scopeKey, 'create_appointment', created);
        return created;
      });
      log('info', { business_id: business.id, operation: 'create_appointment', appointment_id: appointment.id });
      return response;
    } catch (error) {
      const raced = await bookingRepository.getIdempotencyResponse(scopeKey);
      if (raced) return raced as ReturnType<typeof ok>;
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCodes.RESOURCE_UNAVAILABLE, 'Required resources are no longer available.', true);
    }
  }

  async getAppointment(businessSlug: string, appointmentId: string) {
    const business = await bookingRepository.getBusinessBySlug(businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${businessSlug} was not found.`);

    const appointment = await bookingRepository.getAppointment(appointmentId);
    assertAppointmentInBusiness(businessSlug, business.id, appointment, appointmentId);

    const service = await bookingRepository.getService(business.id, appointment!.service_id);
    return ok(this.toPublicAppointment(appointment!, service?.name ?? appointment!.service_id, business.name));
  }

  async rescheduleAppointment(input: {
    businessSlug: string;
    appointment_id: string;
    new_slot_id: string;
    idempotency_key: string;
  }) {
    const scopeKey = buildIdempotencyScope(
      'reschedule_appointment',
      input.businessSlug,
      input.idempotency_key,
    );
    const cached = await bookingRepository.getIdempotencyResponse(scopeKey);
    if (cached) return cached as ReturnType<typeof ok>;

    const business = await bookingRepository.getBusinessBySlug(input.businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${input.businessSlug} was not found.`);

    const existing = await bookingRepository.getAppointment(input.appointment_id);
    assertAppointmentInBusiness(input.businessSlug, business.id, existing, input.appointment_id);

    const slot = await bookingRepository.getSlotTokenForBusiness(business.id, input.new_slot_id);
    if (!slot) {
      throw new AppError(ErrorCodes.SLOT_UNAVAILABLE, 'New slot is expired or invalid.', true);
    }

    const ctx = await buildSchedulerContext(business.id, existing!.service_id);
    const query: AvailabilityQuery = {
      service_id: existing!.service_id,
      start_date: slot.starts_at.slice(0, 10),
      end_date: slot.ends_at.slice(0, 10),
    };

    if (!revalidateSlot(ctx, slot, query)) {
      throw new AppError(ErrorCodes.SLOT_UNAVAILABLE, 'New slot is no longer available.', true);
    }

    try {
      const response = await runInTransaction(async () => {
        // Lock appointment row first so cancel/reschedule serialize on lifecycle state.
        const appointment = await bookingRepository.getAppointmentForUpdate(input.appointment_id);
        assertAppointmentInBusiness(input.businessSlug, business.id, appointment, input.appointment_id);

        if (appointment!.status === 'cancelled') {
          throw new AppError(
            ErrorCodes.APPOINTMENT_NOT_RESCHEDULABLE,
            'Cancelled appointments cannot be rescheduled.',
          );
        }

        const updated: Appointment = {
          ...appointment!,
          starts_at: slot.starts_at,
          ends_at: slot.ends_at,
          resource_allocations: slot.resources,
        };

        await this.lockResourcesForAppointment(updated);
        const raced = await bookingRepository.getIdempotencyResponse(scopeKey);
        if (raced) return raced as ReturnType<typeof ok>;

        await this.assertResourcesFree(business.id, updated, appointment!.id, { alreadyLocked: true });
        await bookingRepository.updateAppointmentTimes(appointment!.id, slot.starts_at, slot.ends_at);
        await bookingRepository.replaceAppointmentResources(appointment!.id, slot.resources);
        const body = ok(this.toPublicAppointment(updated, ctx.service.name, ctx.business.name));
        await bookingRepository.saveIdempotencyResponse(scopeKey, 'reschedule_appointment', body);
        return body;
      });
      log('info', {
        business_id: business.id,
        operation: 'reschedule_appointment',
        appointment_id: input.appointment_id,
      });
      return response;
    } catch (error) {
      const raced = await bookingRepository.getIdempotencyResponse(scopeKey);
      if (raced) return raced as ReturnType<typeof ok>;
      if (error instanceof AppError) throw error;
      throw new AppError(ErrorCodes.RESOURCE_UNAVAILABLE, 'Required resources are unavailable for reschedule.', true);
    }
  }

  async cancelAppointment(input: {
    businessSlug: string;
    appointment_id: string;
    idempotency_key: string;
    reason?: string;
  }) {
    const scopeKey = buildIdempotencyScope('cancel_appointment', input.businessSlug, input.idempotency_key);
    const cached = await bookingRepository.getIdempotencyResponse(scopeKey);
    if (cached) return cached as ReturnType<typeof ok>;

    const business = await bookingRepository.getBusinessBySlug(input.businessSlug);
    if (!business) throw new AppError(ErrorCodes.BUSINESS_NOT_FOUND, `Business ${input.businessSlug} was not found.`);

    const preview = await bookingRepository.getAppointment(input.appointment_id);
    assertAppointmentInBusiness(input.businessSlug, business.id, preview, input.appointment_id);

    const service = await bookingRepository.getService(business.id, preview!.service_id);

    const response = await runInTransaction(async () => {
      const appointment = await bookingRepository.getAppointmentForUpdate(input.appointment_id);
      assertAppointmentInBusiness(input.businessSlug, business.id, appointment, input.appointment_id);

      const raced = await bookingRepository.getIdempotencyResponse(scopeKey);
      if (raced) return raced as ReturnType<typeof ok>;

      if (appointment!.status === 'cancelled') {
        const body = ok({
          appointment_id: appointment!.id,
          status: 'cancelled',
          message: 'Appointment was already cancelled.',
          appointment: this.toPublicAppointment(
            appointment!,
            service?.name ?? appointment!.service_id,
            business.name,
          ),
        });
        await bookingRepository.saveIdempotencyResponse(scopeKey, 'cancel_appointment', body);
        return body;
      }

      await bookingRepository.cancelAppointment(appointment!.id);
      appointment!.status = 'cancelled';
      const body = ok({
        appointment_id: appointment!.id,
        status: 'cancelled',
        message: input.reason ? `Cancelled: ${input.reason}` : 'Appointment cancelled.',
        appointment: this.toPublicAppointment(
          appointment!,
          service?.name ?? appointment!.service_id,
          business.name,
        ),
      });
      await bookingRepository.saveIdempotencyResponse(scopeKey, 'cancel_appointment', body);
      return body;
    });
    log('info', {
      business_id: business.id,
      operation: 'cancel_appointment',
      appointment_id: input.appointment_id,
    });
    return response;
  }

  private async lockResourcesForAppointment(appointment: Appointment) {
    const resourceIds = appointment.resource_allocations.map((a) => a.resource_id);
    await bookingRepository.lockResources(resourceIds);
    await bookingRepository.lockOverlappingAppointments(
      appointment.business_id,
      resourceIds,
      appointment.starts_at,
      appointment.ends_at,
      appointment.id,
    );
  }

  private async assertResourcesFree(
    businessId: string,
    appointment: Appointment,
    excludeAppointmentId?: string,
    options?: { alreadyLocked?: boolean },
  ) {
    if (!options?.alreadyLocked) {
      await this.lockResourcesForAppointment({
        ...appointment,
        id: excludeAppointmentId ?? appointment.id,
        business_id: businessId,
      });
    }

    const appointments = (await bookingRepository.listAppointments(businessId)).filter(
      (item) => item.id !== excludeAppointmentId,
    );
    const blocked = await bookingRepository.listBlockedTimes(businessId);
    const start = new Date(appointment.starts_at);
    const end = new Date(appointment.ends_at);

    for (const allocation of appointment.resource_allocations) {
      for (const existing of appointments) {
        if (existing.status !== 'confirmed') continue;
        const uses = existing.resource_allocations.some((r) => r.resource_id === allocation.resource_id);
        if (!uses) continue;
        if (start < new Date(existing.ends_at) && new Date(existing.starts_at) < end) {
          throw new AppError(ErrorCodes.RESOURCE_UNAVAILABLE, `Resource ${allocation.resource_id} is busy.`, true);
        }
      }
      for (const block of blocked) {
        if (block.resource_id !== allocation.resource_id) continue;
        if (start < new Date(block.ends_at) && new Date(block.starts_at) < end) {
          throw new AppError(ErrorCodes.RESOURCE_UNAVAILABLE, `Resource ${allocation.resource_id} is blocked.`, true);
        }
      }
    }
  }

  private toPublicAppointment(appointment: Appointment, serviceName: string, businessName: string) {
    const human = appointment.resource_allocations.find((r) =>
      ['hvac_technician', 'plumber', 'stylist', 'therapist', 'automotive_technician'].includes(r.resource_type),
    );
    return {
      appointment_id: appointment.id,
      business: businessName,
      service: serviceName,
      status: appointment.status,
      starts_at: appointment.starts_at,
      ends_at: appointment.ends_at,
      location:
        appointment.customer.service_address ??
        (appointment.resource_allocations.length ? 'At business location' : null),
      provider: human?.resource_name ?? null,
      price: { amount: appointment.price_cents, currency: appointment.currency },
      customer: {
        name: appointment.customer.name,
        email: appointment.customer.email ?? null,
        phone: appointment.customer.phone ?? null,
      },
      notes: appointment.notes ?? null,
      cancellable: appointment.status === 'confirmed',
    };
  }
}

export const bookingService = new BookingService();

export function handleServiceError(error: unknown) {
  return toErrorResponse(error);
}

export type BookingServiceResult<T> = ReturnType<typeof ok<T>> | ReturnType<typeof toErrorResponse>;
