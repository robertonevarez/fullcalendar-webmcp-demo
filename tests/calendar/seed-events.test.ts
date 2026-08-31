import { describe, expect, it } from "vitest";
import { createSeedEvents } from "@/calendar/seed-events";

describe("createSeedEvents", () => {
  it("returns 8–12 deterministic enterprise events for a given month", () => {
    const events = createSeedEvents(new Date(2026, 7, 15)); // August 2026

    expect(events.length).toBeGreaterThanOrEqual(8);
    expect(events.length).toBeLessThanOrEqual(12);

    const ids = events.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("seed-site-survey");
    expect(ids).toContain("seed-deployment");

    for (const event of events) {
      expect(event.title).toMatch(/—/);
      expect(event.allDay).toBe(true);
      expect(event.start).toMatch(/^2026-08-\d{2}$/);
      expect(event.start < "2026-09-01").toBe(true);
    }
  });

  it("keeps stable IDs across months while shifting dates", () => {
    const august = createSeedEvents(new Date(2026, 7, 1));
    const september = createSeedEvents(new Date(2026, 8, 1));

    expect(august.map((e) => e.id)).toEqual(september.map((e) => e.id));
    expect(august[0]?.start).toBe("2026-08-03");
    expect(september[0]?.start).toBe("2026-09-03");
  });

  it("does not use personal-calendar wording", () => {
    const titles = createSeedEvents().map((event) => event.title.toLowerCase());
    for (const banned of ["dentist", "lunch", "birthday", "gym", "vacation", "groceries"]) {
      expect(titles.some((title) => title.includes(banned))).toBe(false);
    }
  });
});
