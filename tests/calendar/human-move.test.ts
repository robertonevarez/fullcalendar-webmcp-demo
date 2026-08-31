import { describe, expect, it, vi } from "vitest";
import { persistHumanMove, type HumanMoveInfo } from "@/calendar/human-move";
import type { CalendarEventRepository } from "@protocoltooling/fullcalendar";

function moveInfo(overrides: Partial<HumanMoveInfo["event"]> = {}): HumanMoveInfo {
  return {
    event: {
      id: "seed-sep-site-survey",
      title: "Site Survey — North Campus",
      start: new Date("2026-09-02T08:00:00-04:00"),
      end: new Date("2026-09-02T10:00:00-04:00"),
      allDay: false,
      startStr: "2026-09-02T08:00:00-04:00",
      endStr: "2026-09-02T10:00:00-04:00",
      ...overrides,
    },
    revert: vi.fn(),
  };
}

describe("persistHumanMove", () => {
  it("persists a timed drag then reloads host events", async () => {
    const start = new Date("2026-09-03T14:00:00-04:00");
    const end = new Date("2026-09-03T16:00:00-04:00");
    const update = vi.fn().mockResolvedValue({
      id: "seed-sep-site-survey",
      title: "Site Survey — North Campus",
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: false,
    });
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    const repository = { update } as unknown as CalendarEventRepository;
    const info = moveInfo({
      start,
      end,
      allDay: false,
      startStr: "2026-09-03T14:00:00-04:00",
      endStr: "2026-09-03T16:00:00-04:00",
    });

    await persistHumanMove(repository, info, reloadEvents);

    expect(update).toHaveBeenCalledWith("seed-sep-site-survey", {
      title: "Site Survey — North Campus",
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: false,
    });
    expect(reloadEvents).toHaveBeenCalledOnce();
    expect(info.revert).not.toHaveBeenCalled();
  });

  it("persists a timed resize then reloads host events", async () => {
    const start = new Date("2026-09-02T08:00:00-04:00");
    const end = new Date("2026-09-02T11:30:00-04:00");
    const update = vi.fn().mockResolvedValue({
      id: "seed-sep-site-survey",
      title: "Site Survey — North Campus",
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: false,
    });
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    const repository = { update } as unknown as CalendarEventRepository;
    const info = moveInfo({ start, end });

    await persistHumanMove(repository, info, reloadEvents);

    expect(update).toHaveBeenCalledWith("seed-sep-site-survey", {
      title: "Site Survey — North Campus",
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: false,
    });
    expect(reloadEvents).toHaveBeenCalledOnce();
  });

  it("captures allDay when a move lands in the all-day region", async () => {
    const update = vi.fn().mockResolvedValue({
      id: "seed-sep-site-survey",
      title: "Site Survey — North Campus",
      start: "2026-09-03",
      end: null,
      allDay: true,
    });
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    const repository = { update } as unknown as CalendarEventRepository;
    const info = moveInfo({
      start: new Date("2026-09-03T00:00:00"),
      end: null,
      allDay: true,
      startStr: "2026-09-03",
      endStr: "",
    });

    await persistHumanMove(repository, info, reloadEvents);

    expect(update).toHaveBeenCalledWith("seed-sep-site-survey", {
      title: "Site Survey — North Campus",
      start: "2026-09-03",
      end: null,
      allDay: true,
    });
  });

  it("reverts the FullCalendar optimistic move when update rejects", async () => {
    const repository = {
      update: vi.fn().mockRejectedValue(new Error("persist failed")),
    } as unknown as CalendarEventRepository;
    const reloadEvents = vi.fn();
    const info = moveInfo();

    await persistHumanMove(repository, info, reloadEvents);

    expect(info.revert).toHaveBeenCalledOnce();
    expect(reloadEvents).not.toHaveBeenCalled();
  });
});

describe("human → agent convergence", () => {
  it("exposes the latest timed values through repository reads after a human move", async () => {
    const { LocalCalendarEventRepository } = await import(
      "@/calendar/local-calendar-repository"
    );
    const { createSeedEvents, DEMO_STORAGE_KEY } = await import(
      "@/calendar/seed-events"
    );

    const map = new Map<string, string>();
    const storage: Storage = {
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

    const repository = new LocalCalendarEventRepository({
      storage,
      storageKey: DEMO_STORAGE_KEY,
      seedEvents: createSeedEvents(),
    });

    const start = new Date("2026-09-03T14:00:00-04:00");
    const end = new Date("2026-09-03T16:00:00-04:00");
    const info = moveInfo({ start, end });
    await persistHumanMove(repository, info, async () => undefined);

    const agentView = await repository.get("seed-sep-site-survey");
    expect(agentView?.start).toBe(start.toISOString());
    expect(agentView?.end).toBe(end.toISOString());
    expect(agentView?.allDay).toBe(false);

    const listed = await repository.list({
      start: "2026-09-03T12:00:00-04:00",
      end: "2026-09-03T18:00:00-04:00",
      text: "Site Survey",
    });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe("seed-sep-site-survey");
  });
});
