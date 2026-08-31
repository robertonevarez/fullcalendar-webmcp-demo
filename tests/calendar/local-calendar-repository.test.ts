import { beforeEach, describe, expect, it } from "vitest";
import {
  LocalCalendarEventRepository,
  parseStoredEvents,
  storageKeyForMonth,
} from "@/calendar/local-calendar-repository";
import { createSeedEvents, DEMO_STORAGE_KEY } from "@/calendar/seed-events";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("storageKeyForMonth", () => {
  it("scopes the persistence key to year-month", () => {
    expect(storageKeyForMonth(new Date(2026, 7, 15))).toBe(
      "protocoltooling-demo:calendar-events:v2:2026-08",
    );
    expect(storageKeyForMonth(new Date(2026, 8, 1))).toBe(
      "protocoltooling-demo:calendar-events:v2:2026-09",
    );
  });
});

describe("parseStoredEvents", () => {
  it("rejects non-array JSON and structurally invalid events", () => {
    expect(parseStoredEvents("{}")).toBeNull();
    expect(parseStoredEvents('{"events":[]}')).toBeNull();
    expect(parseStoredEvents('[{"id":"x"}]')).toBeNull();
    expect(parseStoredEvents("not-json")).toBeNull();
  });

  it("accepts valid CalendarEvent arrays", () => {
    const events = createSeedEvents();
    expect(parseStoredEvents(JSON.stringify(events))).toEqual(events);
  });
});

describe("LocalCalendarEventRepository", () => {
  const seed = createSeedEvents();
  const key = DEMO_STORAGE_KEY;
  let storage: Storage;
  let repository: LocalCalendarEventRepository;

  beforeEach(() => {
    storage = memoryStorage();
    repository = new LocalCalendarEventRepository({
      storage,
      storageKey: key,
      seedEvents: seed,
      createId: () => "created-1",
    });
  });

  it("seeds deterministic enterprise events on first read", async () => {
    const events = await repository.list();
    expect(events.length).toBe(seed.length);
    expect(events.map((event) => event.id)).toContain("seed-sep-site-survey");
    expect(JSON.parse(storage.getItem(key)!)).toHaveLength(seed.length);
  });

  it("persists timed start/end updates and reloads the same values", async () => {
    await repository.update("seed-sep-project-review", {
      start: "2026-09-15T14:00:00-04:00",
      end: "2026-09-15T15:30:00-04:00",
      allDay: false,
    });

    const moved = await repository.get("seed-sep-project-review");
    expect(moved?.allDay).toBe(false);
    expect(moved?.start).toBe("2026-09-15T18:00:00.000Z");
    expect(moved?.end).toBe("2026-09-15T19:30:00.000Z");

    const reloaded = new LocalCalendarEventRepository({
      storage,
      storageKey: key,
      seedEvents: seed,
    });
    const again = await reloaded.get("seed-sep-project-review");
    expect(again?.start).toBe(moved?.start);
    expect(again?.end).toBe(moved?.end);
  });

  it("supports agent allDay true → timed and timed → allDay updates", async () => {
    await repository.update("seed-sep-inventory-count", {
      allDay: false,
      start: "2026-09-25T08:00:00-04:00",
      end: "2026-09-25T12:00:00-04:00",
    });
    const timed = await repository.get("seed-sep-inventory-count");
    expect(timed?.allDay).toBe(false);
    expect(timed?.start).toBe("2026-09-25T12:00:00.000Z");
    expect(timed?.end).toBe("2026-09-25T16:00:00.000Z");

    await repository.update("seed-sep-site-survey", {
      allDay: true,
      start: "2026-09-02",
      end: null,
    });
    const allDay = await repository.get("seed-sep-site-survey");
    expect(allDay?.allDay).toBe(true);
    expect(allDay?.start).toBe("2026-09-02");
    expect(allDay?.end).toBeNull();
  });

  it("filters timed events by ISO interval boundaries", async () => {
    // Friday Sep 18 afternoon (America/New_York): Staff Training is morning-only
    const afternoon = await repository.list({
      start: "2026-09-18T12:00:00-04:00",
      end: "2026-09-19T00:00:00-04:00",
    });
    expect(afternoon.map((event) => event.id)).not.toContain(
      "seed-sep-staff-training",
    );

    const morning = await repository.list({
      start: "2026-09-18T08:00:00-04:00",
      end: "2026-09-18T12:00:00-04:00",
    });
    expect(morning.map((event) => event.id)).toContain(
      "seed-sep-staff-training",
    );

    // Project Review 10–11 AM overlaps 1–5 PM? No.
    const lateAfternoon = await repository.list({
      start: "2026-09-15T13:00:00-04:00",
      end: "2026-09-15T17:00:00-04:00",
    });
    expect(lateAfternoon.map((event) => event.id)).toContain(
      "seed-sep-compliance-check",
    );
    expect(lateAfternoon.map((event) => event.id)).not.toContain(
      "seed-sep-project-review",
    );
  });

  it("creates and deletes timed events through the same store", async () => {
    const created = await repository.create({
      title: "Commissioning — Lab 2",
      start: "2026-09-21T09:00:00-04:00",
      end: "2026-09-21T10:00:00-04:00",
      allDay: false,
    });
    expect(created.id).toBe("created-1");
    expect(created.allDay).toBe(false);
    expect(created.start).toBe("2026-09-21T13:00:00.000Z");

    await repository.delete(created.id);
    expect(await repository.get(created.id)).toBeNull();
  });

  it("repairs corrupt localStorage payloads by rewriting seeds", async () => {
    storage.setItem(key, "{}");
    const events = await repository.list();
    expect(events).toEqual(seed);
    expect(parseStoredEvents(storage.getItem(key)!)).toEqual(seed);

    storage.setItem(key, '{"events":[]}');
    const again = await new LocalCalendarEventRepository({
      storage,
      storageKey: key,
      seedEvents: seed,
    }).list();
    expect(again).toEqual(seed);
  });

  it("resetToSeeds restores the canonical timed seed set", async () => {
    await repository.update("seed-sep-site-survey", {
      start: "2026-09-28T09:00:00-04:00",
      end: "2026-09-28T10:00:00-04:00",
      allDay: false,
    });
    expect((await repository.get("seed-sep-site-survey"))?.start).toBe(
      "2026-09-28T13:00:00.000Z",
    );

    const restored = repository.resetToSeeds();
    const siteSurvey = restored.find(
      (event) => event.id === "seed-sep-site-survey",
    );
    expect(siteSurvey?.start).toBe("2026-09-02T08:00:00-04:00");
    expect(siteSurvey?.end).toBe("2026-09-02T10:00:00-04:00");
    expect(siteSurvey?.allDay).toBe(false);
    expect(await repository.list()).toEqual(seed);
  });

  it("keeps the demo window store independent from legacy month keys", async () => {
    await repository.update("seed-sep-site-survey", {
      start: "2026-09-20T08:00:00-04:00",
      end: "2026-09-20T10:00:00-04:00",
      allDay: false,
    });

    const legacyAugust = new LocalCalendarEventRepository({
      storage,
      storageKey: storageKeyForMonth(new Date(2026, 7, 1)),
      seedEvents: [
        {
          id: "seed-sep-site-survey",
          title: "Site Survey — North Campus",
          start: "2026-08-03T08:00:00-04:00",
          end: "2026-08-03T10:00:00-04:00",
          allDay: false,
        },
      ],
    });

    expect(
      (await legacyAugust.get("seed-sep-site-survey"))?.start,
    ).toBe("2026-08-03T08:00:00-04:00");
    expect((await repository.get("seed-sep-site-survey"))?.start).toBe(
      "2026-09-20T12:00:00.000Z",
    );
  });
});
