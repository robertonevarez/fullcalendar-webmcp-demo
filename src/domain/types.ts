export type LocationMode = 'CUSTOMER_LOCATION' | 'BUSINESS_LOCATION' | 'EITHER';
export type LocationPolicy = 'CUSTOMER' | 'BUSINESS' | 'NONE';
export type AppointmentStatus = 'confirmed' | 'cancelled';

export interface WorkingHours {
  /** 0=Sunday … 6=Saturday */
  day: number;
  open: string; // HH:mm
  close: string; // HH:mm
}

export interface BusinessAddress {
  line1: string;
  city: string;
  region: string;
  postal_code: string;
}

export interface Business {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  location_mode: LocationMode;
  working_hours: WorkingHours[];
  address: BusinessAddress;
}

export interface ResourceRequirement {
  resource_type: string;
  quantity: number;
  capability?: string;
  preferred_resource_id?: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  keywords: string[];
  location_policy: LocationPolicy;
  service_area_required: boolean;
  resource_requirements: ResourceRequirement[];
  intake_fields: string[];
}

export interface Resource {
  id: string;
  business_id: string;
  name: string;
  resource_type: string;
  capabilities: string[];
  working_hours: WorkingHours[];
  is_human: boolean;
}

export interface BlockedTime {
  id: string;
  resource_id: string;
  starts_at: string;
  ends_at: string;
  reason?: string;
}

export interface ServiceAreaZone {
  id: string;
  business_id: string;
  zone_id: string;
  postal_codes: string[];
}

export interface CustomerInput {
  name: string;
  email?: string;
  phone?: string;
  service_address?: BusinessAddress;
}

export interface AppointmentNotes {
  description?: string;
  location_detail?: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  service_id: string;
  status: AppointmentStatus;
  starts_at: string;
  ends_at: string;
  customer: CustomerInput;
  notes?: AppointmentNotes;
  price_cents: number;
  currency: string;
  idempotency_key?: string;
  resource_allocations: SlotResourceAllocation[];
}

export interface SlotResourceAllocation {
  resource_id: string;
  resource_type: string;
  resource_name?: string;
}

export interface AvailabilitySlot {
  slot_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  resources: SlotResourceAllocation[];
  price: { amount: number; currency: string };
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface AvailabilityQuery {
  service_id: string;
  start_date: string;
  end_date: string;
  postal_code?: string;
  time_preference?: string;
  preferred_resource_id?: string;
  limit?: number;
}

export interface ServiceSearchResult {
  service_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
  score: number;
}
