import { describe, expect, it } from "vitest";
import type { CalendarEvent } from "@protocoltooling/fullcalendar";

import { LocalCalendarEventRepository } from "@/calendar/local-calendar-repository";
import { CalendarMutationBus, SIGNAL_STALE_MS } from "@/calendar/mutation-bus";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => void map.delete(key),
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

const seed: CalendarEvent = {
  id: "seed-1",
  title: "Site Survey",
  start: "2026-09-02T12:00:00.000Z",
  end: "2026-09-02T13:30:00.000Z",
  allDay: false,
};

function busWithClock() {
  let clock = 10_000;
  const inner = new LocalCalendarEventRepository({
    storage: memoryStorage(),
    storageKey: "test:v4",
    seedEvents: [seed],
    createId: () => "created-1",
  });
  const bus = new CalendarMutationBus(inner, () => clock);
  return {
    bus,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

describe("CalendarMutationBus", () => {
  it("hands the agent signal to the refresh that follows it", async () => {
    const { bus } = busWithClock();

    await bus.agent.create({ title: "Equipment Inspection", start: seed.start });

    expect(bus.takeAgentMutation()).toMatchObject({
      kind: "created",
      origin: "agent",
      id: "created-1",
    });
  });

  it("consumes the signal so a second refresh reads as ordinary", async () => {
    const { bus } = busWithClock();

    await bus.agent.delete("seed-1");

    expect(bus.takeAgentMutation()).not.toBeNull();
    expect(bus.takeAgentMutation()).toBeNull();
  });

  it("returns null with no signal at all", () => {
    const { bus } = busWithClock();
    expect(bus.takeAgentMutation()).toBeNull();
  });

  it("withholds human drag/resize, which the pointer already showed", async () => {
    const { bus } = busWithClock();

    await bus.human.update("seed-1", {
      start: "2026-09-20T18:00:00.000Z",
      end: "2026-09-20T19:30:00.000Z",
    });

    expect(bus.peekOrigin()).toBe("human");
    expect(bus.takeAgentMutation()).toBeNull();
  });

  it("drops a signal whose refresh never arrived", async () => {
    const { bus, advance } = busWithClock();

    await bus.agent.create({ title: "Orphan", start: seed.start });
    advance(SIGNAL_STALE_MS + 1);

    expect(bus.takeAgentMutation()).toBeNull();
  });

  it("keeps a signal that is consumed promptly", async () => {
    const { bus, advance } = busWithClock();

    await bus.agent.create({ title: "Prompt", start: seed.start });
    advance(SIGNAL_STALE_MS - 1);

    expect(bus.takeAgentMutation()).not.toBeNull();
  });

  it("queues every signal when writes outpace refreshes", async () => {
    const { bus } = busWithClock();

    // Concurrent tool calls all write before any of them refreshes. A single
    // slot would drop everything but the last, and those mutations would land
    // on screen with no feedback at all.
    await bus.agent.create({ title: "First", start: seed.start });
    await bus.agent.delete("seed-1");

    expect(bus.pendingCount).toBe(2);
    expect(bus.takeAgentMutation()).toMatchObject({
      kind: "created",
      id: "created-1",
    });
    expect(bus.takeAgentMutation()).toMatchObject({
      kind: "removed",
      id: "seed-1",
    });
    expect(bus.takeAgentMutation()).toBeNull();
  });

  it("skips a stale head but still delivers the fresh signal behind it", async () => {
    const { bus, advance } = busWithClock();

    await bus.agent.create({ title: "Orphaned", start: seed.start });
    advance(SIGNAL_STALE_MS + 1);
    await bus.agent.delete("seed-1");

    expect(bus.takeAgentMutation()).toMatchObject({ kind: "removed" });
  });

  it("skips a human signal without swallowing the agent signal behind it", async () => {
    const { bus } = busWithClock();

    await bus.human.update("seed-1", {
      start: "2026-09-20T18:00:00.000Z",
      end: "2026-09-20T19:30:00.000Z",
    });
    await bus.agent.delete("seed-1");

    expect(bus.takeAgentMutation()).toMatchObject({
      kind: "removed",
      origin: "agent",
    });
  });

  it("emits no signal when the underlying write fails", async () => {
    const { bus } = busWithClock();

    await expect(bus.agent.delete("missing")).rejects.toThrow();

    expect(bus.takeAgentMutation()).toBeNull();
  });

  it("stamps and expires DOM marks through the same clock", async () => {
    const { bus, advance } = busWithClock();

    bus.mark("seed-1", "rescheduled");
    expect(bus.markFor("seed-1")).toMatchObject({ kind: "rescheduled" });

    advance(9_000);
    expect(bus.markFor("seed-1")).toBeNull();
  });

  it("drops everything on dispose", async () => {
    const { bus } = busWithClock();

    await bus.agent.create({ title: "Gone", start: seed.start });
    bus.mark("seed-1", "created");
    bus.dispose();

    expect(bus.takeAgentMutation()).toBeNull();
    expect(bus.markFor("seed-1")).toBeNull();
  });
});
