import { beforeEach, describe, expect, it } from "vitest";
import {
  LocalCalendarEventRepository,
  parseStoredEvents,
  storageKeyForMonth,
} from "@/calendar/local-calendar-repository";
import { createSeedEvents } from "@/calendar/seed-events";

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
      "protocoltooling-demo:calendar-events:v1:2026-08",
    );
    expect(storageKeyForMonth(new Date(2026, 8, 1))).toBe(
      "protocoltooling-demo:calendar-events:v1:2026-09",
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
    const events = createSeedEvents(new Date(2026, 7, 1));
    expect(parseStoredEvents(JSON.stringify(events))).toEqual(events);
  });
});

describe("LocalCalendarEventRepository", () => {
  const seed = createSeedEvents(new Date(2026, 7, 1));
  const key = storageKeyForMonth(new Date(2026, 7, 1));
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
    expect(events.length).toBe(10);
    expect(events.map((event) => event.id)).toContain("seed-site-survey");
    expect(JSON.parse(storage.getItem(key)!)).toHaveLength(10);
  });

  it("persists human/agent updates through the repository", async () => {
    await repository.update("seed-site-survey", {
      start: "2026-08-20",
      end: null,
      allDay: true,
    });

    const moved = await repository.get("seed-site-survey");
    expect(moved?.start).toBe("2026-08-20");
  });

  it("creates and deletes events through the same store", async () => {
    const created = await repository.create({
      title: "Commissioning — Lab 2",
      start: "2026-08-21",
      end: null,
      allDay: true,
    });
    expect(created.id).toBe("created-1");

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

  it("resetToSeeds restores the deterministic seed set", async () => {
    await repository.update("seed-site-survey", {
      start: "2026-08-28",
      end: null,
      allDay: true,
    });
    expect((await repository.get("seed-site-survey"))?.start).toBe("2026-08-28");

    const restored = repository.resetToSeeds();
    expect(restored.find((event) => event.id === "seed-site-survey")?.start).toBe(
      "2026-08-03",
    );
    expect(await repository.list()).toEqual(seed);
  });

  it("keeps August and September demo state independent", async () => {
    await repository.update("seed-site-survey", {
      start: "2026-08-20",
      end: null,
      allDay: true,
    });

    const september = new LocalCalendarEventRepository({
      storage,
      storageKey: storageKeyForMonth(new Date(2026, 8, 1)),
      seedEvents: createSeedEvents(new Date(2026, 8, 1)),
    });

    const septEvents = await september.list();
    expect(septEvents.find((event) => event.id === "seed-site-survey")?.start).toBe(
      "2026-09-03",
    );
    expect((await repository.get("seed-site-survey"))?.start).toBe("2026-08-20");
  });
});
