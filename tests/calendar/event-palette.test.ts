import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "@protocoltooling/fullcalendar";
import {
  EVENT_PALETTE,
  hashEventId,
  paletteForEventId,
  paletteIndexForEventId,
} from "@/calendar/event-palette";

describe("event palette (presentation-only)", () => {
  it("maps the same ID to the same palette entry every time", () => {
    const id = "seed-sep-site-survey";
    expect(paletteIndexForEventId(id)).toBe(paletteIndexForEventId(id));
    expect(paletteForEventId(id)).toBe(paletteForEventId(id));
    expect(hashEventId(id)).toBe(hashEventId(id));
  });

  it("can map representative seed IDs to different palette entries", () => {
    const indexes = [
      paletteIndexForEventId("seed-sep-installation"),
      paletteIndexForEventId("seed-sep-safety-briefing"),
      paletteIndexForEventId("seed-sep-kickoff"),
      paletteIndexForEventId("seed-sep-site-survey"),
    ];
    expect(new Set(indexes).size).toBeGreaterThan(1);
    expect(indexes[0]).not.toBe(indexes[1]);
  });

  it("does not change color when title or dates change (ID-based)", () => {
    const id = "seed-sep-installation";
    const before = paletteForEventId(id);
    const mutated: CalendarEvent = {
      id,
      title: "Installation — Relocated",
      start: "2026-09-20",
      end: "2026-09-22",
      allDay: true,
    };
    expect(paletteForEventId(mutated.id)).toEqual(before);
  });

  it("does not mutate CalendarEvent when resolving a swatch", () => {
    const event: CalendarEvent = {
      id: "created-1",
      title: "New Event",
      start: "2026-09-10",
      end: null,
      allDay: true,
    };
    const snapshot = structuredClone(event);
    const swatch = paletteForEventId(event.id);
    expect(event).toEqual(snapshot);
    expect(swatch).toEqual(EVENT_PALETTE[paletteIndexForEventId(event.id)]);
    expect(event).not.toHaveProperty("color");
    expect(event).not.toHaveProperty("contrastColor");
  });

  it("keeps palette length small and coherent", () => {
    expect(EVENT_PALETTE.length).toBe(6);
    for (const swatch of EVENT_PALETTE) {
      expect(swatch.color).toMatch(/^oklch\(/);
      expect(swatch.contrastColor).toMatch(/^oklch\(/);
      expect(swatch.hoverColor).toMatch(/^oklch\(/);
    }
  });
});
