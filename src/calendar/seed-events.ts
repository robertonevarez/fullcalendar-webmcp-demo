import type { CalendarEvent } from "@protocoltooling/fullcalendar";

/** Exclusive end: December 1 opens the day after the last valid November day. */
export const DEMO_VALID_RANGE = {
  start: "2026-09-01",
  end: "2026-12-01",
} as const;

export const DEMO_INITIAL_DATE = "2026-09-01";

/** Single persistence key for the fixed Sep–Nov 2026 demo window. */
export const DEMO_STORAGE_KEY =
  "protocoltooling-demo:calendar-events:v1:2026-sep-nov";

type SeedSpec = {
  id: string;
  title: string;
  /** Inclusive start as YYYY-MM-DD. */
  start: string;
  /** Exclusive end for multi-day all-day events. */
  end?: string;
};

/**
 * Deterministic enterprise seeds for the locked Sep–Nov 2026 window.
 * September is densely filled; October and November get lighter coverage.
 */
const SEED_SPECS: SeedSpec[] = [
  // September 2026 — fill the month
  { id: "seed-sep-kickoff", title: "Q4 Kickoff — HQ Boardroom", start: "2026-09-01" },
  { id: "seed-sep-site-survey", title: "Site Survey — North Campus", start: "2026-09-02" },
  {
    id: "seed-sep-vendor-onboarding",
    title: "Vendor Onboarding — Procurement",
    start: "2026-09-03",
  },
  {
    id: "seed-sep-equipment-inspection",
    title: "Equipment Inspection — Building 4",
    start: "2026-09-04",
  },
  {
    id: "seed-sep-network-audit",
    title: "Network Audit — Data Center A",
    start: "2026-09-05",
  },
  {
    id: "seed-sep-installation",
    title: "Installation — West Facility",
    start: "2026-09-08",
    end: "2026-09-10",
  },
  {
    id: "seed-sep-safety-briefing",
    title: "Safety Briefing — Plant Floor",
    start: "2026-09-09",
  },
  {
    id: "seed-sep-maintenance",
    title: "Maintenance — South Plant",
    start: "2026-09-11",
  },
  {
    id: "seed-sep-capacity-planning",
    title: "Capacity Planning — Ops Hub",
    start: "2026-09-12",
  },
  {
    id: "seed-sep-project-review",
    title: "Project Review — Central Office",
    start: "2026-09-15",
  },
  {
    id: "seed-sep-client-walkthrough",
    title: "Client Walkthrough — Building 2",
    start: "2026-09-16",
  },
  {
    id: "seed-sep-service-visit",
    title: "Service Visit — Warehouse 2",
    start: "2026-09-17",
  },
  {
    id: "seed-sep-compliance-check",
    title: "Compliance Check — Records Room",
    start: "2026-09-18",
  },
  {
    id: "seed-sep-safety-inspection",
    title: "Safety Inspection — East Facility",
    start: "2026-09-19",
  },
  {
    id: "seed-sep-system-upgrade",
    title: "System Upgrade — Operations Center",
    start: "2026-09-22",
    end: "2026-09-24",
  },
  {
    id: "seed-sep-staff-training",
    title: "Staff Training — Training Lab",
    start: "2026-09-23",
  },
  {
    id: "seed-sep-facility-assessment",
    title: "Facility Assessment — Building 7",
    start: "2026-09-25",
  },
  {
    id: "seed-sep-inventory-count",
    title: "Inventory Count — Warehouse 1",
    start: "2026-09-26",
  },
  {
    id: "seed-sep-deployment",
    title: "Deployment — Regional Office",
    start: "2026-09-29",
  },
  {
    id: "seed-sep-month-close",
    title: "Month Close Review — Finance",
    start: "2026-09-30",
  },

  // October 2026 — lighter coverage
  {
    id: "seed-oct-planning",
    title: "October Planning — Ops Hub",
    start: "2026-10-05",
  },
  {
    id: "seed-oct-retrofit",
    title: "Retrofit — West Facility",
    start: "2026-10-14",
    end: "2026-10-16",
  },
  {
    id: "seed-oct-audit",
    title: "Quarterly Audit — Central Office",
    start: "2026-10-22",
  },
  {
    id: "seed-oct-drill",
    title: "Emergency Drill — All Sites",
    start: "2026-10-28",
  },

  // November 2026 — lighter coverage
  {
    id: "seed-nov-kickoff",
    title: "November Kickoff — HQ Boardroom",
    start: "2026-11-02",
  },
  {
    id: "seed-nov-inspection",
    title: "Winter Readiness — North Campus",
    start: "2026-11-12",
  },
  {
    id: "seed-nov-cutover",
    title: "System Cutover — Operations Center",
    start: "2026-11-18",
    end: "2026-11-20",
  },
  {
    id: "seed-nov-closeout",
    title: "Year-End Closeout Prep — Finance",
    start: "2026-11-25",
  },
];

export function createSeedEvents(): CalendarEvent[] {
  return SEED_SPECS.map((spec) => ({
    id: spec.id,
    title: spec.title,
    start: spec.start,
    end: spec.end ?? null,
    allDay: true,
  }));
}
