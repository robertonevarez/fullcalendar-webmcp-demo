import { beforeEach, describe, expect, it } from "vitest";
import { LocalCalendarEventRepository } from "@/calendar/local-calendar-repository";
import { createSeedEvents } from "@/calendar/seed-events";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
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

describe("LocalCalendarEventRepository", () => {
  let repository: LocalCalendarEventRepository;

  beforeEach(() => {
    repository = new LocalCalendarEventRepository({
      storage: memoryStorage(),
      seedEvents: createSeedEvents(new Date(2026, 7, 1)),
      createId: () => "created-1",
    });
  });

  it("seeds deterministic enterprise events on first read", async () => {
    const events = await repository.list();
    expect(events.length).toBe(10);
    expect(events.map((event) => event.id)).toContain("seed-site-survey");
  });

  it("persists human/agent updates through the repository", async () => {
    await repository.update("seed-site-survey", {
      start: "2026-08-20",
      end: null,
      allDay: true,
    });

    const moved = await repository.get("seed-site-survey");
    expect(moved?.start).toBe("2026-08-20");

    const listed = await repository.list();
    expect(listed.find((event) => event.id === "seed-site-survey")?.start).toBe(
      "2026-08-20",
    );
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
});
