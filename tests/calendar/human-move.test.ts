import { describe, expect, it, vi } from "vitest";
import { persistHumanMove, type HumanMoveInfo } from "@/calendar/human-move";
import type { CalendarEventRepository } from "@protocoltooling/fullcalendar";

function moveInfo(overrides: Partial<HumanMoveInfo["event"]> = {}): HumanMoveInfo {
  return {
    event: {
      id: "seed-site-survey",
      title: "Site Survey — North Campus",
      start: new Date("2026-08-20T00:00:00"),
      end: null,
      allDay: true,
      startStr: "2026-08-20",
      endStr: "",
      ...overrides,
    },
    revert: vi.fn(),
  };
}

describe("persistHumanMove", () => {
  it("updates the repository then reloads host events", async () => {
    const update = vi.fn().mockResolvedValue({
      id: "seed-site-survey",
      title: "Site Survey — North Campus",
      start: "2026-08-20",
      end: null,
      allDay: true,
    });
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    const repository = { update } as unknown as CalendarEventRepository;
    const info = moveInfo();

    await persistHumanMove(repository, info, reloadEvents);

    expect(update).toHaveBeenCalledWith("seed-site-survey", {
      title: "Site Survey — North Campus",
      start: "2026-08-20",
      end: null,
      allDay: true,
    });
    expect(reloadEvents).toHaveBeenCalledOnce();
    expect(info.revert).not.toHaveBeenCalled();
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
