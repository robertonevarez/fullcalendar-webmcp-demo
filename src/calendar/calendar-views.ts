/** FullCalendar view types exposed in the Base UI view selector. */
export const CALENDAR_VIEW_OPTIONS = [
  { value: "dayGridMonth", label: "Month" },
  { value: "timeGridWeek", label: "Week" },
  { value: "timeGridDay", label: "Day" },
] as const;

export type CalendarViewType = (typeof CALENDAR_VIEW_OPTIONS)[number]["value"];

export function isCalendarViewType(value: string): value is CalendarViewType {
  return CALENDAR_VIEW_OPTIONS.some((option) => option.value === value);
}
