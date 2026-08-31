import type { CalendarEvent } from "./types";

type SeedSpec = {
  id: string;
  title: string;
  /** 1-based day of the current month. Clamped into the month when needed. */
  dayOfMonth: number;
  /** Inclusive span in days for all-day events (1 = single day). */
  daySpan?: number;
};

/**
 * Deterministic enterprise seed events for the visible month.
 *
 * Strategy: place stable-ID events relative to the anchor date's year/month
 * so the deployed demo never looks empty as calendar months roll forward.
 * Day-of-month offsets are fixed; IDs never change across months.
 */
const SEED_SPECS: SeedSpec[] = [
  { id: "seed-site-survey", title: "Site Survey — North Campus", dayOfMonth: 3 },
  {
    id: "seed-equipment-inspection",
    title: "Equipment Inspection — Building 4",
    dayOfMonth: 5,
  },
  {
    id: "seed-installation",
    title: "Installation — West Facility",
    dayOfMonth: 8,
    daySpan: 2,
  },
  {
    id: "seed-maintenance",
    title: "Maintenance — South Plant",
    dayOfMonth: 11,
  },
  {
    id: "seed-project-review",
    title: "Project Review — Central Office",
    dayOfMonth: 14,
  },
  {
    id: "seed-service-visit",
    title: "Service Visit — Warehouse 2",
    dayOfMonth: 17,
  },
  {
    id: "seed-safety-inspection",
    title: "Safety Inspection — East Facility",
    dayOfMonth: 19,
  },
  {
    id: "seed-system-upgrade",
    title: "System Upgrade — Operations Center",
    dayOfMonth: 22,
    daySpan: 2,
  },
  {
    id: "seed-facility-assessment",
    title: "Facility Assessment — Building 7",
    dayOfMonth: 25,
  },
  {
    id: "seed-deployment",
    title: "Deployment — Regional Office",
    dayOfMonth: 27,
  },
];

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function localDateIso(year: number, monthIndex: number, day: number): string {
  const y = String(year);
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function clampDay(year: number, monthIndex: number, dayOfMonth: number): number {
  const max = daysInMonth(year, monthIndex);
  return Math.min(Math.max(dayOfMonth, 1), max);
}

export function createSeedEvents(anchor: Date = new Date()): CalendarEvent[] {
  const year = anchor.getFullYear();
  const monthIndex = anchor.getMonth();

  return SEED_SPECS.map((spec) => {
    const startDay = clampDay(year, monthIndex, spec.dayOfMonth);
    const span = Math.max(spec.daySpan ?? 1, 1);
    const exclusiveEndDay = clampDay(year, monthIndex, startDay + span);

    return {
      id: spec.id,
      title: spec.title,
      start: localDateIso(year, monthIndex, startDay),
      // FullCalendar exclusive end for multi-day all-day events.
      end:
        span > 1
          ? localDateIso(year, monthIndex, exclusiveEndDay)
          : null,
      allDay: true,
    };
  });
}
