import { query, runInTransaction } from '@/db/client';
import { WorkingHours } from '@/domain/types';

const WEEKDAY_FIELD: WorkingHours[] = [
  { day: 1, open: '08:00', close: '20:00' },
  { day: 2, open: '08:00', close: '20:00' },
  { day: 3, open: '08:00', close: '20:00' },
  { day: 4, open: '08:00', close: '20:00' },
  { day: 5, open: '08:00', close: '20:00' },
  { day: 6, open: '09:00', close: '14:00' },
];

const SALON_HOURS: WorkingHours[] = [
  { day: 2, open: '09:00', close: '19:00' },
  { day: 3, open: '09:00', close: '19:00' },
  { day: 4, open: '09:00', close: '19:00' },
  { day: 5, open: '09:00', close: '19:00' },
  { day: 6, open: '09:00', close: '17:00' },
];

const CLINIC_HOURS: WorkingHours[] = [
  { day: 1, open: '08:00', close: '18:00' },
  { day: 2, open: '08:00', close: '18:00' },
  { day: 3, open: '08:00', close: '18:00' },
  { day: 4, open: '08:00', close: '18:00' },
  { day: 5, open: '08:00', close: '16:00' },
];

const AUTO_HOURS: WorkingHours[] = [
  { day: 1, open: '07:30', close: '18:00' },
  { day: 2, open: '07:30', close: '18:00' },
  { day: 3, open: '07:30', close: '18:00' },
  { day: 4, open: '07:30', close: '18:00' },
  { day: 5, open: '07:30', close: '18:00' },
  { day: 6, open: '08:00', close: '14:00' },
];

export async function seedDatabase(force = false) {
  return runInTransaction(async () => {
    const countResult = await query<{ count: string }>('SELECT COUNT(*)::text as count FROM businesses');
    const count = Number(countResult.rows[0]?.count ?? 0);
    if (count > 0 && !force) return { seeded: false };

    if (force) {
      await query('DELETE FROM appointment_resources');
      await query('DELETE FROM appointments');
      await query('DELETE FROM slot_tokens');
      await query('DELETE FROM idempotency_records');
      await query('DELETE FROM blocked_times');
      await query('DELETE FROM service_area_zones');
      await query('DELETE FROM resources');
      await query('DELETE FROM services');
      await query('DELETE FROM businesses');
    }

    async function insertBusiness(
      id: string,
      slug: string,
      name: string,
      timezone: string,
      locationMode: string,
      workingHoursJson: string,
      addressJson: string,
    ) {
      await query(
        `INSERT INTO businesses (id, slug, name, timezone, location_mode, working_hours_json, address_json)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
        [id, slug, name, timezone, locationMode, workingHoursJson, addressJson],
      );
    }

    async function insertService(
      id: string,
      businessId: string,
      name: string,
      description: string,
      durationMinutes: number,
      priceCents: number,
      currency: string,
      keywordsJson: string,
      locationPolicy: string,
      serviceAreaRequired: boolean,
      resourceRequirementsJson: string,
      intakeFieldsJson: string,
    ) {
      await query(
        `INSERT INTO services (
          id, business_id, name, description, duration_minutes, price_cents, currency,
          keywords_json, location_policy, service_area_required, resource_requirements_json, intake_fields_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11::jsonb, $12::jsonb)`,
        [
          id,
          businessId,
          name,
          description,
          durationMinutes,
          priceCents,
          currency,
          keywordsJson,
          locationPolicy,
          serviceAreaRequired,
          resourceRequirementsJson,
          intakeFieldsJson,
        ],
      );
    }

    async function insertResource(
      id: string,
      businessId: string,
      name: string,
      resourceType: string,
      capabilitiesJson: string,
      workingHoursJson: string,
      isHuman: boolean,
    ) {
      await query(
        `INSERT INTO resources (id, business_id, name, resource_type, capabilities_json, working_hours_json, is_human)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)`,
        [id, businessId, name, resourceType, capabilitiesJson, workingHoursJson, isHuman],
      );
    }

    async function insertZone(id: string, businessId: string, zoneId: string, postalCodesJson: string) {
      await query(
        `INSERT INTO service_area_zones (id, business_id, zone_id, postal_codes_json) VALUES ($1, $2, $3, $4::jsonb)`,
        [id, businessId, zoneId, postalCodesJson],
      );
    }

    async function insertBlocked(
      id: string,
      resourceId: string,
      startsAt: string,
      endsAt: string,
      reason: string,
    ) {
      await query(
        `INSERT INTO blocked_times (id, resource_id, starts_at, ends_at, reason)
         VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5)`,
        [id, resourceId, startsAt, endsAt, reason],
      );
    }

    async function insertAppointment(
      id: string,
      businessId: string,
      serviceId: string,
      status: string,
      startsAt: string,
      endsAt: string,
      customerName: string,
      customerEmail: string | null,
      customerPhone: string | null,
      serviceAddressJson: string | null,
      notesJson: string | null,
      priceCents: number,
      currency: string,
      idempotencyKey: string,
      createdAt: string,
      updatedAt: string,
    ) {
      await query(
        `INSERT INTO appointments (
          id, business_id, service_id, status, starts_at, ends_at,
          customer_name, customer_email, customer_phone, service_address_json, notes_json,
          price_cents, currency, idempotency_key, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14, $15::timestamptz, $16::timestamptz)`,
        [
          id,
          businessId,
          serviceId,
          status,
          startsAt,
          endsAt,
          customerName,
          customerEmail,
          customerPhone,
          serviceAddressJson,
          notesJson,
          priceCents,
          currency,
          idempotencyKey,
          createdAt,
          updatedAt,
        ],
      );
    }

    async function insertApptResource(appointmentId: string, resourceId: string, resourceType: string) {
      await query(
        `INSERT INTO appointment_resources (appointment_id, resource_id, resource_type) VALUES ($1, $2, $3)`,
        [appointmentId, resourceId, resourceType],
      );
    }

    // --- Acme HVAC ---
    await insertBusiness(
      'biz_acme_hvac',
      'acme-hvac',
      'Acme Heating & Air',
      'America/Chicago',
      'CUSTOMER_LOCATION',
      JSON.stringify(WEEKDAY_FIELD),
      JSON.stringify({
        line1: '1200 Service Depot Rd',
        city: 'Austin',
        region: 'TX',
        postal_code: '78701',
      }),
    );
    await insertZone(
      'zone_acme_central',
      'biz_acme_hvac',
      'austin-central',
      JSON.stringify(['78701', '78702', '78704', '78705']),
    );
    await insertService(
      'svc_ac_diagnostic',
      'biz_acme_hvac',
      'AC Diagnostic Visit',
      'Technician inspects cooling performance, airflow, and refrigerant indicators.',
      90,
      8900,
      'USD',
      JSON.stringify(['AC', 'cooling', 'not cooling', 'airflow', 'diagnostic', 'AC issue', 'upstairs']),
      'CUSTOMER',
      true,
      JSON.stringify([{ resource_type: 'hvac_technician', quantity: 1, capability: 'hvac_diagnostic' }]),
      JSON.stringify(['issue_description', 'symptom_location']),
    );
    await insertService(
      'svc_ac_repair',
      'biz_acme_hvac',
      'AC Repair',
      'Repairs identified cooling system faults.',
      120,
      14900,
      'USD',
      JSON.stringify(['AC repair', 'cooling repair', 'compressor', 'refrigerant']),
      'CUSTOMER',
      true,
      JSON.stringify([{ resource_type: 'hvac_technician', quantity: 1, capability: 'hvac_repair' }]),
      JSON.stringify(['issue_description']),
    );
    await insertService(
      'svc_preventive',
      'biz_acme_hvac',
      'Preventive Maintenance',
      'Seasonal HVAC tune-up and safety checks.',
      60,
      7900,
      'USD',
      JSON.stringify(['maintenance', 'tune-up', 'seasonal', 'HVAC']),
      'CUSTOMER',
      true,
      JSON.stringify([{ resource_type: 'hvac_technician', quantity: 1, capability: 'hvac_maintenance' }]),
      JSON.stringify([]),
    );
    await insertResource(
      'res_hvac_maria',
      'biz_acme_hvac',
      'Maria Lopez',
      'hvac_technician',
      JSON.stringify(['hvac_diagnostic', 'hvac_repair', 'hvac_maintenance']),
      JSON.stringify(WEEKDAY_FIELD),
      true,
    );
    await insertResource(
      'res_hvac_james',
      'biz_acme_hvac',
      'James Carter',
      'hvac_technician',
      JSON.stringify(['hvac_diagnostic', 'hvac_maintenance']),
      JSON.stringify(WEEKDAY_FIELD),
      true,
    );
    await insertBlocked(
      'blk_hvac_maria_lunch',
      'res_hvac_maria',
      '2026-08-26T17:00:00.000Z',
      '2026-08-26T18:00:00.000Z',
      'Lunch break',
    );
    await insertAppointment(
      'appt_seed_hvac_1',
      'biz_acme_hvac',
      'svc_preventive',
      'confirmed',
      '2026-08-26T15:00:00.000Z',
      '2026-08-26T16:00:00.000Z',
      'Pat Lee',
      'pat@example.com',
      '512-555-0101',
      JSON.stringify({ line1: '45 Oak St', city: 'Austin', region: 'TX', postal_code: '78704' }),
      null,
      7900,
      'USD',
      'seed-hvac-1',
      new Date().toISOString(),
      new Date().toISOString(),
    );
    await insertApptResource('appt_seed_hvac_1', 'res_hvac_james', 'hvac_technician');

    // --- Blue Pipe Plumbing ---
    await insertBusiness(
      'biz_blue_pipe',
      'blue-pipe-plumbing',
      'Blue Pipe Plumbing',
      'America/Chicago',
      'CUSTOMER_LOCATION',
      JSON.stringify(WEEKDAY_FIELD),
      JSON.stringify({
        line1: '88 Pipeworks Ave',
        city: 'Austin',
        region: 'TX',
        postal_code: '78702',
      }),
    );
    await insertZone(
      'zone_blue_east',
      'biz_blue_pipe',
      'austin-east',
      JSON.stringify(['78702', '78721', '78722', '78723']),
    );
    await insertService(
      'svc_drain_cleaning',
      'biz_blue_pipe',
      'Drain Cleaning',
      'Clears clogged drains and verifies flow.',
      75,
      9900,
      'USD',
      JSON.stringify(['drain', 'clog', 'slow drain', 'backup']),
      'CUSTOMER',
      true,
      JSON.stringify([{ resource_type: 'plumber', quantity: 1, capability: 'drain_cleaning' }]),
      JSON.stringify(['issue_description']),
    );
    await insertService(
      'svc_leak_diagnosis',
      'biz_blue_pipe',
      'Leak Diagnosis',
      'Locates and assesses plumbing leaks.',
      90,
      11900,
      'USD',
      JSON.stringify(['leak', 'water damage', 'pipe leak', 'emergency leak']),
      'CUSTOMER',
      true,
      JSON.stringify([{ resource_type: 'plumber', quantity: 1, capability: 'leak_diagnosis' }]),
      JSON.stringify(['issue_description']),
    );
    await insertService(
      'svc_water_heater',
      'biz_blue_pipe',
      'Water Heater Service',
      'Inspects or services water heater units.',
      120,
      15900,
      'USD',
      JSON.stringify(['water heater', 'no hot water', 'tankless']),
      'CUSTOMER',
      true,
      JSON.stringify([{ resource_type: 'plumber', quantity: 1, capability: 'water_heater_service' }]),
      JSON.stringify(['issue_description']),
    );
    await insertResource(
      'res_plumber_ana',
      'biz_blue_pipe',
      'Ana Ruiz',
      'plumber',
      JSON.stringify(['drain_cleaning', 'leak_diagnosis', 'water_heater_service']),
      JSON.stringify(WEEKDAY_FIELD),
      true,
    );
    await insertResource(
      'res_plumber_dev',
      'biz_blue_pipe',
      'Dev Singh',
      'plumber',
      JSON.stringify(['drain_cleaning', 'leak_diagnosis']),
      JSON.stringify(WEEKDAY_FIELD),
      true,
    );

    // --- Northline Salon ---
    await insertBusiness(
      'biz_northline_salon',
      'northline-salon',
      'Northline Salon',
      'America/Chicago',
      'BUSINESS_LOCATION',
      JSON.stringify(SALON_HOURS),
      JSON.stringify({
        line1: '501 Northline Blvd',
        city: 'Austin',
        region: 'TX',
        postal_code: '78756',
      }),
    );
    await insertService(
      'svc_haircut',
      'biz_northline_salon',
      'Haircut',
      'Standard haircut service at the salon.',
      45,
      4500,
      'USD',
      JSON.stringify(['haircut', 'trim', 'cut', 'barber', 'salon']),
      'BUSINESS',
      false,
      JSON.stringify([{ resource_type: 'stylist', quantity: 1, capability: 'haircut' }]),
      JSON.stringify([]),
    );
    await insertService(
      'svc_color',
      'biz_northline_salon',
      'Color Service',
      'Single-process color treatment.',
      120,
      12500,
      'USD',
      JSON.stringify(['color', 'dye', 'highlights', 'salon color']),
      'BUSINESS',
      false,
      JSON.stringify([{ resource_type: 'stylist', quantity: 1, capability: 'hair_color' }]),
      JSON.stringify([]),
    );
    await insertService(
      'svc_massage',
      'biz_northline_salon',
      'Massage',
      '60-minute massage in a treatment room.',
      60,
      9000,
      'USD',
      JSON.stringify(['massage', 'spa', 'relaxation']),
      'BUSINESS',
      false,
      JSON.stringify([
        { resource_type: 'therapist', quantity: 1, capability: 'massage' },
        { resource_type: 'treatment_room', quantity: 1 },
      ]),
      JSON.stringify([]),
    );
    await insertResource(
      'res_stylist_sarah',
      'biz_northline_salon',
      'Sarah Kim',
      'stylist',
      JSON.stringify(['haircut', 'hair_color']),
      JSON.stringify(SALON_HOURS),
      true,
    );
    await insertResource(
      'res_stylist_leo',
      'biz_northline_salon',
      'Leo Martin',
      'stylist',
      JSON.stringify(['haircut']),
      JSON.stringify(SALON_HOURS),
      true,
    );
    await insertResource(
      'res_therapist_nina',
      'biz_northline_salon',
      'Nina Ortiz',
      'therapist',
      JSON.stringify(['massage']),
      JSON.stringify(SALON_HOURS),
      true,
    );
    await insertResource(
      'res_room_a',
      'biz_northline_salon',
      'Treatment Room A',
      'treatment_room',
      JSON.stringify([]),
      JSON.stringify(SALON_HOURS),
      false,
    );
    await insertResource(
      'res_room_b',
      'biz_northline_salon',
      'Treatment Room B',
      'treatment_room',
      JSON.stringify([]),
      JSON.stringify(SALON_HOURS),
      false,
    );

    // --- Harbor Physical Therapy ---
    await insertBusiness(
      'biz_harbor_pt',
      'harbor-physical-therapy',
      'Harbor Physical Therapy',
      'America/Chicago',
      'BUSINESS_LOCATION',
      JSON.stringify(CLINIC_HOURS),
      JSON.stringify({
        line1: '300 Harbor Clinic Dr',
        city: 'Austin',
        region: 'TX',
        postal_code: '78731',
      }),
    );
    await insertService(
      'svc_pt_eval',
      'biz_harbor_pt',
      'Physical Therapy Evaluation',
      'Initial PT evaluation in a treatment room.',
      60,
      11000,
      'USD',
      JSON.stringify(['physical therapy', 'PT eval', 'evaluation', 'injury']),
      'BUSINESS',
      false,
      JSON.stringify([
        { resource_type: 'therapist', quantity: 1, capability: 'physical_therapy_eval' },
        { resource_type: 'treatment_room', quantity: 1 },
      ]),
      JSON.stringify(['issue_description']),
    );
    await insertService(
      'svc_chiro_followup',
      'biz_harbor_pt',
      'Chiropractic Follow-Up',
      'Follow-up chiropractic session.',
      30,
      6500,
      'USD',
      JSON.stringify(['chiropractic', 'follow-up', 'adjustment']),
      'BUSINESS',
      false,
      JSON.stringify([
        { resource_type: 'therapist', quantity: 1, capability: 'chiropractic_followup' },
        { resource_type: 'treatment_room', quantity: 1 },
      ]),
      JSON.stringify([]),
    );
    await insertService(
      'svc_wellness_consult',
      'biz_harbor_pt',
      'Wellness Consultation',
      'General wellness consultation.',
      45,
      7500,
      'USD',
      JSON.stringify(['wellness', 'consultation', 'health coaching']),
      'BUSINESS',
      false,
      JSON.stringify([
        { resource_type: 'therapist', quantity: 1, capability: 'wellness_consultation' },
        { resource_type: 'treatment_room', quantity: 1 },
      ]),
      JSON.stringify([]),
    );
    await insertResource(
      'res_pt_elena',
      'biz_harbor_pt',
      'Elena Brooks',
      'therapist',
      JSON.stringify(['physical_therapy_eval', 'wellness_consultation']),
      JSON.stringify(CLINIC_HOURS),
      true,
    );
    await insertResource(
      'res_pt_marcus',
      'biz_harbor_pt',
      'Marcus Chen',
      'therapist',
      JSON.stringify(['chiropractic_followup', 'wellness_consultation']),
      JSON.stringify(CLINIC_HOURS),
      true,
    );
    await insertResource(
      'res_clinic_room_1',
      'biz_harbor_pt',
      'Clinic Room 1',
      'treatment_room',
      JSON.stringify([]),
      JSON.stringify(CLINIC_HOURS),
      false,
    );
    await insertResource(
      'res_clinic_room_2',
      'biz_harbor_pt',
      'Clinic Room 2',
      'treatment_room',
      JSON.stringify([]),
      JSON.stringify(CLINIC_HOURS),
      false,
    );

    // --- Mesa Auto Service ---
    await insertBusiness(
      'biz_mesa_auto',
      'mesa-auto-service',
      'Mesa Auto Service',
      'America/Chicago',
      'BUSINESS_LOCATION',
      JSON.stringify(AUTO_HOURS),
      JSON.stringify({
        line1: '900 Mesa Motor Ln',
        city: 'Austin',
        region: 'TX',
        postal_code: '78745',
      }),
    );
    await insertService(
      'svc_oil_change',
      'biz_mesa_auto',
      'Oil Change',
      'Standard oil and filter change.',
      45,
      6999,
      'USD',
      JSON.stringify(['oil change', 'maintenance', 'lube']),
      'BUSINESS',
      false,
      JSON.stringify([
        { resource_type: 'automotive_technician', quantity: 1, capability: 'oil_change' },
        { resource_type: 'service_bay', quantity: 1 },
      ]),
      JSON.stringify([]),
    );
    await insertService(
      'svc_brake_inspection',
      'biz_mesa_auto',
      'Brake Inspection',
      'Brake system inspection and report.',
      60,
      8900,
      'USD',
      JSON.stringify(['brake', 'inspection', 'safety']),
      'BUSINESS',
      false,
      JSON.stringify([
        { resource_type: 'automotive_technician', quantity: 1, capability: 'brake_service' },
        { resource_type: 'service_bay', quantity: 1 },
      ]),
      JSON.stringify([]),
    );
    await insertService(
      'svc_battery_replacement',
      'biz_mesa_auto',
      'Battery Replacement',
      'Battery test and replacement service.',
      30,
      14999,
      'USD',
      JSON.stringify(['battery', 'dead battery', 'no start']),
      'BUSINESS',
      false,
      JSON.stringify([
        { resource_type: 'automotive_technician', quantity: 1, capability: 'battery_service' },
        { resource_type: 'service_bay', quantity: 1 },
      ]),
      JSON.stringify([]),
    );
    await insertResource(
      'res_auto_maria',
      'biz_mesa_auto',
      'Maria Vega',
      'automotive_technician',
      JSON.stringify(['oil_change', 'brake_service', 'battery_service']),
      JSON.stringify(AUTO_HOURS),
      true,
    );
    await insertResource(
      'res_auto_tom',
      'biz_mesa_auto',
      'Tom Reed',
      'automotive_technician',
      JSON.stringify(['oil_change', 'battery_service']),
      JSON.stringify(AUTO_HOURS),
      true,
    );
    await insertResource(
      'res_bay_1',
      'biz_mesa_auto',
      'Service Bay 1',
      'service_bay',
      JSON.stringify([]),
      JSON.stringify(AUTO_HOURS),
      false,
    );
    await insertResource(
      'res_bay_2',
      'biz_mesa_auto',
      'Service Bay 2',
      'service_bay',
      JSON.stringify([]),
      JSON.stringify(AUTO_HOURS),
      false,
    );
    await insertAppointment(
      'appt_seed_auto_1',
      'biz_mesa_auto',
      'svc_brake_inspection',
      'confirmed',
      '2026-08-29T15:00:00.000Z',
      '2026-08-29T16:00:00.000Z',
      'Chris Nguyen',
      'chris@example.com',
      null,
      null,
      null,
      8900,
      'USD',
      'seed-auto-1',
      new Date().toISOString(),
      new Date().toISOString(),
    );
    await insertApptResource('appt_seed_auto_1', 'res_auto_maria', 'automotive_technician');
    await insertApptResource('appt_seed_auto_1', 'res_bay_1', 'service_bay');

    return { seeded: true };
  });
}

export async function restoreSeedConflictAppointments() {
  await query(
    `INSERT INTO appointments (
      id, business_id, service_id, status, starts_at, ends_at,
      customer_name, customer_email, customer_phone, service_address_json, notes_json,
      price_cents, currency, idempotency_key, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14, $15::timestamptz, $16::timestamptz)
    ON CONFLICT (id) DO NOTHING`,
    [
      'appt_seed_hvac_1',
      'biz_acme_hvac',
      'svc_preventive',
      'confirmed',
      '2026-08-26T15:00:00.000Z',
      '2026-08-26T16:00:00.000Z',
      'Pat Lee',
      'pat@example.com',
      '512-555-0101',
      JSON.stringify({ line1: '45 Oak St', city: 'Austin', region: 'TX', postal_code: '78704' }),
      null,
      7900,
      'USD',
      'seed-hvac-1',
      new Date().toISOString(),
      new Date().toISOString(),
    ],
  );
  await query(
    `INSERT INTO appointment_resources (appointment_id, resource_id, resource_type) VALUES ($1, $2, $3)
     ON CONFLICT (appointment_id, resource_id) DO NOTHING`,
    ['appt_seed_hvac_1', 'res_hvac_james', 'hvac_technician'],
  );

  await query(
    `INSERT INTO appointments (
      id, business_id, service_id, status, starts_at, ends_at,
      customer_name, customer_email, customer_phone, service_address_json, notes_json,
      price_cents, currency, idempotency_key, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14, $15::timestamptz, $16::timestamptz)
    ON CONFLICT (id) DO NOTHING`,
    [
      'appt_seed_auto_1',
      'biz_mesa_auto',
      'svc_brake_inspection',
      'confirmed',
      '2026-08-29T15:00:00.000Z',
      '2026-08-29T16:00:00.000Z',
      'Chris Nguyen',
      'chris@example.com',
      null,
      null,
      null,
      8900,
      'USD',
      'seed-auto-1',
      new Date().toISOString(),
      new Date().toISOString(),
    ],
  );
  await query(
    `INSERT INTO appointment_resources (appointment_id, resource_id, resource_type) VALUES ($1, $2, $3)
     ON CONFLICT (appointment_id, resource_id) DO NOTHING`,
    ['appt_seed_auto_1', 'res_auto_maria', 'automotive_technician'],
  );
  await query(
    `INSERT INTO appointment_resources (appointment_id, resource_id, resource_type) VALUES ($1, $2, $3)
     ON CONFLICT (appointment_id, resource_id) DO NOTHING`,
    ['appt_seed_auto_1', 'res_bay_1', 'service_bay'],
  );
}

export async function resetDemoMutableState() {
  await runInTransaction(async () => {
    await query('DELETE FROM appointment_resources');
    await query('DELETE FROM appointments');
    await query('DELETE FROM slot_tokens');
    await query('DELETE FROM idempotency_records');
    await restoreSeedConflictAppointments();
  });
  return { reset: true };
}
