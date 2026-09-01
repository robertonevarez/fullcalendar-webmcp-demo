import type { CalendarEvent, JsonObject } from "@protocoltooling/fullcalendar";

/** Exclusive end: November 1 opens the day after the last valid October day. */
export const DEMO_VALID_RANGE = {
  start: "2026-08-01",
  end: "2026-11-01",
} as const;

export const DEMO_INITIAL_DATE = "2026-09-01";

/**
 * Demo wall-clock timezone for FullCalendar and seed generation.
 * Timed seeds use explicit offsets matching America/New_York (EDT/EST).
 */
export const DEMO_TIME_ZONE = "America/New_York";

/**
 * Persistence key for the fixed Aug–Oct 2026 window.
 * v4: navigable August–October (exclusive end 2026-11-01).
 */
export const DEMO_STORAGE_KEY =
  "protocoltooling-demo:calendar-events:v4:2026-aug-oct";

/** US Eastern DST ends 2026-11-01; Nov 2+ is EST (−05:00). */
function easternOffset(date: string): "-04:00" | "-05:00" {
  return date >= "2026-11-02" ? "-05:00" : "-04:00";
}

function timedInstant(date: string, hhmm: string): string {
  return `${date}T${hhmm}:00${easternOffset(date)}`;
}

type TimedSeed = {
  id: string;
  title: string;
  date: string;
  /** Local wall-clock start HH:MM in America/New_York. */
  start: string;
  /** Local wall-clock exclusive end HH:MM in America/New_York. */
  end: string;
  /** Agent-visible projection fields (optional). */
  location?: string;
  attendees?: string[];
  team?: string;
  /** Host-private — never projected into CalendarEvent.metadata. */
  tenantId?: string;
  billingCode?: string;
  privateNotes?: string;
};

type AllDaySeed = {
  id: string;
  title: string;
  /** Inclusive start YYYY-MM-DD. */
  start: string;
  /** Exclusive end YYYY-MM-DD for multi-day spans; omit for single day. */
  end?: string;
  location?: string;
  team?: string;
  tenantId?: string;
  billingCode?: string;
  privateNotes?: string;
};

/**
 * Project only intentionally agent-visible fields.
 * Private host fields on the seed domain stay out of WebMCP.
 */
export function projectSeedMetadata(seed: {
  location?: string;
  attendees?: string[];
  team?: string;
}): JsonObject | undefined {
  const metadata: JsonObject = {};
  if (seed.location) metadata.location = seed.location;
  if (seed.attendees?.length) metadata.attendees = [...seed.attendees];
  if (seed.team) metadata.team = seed.team;
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

/**
 * Deterministic enterprise seeds for the locked Aug–Oct 2026 window.
 * Majority are timed business-hour appointments; a minority are true all-day
 * or multi-day operations. September is dense; Aug/Oct stay lighter.
 *
 * A small subset carries host-selected metadata for WebMCP agents.
 * Most events remain metadata-free. Private seed fields are never projected.
 */
const TIMED_SEEDS: TimedSeed[] = [
  // August 2026 — lighter timed coverage
  {
    id: "seed-aug-planning",
    title: "August Planning — Ops Hub",
    date: "2026-08-05",
    start: "09:00",
    end: "10:30",
  },
  {
    id: "seed-aug-site-prep",
    title: "Site Prep — North Campus",
    date: "2026-08-12",
    start: "08:00",
    end: "10:00",
    location: "North Campus",
    team: "Facilities",
  },
  {
    id: "seed-aug-vendor-review",
    title: "Vendor Review — Procurement",
    date: "2026-08-20",
    start: "13:00",
    end: "14:30",
  },
  {
    id: "seed-aug-readiness",
    title: "Q3 Readiness — HQ Boardroom",
    date: "2026-08-27",
    start: "09:00",
    end: "10:30",
  },

  // September 2026 — weekday operations mix
  {
    id: "seed-sep-kickoff",
    title: "Q4 Kickoff — HQ Boardroom",
    date: "2026-09-01",
    start: "09:00",
    end: "10:30",
  },
  {
    id: "seed-sep-site-survey",
    title: "Site Survey — North Campus",
    date: "2026-09-02",
    start: "08:00",
    end: "10:00",
    location: "North Campus",
    team: "Facilities",
    tenantId: "tenant-secret",
    billingCode: "internal-9281",
    privateNotes: "Sensitive internal note",
  },
  {
    id: "seed-sep-vendor-onboarding",
    title: "Vendor Onboarding — Procurement",
    date: "2026-09-03",
    start: "09:30",
    end: "11:00",
  },
  {
    id: "seed-sep-equipment-inspection",
    title: "Equipment Inspection — Building 4",
    date: "2026-09-04",
    start: "09:00",
    end: "10:30",
  },
  {
    id: "seed-sep-network-audit",
    title: "Network Audit — Data Center A",
    date: "2026-09-04",
    start: "13:00",
    end: "15:30",
  },
  {
    id: "seed-sep-safety-briefing",
    title: "Safety Briefing — Plant Floor",
    date: "2026-09-08",
    start: "08:30",
    end: "09:00",
  },
  {
    id: "seed-sep-maintenance",
    title: "Maintenance — South Plant",
    date: "2026-09-09",
    start: "13:00",
    end: "15:30",
  },
  {
    id: "seed-sep-capacity-planning",
    title: "Capacity Planning — Ops Hub",
    date: "2026-09-10",
    start: "11:00",
    end: "12:00",
  },
  {
    id: "seed-sep-client-walkthrough",
    title: "Client Walkthrough — Building 2",
    date: "2026-09-11",
    start: "09:00",
    end: "10:30",
  },
  {
    id: "seed-sep-service-visit",
    title: "Service Visit — Warehouse 2",
    date: "2026-09-11",
    start: "14:00",
    end: "15:00",
    location: "Warehouse 2",
    team: "Field Operations",
  },
  {
    id: "seed-sep-project-review",
    title: "Project Review — Central Office",
    date: "2026-09-15",
    start: "10:00",
    end: "11:00",
    location: "Central Office",
    attendees: ["Sarah Chen", "Michael Torres"],
    tenantId: "tenant-secret",
    billingCode: "internal-9281",
    privateNotes: "Sensitive internal note",
  },
  {
    id: "seed-sep-compliance-check",
    title: "Compliance Check — Records Room",
    date: "2026-09-15",
    start: "14:00",
    end: "15:00",
  },
  {
    id: "seed-sep-safety-inspection",
    title: "Safety Inspection — East Facility",
    date: "2026-09-16",
    start: "08:00",
    end: "10:00",
  },
  {
    id: "seed-sep-facility-assessment",
    title: "Facility Assessment — Building 7",
    date: "2026-09-17",
    start: "09:30",
    end: "11:00",
  },
  {
    id: "seed-sep-staff-training",
    title: "Staff Training — Training Lab",
    date: "2026-09-18",
    start: "09:00",
    end: "12:00",
  },
  {
    id: "seed-sep-deployment-review",
    title: "Deployment Review — Regional Office",
    date: "2026-09-22",
    start: "13:00",
    end: "14:30",
  },
  {
    id: "seed-sep-procurement-sync",
    title: "Procurement Sync — Central Office",
    date: "2026-09-23",
    start: "08:30",
    end: "09:30",
  },
  {
    id: "seed-sep-ops-standup",
    title: "Ops Standup — Ops Hub",
    date: "2026-09-24",
    start: "08:00",
    end: "08:30",
  },
  {
    id: "seed-sep-deployment",
    title: "Deployment — Regional Office",
    date: "2026-09-29",
    start: "09:00",
    end: "11:00",
  },
  {
    id: "seed-sep-month-close",
    title: "Month Close Review — Finance",
    date: "2026-09-30",
    start: "15:30",
    end: "16:30",
  },

  // October 2026 — lighter timed coverage
  {
    id: "seed-oct-planning",
    title: "October Planning — Ops Hub",
    date: "2026-10-05",
    start: "09:00",
    end: "10:30",
  },
  {
    id: "seed-oct-audit",
    title: "Quarterly Audit — Central Office",
    date: "2026-10-22",
    start: "13:00",
    end: "15:00",
  },
  {
    id: "seed-oct-vendor-checkin",
    title: "Vendor Check-In — Procurement",
    date: "2026-10-28",
    start: "10:00",
    end: "11:00",
  },
];

const ALL_DAY_SEEDS: AllDaySeed[] = [
  {
    id: "seed-sep-installation",
    title: "Installation — West Facility",
    start: "2026-09-08",
    end: "2026-09-10",
  },
  {
    id: "seed-sep-system-upgrade",
    title: "System Upgrade — Operations Center",
    start: "2026-09-22",
    end: "2026-09-24",
  },
  {
    id: "seed-sep-inventory-count",
    title: "Inventory Count — Warehouse 1",
    start: "2026-09-25",
  },
  {
    id: "seed-sep-planning-day",
    title: "Company Planning Day",
    start: "2026-09-28",
  },
  {
    id: "seed-oct-retrofit",
    title: "Retrofit — West Facility",
    start: "2026-10-14",
    end: "2026-10-16",
  },
  {
    id: "seed-oct-drill",
    title: "Emergency Drill — All Sites",
    start: "2026-10-29",
  },
  {
    id: "seed-aug-inventory",
    title: "Inventory Prep — Warehouse 1",
    start: "2026-08-14",
  },
];

export function createSeedEvents(): CalendarEvent[] {
  const timed: CalendarEvent[] = TIMED_SEEDS.map((spec) => {
    const metadata = projectSeedMetadata(spec);
    return {
      id: spec.id,
      title: spec.title,
      start: timedInstant(spec.date, spec.start),
      end: timedInstant(spec.date, spec.end),
      allDay: false,
      ...(metadata ? { metadata } : {}),
    };
  });

  const allDay: CalendarEvent[] = ALL_DAY_SEEDS.map((spec) => {
    const metadata = projectSeedMetadata(spec);
    return {
      id: spec.id,
      title: spec.title,
      start: spec.start,
      end: spec.end ?? null,
      allDay: true,
      ...(metadata ? { metadata } : {}),
    };
  });

  return [...timed, ...allDay];
}
