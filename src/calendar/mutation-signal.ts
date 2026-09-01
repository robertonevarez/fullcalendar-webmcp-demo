import type { CalendarEvent } from "@protocoltooling/fullcalendar";

import { DEMO_TIME_ZONE } from "./seed-events";

/**
 * Who performed the mutation.
 *
 * Human drag/resize is already spatially self-evident — FullCalendar moves the
 * element optimistically under the pointer — so only `agent` mutations earn
 * motion and announcements.
 */
export type MutationOrigin = "agent" | "human";

export type MutationKind = "created" | "rescheduled" | "updated" | "removed";

export type CalendarMutation = {
  kind: MutationKind;
  origin: MutationOrigin;
  id: string;
  /** Absent for `created`. */
  before?: CalendarEvent | null;
  /** Absent for `removed`. */
  after?: CalendarEvent | null;
};

/**
 * Distinguishes a move in time from an edit in place.
 *
 * The repository normalizes every instant to canonical ISO before persisting,
 * so plain string comparison is sufficient here.
 */
export function classifyUpdate(
  before: CalendarEvent | null | undefined,
  after: CalendarEvent,
): MutationKind {
  if (!before) return "created";
  if (
    !sameInstant(before.start, after.start) ||
    !sameInstant(before.end, after.end) ||
    before.allDay !== after.allDay
  ) {
    return "rescheduled";
  }
  return "updated";
}

/**
 * Compares by instant rather than by string.
 *
 * Seeded events are persisted with their original UTC offsets while the
 * repository normalizes writes to canonical ISO, so the same moment in time can
 * be spelled two ways. String comparison would report a phantom reschedule the
 * first time an agent edits a seeded event.
 */
function sameInstant(a: string | null, b: string | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  const left = Date.parse(a);
  const right = Date.parse(b);
  if (Number.isNaN(left) || Number.isNaN(right)) return false;
  return left === right;
}

function dayKey(value: string): string {
  return value.slice(0, 10);
}

/**
 * True when the event renders as more than one segment.
 *
 * FullCalendar slices a multi-day range into one harness per week row (month)
 * or per day column (time grid). Multiple DOM nodes cannot share a single
 * `view-transition-name`, so these events opt out of the spatial layer.
 */
export function spansMultipleDays(
  event: CalendarEvent | null | undefined,
): boolean {
  if (!event?.end) return false;

  if (event.allDay) {
    // All-day ends are exclusive: a single-day event ends on the next date.
    const start = Date.parse(`${dayKey(event.start)}T00:00:00Z`);
    const end = Date.parse(`${dayKey(event.end)}T00:00:00Z`);
    if (Number.isNaN(start) || Number.isNaN(end)) return false;
    return end - start > 86_400_000;
  }

  return calendarDayKey(event.start) !== calendarDayKey(event.end);
}

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DEMO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const spokenFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DEMO_TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const spokenDayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: DEMO_TIME_ZONE,
  weekday: "long",
  month: "long",
  day: "numeric",
});

/** `YYYY-MM-DD` in the calendar's timezone — matches FullCalendar's `data-date`. */
export function calendarDayKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value.slice(0, 10);
  return dayFormatter.format(parsed);
}

function spokenWhen(event: CalendarEvent): string {
  const parsed = new Date(
    event.allDay ? `${dayKey(event.start)}T12:00:00Z` : event.start,
  );
  if (Number.isNaN(parsed.valueOf())) return "";
  return event.allDay
    ? spokenDayFormatter.format(parsed)
    : spokenFormatter.format(parsed);
}

/** Plain-language description for the polite live region. */
export function announcementFor(mutation: CalendarMutation): string | null {
  const { after, before } = mutation;

  switch (mutation.kind) {
    case "created":
      return after
        ? `Added ${after.title}, ${spokenWhen(after)}.`
        : "Event added.";
    case "rescheduled":
      return after
        ? `${after.title} moved to ${spokenWhen(after)}.`
        : "Event moved.";
    case "updated":
      return after ? `${after.title} updated.` : "Event updated.";
    case "removed":
      return before ? `Removed ${before.title}.` : "Event removed.";
    default:
      return null;
  }
}
