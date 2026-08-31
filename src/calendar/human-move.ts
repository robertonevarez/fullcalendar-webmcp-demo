import type {
  CalendarEventRepository,
  UpdateCalendarEventInput,
} from "@protocoltooling/fullcalendar";

export type HumanMoveInfo = {
  event: {
    id: string;
    title: string;
    start: Date | null;
    end: Date | null;
    allDay: boolean;
    startStr: string;
    endStr: string;
  };
  revert: () => void;
};

export function patchFromMove(
  info: HumanMoveInfo,
): UpdateCalendarEventInput | null {
  const { event } = info;
  if (!event.start) return null;

  return {
    title: event.title,
    start: event.allDay ? event.startStr : event.start.toISOString(),
    end: event.end
      ? event.allDay
        ? event.endStr
        : event.end.toISOString()
      : null,
    allDay: event.allDay,
  };
}

/**
 * Human drag/resize → repository.update → host reload.
 * On failure, reverts the FullCalendar optimistic UI change.
 */
export async function persistHumanMove(
  repository: CalendarEventRepository,
  info: HumanMoveInfo,
  reloadEvents: () => Promise<unknown>,
): Promise<void> {
  const patch = patchFromMove(info);
  if (!patch) {
    info.revert();
    return;
  }

  try {
    await repository.update(info.event.id, patch);
    await reloadEvents();
  } catch {
    info.revert();
  }
}
