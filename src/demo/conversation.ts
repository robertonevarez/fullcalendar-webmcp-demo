import { AppError, ErrorCodes, toErrorResponse } from '@/domain/errors';
import { DemoBookingEngine, emptyConversationState } from '@/demo/engine';
import { formatPriceCents, formatSlotTimeOnly, formatSlotWhen } from '@/demo/format';
import {
  hasScheduleWindow,
  isAffirmative,
  isAvailabilityRequest,
  isNegative,
  isScheduleCorrection,
  matchSlotBySpokenTime,
  parseCustomerIntent,
  type ParsedCustomerIntent,
} from '@/demo/intent';
import type {
  DemoActivityResult,
  DemoActivityStep,
  DemoActivityTarget,
  DemoConfig,
  DemoConversationState,
  DemoPendingOffer,
  DemoPendingService,
  DemoPublicAppointment,
  DemoTurnRequest,
  DemoTurnResponse,
} from '@/demo/types';

function activityStep(
  id: string,
  label: string,
  target: DemoActivityTarget,
  options?: {
    detail?: string;
    tool?: string;
    result?: DemoActivityResult;
  },
): DemoActivityStep {
  return {
    id,
    label,
    target,
    detail: options?.detail,
    tool: options?.tool,
    result: options?.result,
  };
}

function friendlyError(error: unknown): string {
  if (error instanceof AppError) {
    switch (error.code) {
      case ErrorCodes.OUTSIDE_SERVICE_AREA:
        return error.message.includes("doesn't serve")
          ? error.message
          : 'That location is outside this business\'s service area.';
      case ErrorCodes.LOCATION_REQUIRED:
        return "What's the ZIP code for the service address?";
      case ErrorCodes.NO_AVAILABILITY:
        return "They don't have anything available in that window. Want me to check another day?";
      case ErrorCodes.SLOT_UNAVAILABLE:
      case ErrorCodes.RESOURCE_UNAVAILABLE:
        return 'That time was just taken. I can check the latest openings.';
      case ErrorCodes.SERVICE_NOT_FOUND:
        return "I couldn't find a service there that matches that problem.";
      case ErrorCodes.VALIDATION_ERROR:
        return error.message;
      default:
        return "I couldn't complete that request. Try rephrasing, or reset the demo and start again.";
    }
  }
  return "Something unexpected happened. Reset the demo if things feel stuck.";
}

function toPublicAppointment(
  appointment: DemoConversationState['appointments'][number],
  serviceName: string,
): DemoPublicAppointment {
  const provider = appointment.resource_allocations[0];
  return {
    appointment_id: appointment.id,
    service_name: serviceName,
    starts_at: appointment.starts_at,
    ends_at: appointment.ends_at,
    price_cents: appointment.price_cents,
    currency: appointment.currency,
    provider_name: provider?.resource_name,
    postal_code: appointment.customer.service_address?.postal_code,
  };
}

function clearPending(conversation: DemoConversationState): DemoConversationState {
  return {
    ...conversation,
    phase: 'idle',
    serviceQuery: null,
    pendingService: null,
    pendingOffer: null,
    selectedSlotId: null,
  };
}

function noActivity(
  conversation: DemoConversationState,
  reply: string,
): DemoTurnResponse {
  return {
    ok: true,
    reply,
    conversation,
    activity: [],
    businessNotice: null,
  };
}

function guidedReply(config: DemoConfig): string {
  if (config.archetype === 'field_service') {
    return "If your AC is blowing warm air, a technician should inspect the compressor and coils.\n\nWant me to find someone nearby?";
  }
  if (config.archetype === 'salon') {
    return 'Sounds like you need a haircut appointment.\n\nWant me to find an open spot?';
  }
  return "Sounds like a diagnostic service visit.\n\nWant me to check when the shop can take it in?";
}

function availabilityQuestion(config: DemoConfig): string {
  if (config.archetype === 'field_service') return 'Want me to check their next openings tomorrow after 4?';
  return config.archetype === 'salon'
    ? 'Want me to check tomorrow morning?'
    : 'Want me to check tomorrow morning?';
}

function defaultAvailabilityPrompt(config: DemoConfig): string {
  return config.archetype === 'field_service' ? 'tomorrow after 4 pm' : 'tomorrow morning';
}

function requiresLocation(engine: DemoBookingEngine): boolean {
  return engine.normalized.business.location_mode === 'CUSTOMER_LOCATION';
}

function hasExplicitSchedulingIntent(message: string, intent: ParsedCustomerIntent): boolean {
  return Boolean(
    intent.postalCode ||
      hasScheduleWindow(message, intent) ||
      isAvailabilityRequest(message) ||
      /\b(book|appointment|schedule|opening|available|what time|what times)\b/i.test(message),
  );
}

function startGuidedConversation(
  conversation: DemoConversationState,
  config: DemoConfig,
  serviceQuery: string,
): DemoTurnResponse {
  return noActivity(
    {
      ...conversation,
      phase: 'awaiting_service_confirmation',
      serviceQuery,
      pendingService: null,
      pendingOffer: null,
      selectedSlotId: null,
    },
    guidedReply(config),
  );
}

function requestLocation(
  conversation: DemoConversationState,
  serviceQuery: string,
): DemoTurnResponse {
  return noActivity(
    {
      ...conversation,
      phase: 'awaiting_location',
      serviceQuery,
      pendingService: null,
      pendingOffer: null,
      selectedSlotId: null,
    },
    "What's your ZIP code?",
  );
}

function discoverService(
  engine: DemoBookingEngine,
  config: DemoConfig,
  conversation: DemoConversationState,
  serviceQuery: string,
  postalCode?: string,
): DemoTurnResponse {
  const activity: DemoActivityStep[] = [];
  const matches = engine.search(serviceQuery);

  if (!matches.length) {
    activity.push(
      activityStep('search_services', 'Search services', 'services', {
        detail: 'No match',
        tool: 'search_services',
        result: { query: serviceQuery },
      }),
    );
    throw Object.assign(
      new AppError(
        ErrorCodes.SERVICE_NOT_FOUND,
        'No matching service is configured for this business.',
        false,
      ),
      { activity },
    );
  }

  const service = engine.getService(matches[0].service_id);
  activity.push(
    activityStep('search_services', 'Search services', 'services', {
      detail: service.name,
      tool: 'search_services',
      result: {
        service_id: service.id,
        query: serviceQuery.trim() || 'AC diagnostic',
        service_name: service.name,
        price_label: formatPriceCents(service.price_cents, service.currency),
        duration_minutes: service.duration_minutes,
      },
    }),
  );

  if (service.service_area_required) {
    if (!postalCode) {
      throw Object.assign(
        new AppError(ErrorCodes.LOCATION_REQUIRED, 'Postal code is required.', false, 'postal_code'),
        { activity },
      );
    }

    try {
      engine.assertServiceArea(service.id, postalCode);
      activity.push(
        activityStep('check_service_area', 'Check service area', 'service_area', {
          detail: `${postalCode} eligible`,
          tool: 'check_service_area',
          result: { postal_code: postalCode, eligible: true },
        }),
      );
    } catch (error) {
      activity.push(
        activityStep('check_service_area', 'Check service area', 'service_area', {
          detail: `${postalCode} is outside the service area`,
          tool: 'check_service_area',
          result: { postal_code: postalCode, eligible: false },
        }),
      );
      const outsideError = new AppError(
        ErrorCodes.OUTSIDE_SERVICE_AREA,
        `${engine.businessName} doesn't serve ${postalCode}.`,
        false,
        'postal_code',
      );
      throw Object.assign(outsideError, { cause: error, activity });
    }
  }

  const pendingService: DemoPendingService = {
    service_id: service.id,
    service_name: service.name,
    price_cents: service.price_cents,
    currency: service.currency,
    postal_code: postalCode,
  };

  const nextConversation: DemoConversationState = {
    ...conversation,
    phase: 'awaiting_availability_permission',
    serviceQuery,
    pendingService,
    pendingOffer: null,
    selectedSlotId: null,
  };

  return {
    ok: true,
    reply: serviceReply(engine, config, pendingService),
    conversation: nextConversation,
    activity,
    businessNotice: null,
  };
}

function serviceReply(
  engine: DemoBookingEngine,
  config: DemoConfig,
  pendingService: DemoPendingService,
): string {
  return `${engine.businessName} can help. Their ${pendingService.service_name} is ${formatPriceCents(pendingService.price_cents, pendingService.currency)} and takes about ${engine.getService(pendingService.service_id).duration_minutes} minutes.\n\n${availabilityQuestion(config)}`;
}

function findAvailability(
  engine: DemoBookingEngine,
  config: DemoConfig,
  conversation: DemoConversationState,
  message: string,
  priorActivity: DemoActivityStep[] = [],
): DemoTurnResponse {
  const pendingService = conversation.pendingService;
  if (!pendingService) return noActivity(conversation, "Let's find the right service first.");

  const parsed = parseCustomerIntent(message, {
    timeZone: engine.timezone,
    workingHours: engine.normalized.business.working_hours,
  });
  const scheduleMessage = hasScheduleWindow(message, parsed)
    ? message
    : defaultAvailabilityPrompt(config);
  const intent = parseCustomerIntent(scheduleMessage, {
    timeZone: engine.timezone,
    workingHours: engine.normalized.business.working_hours,
  });

  let slots;
  try {
    slots = engine.findSlots(conversation.appointments, {
      service_id: pendingService.service_id,
      start_date: intent.startDate,
      end_date: intent.endDate,
      postal_code: pendingService.postal_code,
      time_preference: intent.timePreference,
      limit: 4,
    });
  } catch (error) {
    const activity = [
      ...priorActivity,
      activityStep('get_availability', 'Find availability', 'availability', {
        detail: 'None found',
        tool: 'get_availability',
        result: { query: intent.timePreference, slot_labels: [] },
      }),
    ];
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), { activity });
  }

  const slotLabels = slots.slice(0, 3).map((slot) => formatSlotTimeOnly(slot.starts_at, engine.timezone));
  const activity = [
    ...priorActivity,
    activityStep('get_availability', 'Find availability', 'availability', {
      detail: `${slots.length} time${slots.length === 1 ? '' : 's'} found`,
      tool: 'get_availability',
      result: { query: intent.timePreference, slot_labels: slotLabels },
    }),
  ];
  const pendingOffer: DemoPendingOffer = {
    service_id: pendingService.service_id,
    service_name: pendingService.service_name,
    price_cents: pendingService.price_cents,
    currency: pendingService.currency,
    postal_code: pendingService.postal_code,
    time_preference: intent.timePreference,
    start_date: intent.startDate,
    end_date: intent.endDate,
    slots,
  };
  const whenDay = formatSlotWhen(slots[0].starts_at, engine.timezone).replace(/ at .*$/, '');
  const timeList = slotLabels.length === 1
    ? slotLabels[0]
    : slotLabels.length === 2
      ? `${slotLabels[0]} and ${slotLabels[1]}`
      : `${slotLabels.slice(0, -1).join(', ')}, and ${slotLabels.at(-1)}`;

  return {
    ok: true,
    reply: `They have openings ${whenDay} at ${timeList}.\n\nWhich works best?`,
    conversation: {
      ...conversation,
      phase: 'awaiting_slot_choice',
      pendingOffer,
      selectedSlotId: null,
    },
    activity,
    businessNotice: null,
  };
}

function selectedSlotIndex(
  offer: DemoPendingOffer,
  intent: ParsedCustomerIntent,
  timeZone: string,
): number {
  const byTime = matchSlotBySpokenTime(offer.slots, intent.chosenTimeHm, timeZone);
  if (byTime >= 0) return byTime;
  if (intent.slotChoice === 'first') return 0;
  if (intent.slotChoice === 'second') return offer.slots.length > 1 ? 1 : -1;
  if (intent.slotChoice === 'last') return offer.slots.length - 1;
  return -1;
}

function confirmsBooking(message: string): boolean {
  return !isNegative(message) && (isAffirmative(message) || /\b(book|confirm|go ahead|do it|lock it in|yes)\b/i.test(message));
}

function selectedSlotReply(engine: DemoBookingEngine, slot: DemoPendingOffer['slots'][number]): string {
  return `${formatSlotTimeOnly(slot.starts_at, engine.timezone)} works. Want me to book it?`;
}

function bookSlot(
  engine: DemoBookingEngine,
  conversation: DemoConversationState,
  slot: DemoPendingOffer['slots'][number],
  message: string,
): DemoTurnResponse {
  const offer = conversation.pendingOffer;
  if (!offer) return noActivity(conversation, "I don't have an opening ready to book.");
  const service = engine.getService(offer.service_id);
  const { appointment, appointments } = engine.createAppointment({
    appointments: conversation.appointments,
    service_id: offer.service_id,
    slot,
    postal_code: offer.postal_code,
    customer: {
      name: 'Demo Customer',
      email: 'customer@example.com',
      service_address: offer.postal_code
        ? {
            line1: 'Customer location',
            city: 'Austin',
            region: 'TX',
            postal_code: offer.postal_code,
          }
        : undefined,
    },
    notes: { description: message },
  });
  const lastBooking = toPublicAppointment(appointment, service.name);
  const when = formatSlotWhen(appointment.starts_at, engine.timezone);
  const whenLabel = when.charAt(0).toUpperCase() + when.slice(1);

  return {
    ok: true,
    reply: `You're booked with ${engine.businessName} ${when}.`,
    conversation: {
      phase: 'booked',
      appointments,
      serviceQuery: conversation.serviceQuery,
      pendingService: null,
      pendingOffer: null,
      selectedSlotId: null,
      lastBooking,
    },
    activity: [
      activityStep('create_appointment', 'Create appointment', 'booking', {
        detail: 'Confirmed',
        tool: 'create_appointment',
        result: {
          service_id: service.id,
          service_name: service.name,
          when_label: whenLabel,
          provider_name: lastBooking.provider_name,
        },
      }),
    ],
    businessNotice: {
      headline: 'Appointment received',
      service_name: service.name,
      when_label: whenLabel,
      notification_email: engine.notificationEmail,
      provider_name: lastBooking.provider_name,
    },
  };
}

function handleSlotChoice(
  engine: DemoBookingEngine,
  config: DemoConfig,
  conversation: DemoConversationState,
  message: string,
): DemoTurnResponse {
  const offer = conversation.pendingOffer;
  if (!offer) return noActivity(conversation, "I don't have openings ready to choose from.");
  if (isNegative(message)) return noActivity(clearPending(conversation), 'No problem. I won\'t book anything.');

  const intent = parseCustomerIntent(message, {
    timeZone: engine.timezone,
    workingHours: engine.normalized.business.working_hours,
  });
  if (isScheduleCorrection(message, intent)) {
    return findAvailability(engine, config, conversation, message);
  }
  if (isAvailabilityRequest(message)) {
    return findAvailability(engine, config, conversation, message);
  }

  const index = selectedSlotIndex(offer, intent, engine.timezone);
  if (index < 0) {
    return noActivity(conversation, `Which works best — ${offer.slots.slice(0, 3).map((slot) => formatSlotTimeOnly(slot.starts_at, engine.timezone)).join(', ')}?`);
  }

  const slot = offer.slots[index];
  if (confirmsBooking(message)) return bookSlot(engine, conversation, slot, message);

  return noActivity(
    { ...conversation, phase: 'awaiting_booking_confirmation', selectedSlotId: slot.slot_id },
    selectedSlotReply(engine, slot),
  );
}

function handleBookingConfirmation(
  engine: DemoBookingEngine,
  config: DemoConfig,
  conversation: DemoConversationState,
  message: string,
): DemoTurnResponse {
  if (isNegative(message)) return noActivity(clearPending(conversation), 'No problem. I won\'t book anything.');
  const offer = conversation.pendingOffer;
  if (!offer) return noActivity(conversation, 'Which time would you like?');

  const intent = parseCustomerIntent(message, {
    timeZone: engine.timezone,
    workingHours: engine.normalized.business.working_hours,
  });
  if (isScheduleCorrection(message, intent)) {
    return findAvailability(engine, config, conversation, message);
  }
  if (isAvailabilityRequest(message)) {
    return findAvailability(engine, config, conversation, message);
  }
  const index = conversation.selectedSlotId
    ? offer.slots.findIndex((slot) => slot.slot_id === conversation.selectedSlotId)
    : selectedSlotIndex(offer, intent, engine.timezone);
  if (index >= 0 && !confirmsBooking(message)) {
    const slot = offer.slots[index];
    return noActivity(
      { ...conversation, selectedSlotId: slot.slot_id },
      selectedSlotReply(engine, slot),
    );
  }
  if (confirmsBooking(message) && index >= 0) return bookSlot(engine, conversation, offer.slots[index], message);
  return noActivity(conversation, 'Want me to book the selected time?');
}

function handleInitialTurn(
  engine: DemoBookingEngine,
  config: DemoConfig,
  conversation: DemoConversationState,
  message: string,
): DemoTurnResponse {
  const intent = parseCustomerIntent(message, {
    timeZone: engine.timezone,
    workingHours: engine.normalized.business.working_hours,
  });
  if (!hasExplicitSchedulingIntent(message, intent)) {
    return startGuidedConversation(conversation, config, intent.serviceQuery);
  }
  if (requiresLocation(engine) && !intent.postalCode) {
    return requestLocation(conversation, intent.serviceQuery);
  }
  const discovered = discoverService(engine, config, conversation, intent.serviceQuery, intent.postalCode);
  return hasScheduleWindow(message, intent) || isAvailabilityRequest(message)
    ? findAvailability(engine, config, discovered.conversation, message, discovered.activity)
    : discovered;
}

function handleServiceConfirmation(
  engine: DemoBookingEngine,
  config: DemoConfig,
  conversation: DemoConversationState,
  message: string,
): DemoTurnResponse {
  if (isNegative(message)) return noActivity(clearPending(conversation), 'Okay. Let me know if you want a hand with it.');
  const intent = parseCustomerIntent(message, {
    timeZone: engine.timezone,
    workingHours: engine.normalized.business.working_hours,
  });
  const serviceQuery = conversation.serviceQuery ?? intent.serviceQuery;
  if (!isAffirmative(message) && !intent.postalCode) {
    return noActivity(conversation, guidedReply(config));
  }
  if (requiresLocation(engine) && !intent.postalCode) return requestLocation(conversation, serviceQuery);
  const discovered = discoverService(engine, config, conversation, serviceQuery, intent.postalCode);
  return hasScheduleWindow(message, intent) || isAvailabilityRequest(message)
    ? findAvailability(engine, config, discovered.conversation, message, discovered.activity)
    : discovered;
}

function handleLocation(
  engine: DemoBookingEngine,
  config: DemoConfig,
  conversation: DemoConversationState,
  message: string,
): DemoTurnResponse {
  if (isNegative(message)) return noActivity(clearPending(conversation), 'Okay. Let me know if you want a hand with it.');
  const intent = parseCustomerIntent(message, {
    timeZone: engine.timezone,
    workingHours: engine.normalized.business.working_hours,
  });
  if (!intent.postalCode) return noActivity(conversation, "What's your ZIP code?");
  const discovered = discoverService(engine, config, conversation, conversation.serviceQuery ?? intent.serviceQuery, intent.postalCode);
  return hasScheduleWindow(message, intent) || isAvailabilityRequest(message)
    ? findAvailability(engine, config, discovered.conversation, message, discovered.activity)
    : discovered;
}

function handleAvailabilityPermission(
  engine: DemoBookingEngine,
  config: DemoConfig,
  conversation: DemoConversationState,
  message: string,
): DemoTurnResponse {
  if (isNegative(message)) return noActivity(clearPending(conversation), 'No problem. I won\'t check availability.');
  const intent = parseCustomerIntent(message, {
    timeZone: engine.timezone,
    workingHours: engine.normalized.business.working_hours,
  });
  if (isAffirmative(message) || isAvailabilityRequest(message) || hasScheduleWindow(message, intent)) {
    return findAvailability(engine, config, conversation, message);
  }
  return noActivity(conversation, availabilityQuestion(config));
}

/** One deterministic conversation turn. Business capabilities remain authoritative. */
export function processDemoTurn(request: DemoTurnRequest): DemoTurnResponse {
  const message = request.message?.trim();
  if (!message) throw new AppError(ErrorCodes.VALIDATION_ERROR, 'Say what you need in a short message.', false);

  const engine = new DemoBookingEngine(request.config);
  const conversation = request.conversation ?? emptyConversationState();

  switch (conversation.phase) {
    case 'idle':
      return handleInitialTurn(engine, request.config, conversation, message);
    case 'awaiting_service_confirmation':
      return handleServiceConfirmation(engine, request.config, conversation, message);
    case 'awaiting_location':
      return handleLocation(engine, request.config, conversation, message);
    case 'awaiting_availability_permission':
      return handleAvailabilityPermission(engine, request.config, conversation, message);
    case 'awaiting_slot_choice':
      return handleSlotChoice(engine, request.config, conversation, message);
    case 'awaiting_booking_confirmation':
      return handleBookingConfirmation(engine, request.config, conversation, message);
    case 'booked':
      return noActivity(conversation, `You're already booked with ${engine.businessName}.`);
  }
}

export function processDemoTurnSafe(
  request: DemoTurnRequest,
): DemoTurnResponse | {
  ok: false;
  error: { code: string; message: string };
  reply: string;
  activity: DemoActivityStep[];
} {
  try {
    return processDemoTurn(request);
  } catch (error) {
    const envelope = toErrorResponse(error);
    const activity =
      error && typeof error === 'object' && 'activity' in error
        ? ((error as { activity?: DemoActivityStep[] }).activity ?? [])
        : [];
    return {
      ok: false,
      error: {
        code: envelope.error.code,
        message: envelope.error.message,
      },
      reply: friendlyError(error),
      activity,
    };
  }
}

export { emptyConversationState };
