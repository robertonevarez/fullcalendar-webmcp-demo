import { formatDateInZone, timeStringInZone } from '@/lib/time';
import { addDaysToDateString } from '@/demo/format';
import type { WorkingHours } from '@/domain/types';

export interface ParsedCustomerIntent {
  postalCode?: string;
  timePreference?: string;
  /** YYYY-MM-DD in business timezone */
  startDate: string;
  endDate: string;
  /** Free-text used for service search */
  serviceQuery: string;
  /** Parsed clock time if present, e.g. "16:30" */
  chosenTimeHm?: string;
  /** Simple ordinal selection for offered slots. */
  slotChoice?: 'first' | 'second' | 'last';
}

function todayInZone(timeZone: string): string {
  return formatDateInZone(new Date(), timeZone);
}

/** "after 4" in booking chat usually means 4pm, not 4am. */
function normalizeAfterBeforePreference(
  kind: 'after' | 'before',
  match: RegExpMatchArray,
): string {
  const hour = Number(match[1]);
  const minute = match[2] ? `:${match[2]}` : '';
  let meridiem = match[3];
  if (!meridiem && hour >= 1 && hour <= 7) {
    meridiem = 'pm';
  }
  return `${kind} ${hour}${minute}${meridiem ? ` ${meridiem}` : ''}`.trim();
}

function weekdayForDateString(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Calendar weekday for a civil date (independent of local TZ interpretation).
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

function nextOpenDate(fromDate: string, hours: WorkingHours[], maxLookahead = 14): string {
  const openDays = new Set(hours.map((h) => h.day));
  for (let i = 0; i < maxLookahead; i += 1) {
    const dateStr = addDaysToDateString(fromDate, i);
    if (openDays.has(weekdayForDateString(dateStr))) return dateStr;
  }
  return fromDate;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SERVICE_QUERY_FILLER =
  /\b(a|an|and|at|can|do|for|getting|happening|have|i|is|it|long|my|needs|need|of|please|the|too|what|what's|with|you)\b/gi;

function nextDateForWeekday(fromDate: string, weekday: number): string {
  const current = weekdayForDateString(fromDate);
  const daysAhead = (weekday - current + 7) % 7;
  return addDaysToDateString(fromDate, daysAhead);
}

/**
 * Constrained deterministic intent layer for the guided demo.
 * Interprets natural language; does not invent business results.
 */
export function parseCustomerIntent(
  message: string,
  options: {
    timeZone: string;
    workingHours: WorkingHours[];
  },
): ParsedCustomerIntent {
  const text = message.trim();
  const lower = text.toLowerCase();

  const postalMatch = text.match(/\b(\d{5})\b/);
  const postalCode = postalMatch?.[1];

  let timePreference: string | undefined;
  const afterMatch = lower.match(/\bafter\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  const beforeMatch = lower.match(/\bbefore\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (afterMatch) {
    timePreference = normalizeAfterBeforePreference('after', afterMatch);
  } else if (beforeMatch) {
    timePreference = normalizeAfterBeforePreference('before', beforeMatch);
  } else if (/\bmorning\b/.test(lower)) {
    timePreference = 'morning';
  } else if (/\bafternoon\b/.test(lower)) {
    timePreference = 'afternoon';
  }

  const today = todayInZone(options.timeZone);
  let startDate = today;
  if (/\btomorrow\b/.test(lower)) {
    startDate = addDaysToDateString(today, 1);
  } else if (/\btoday\b/.test(lower)) {
    startDate = today;
  } else {
    const weekday = WEEKDAYS.findIndex((day) => new RegExp(`\\b${day}\\b`).test(lower));
    if (weekday >= 0) startDate = nextDateForWeekday(today, weekday);
  }

  // If the requested day is closed, move to the next open day (demo UX).
  startDate = nextOpenDate(startDate, options.workingHours);
  const endDate = startDate;

  const chosenTime = parseSpokenTime(lower);
  const slotChoice = /\b(first|earliest)\b/.test(lower)
    ? 'first'
    : /\b(second)\b/.test(lower)
      ? 'second'
      : /\b(last|latest)\b/.test(lower)
        ? 'last'
        : undefined;

  // Strip location/time noise for service search; keep symptom words.
  const serviceQuery = text
    .replace(/\b\d{5}\b/g, ' ')
    .replace(/\b(tomorrow|today|after|before|morning|afternoon|am|pm|i'?m|free|in)\b/gi, ' ')
    .replace(/\b\d{1,2}(:\d{2})?\b/g, ' ')
    .replace(SERVICE_QUERY_FILLER, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    postalCode,
    timePreference,
    startDate,
    endDate,
    serviceQuery: serviceQuery || text,
    chosenTimeHm: chosenTime,
    slotChoice,
  };
}

function normalizedMessage(message: string): string {
  return message.toLowerCase().replace(/[.!?,]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isAffirmative(message: string): boolean {
  const text = normalizedMessage(message);
  if (!text || isNegative(message)) return false;
  return /^(yes|yeah|yep|sure|please|okay|ok|do it|go ahead|sounds good|sounds great|perfect)(?: please| thanks| thank you| let's do it| book it)?$/.test(text);
}

export function isNegative(message: string): boolean {
  return /\b(no|nope|never mind|nevermind|not now|don't|do not|skip|cancel)\b/i.test(message);
}

export function isAvailabilityRequest(message: string): boolean {
  return /\b(when|what time|what times|availability|available|opening|openings|schedule|latest|again|another day)\b/i.test(message);
}

export function hasScheduleWindow(message: string, intent: ParsedCustomerIntent): boolean {
  return Boolean(
    intent.timePreference ||
      intent.chosenTimeHm ||
      intent.slotChoice ||
      /\b(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.test(message),
  );
}

export function isScheduleCorrection(message: string, intent: ParsedCustomerIntent): boolean {
  return hasScheduleWindow(message, intent) && /\b(actually|instead|better|change|check)\b/i.test(message);
}

/** Convert "4:30", "4:30pm", "4 pm" → "HH:mm" 24h. */
export function parseSpokenTime(lower: string): string | undefined {
  const withMinutes = lower.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/);
  if (withMinutes) {
    let hour = Number(withMinutes[1]);
    const minute = Number(withMinutes[2]);
    const meridiem = withMinutes[3];
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    if (!meridiem && hour > 0 && hour <= 7) hour += 12;
    if (hour > 23 || minute > 59) return undefined;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  const hourOnly = lower.match(/\b(\d{1,2})\s*(am|pm)\b/);
  if (hourOnly) {
    let hour = Number(hourOnly[1]);
    const meridiem = hourOnly[2];
    if (meridiem === 'pm' && hour < 12) hour += 12;
    if (meridiem === 'am' && hour === 12) hour = 0;
    if (hour > 23) return undefined;
    return `${String(hour).padStart(2, '0')}:00`;
  }

  return undefined;
}

export function matchSlotBySpokenTime(
  slots: { starts_at: string }[],
  chosenHm: string | undefined,
  timeZone: string,
): number {
  if (!chosenHm) return -1;
  return slots.findIndex((slot) => timeStringInZone(new Date(slot.starts_at), timeZone) === chosenHm);
}
