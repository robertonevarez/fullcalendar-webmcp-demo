import type { CalendarEvent } from "./types";

export type EventDatePatch = {
  title?: string;
  start: string;
  end: string | null;
  allDay: boolean;
};

/**
 * Host-side event mutation used by human drag/resize callbacks.
 * Kept separate so Phase D1 can route the same updates through a repository.
 */
export function updateEventInState(
  events: CalendarEvent[],
  id: string,
  patch: EventDatePatch,
): CalendarEvent[] {
  let found = false;

  const next = events.map((event) => {
    if (event.id !== id) return event;
    found = true;
    return {
      ...event,
      title: patch.title ?? event.title,
      start: patch.start,
      end: patch.end,
      allDay: patch.allDay,
    };
  });

  return found ? next : events;
}
