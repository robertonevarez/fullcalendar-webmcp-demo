import { createHash, randomUUID } from 'crypto';
import { AppError, ErrorCodes } from '@/domain/errors';
import {
  Appointment,
  AvailabilityQuery,
  AvailabilitySlot,
  BlockedTime,
  Business,
  Resource,
  ResourceRequirement,
  Service,
  SlotResourceAllocation,
} from '@/domain/types';
import {
  addMinutes,
  eachDayInRange,
  isWithinWorkingHours,
  matchesTimePreference,
  overlaps,
  utcToIso,
  zonedDateTimeToUtc,
} from '@/lib/time';

const SLOT_INTERVAL_MINUTES = 15;
const DEFAULT_SLOT_LIMIT = 8;

export interface SchedulerContext {
  business: Business;
  service: Service;
  resources: Resource[];
  appointments: Appointment[];
  blockedTimes: BlockedTime[];
}

export function checkServiceArea(
  businessId: string,
  service: Service,
  postalCodesByZone: Map<string, string[]>,
  postalCode?: string,
): { status: 'not_required' | 'eligible' | 'ineligible'; zone_id?: string; message: string } {
  if (!service.service_area_required) {
    return {
      status: 'not_required',
      message: 'Service-area check is not required for this service.',
    };
  }
  if (!postalCode) {
    throw new AppError(ErrorCodes.LOCATION_REQUIRED, 'Postal code is required for this service.', false, 'postal_code');
  }
  for (const [zoneId, codes] of postalCodesByZone.entries()) {
    if (codes.includes(postalCode)) {
      return {
        status: 'eligible',
        zone_id: zoneId,
        message: `Postal code ${postalCode} is within service area ${zoneId}.`,
      };
    }
  }
  return {
    status: 'ineligible',
    message: `Postal code ${postalCode} is outside the service area for business ${businessId}.`,
  };
}

export function findAvailability(ctx: SchedulerContext, query: AvailabilityQuery): AvailabilitySlot[] {
  if (query.start_date > query.end_date) {
    throw new AppError(ErrorCodes.INVALID_TIME_RANGE, 'start_date must be on or before end_date.', false);
  }

  const slots: AvailabilitySlot[] = [];
  const days = eachDayInRange(query.start_date, query.end_date);

  for (const day of days) {
    for (let minute = 0; minute < 24 * 60; minute += SLOT_INTERVAL_MINUTES) {
      const hour = Math.floor(minute / 60);
      const min = minute % 60;
      const startLocal = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      const start = zonedDateTimeToUtc(day, startLocal, ctx.business.timezone);
      const end = addMinutes(start, ctx.service.duration_minutes);

      if (!isWithinWorkingHours(start, end, ctx.business.working_hours, ctx.business.timezone)) {
        continue;
      }
      if (!matchesTimePreference(start, end, query.time_preference, ctx.business.timezone)) {
        continue;
      }

      const allocation = allocateResources(ctx, query, start, end);
      if (!allocation) continue;

      const slotId = buildSlotId(ctx.service.id, start, allocation);
      slots.push({
        slot_id: slotId,
        service_id: ctx.service.id,
        starts_at: utcToIso(start),
        ends_at: utcToIso(end),
        resources: allocation,
        price: { amount: ctx.service.price_cents, currency: ctx.service.currency },
      });

      if (slots.length >= (query.limit ?? DEFAULT_SLOT_LIMIT)) {
        return slots;
      }
    }
  }

  return slots;
}

/** Exported for domain tests — deterministic backtracking resource allocation. */
export function allocateResources(
  ctx: SchedulerContext,
  query: AvailabilityQuery,
  start: Date,
  end: Date,
): SlotResourceAllocation[] | null {
  const selected: SlotResourceAllocation[] = [];
  const usedResourceIds = new Set<string>();

  function backtrack(requirementIndex: number): boolean {
    if (requirementIndex >= ctx.service.resource_requirements.length) {
      return true;
    }

    const requirement = ctx.service.resource_requirements[requirementIndex];
    const candidates = candidatesForRequirement(ctx, query, requirement, usedResourceIds, start, end);
    const combos = combinations(candidates, requirement.quantity);

    for (const combo of combos) {
      for (const resource of combo) {
        usedResourceIds.add(resource.id);
        selected.push({
          resource_id: resource.id,
          resource_type: resource.resource_type,
          resource_name: resource.name,
        });
      }

      if (backtrack(requirementIndex + 1)) {
        return true;
      }

      for (const resource of combo) {
        usedResourceIds.delete(resource.id);
        selected.pop();
      }
    }

    return false;
  }

  return backtrack(0) ? selected : null;
}

function candidatesForRequirement(
  ctx: SchedulerContext,
  query: AvailabilityQuery,
  requirement: ResourceRequirement,
  usedResourceIds: Set<string>,
  start: Date,
  end: Date,
): Resource[] {
  return ctx.resources.filter((resource) => {
    if (resource.resource_type !== requirement.resource_type) return false;
    if (requirement.capability && !resource.capabilities.includes(requirement.capability)) {
      return false;
    }
    if (requirement.preferred_resource_id && resource.id !== requirement.preferred_resource_id) {
      return false;
    }
    if (query.preferred_resource_id && resource.is_human && resource.id !== query.preferred_resource_id) {
      return false;
    }
    if (usedResourceIds.has(resource.id)) return false;
    return isResourceFree(ctx, resource, start, end);
  });
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [[]];
  if (items.length < size) return [];

  const results: T[][] = [];

  function build(startIndex: number, combo: T[]) {
    if (combo.length === size) {
      results.push([...combo]);
      return;
    }
    for (let i = startIndex; i <= items.length - (size - combo.length); i += 1) {
      combo.push(items[i]);
      build(i + 1, combo);
      combo.pop();
    }
  }

  build(0, []);
  return results;
}

function isResourceFree(ctx: SchedulerContext, resource: Resource, start: Date, end: Date): boolean {
  if (!isWithinWorkingHours(start, end, resource.working_hours, ctx.business.timezone)) {
    return false;
  }

  for (const appointment of ctx.appointments) {
    if (appointment.status !== 'confirmed') continue;
    const usesResource = appointment.resource_allocations.some((a) => a.resource_id === resource.id);
    if (!usesResource) continue;
    const apptStart = new Date(appointment.starts_at);
    const apptEnd = new Date(appointment.ends_at);
    if (overlaps(start, end, apptStart, apptEnd)) {
      return false;
    }
  }

  for (const blocked of ctx.blockedTimes) {
    if (blocked.resource_id !== resource.id) continue;
    if (overlaps(start, end, new Date(blocked.starts_at), new Date(blocked.ends_at))) {
      return false;
    }
  }

  return true;
}

export function buildSlotId(serviceId: string, start: Date, resources: SlotResourceAllocation[]): string {
  const payload = JSON.stringify({
    serviceId,
    start: utcToIso(start),
    resources: resources.map((r) => r.resource_id).sort(),
  });
  return `slot_${createHash('sha256').update(payload).digest('hex').slice(0, 16)}`;
}

export function revalidateSlot(
  ctx: SchedulerContext,
  slot: AvailabilitySlot,
  query: AvailabilityQuery,
): boolean {
  const start = new Date(slot.starts_at);
  const end = new Date(slot.ends_at);
  const allocation = allocateResources(ctx, query, start, end);
  if (!allocation) return false;
  const expected = buildSlotId(ctx.service.id, start, allocation);
  return expected === slot.slot_id;
}

export function newAppointmentId(): string {
  return `appt_${randomUUID()}`;
}

export function requirementSummary(requirements: ResourceRequirement[]) {
  return requirements.map((req) => ({
    resource_type: req.resource_type,
    quantity: req.quantity,
    capability: req.capability ?? null,
  }));
}
