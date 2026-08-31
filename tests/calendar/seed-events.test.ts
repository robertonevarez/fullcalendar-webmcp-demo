import { describe, expect, it } from "vitest";
import {
  createSeedEvents,
  DEMO_INITIAL_DATE,
  DEMO_STORAGE_KEY,
  DEMO_TIME_ZONE,
  DEMO_VALID_RANGE,
} from "@/calendar/seed-events";

describe("createSeedEvents", () => {
  const events = createSeedEvents();
  const timed = events.filter((event) => !event.allDay);
  const allDay = events.filter((event) => event.allDay);
  const multiDay = allDay.filter(
    (event) => event.end != null && event.end > event.start,
  );

  it("fills September 2026 and covers Aug–Oct within the locked window", () => {
    const august = events.filter((event) => event.start.startsWith("2026-08"));
    const september = events.filter((event) =>
      event.start.startsWith("2026-09"),
    );
    const october = events.filter((event) => event.start.startsWith("2026-10"));
    const november = events.filter((event) =>
      event.start.startsWith("2026-11"),
    );

    expect(august.length).toBeGreaterThanOrEqual(3);
    expect(september.length).toBeGreaterThanOrEqual(18);
    expect(october.length).toBeGreaterThanOrEqual(3);
    expect(november.length).toBe(0);
  });

  it("uses unique stable IDs", () => {
    const ids = events.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mixes timed, all-day, and multi-day events with meaningful ends", () => {
    expect(timed.length).toBeGreaterThanOrEqual(20);
    expect(allDay.length).toBeGreaterThanOrEqual(5);
    expect(multiDay.length).toBeGreaterThanOrEqual(3);

    // Majority timed (~70%+)
    expect(timed.length / events.length).toBeGreaterThanOrEqual(0.65);

    for (const event of timed) {
      expect(event.end).toBeTruthy();
      expect(new Date(event.end!).valueOf()).toBeGreaterThan(
        new Date(event.start).valueOf(),
      );
      expect(event.start).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
      );
      expect(event.end).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
      );
    }

    for (const event of allDay) {
      expect(event.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (event.end) {
        expect(event.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(event.end > event.start).toBe(true);
      }
    }
  });

  it("keeps every event inside the demo valid range", () => {
    for (const event of events) {
      const startDay = event.start.slice(0, 10);
      expect(startDay >= DEMO_VALID_RANGE.start).toBe(true);
      expect(startDay < DEMO_VALID_RANGE.end).toBe(true);
      if (event.end) {
        const endDay = event.end.slice(0, 10);
        expect(endDay <= DEMO_VALID_RANGE.end).toBe(true);
      }
    }
  });

  it("exports a fixed Aug–Oct 2026 demo window and v4 storage key", () => {
    expect(DEMO_INITIAL_DATE).toBe("2026-09-01");
    expect(DEMO_TIME_ZONE).toBe("America/New_York");
    expect(DEMO_VALID_RANGE).toEqual({
      start: "2026-08-01",
      end: "2026-11-01",
    });
    expect(DEMO_STORAGE_KEY).toBe(
      "protocoltooling-demo:calendar-events:v4:2026-aug-oct",
    );
  });

  it("projects host-selected metadata and omits private seed fields", () => {
    const siteSurvey = events.find((event) => event.id === "seed-sep-site-survey");
    const sitePrep = events.find((event) => event.id === "seed-aug-site-prep");
    const projectReview = events.find(
      (event) => event.id === "seed-sep-project-review",
    );
    const serviceVisit = events.find(
      (event) => event.id === "seed-sep-service-visit",
    );
    const kickoff = events.find((event) => event.id === "seed-sep-kickoff");

    expect(siteSurvey?.metadata).toEqual({
      location: "North Campus",
      team: "Facilities",
    });
    expect(sitePrep?.metadata).toEqual({
      location: "North Campus",
      team: "Facilities",
    });
    expect(projectReview?.metadata).toEqual({
      location: "Central Office",
      attendees: ["Sarah Chen", "Michael Torres"],
    });
    expect(serviceVisit?.metadata).toEqual({
      location: "Warehouse 2",
      team: "Field Operations",
    });
    expect(kickoff?.metadata).toBeUndefined();

    const serialized = JSON.stringify(events);
    expect(serialized).toContain("North Campus");
    expect(serialized).toContain("Sarah Chen");
    expect(serialized).not.toContain("tenant-secret");
    expect(serialized).not.toContain("internal-9281");
    expect(serialized).not.toContain("Sensitive internal note");
  });

  it("does not use personal-calendar wording", () => {
    const titles = events.map((event) => event.title.toLowerCase());
    for (const banned of [
      "dentist",
      "lunch",
      "birthday",
      "gym",
      "vacation",
      "groceries",
    ]) {
      expect(titles.some((title) => title.includes(banned))).toBe(false);
    }
  });

  it("uses EDT offsets for timed seeds in the Aug–Oct window", () => {
    const siteSurvey = timed.find((event) => event.id === "seed-sep-site-survey");
    const sitePrep = timed.find((event) => event.id === "seed-aug-site-prep");
    const octAudit = timed.find((event) => event.id === "seed-oct-audit");
    expect(siteSurvey?.start).toContain("-04:00");
    expect(sitePrep?.start).toContain("-04:00");
    expect(octAudit?.start).toContain("-04:00");
  });
});
