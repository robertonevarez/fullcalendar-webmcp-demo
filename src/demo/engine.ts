import { AppError, ErrorCodes } from '@/domain/errors';
import { searchServices } from '@/domain/search';
import {
  checkServiceArea,
  findAvailability,
  newAppointmentId,
  revalidateSlot,
} from '@/domain/scheduler';
import type {
  Appointment,
  AvailabilityQuery,
  AvailabilitySlot,
  CustomerInput,
} from '@/domain/types';
import { normalizeDemoConfig, type NormalizedDemoBusiness } from '@/demo/normalize';
import type { DemoConfig } from '@/demo/types';

/**
 * Thin adapter: demo config → real Protocol Tooling domain scheduling.
 * No second scheduler. No Postgres. No mutation of seeded businesses.
 */
export class DemoBookingEngine {
  readonly normalized: NormalizedDemoBusiness;

  constructor(config: DemoConfig) {
    this.normalized = normalizeDemoConfig(config);
  }

  get businessName() {
    return this.normalized.business.name;
  }

  get timezone() {
    return this.normalized.business.timezone;
  }

  get notificationEmail() {
    return this.normalized.notificationEmail;
  }

  search(query?: string) {
    return searchServices(this.normalized.services, query);
  }

  getService(serviceId: string) {
    const service = this.normalized.services.find((s) => s.id === serviceId);
    if (!service) {
      throw new AppError(ErrorCodes.SERVICE_NOT_FOUND, 'That service was not found.', false, 'service_id');
    }
    return service;
  }

  assertServiceArea(serviceId: string, postalCode?: string) {
    const service = this.getService(serviceId);
    const result = checkServiceArea(
      this.normalized.business.id,
      service,
      this.normalized.postalCodesByZone,
      postalCode,
    );
    if (result.status === 'ineligible') {
      throw new AppError(ErrorCodes.OUTSIDE_SERVICE_AREA, result.message, false, 'postal_code');
    }
    return result;
  }

  findSlots(
    appointments: Appointment[],
    query: AvailabilityQuery,
  ): AvailabilitySlot[] {
    const service = this.getService(query.service_id);
    this.assertServiceArea(service.id, query.postal_code);

    const slots = findAvailability(
      {
        business: this.normalized.business,
        service,
        resources: this.normalized.resources,
        appointments,
        blockedTimes: [],
      },
      query,
    );

    if (!slots.length) {
      throw new AppError(ErrorCodes.NO_AVAILABILITY, 'No availability found for the requested range.', true);
    }
    return slots;
  }

  /**
   * Create an appointment using the same domain revalidation rules as production.
   * Requires an explicit slot from a prior availability result (confirmation gate is
   * enforced by the conversation layer before calling this).
   */
  createAppointment(input: {
    appointments: Appointment[];
    service_id: string;
    slot: AvailabilitySlot;
    customer: CustomerInput;
    postal_code?: string;
    notes?: { description?: string; location_detail?: string };
  }): { appointment: Appointment; appointments: Appointment[] } {
    const service = this.getService(input.service_id);
    if (input.slot.service_id !== input.service_id) {
      throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Slot does not match the selected service.', false, 'slot_id');
    }

    const effectivePostal =
      input.postal_code ?? input.customer.service_address?.postal_code;

    if (service.location_policy === 'CUSTOMER' && !input.customer.service_address && !effectivePostal) {
      throw new AppError(
        ErrorCodes.LOCATION_REQUIRED,
        'A postal code is needed to book this service.',
        false,
        'postal_code',
      );
    }

    this.assertServiceArea(service.id, effectivePostal);

    const query: AvailabilityQuery = {
      service_id: input.service_id,
      start_date: input.slot.starts_at.slice(0, 10),
      end_date: input.slot.ends_at.slice(0, 10),
      postal_code: effectivePostal,
    };

    const ctx = {
      business: this.normalized.business,
      service,
      resources: this.normalized.resources,
      appointments: input.appointments,
      blockedTimes: [],
    };

    if (!revalidateSlot(ctx, input.slot, query)) {
      throw new AppError(ErrorCodes.SLOT_UNAVAILABLE, 'That time is no longer available.', true);
    }

    // Double-check resources aren't taken (same rule as booking service conflict path).
    const stillOpen = findAvailability(ctx, {
      ...query,
      limit: 50,
    }).some((s) => s.slot_id === input.slot.slot_id);
    if (!stillOpen) {
      throw new AppError(ErrorCodes.RESOURCE_UNAVAILABLE, 'That time was just taken. Please pick another.', true);
    }

    const provider = input.slot.resources[0];
    const resourceName = this.normalized.resources.find((r) => r.id === provider?.resource_id)?.name;

    const appointment: Appointment = {
      id: newAppointmentId(),
      business_id: this.normalized.business.id,
      service_id: input.service_id,
      status: 'confirmed',
      starts_at: input.slot.starts_at,
      ends_at: input.slot.ends_at,
      customer: {
        ...input.customer,
        service_address:
          input.customer.service_address ??
          (effectivePostal
            ? {
                line1: 'Customer location',
                city: 'Unknown',
                region: 'TX',
                postal_code: effectivePostal,
              }
            : undefined),
      },
      notes: input.notes,
      price_cents: input.slot.price.amount,
      currency: input.slot.price.currency,
      resource_allocations: input.slot.resources.map((r) => ({
        ...r,
        resource_name: r.resource_name ?? resourceName,
      })),
    };

    return {
      appointment,
      appointments: [...input.appointments, appointment],
    };
  }
}

export function emptyConversationState() {
  return {
    phase: 'idle' as const,
    appointments: [] as Appointment[],
    serviceQuery: null,
    pendingService: null,
    pendingOffer: null,
    selectedSlotId: null,
    lastBooking: null,
  };
}
