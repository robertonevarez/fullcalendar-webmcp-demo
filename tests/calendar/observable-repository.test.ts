import { describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@protocoltooling/fullcalendar";

import { LocalCalendarEventRepository } from "@/calendar/local-calendar-repository";
import type { CalendarMutation } from "@/calendar/mutation-signal";
import { withMutationSignals } from "@/calendar/observable-repository";

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

function harness(origin: "agent" | "human" = "agent") {
  const signals: CalendarMutation[] = [];
  const inner = new LocalCalendarEventRepository({
    storage: memoryStorage(),
    storageKey: "test:v4",
    seedEvents: [seed],
    createId: () => "created-1",
  });
  const repository = withMutationSignals(
    inner,
    (signal) => signals.push(signal),
    origin,
  );
  return { inner, repository, signals };
}

describe("withMutationSignals", () => {
  it("emits a created signal carrying the persisted event", async () => {
    const { repository, signals } = harness();

    const created = await repository.create({
      title: "Equipment Inspection",
      start: "2026-09-04T13:00:00.000Z",
      end: "2026-09-04T14:30:00.000Z",
    });

    expect(created.id).toBe("created-1");
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      kind: "created",
      origin: "agent",
      id: "created-1",
    });
    expect(signals[0]!.after?.title).toBe("Equipment Inspection");
  });

  it("emits a reschedule with both the before and after state", async () => {
    const { repository, signals } = harness();

    await repository.update("seed-1", {
      start: "2026-09-20T18:00:00.000Z",
      end: "2026-09-20T19:30:00.000Z",
    });

    expect(signals).toHaveLength(1);
    const signal = signals[0]!;
    expect(signal.kind).toBe("rescheduled");
    expect(signal.before?.start).toBe("2026-09-02T12:00:00.000Z");
    expect(signal.after?.start).toBe("2026-09-20T18:00:00.000Z");
  });

  it("distinguishes an in-place rename from a reschedule", async () => {
    const { repository, signals } = harness();

    await repository.update("seed-1", { title: "Site Survey — North Campus" });

    expect(signals[0]!.kind).toBe("updated");
  });

  it("emits a removal carrying the event that was deleted", async () => {
    const { repository, signals } = harness();

    await repository.delete("seed-1");

    expect(signals).toHaveLength(1);
    expect(signals[0]!.kind).toBe("removed");
    expect(signals[0]!.before?.title).toBe("Site Survey");
  });

  it("tags the configured origin", async () => {
    const { repository, signals } = harness("human");

    await repository.update("seed-1", {
      start: "2026-09-20T18:00:00.000Z",
      end: "2026-09-20T19:30:00.000Z",
    });

    expect(signals[0]!.origin).toBe("human");
  });

  it("emits nothing when the write fails", async () => {
    const { repository, signals } = harness();

    await expect(
      repository.update("does-not-exist", { title: "Ghost" }),
    ).rejects.toThrow(/was not found/);
    await expect(repository.delete("does-not-exist")).rejects.toThrow(
      /was not found/,
    );
    await expect(repository.create({ title: "  ", start: seed.start })).rejects.toThrow();

    expect(signals).toHaveLength(0);
  });

  it("never lets a listener failure break persistence", async () => {
    const inner = new LocalCalendarEventRepository({
      storage: memoryStorage(),
      storageKey: "test:v4",
      seedEvents: [seed],
      createId: () => "created-1",
    });
    const repository = withMutationSignals(
      inner,
      () => {
        throw new Error("listener exploded");
      },
      "agent",
    );

    await expect(repository.delete("seed-1")).resolves.toBeUndefined();
    expect(await inner.get("seed-1")).toBeNull();
  });

  it("passes reads straight through", async () => {
    const { inner, repository } = harness();
    const listSpy = vi.spyOn(inner, "list");

    await repository.list({ text: "site" });

    expect(listSpy).toHaveBeenCalledWith({ text: "site" }, undefined);
  });
});
