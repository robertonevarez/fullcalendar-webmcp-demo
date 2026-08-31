import { describe, expect, it } from "vitest";
import {
  createSeedEvents,
  DEMO_INITIAL_DATE,
  DEMO_STORAGE_KEY,
  DEMO_VALID_RANGE,
} from "@/calendar/seed-events";

describe("createSeedEvents", () => {
  it("fills September 2026 and covers Oct–Nov within the locked window", () => {
    const events = createSeedEvents();
    const september = events.filter((event) => event.start.startsWith("2026-09-"));
    const october = events.filter((event) => event.start.startsWith("2026-10-"));
    const november = events.filter((event) => event.start.startsWith("2026-11-"));

    expect(september.length).toBeGreaterThanOrEqual(18);
    expect(october.length).toBeGreaterThanOrEqual(3);
    expect(november.length).toBeGreaterThanOrEqual(3);

    const ids = events.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const event of events) {
      expect(event.title).toMatch(/—/);
      expect(event.allDay).toBe(true);
      expect(event.start >= DEMO_VALID_RANGE.start).toBe(true);
      expect(event.start < DEMO_VALID_RANGE.end).toBe(true);
    }
  });

  it("exports a fixed Sep–Nov 2026 demo window", () => {
    expect(DEMO_INITIAL_DATE).toBe("2026-09-01");
    expect(DEMO_VALID_RANGE).toEqual({
      start: "2026-09-01",
      end: "2026-12-01",
    });
    expect(DEMO_STORAGE_KEY).toContain("2026-sep-nov");
  });

  it("does not use personal-calendar wording", () => {
    const titles = createSeedEvents().map((event) => event.title.toLowerCase());
    for (const banned of ["dentist", "lunch", "birthday", "gym", "vacation", "groceries"]) {
      expect(titles.some((title) => title.includes(banned))).toBe(false);
    }
  });
});
