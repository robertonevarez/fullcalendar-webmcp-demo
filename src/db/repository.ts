import { query } from '@/db/client';
import {
  asIso,
  asJson,
  toAppointment,
  toBlockedTime,
  toBusiness,
  toResource,
  toService,
  toServiceAreaZone,
} from '@/db/mappers';
import { Appointment, AvailabilitySlot, Business, Resource, Service } from '@/domain/types';

export class BookingRepository {
  async listBusinesses(): Promise<Business[]> {
    const result = await query('SELECT * FROM businesses ORDER BY name');
    return result.rows.map((row) => toBusiness(row as Record<string, unknown>));
  }

  async getBusinessBySlug(slug: string): Promise<Business | null> {
    const result = await query('SELECT * FROM businesses WHERE slug = $1', [slug]);
    const row = result.rows[0];
    return row ? toBusiness(row as Record<string, unknown>) : null;
  }

  async getBusinessById(id: string): Promise<Business | null> {
    const result = await query('SELECT * FROM businesses WHERE id = $1', [id]);
    const row = result.rows[0];
    return row ? toBusiness(row as Record<string, unknown>) : null;
  }

  async listServices(businessId: string): Promise<Service[]> {
    const result = await query('SELECT * FROM services WHERE business_id = $1 ORDER BY name', [
      businessId,
    ]);
    return result.rows.map((row) => toService(row as Record<string, unknown>));
  }

  async getService(businessId: string, serviceId: string): Promise<Service | null> {
    const result = await query('SELECT * FROM services WHERE business_id = $1 AND id = $2', [
      businessId,
      serviceId,
    ]);
    const row = result.rows[0];
    return row ? toService(row as Record<string, unknown>) : null;
  }

  async listResources(businessId: string): Promise<Resource[]> {
    const result = await query('SELECT * FROM resources WHERE business_id = $1 ORDER BY name', [
      businessId,
    ]);
    return result.rows.map((row) => toResource(row as Record<string, unknown>));
  }

  async listServiceAreaZones(businessId: string) {
    const result = await query('SELECT * FROM service_area_zones WHERE business_id = $1', [
      businessId,
    ]);
    return result.rows.map((row) => toServiceAreaZone(row as Record<string, unknown>));
  }

  async listBlockedTimes(businessId: string) {
    const result = await query(
      `SELECT bt.* FROM blocked_times bt
       JOIN resources r ON r.id = bt.resource_id
       WHERE r.business_id = $1`,
      [businessId],
    );
    return result.rows.map((row) => toBlockedTime(row as Record<string, unknown>));
  }

  async listAppointments(businessId: string, statuses: string[] = ['confirmed']): Promise<Appointment[]> {
    const result = await query(
      `SELECT * FROM appointments WHERE business_id = $1 AND status = ANY($2::text[])`,
      [businessId, statuses],
    );
    const appointments: Appointment[] = [];
    for (const row of result.rows) {
      appointments.push(await this.hydrateAppointment(row as Record<string, unknown>));
    }
    return appointments;
  }

  async getAppointment(appointmentId: string): Promise<Appointment | null> {
    const result = await query('SELECT * FROM appointments WHERE id = $1', [appointmentId]);
    const row = result.rows[0];
    return row ? this.hydrateAppointment(row as Record<string, unknown>) : null;
  }

  /**
   * Lock and re-read an appointment row inside the current transaction.
   * Callers must be inside `runInTransaction`.
   */
  async getAppointmentForUpdate(appointmentId: string): Promise<Appointment | null> {
    const result = await query('SELECT * FROM appointments WHERE id = $1 FOR UPDATE', [
      appointmentId,
    ]);
    const row = result.rows[0];
    return row ? this.hydrateAppointment(row as Record<string, unknown>) : null;
  }

  private async hydrateAppointment(row: Record<string, unknown>): Promise<Appointment> {
    const resources = await query(
      `SELECT ar.resource_id, ar.resource_type, r.name as resource_name
       FROM appointment_resources ar
       JOIN resources r ON r.id = ar.resource_id
       WHERE ar.appointment_id = $1`,
      [String(row.id)],
    );
    return toAppointment(
      row,
      resources.rows.map((resource) => ({
        resource_id: String(resource.resource_id),
        resource_type: String(resource.resource_type),
        resource_name: resource.resource_name ? String(resource.resource_name) : undefined,
      })),
    );
  }

  /**
   * Lock resources in deterministic id order to prevent deadlocks under concurrent booking.
   */
  async lockResources(resourceIds: string[]): Promise<void> {
    if (!resourceIds.length) return;
    const ordered = [...new Set(resourceIds)].sort();
    await query(`SELECT id FROM resources WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`, [
      ordered,
    ]);
  }

  /**
   * Lock overlapping confirmed appointments that use any of the given resources.
   */
  async lockOverlappingAppointments(
    businessId: string,
    resourceIds: string[],
    startsAt: string,
    endsAt: string,
    excludeAppointmentId?: string,
  ): Promise<void> {
    if (!resourceIds.length) return;
    await query(
      `SELECT a.id
       FROM appointments a
       JOIN appointment_resources ar ON ar.appointment_id = a.id
       WHERE a.business_id = $1
         AND a.status = 'confirmed'
         AND ($2::text IS NULL OR a.id <> $2)
         AND ar.resource_id = ANY($3::text[])
         AND a.starts_at < $5::timestamptz
         AND a.ends_at > $4::timestamptz
       ORDER BY a.id
       FOR UPDATE OF a`,
      [businessId, excludeAppointmentId ?? null, resourceIds, startsAt, endsAt],
    );
  }

  async saveSlotToken(businessId: string, slot: AvailabilitySlot, expiresAt: string) {
    await query(
      `INSERT INTO slot_tokens (slot_id, business_id, service_id, payload_json, expires_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz)
       ON CONFLICT (slot_id) DO UPDATE SET
         business_id = EXCLUDED.business_id,
         service_id = EXCLUDED.service_id,
         payload_json = EXCLUDED.payload_json,
         expires_at = EXCLUDED.expires_at`,
      [slot.slot_id, businessId, slot.service_id, JSON.stringify(slot), expiresAt],
    );
  }

  async getSlotTokenForBusiness(businessId: string, slotId: string): Promise<AvailabilitySlot | null> {
    const result = await query(
      'SELECT * FROM slot_tokens WHERE slot_id = $1 AND business_id = $2',
      [slotId, businessId],
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    if (new Date(asIso(row.expires_at)) < new Date()) {
      await query('DELETE FROM slot_tokens WHERE slot_id = $1', [slotId]);
      return null;
    }
    return asJson<AvailabilitySlot>(row.payload_json);
  }

  async getIdempotencyResponse(scopeKey: string) {
    const result = await query('SELECT response_json FROM idempotency_records WHERE scope_key = $1', [
      scopeKey,
    ]);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? asJson<unknown>(row.response_json) : null;
  }

  async saveIdempotencyResponse(scopeKey: string, operation: string, response: unknown) {
    await query(
      `INSERT INTO idempotency_records (scope_key, operation, response_json, created_at)
       VALUES ($1, $2, $3::jsonb, $4::timestamptz)
       ON CONFLICT (scope_key) DO UPDATE SET
         operation = EXCLUDED.operation,
         response_json = EXCLUDED.response_json,
         created_at = EXCLUDED.created_at`,
      [scopeKey, operation, JSON.stringify(response), new Date().toISOString()],
    );
  }

  async insertAppointment(appointment: Appointment) {
    const now = new Date().toISOString();
    await query(
      `INSERT INTO appointments (
        id, business_id, service_id, status, starts_at, ends_at,
        customer_name, customer_email, customer_phone, service_address_json, notes_json,
        price_cents, currency, idempotency_key, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5::timestamptz, $6::timestamptz,
        $7, $8, $9, $10::jsonb, $11::jsonb,
        $12, $13, $14, $15::timestamptz, $16::timestamptz
      )`,
      [
        appointment.id,
        appointment.business_id,
        appointment.service_id,
        appointment.status,
        appointment.starts_at,
        appointment.ends_at,
        appointment.customer.name,
        appointment.customer.email ?? null,
        appointment.customer.phone ?? null,
        appointment.customer.service_address
          ? JSON.stringify(appointment.customer.service_address)
          : null,
        appointment.notes ? JSON.stringify(appointment.notes) : null,
        appointment.price_cents,
        appointment.currency,
        appointment.idempotency_key ?? null,
        now,
        now,
      ],
    );

    for (const allocation of appointment.resource_allocations) {
      await query(
        `INSERT INTO appointment_resources (appointment_id, resource_id, resource_type)
         VALUES ($1, $2, $3)`,
        [appointment.id, allocation.resource_id, allocation.resource_type],
      );
    }
  }

  async updateAppointmentTimes(appointmentId: string, startsAt: string, endsAt: string) {
    await query(
      'UPDATE appointments SET starts_at = $1::timestamptz, ends_at = $2::timestamptz, updated_at = $3::timestamptz WHERE id = $4',
      [startsAt, endsAt, new Date().toISOString(), appointmentId],
    );
  }

  async replaceAppointmentResources(
    appointmentId: string,
    allocations: Appointment['resource_allocations'],
  ) {
    await query('DELETE FROM appointment_resources WHERE appointment_id = $1', [appointmentId]);
    for (const allocation of allocations) {
      await query(
        `INSERT INTO appointment_resources (appointment_id, resource_id, resource_type)
         VALUES ($1, $2, $3)`,
        [appointmentId, allocation.resource_id, allocation.resource_type],
      );
    }
  }

  async cancelAppointment(appointmentId: string) {
    await query(
      `UPDATE appointments SET status = 'cancelled', updated_at = $1::timestamptz WHERE id = $2`,
      [new Date().toISOString(), appointmentId],
    );
  }
}

export const bookingRepository = new BookingRepository();
