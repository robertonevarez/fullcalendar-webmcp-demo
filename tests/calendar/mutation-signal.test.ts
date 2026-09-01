import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "@protocoltooling/fullcalendar";

import {
  announcementFor,
  calendarDayKey,
  classifyUpdate,
  spansMultipleDays,
} from "@/calendar/mutation-signal";

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "seed-sep-site-survey",
    title: "Site Survey",
    start: "2026-09-02T12:00:00.000Z",
    end: "2026-09-02T13:30:00.000Z",
    allDay: false,
    ...overrides,
  };
}

describe("classifyUpdate", () => {
  it("treats a missing before-state as a creation", () => {
    expect(classifyUpdate(null, event())).toBe("created");
    expect(classifyUpdate(undefined, event())).toBe("created");
  });

  it("classifies a start change as a reschedule", () => {
    const before = event();
    const after = event({ start: "2026-09-20T18:00:00.000Z" });
    expect(classifyUpdate(before, after)).toBe("rescheduled");
  });

  it("classifies an end-only change as a reschedule", () => {
    const before = event();
    const after = event({ end: "2026-09-02T15:00:00.000Z" });
    expect(classifyUpdate(before, after)).toBe("rescheduled");
  });

  it("classifies an allDay flip as a reschedule", () => {
    const before = event();
    const after = event({ allDay: true });
    expect(classifyUpdate(before, after)).toBe("rescheduled");
  });

  it("classifies a title-only change as an in-place update", () => {
    const before = event();
    const after = event({ title: "Site Survey — Relocated Campus" });
    expect(classifyUpdate(before, after)).toBe("updated");
  });

  it("classifies an identical payload as an in-place update", () => {
    expect(classifyUpdate(event(), event())).toBe("updated");
  });

  it("does not report a phantom reschedule when only the offset spelling differs", () => {
    // Seeds persist their original offset; the repository normalizes writes to
    // canonical ISO. Both spell the same instant.
    const before = event({
      start: "2026-09-02T08:00:00-04:00",
      end: "2026-09-02T09:30:00-04:00",
    });
    const after = event({
      title: "Site Survey — North Campus",
      start: "2026-09-02T12:00:00.000Z",
      end: "2026-09-02T13:30:00.000Z",
    });

    expect(classifyUpdate(before, after)).toBe("updated");
  });

  it("still reports a reschedule when only one endpoint moves", () => {
    const before = event({
      start: "2026-09-02T08:00:00-04:00",
      end: "2026-09-02T09:30:00-04:00",
    });
    const after = event({
      start: "2026-09-02T12:00:00.000Z",
      end: "2026-09-02T14:00:00.000Z",
    });

    expect(classifyUpdate(before, after)).toBe("rescheduled");
  });
});

describe("spansMultipleDays", () => {
  it("is false for a timed event inside one calendar day", () => {
    expect(spansMultipleDays(event())).toBe(false);
  });

  it("is false for an event with no end", () => {
    expect(spansMultipleDays(event({ end: null }))).toBe(false);
  });

  it("is true for a timed event crossing midnight in the calendar timezone", () => {
    expect(
      spansMultipleDays(
        event({
          start: "2026-09-02T22:00:00-04:00",
          end: "2026-09-03T02:00:00-04:00",
        }),
      ),
    ).toBe(true);
  });

  it("is false for a single-day all-day event with an exclusive end", () => {
    expect(
      spansMultipleDays(
        event({ allDay: true, start: "2026-09-07", end: "2026-09-08" }),
      ),
    ).toBe(false);
  });

  it("is true for a multi-day all-day event", () => {
    expect(
      spansMultipleDays(
        event({ allDay: true, start: "2026-09-07", end: "2026-09-10" }),
      ),
    ).toBe(true);
  });

  it("is false for a null or undefined event", () => {
    expect(spansMultipleDays(null)).toBe(false);
    expect(spansMultipleDays(undefined)).toBe(false);
  });
});

describe("calendarDayKey", () => {
  it("passes through date-only values untouched", () => {
    expect(calendarDayKey("2026-09-07")).toBe("2026-09-07");
  });

  it("resolves instants in the calendar timezone, not UTC", () => {
    // 00:30Z on the 3rd is still the evening of the 2nd in America/New_York.
    expect(calendarDayKey("2026-09-03T00:30:00.000Z")).toBe("2026-09-02");
  });
});

describe("announcementFor", () => {
  it("names the event and its new time on creation", () => {
    const text = announcementFor({
      kind: "created",
      origin: "agent",
      id: "created-1",
      after: event({ title: "Equipment Inspection" }),
    });
    expect(text).toMatch(/^Added Equipment Inspection, /);
    expect(text).toMatch(/September 2/);
  });

  it("describes a reschedule by destination", () => {
    const text = announcementFor({
      kind: "rescheduled",
      origin: "agent",
      id: "seed-sep-site-survey",
      before: event(),
      after: event({ start: "2026-09-22T18:00:00.000Z" }),
    });
    expect(text).toMatch(/^Site Survey moved to /);
    expect(text).toMatch(/September 22/);
  });

  it("uses the before-state for a removal", () => {
    expect(
      announcementFor({
        kind: "removed",
        origin: "agent",
        id: "seed-sep-site-survey",
        before: event(),
      }),
    ).toBe("Removed Site Survey.");
  });

  it("omits a time for all-day events", () => {
    const text = announcementFor({
      kind: "created",
      origin: "agent",
      id: "created-1",
      after: event({ title: "Company Offsite", allDay: true, start: "2026-09-07", end: "2026-09-08" }),
    });
    expect(text).toMatch(/September 7/);
    expect(text).not.toMatch(/\d:\d\d/);
  });
});
