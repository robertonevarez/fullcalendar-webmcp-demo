/**
 * Host calendar event shape for Phase D0.
 * Intentionally matches the public event contract expected by
 * `@protocoltooling/fullcalendar` in a later phase.
 */
export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
};
