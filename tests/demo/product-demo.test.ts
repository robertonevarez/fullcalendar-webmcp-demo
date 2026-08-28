import { describe, expect, it } from 'vitest';
import { AppError, ErrorCodes } from '@/domain/errors';
import { DemoBookingEngine, emptyConversationState } from '@/demo/engine';
import { processDemoTurn, processDemoTurnSafe } from '@/demo/conversation';
import { parseCustomerIntent, parseSpokenTime } from '@/demo/intent';
import { cloneDemoConfig, normalizeDemoConfig } from '@/demo/normalize';
import {
  DEFAULT_PRESET_ID,
  DEMO_PRESETS,
  getDemoPreset,
  getDefaultPreset,
} from '@/demo/presets';
import { addDaysToDateString, formatPriceCents } from '@/demo/format';
import { formatDateInZone } from '@/lib/time';

function nextOpenDay(days: number[] = [1, 2, 3, 4, 5], timeZone = 'America/Chicago'): string {
  const today = formatDateInZone(new Date(), timeZone);
  for (let i = 1; i <= 14; i += 1) {
    const date = addDaysToDateString(today, i);
    const [y, m, d] = date.split('-').map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
    if (days.includes(weekday)) return date;
  }
  return addDaysToDateString(today, 1);
}

describe('demo presets', () => {
  it('ships three curated presets with Acme as default', () => {
    expect(DEMO_PRESETS).toHaveLength(3);
    expect(DEFAULT_PRESET_ID).toBe('acme-hvac');
    expect(getDefaultPreset().id).toBe('acme-hvac');
    expect(getDefaultPreset().config.businessName).toBe('Acme Heating & Air');
    expect(getDefaultPreset().config.archetype).toBe('field_service');
    expect(getDefaultPreset().customerPrompt).toBe("my ac is blowing warm air, can you check what's up?");
  });

  it('normalizes each archetype into domain objects', () => {
    const acme = normalizeDemoConfig(getDemoPreset('acme-hvac').config);
    expect(acme.services[0].service_area_required).toBe(true);
    expect(acme.resources[0].resource_type).toBe('staff');

    const salon = normalizeDemoConfig(getDemoPreset('northline-salon').config);
    expect(salon.services[0].service_area_required).toBe(false);
    expect(salon.resources[0].resource_type).toBe('stylist');

    const auto = normalizeDemoConfig(getDemoPreset('mesa-auto').config);
    expect(auto.services[0].resource_requirements).toHaveLength(2);
    expect(auto.resources.some((r) => r.resource_type === 'service_bay')).toBe(true);
  });

  it('cloneDemoConfig isolates mutable copies', () => {
    const a = cloneDemoConfig(getDefaultPreset().config);
    const b = cloneDemoConfig(getDefaultPreset().config);
    a.businessName = 'Changed';
    expect(b.businessName).toBe('Acme Heating & Air');
  });
});

describe('demo isolation', () => {
  it('keeps two demo engines from sharing appointment state', () => {
    const config = getDefaultPreset().config;
    const engineA = new DemoBookingEngine(config);
    const engineB = new DemoBookingEngine(config);
    const day = nextOpenDay(config.availability.days);

    const slotsA = engineA.findSlots([], {
      service_id: config.services[0].id,
      start_date: day,
      end_date: day,
      postal_code: '78701',
      time_preference: 'after 4 pm',
      limit: 2,
    });

    const booked = engineA.createAppointment({
      appointments: [],
      service_id: slotsA[0].service_id,
      slot: slotsA[0],
      postal_code: '78701',
      customer: { name: 'A', service_address: { line1: 'x', city: 'Austin', region: 'TX', postal_code: '78701' } },
    });

    expect(booked.appointments).toHaveLength(1);

    const slotsB = engineB.findSlots([], {
      service_id: config.services[0].id,
      start_date: day,
      end_date: day,
      postal_code: '78701',
      time_preference: 'after 4 pm',
      limit: 2,
    });

    expect(slotsB.some((s) => s.slot_id === slotsA[0].slot_id)).toBe(true);
  });

  it('does not leak appointments when switching preset configs', () => {
    const acme = getDemoPreset('acme-hvac').config;
    const salon = getDemoPreset('northline-salon').config;
    const acmeDay = nextOpenDay(acme.availability.days);
    const salonDay = nextOpenDay(salon.availability.days);

    const acmeEngine = new DemoBookingEngine(acme);
    const slots = acmeEngine.findSlots([], {
      service_id: acme.services[0].id,
      start_date: acmeDay,
      end_date: acmeDay,
      postal_code: '78701',
      limit: 1,
    });
    const { appointments } = acmeEngine.createAppointment({
      appointments: [],
      service_id: slots[0].service_id,
      slot: slots[0],
      postal_code: '78701',
      customer: { name: 'A' },
    });
    expect(appointments).toHaveLength(1);

    const salonEngine = new DemoBookingEngine(salon);
    const salonSlots = salonEngine.findSlots([], {
      service_id: salon.services[0].id,
      start_date: salonDay,
      end_date: salonDay,
      time_preference: 'morning',
      limit: 2,
    });
    expect(salonSlots.length).toBeGreaterThan(0);
  });
});

describe('demo scheduling reuse', () => {
  it('matches AC diagnostic from natural language search terms', () => {
    const engine = new DemoBookingEngine(getDefaultPreset().config);
    const results = engine.search('AC cooling upstairs');
    expect(results[0]?.name).toBe('AC Diagnostic Visit');
  });

  it('enforces service area using real domain check', () => {
    const config = getDefaultPreset().config;
    const engine = new DemoBookingEngine(config);
    expect(() => engine.assertServiceArea(config.services[0].id, '90210')).toThrow(
      expect.objectContaining({ code: ErrorCodes.OUTSIDE_SERVICE_AREA }),
    );
    expect(engine.assertServiceArea(config.services[0].id, '78701').status).toBe('eligible');
  });

  it('generates salon availability without postal code', () => {
    const config = getDemoPreset('northline-salon').config;
    const engine = new DemoBookingEngine(config);
    const day = nextOpenDay(config.availability.days);
    const slots = engine.findSlots([], {
      service_id: config.services[0].id,
      start_date: day,
      end_date: day,
      time_preference: 'morning',
      limit: 2,
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].price.amount).toBe(4500);
    expect(slots[0].resources[0].resource_type).toBe('stylist');
  });

  it('allocates technician and service bay for auto oil change', () => {
    const config = getDemoPreset('mesa-auto').config;
    const engine = new DemoBookingEngine(config);
    const day = nextOpenDay(config.availability.days);
    const slots = engine.findSlots([], {
      service_id: config.services[0].id,
      start_date: day,
      end_date: day,
      time_preference: 'morning',
      limit: 2,
    });
    expect(slots.length).toBeGreaterThan(0);
    const types = slots[0].resources.map((r) => r.resource_type).sort();
    expect(types).toEqual(['automotive_technician', 'service_bay']);
  });
});

describe('demo conversation state machine', () => {
  it('starts with a conversational suggestion and no business tools', () => {
    const config = getDefaultPreset().config;
    const result = processDemoTurn({
      config,
      conversation: emptyConversationState(),
      message: "my ac is blowing warm air, can you check what's up?",
    });

    expect(result.conversation.phase).toBe('awaiting_service_confirmation');
    expect(result.conversation.appointments).toHaveLength(0);
    expect(result.activity).toEqual([]);
    expect(result.reply).toMatch(/technician should inspect/i);
    expect(result.reply).toMatch(/find someone nearby/i);
  });

  it('progressively gathers location, groups business reads, and gates booking', () => {
    const config = getDefaultPreset().config;
    const started = processDemoTurn({
      config,
      conversation: emptyConversationState(),
      message: getDefaultPreset().customerPrompt,
    });
    const consent = processDemoTurn({ config, conversation: started.conversation, message: 'yeah please' });
    expect(consent.conversation.phase).toBe('awaiting_location');
    expect(consent.reply).toBe("What's your ZIP code?");
    expect(consent.activity).toEqual([]);

    const discovered = processDemoTurn({ config, conversation: consent.conversation, message: '78701' });
    expect(discovered.conversation.phase).toBe('awaiting_availability_permission');
    expect(discovered.activity.map((step) => step.tool)).toEqual(['search_services', 'check_service_area']);
    expect(discovered.reply).toMatch(/AC Diagnostic Visit is \$89\.00/);
    expect(discovered.reply).toMatch(/90 minutes/);
    expect(discovered.conversation.pendingService?.service_id).toBe(config.services[0].id);

    const availability = processDemoTurn({ config, conversation: discovered.conversation, message: 'sounds good' });
    expect(availability.conversation.phase).toBe('awaiting_slot_choice');
    expect(availability.activity.map((step) => step.tool)).toEqual(['get_availability']);
    expect(availability.conversation.pendingOffer?.slots.length).toBeGreaterThan(0);
    expect(availability.reply).toMatch(/Which works best/);

    const selected = processDemoTurn({ config, conversation: availability.conversation, message: '4:30 works' });
    expect(selected.conversation.phase).toBe('awaiting_booking_confirmation');
    expect(selected.conversation.appointments).toHaveLength(0);
    expect(selected.activity).toEqual([]);
    expect(selected.reply).toMatch(/4:30 PM works/);
    expect(selected.reply).toMatch(/book it/i);

    const confirmed = processDemoTurn({ config, conversation: selected.conversation, message: 'yes please' });
    expect(confirmed.conversation.phase).toBe('booked');
    expect(confirmed.conversation.appointments).toHaveLength(1);
    expect(confirmed.businessNotice?.notification_email).toBe('hello@acme.example');
    expect(confirmed.businessNotice?.headline).toBe('Appointment received');
    expect(confirmed.activity.map((step) => step.tool)).toEqual(['create_appointment']);
    expect(confirmed.activity[0]?.result?.service_id).toBe(config.services[0].id);
    expect(confirmed.activity[0]?.result?.when_label).toBeTruthy();
    expect(confirmed.reply).toMatch(/You're booked with Acme Heating & Air/);
  });

  it.each(['yes', 'yeah', 'sure', 'please', 'do it', 'yeah please', 'sounds good'])('recognizes the affirmation "%s"', (message) => {
    const config = getDefaultPreset().config;
    const started = processDemoTurn({ config, conversation: emptyConversationState(), message: getDefaultPreset().customerPrompt });
    const result = processDemoTurn({ config, conversation: started.conversation, message });
    expect(result.conversation.phase).toBe('awaiting_location');
  });

  it('supports change of mind before booking without writing', () => {
    const config = getDefaultPreset().config;
    const started = processDemoTurn({ config, conversation: emptyConversationState(), message: getDefaultPreset().customerPrompt });
    const consent = processDemoTurn({ config, conversation: started.conversation, message: 'yes' });
    const discovered = processDemoTurn({ config, conversation: consent.conversation, message: '78701' });
    const availability = processDemoTurn({ config, conversation: discovered.conversation, message: 'sure' });
    const canceled = processDemoTurn({ config, conversation: availability.conversation, message: 'Never mind.' });

    expect(canceled.conversation.phase).toBe('idle');
    expect(canceled.conversation.pendingOffer).toBeNull();
    expect(canceled.conversation.appointments).toHaveLength(0);
    expect(canceled.activity).toEqual([]);
  });

  it('supports weekday corrections and ordinal slot choices', () => {
    const config = getDefaultPreset().config;
    const started = processDemoTurn({ config, conversation: emptyConversationState(), message: getDefaultPreset().customerPrompt });
    const consent = processDemoTurn({ config, conversation: started.conversation, message: 'yeah' });
    const discovered = processDemoTurn({ config, conversation: consent.conversation, message: '78701' });
    const availability = processDemoTurn({ config, conversation: discovered.conversation, message: 'sure' });
    const corrected = processDemoTurn({ config, conversation: availability.conversation, message: 'Actually, morning would be better.' });
    expect(corrected.conversation.phase).toBe('awaiting_slot_choice');
    expect(corrected.activity.map((step) => step.tool)).toEqual(['get_availability']);

    const selected = processDemoTurn({ config, conversation: corrected.conversation, message: 'the last one' });
    expect(selected.conversation.phase).toBe('awaiting_booking_confirmation');
    expect(selected.conversation.selectedSlotId).toBeTruthy();
  });

  it('returns outside-area truth and stops before availability', () => {
    const config = getDefaultPreset().config;
    const started = processDemoTurn({ config, conversation: emptyConversationState(), message: getDefaultPreset().customerPrompt });
    const consent = processDemoTurn({ config, conversation: started.conversation, message: 'yes' });
    const result = processDemoTurnSafe({ config, conversation: consent.conversation, message: '90210' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCodes.OUTSIDE_SERVICE_AREA);
      expect(result.reply).toMatch(/Acme Heating & Air doesn't serve 90210/);
      expect(result.activity.map((step) => step.tool)).toEqual(['search_services', 'check_service_area']);
      expect(result.activity.find((step) => step.tool === 'check_service_area')?.result?.eligible).toBe(false);
      expect(result.activity.some((step) => step.tool === 'get_availability')).toBe(false);
    }
  });

  it('does not require a ZIP for salon appointments', () => {
    const preset = getDemoPreset('northline-salon');
    const offered = processDemoTurn({
      config: preset.config,
      conversation: emptyConversationState(),
      message: preset.customerPrompt,
    });
    expect(offered.conversation.phase).toBe('awaiting_slot_choice');
    expect(offered.activity.map((step) => step.tool)).toEqual(['search_services', 'get_availability']);
    expect(offered.activity.some((step) => step.tool === 'check_service_area')).toBe(false);

    const selected = processDemoTurn({ config: preset.config, conversation: offered.conversation, message: 'the first one' });
    expect(selected.conversation.phase).toBe('awaiting_booking_confirmation');
    expect(selected.conversation.appointments).toHaveLength(0);
    const confirmed = processDemoTurn({ config: preset.config, conversation: selected.conversation, message: 'yes' });
    expect(confirmed.conversation.phase).toBe('booked');
  });

  it('guides ambiguous salon and auto problems before accessing either website', () => {
    const salon = getDemoPreset('northline-salon').config;
    const salonStart = processDemoTurn({
      config: salon,
      conversation: emptyConversationState(),
      message: 'My hair is getting way too long.',
    });
    expect(salonStart.activity).toEqual([]);
    const salonConsent = processDemoTurn({ config: salon, conversation: salonStart.conversation, message: 'yeah' });
    expect(salonConsent.activity.map((step) => step.tool)).toEqual(['search_services']);
    expect(salonConsent.conversation.phase).toBe('awaiting_availability_permission');

    const auto = getDemoPreset('mesa-auto').config;
    const autoStart = processDemoTurn({
      config: auto,
      conversation: emptyConversationState(),
      message: 'My car is due for an oil change.',
    });
    expect(autoStart.activity).toEqual([]);
    const autoConsent = processDemoTurn({ config: auto, conversation: autoStart.conversation, message: 'sure' });
    expect(autoConsent.activity.map((step) => step.tool)).toEqual(['search_services']);
    expect(autoConsent.conversation.phase).toBe('awaiting_availability_permission');
  });

  it('keeps auto service functional with its configured service', () => {
    const preset = getDemoPreset('mesa-auto');
    const offered = processDemoTurn({
      config: preset.config,
      conversation: emptyConversationState(),
      message: 'My car is due for an oil change. What times do you have?',
    });
    expect(offered.activity.map((step) => step.tool)).toEqual(['search_services', 'get_availability']);
    expect(offered.activity[0]?.result?.service_name).toBe('Oil Change');
    const selected = processDemoTurn({ config: preset.config, conversation: offered.conversation, message: 'the last one' });
    const confirmed = processDemoTurn({ config: preset.config, conversation: selected.conversation, message: 'book it' });
    expect(confirmed.conversation.phase).toBe('booked');
    expect(confirmed.conversation.appointments[0]?.resource_allocations).toHaveLength(2);
  });

  it('does not invent a service when the problem does not match', () => {
    const config = getDefaultPreset().config;
    const started = processDemoTurn({ config, conversation: emptyConversationState(), message: 'My pool is green and needs cleaning.' });
    const consent = processDemoTurn({ config, conversation: started.conversation, message: 'yes' });
    const result = processDemoTurnSafe({
      config,
      conversation: consent.conversation,
      message: '78701',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCodes.SERVICE_NOT_FOUND);
      expect(result.activity.map((step) => step.tool)).toEqual(['search_services']);
      expect(result.reply).toMatch(/couldn't find a service/i);
    }
  });

  it('reports no availability without inventing slots', () => {
    const config = cloneDemoConfig(getDefaultPreset().config);
    config.availability = { days: [1, 2, 3, 4, 5], open: '08:00', close: '09:00' };
    const result = processDemoTurnSafe({
      config,
      conversation: emptyConversationState(),
      message: "I need an AC check tomorrow after 4. I'm in 78701.",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ErrorCodes.NO_AVAILABILITY);
      expect(result.reply).toMatch(/don't have anything available/i);
      expect(result.activity.map((step) => step.tool)).toEqual(['search_services', 'check_service_area', 'get_availability']);
      expect(result.activity.find((step) => step.tool === 'get_availability')?.result?.slot_labels).toEqual([]);
    }
  });

  it('reset-equivalent empty conversation clears every pending interaction value', () => {
    const reset = emptyConversationState();
    expect(reset.appointments).toHaveLength(0);
    expect(reset.pendingOffer).toBeNull();
    expect(reset.pendingService).toBeNull();
    expect(reset.serviceQuery).toBeNull();
    expect(reset.selectedSlotId).toBeNull();
    expect(reset.phase).toBe('idle');
  });
});

describe('demo intent parsing', () => {
  it('parses postal code, after-4 preference, and tomorrow', () => {
    const intent = parseCustomerIntent("I need an AC check tomorrow after 4. I'm in 78701.", {
      timeZone: 'America/Chicago',
      workingHours: normalizeDemoConfig(getDefaultPreset().config).business.working_hours,
    });
    expect(intent.postalCode).toBe('78701');
    expect(intent.timePreference?.toLowerCase()).toMatch(/after/);
  });

  it('parses spoken confirmation times', () => {
    expect(parseSpokenTime('4:30 works')).toBe('16:30');
    expect(parseSpokenTime('book 6:00 pm')).toBe('18:00');
  });
});

describe('demo format helpers', () => {
  it('formats configured prices', () => {
    expect(formatPriceCents(8900)).toBe('$89.00');
  });
});

describe('demo config validation', () => {
  it('rejects invalid configuration', () => {
    const bad = cloneDemoConfig(getDefaultPreset().config);
    bad.businessName = '';
    expect(() => normalizeDemoConfig(bad)).toThrow(AppError);
  });
});
