import { describe, expect, it } from "vitest";
import { updateEventInState } from "@/calendar/event-ops";
import { createSeedEvents } from "@/calendar/seed-events";

describe("updateEventInState", () => {
  it("updates host state when an event moves to another date", () => {
    const seed = createSeedEvents(new Date(2026, 7, 1));
    const target = seed.find((event) => event.id === "seed-site-survey");
    expect(target).toBeDefined();

    const next = updateEventInState(seed, "seed-site-survey", {
      start: "2026-08-20",
      end: null,
      allDay: true,
    });

    const moved = next.find((event) => event.id === "seed-site-survey");
    expect(moved?.start).toBe("2026-08-20");
    expect(next.filter((event) => event.id !== "seed-site-survey")).toEqual(
      seed.filter((event) => event.id !== "seed-site-survey"),
    );
  });

  it("leaves state unchanged for unknown event ids", () => {
    const seed = createSeedEvents(new Date(2026, 7, 1));
    const next = updateEventInState(seed, "missing", {
      start: "2026-08-20",
      end: null,
      allDay: true,
    });
    expect(next).toEqual(seed);
  });
});
