import type { Appointment, AvailabilitySlot } from '@/domain/types';

export type DemoArchetype = 'field_service' | 'salon' | 'auto';

/** Simplified business setup — preset-driven, not free-form editable in the UI. */
export interface DemoServiceInput {
  id: string;
  name: string;
  duration_minutes: number;
  /** Dollars, e.g. 89 for $89 */
  price_dollars: number;
}

export interface DemoAvailabilityInput {
  /** 0=Sun … 6=Sat — demo default is Mon–Fri */
  days: number[];
  open: string; // HH:mm
  close: string; // HH:mm
}

export interface DemoConfig {
  archetype: DemoArchetype;
  businessName: string;
  /** Optional display location for the human-facing demo website. */
  locationLabel?: string;
  services: DemoServiceInput[];
  staff: string[];
  /** Non-human resources (service bays, rooms) for compound booking presets */
  facilities?: string[];
  availability: DemoAvailabilityInput;
  postalCodes: string[];
  notificationEmail: string;
  timezone: string;
}

export interface DemoPendingOffer {
  service_id: string;
  service_name: string;
  price_cents: number;
  currency: string;
  postal_code?: string;
  time_preference?: string;
  start_date: string;
  end_date: string;
  slots: AvailabilitySlot[];
}

export interface DemoPublicAppointment {
  appointment_id: string;
  service_name: string;
  starts_at: string;
  ends_at: string;
  price_cents: number;
  currency: string;
  provider_name?: string;
  postal_code?: string;
}

export interface DemoPendingService {
  service_id: string;
  service_name: string;
  price_cents: number;
  currency: string;
  postal_code?: string;
}

export type DemoConversationPhase =
  | 'idle'
  | 'awaiting_service_confirmation'
  | 'awaiting_location'
  | 'awaiting_availability_permission'
  | 'awaiting_slot_choice'
  | 'awaiting_booking_confirmation'
  | 'booked';

export interface DemoConversationState {
  phase: DemoConversationPhase;
  appointments: Appointment[];
  serviceQuery: string | null;
  pendingService: DemoPendingService | null;
  pendingOffer: DemoPendingOffer | null;
  selectedSlotId: string | null;
  lastBooking: DemoPublicAppointment | null;
}

export interface DemoTurnRequest {
  config: DemoConfig;
  conversation: DemoConversationState;
  message: string;
}

/** Concise live-ops step from real demo orchestration (not a fake tool trace). */
export type DemoActivityTarget =
  | 'services'
  | 'service_area'
  | 'availability'
  | 'booking';

export interface DemoActivityResult {
  service_id?: string;
  service_name?: string;
  price_label?: string;
  duration_minutes?: number;
  postal_code?: string;
  eligible?: boolean;
  query?: string;
  slot_labels?: string[];
  when_label?: string;
  provider_name?: string;
}

export interface DemoActivityStep {
  id: string;
  /** Plain-language capability label, e.g. "Search services" */
  label: string;
  /** Short outcome detail, e.g. "AC Diagnostic Visit" or "2 times found" */
  detail?: string;
  /** Optional WebMCP tool name shown in the agent terminal */
  tool?: string;
  /** Website region the agent is accessing for this step */
  target: DemoActivityTarget;
  /** Structured outcome for the capability layer — still from real orchestration */
  result?: DemoActivityResult;
}

export interface DemoBusinessNotice {
  headline: string;
  service_name: string;
  when_label: string;
  notification_email: string;
  provider_name?: string;
}

export interface DemoTurnResponse {
  ok: true;
  reply: string;
  conversation: DemoConversationState;
  /** Steps performed during this turn — mirrors real scheduling work. */
  activity: DemoActivityStep[];
  /** Business-side consequence after a booking (not a dashboard). */
  businessNotice: DemoBusinessNotice | null;
}

export interface DemoTurnErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
  reply: string;
  activity: DemoActivityStep[];
}
