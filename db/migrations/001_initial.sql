-- Protocol Tooling initial schema (PlanetScale Postgres / Postgres 15+)
-- Applied via: npm run db:migrate

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  timezone TEXT NOT NULL,
  location_mode TEXT NOT NULL,
  working_hours_json JSONB NOT NULL,
  address_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  keywords_json JSONB NOT NULL,
  location_policy TEXT NOT NULL,
  service_area_required BOOLEAN NOT NULL,
  resource_requirements_json JSONB NOT NULL,
  intake_fields_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  capabilities_json JSONB NOT NULL,
  working_hours_json JSONB NOT NULL,
  is_human BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS service_area_zones (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  zone_id TEXT NOT NULL,
  postal_codes_json JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS blocked_times (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL REFERENCES resources(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  status TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  service_address_json JSONB,
  notes_json JSONB,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS appointment_resources (
  appointment_id TEXT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL REFERENCES resources(id),
  resource_type TEXT NOT NULL,
  PRIMARY KEY (appointment_id, resource_id)
);

CREATE TABLE IF NOT EXISTS slot_tokens (
  slot_id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  service_id TEXT NOT NULL REFERENCES services(id),
  payload_json JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS idempotency_records (
  scope_key TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  response_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_services_business ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_resources_business ON resources(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_business ON appointments(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_time ON appointments(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status_time ON appointments(business_id, status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_appointment_resources_resource ON appointment_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_slot_tokens_business ON slot_tokens(business_id);
CREATE INDEX IF NOT EXISTS idx_blocked_times_resource ON blocked_times(resource_id, starts_at, ends_at);
