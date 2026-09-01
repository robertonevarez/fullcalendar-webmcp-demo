"use client";

import type { EventDisplayInfo, MountInfo } from "@fullcalendar/react";
import type {
  CalendarEvent,
  CalendarEventRepository,
} from "@protocoltooling/fullcalendar";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { CalendarMutationBus } from "./mutation-bus";
import { eventSelector } from "./mutation-marks";
import {
  announcementFor,
  calendarDayKey,
  spansMultipleDays,
  type CalendarMutation,
  type MutationKind,
} from "./mutation-signal";
import {
  resetCalendarMotion,
  runCalendarMotion,
  type TimeDirection,
} from "./event-motion";

const ANNOUNCE_DEBOUNCE_MS = 150;

type QueuedAnnouncement = {
  text: string;
  kind: MutationKind;
};

const BULK_VERB: Record<MutationKind, string> = {
  created: "added",
  removed: "removed",
  rescheduled: "moved",
  updated: "updated",
};

/** One sentence for one change; one count for a bulk edit. */
function summarize(queued: QueuedAnnouncement[]): string {
  if (queued.length === 0) return "";
  if (queued.length === 1) return queued[0]!.text;

  const kinds = new Set(queued.map((item) => item.kind));
  const verb = kinds.size === 1 ? BULK_VERB[queued[0]!.kind] : "updated";
  return `${queued.length} events ${verb}.`;
}

/** Which way through time a mutation carried the event, if at all. */
function timeDirection(signal: CalendarMutation): TimeDirection {
  if (!signal.before || !signal.after) return 0;
  const delta =
    Date.parse(signal.after.start) - Date.parse(signal.before.start);
  if (!Number.isFinite(delta) || delta === 0) return 0;
  return delta > 0 ? 1 : -1;
}

type FocusAnchor = {
  id: string;
  inner: boolean;
} | null;

/**
 * Records where focus lives before a commit.
 *
 * A rescheduled event is torn down and rebuilt, so without this a keyboard user
 * loses their place to `<body>` whenever the agent touches the focused event.
 */
function captureFocus(frame: HTMLElement | null): FocusAnchor {
  if (!frame || typeof document === "undefined") return null;
  const active = document.activeElement as HTMLElement | null;
  if (!active || !frame.contains(active)) return null;
  const host = active.closest<HTMLElement>("[data-pt-event-id]");
  const id = host?.dataset.ptEventId;
  if (!host || !id) return null;
  return { id, inner: active !== host };
}

function restoreFocus(frame: HTMLElement | null, anchor: FocusAnchor): void {
  if (!frame || !anchor || typeof document === "undefined") return;
  const active = document.activeElement;
  if (active && active !== document.body && frame.contains(active)) return;

  const host = frame.querySelector<HTMLElement>(eventSelector(anchor.id));
  if (!host) return;

  const target = anchor.inner
    ? (host.querySelector<HTMLElement>(".pt-event__title-trigger") ?? host)
    : host;
  target.focus?.();
}

export type UseCalendarMutationsOptions = {
  repository: CalendarEventRepository;
  frameRef: React.RefObject<HTMLDivElement | null>;
};

export type UseCalendarMutationsResult = {
  events: CalendarEvent[];
  /** Passed to WebMCP as `onEventsChanged`, and used for the initial hydrate. */
  reload: () => Promise<void>;
  agentRepository: CalendarEventRepository;
  humanRepository: CalendarEventRepository;
  onEventDidMount: (info: MountInfo<EventDisplayInfo>) => void;
  onViewChanged: () => void;
  announcement: string;
};

/**
 * Turns successful repository writes into semantic UI feedback.
 *
 * Mutations arrive as signals from the repository decorator, are serialized
 * through a promise chain so overlapping WebMCP calls cannot fight over the
 * same elements, and are committed either with or without the spatial layer
 * depending on the gates in `event-motion.ts`.
 */
export function useCalendarMutations({
  repository,
  frameRef,
}: UseCalendarMutationsOptions): UseCalendarMutationsResult {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [bus] = useState(() => new CalendarMutationBus(repository));

  // While a mutation is animating, `eventDidMount` must not stamp emphasis onto
  // the node — the ring is applied once the motion settles instead.
  const marksSuspendedRef = useRef(false);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const depthRef = useRef(0);

  const announceQueueRef = useRef<QueuedAnnouncement[]>([]);
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (announceTimerRef.current !== null) {
        clearTimeout(announceTimerRef.current);
      }
      bus.dispose();
    };
  }, [bus]);

  const announce = useCallback(
    (signal: CalendarMutation, moreQueued: boolean) => {
      const text = announcementFor(signal);
      if (!text) return;

      announceQueueRef.current.push({ text, kind: signal.kind });

      // Hold the announcement while more mutations are still queued. Motion
      // paces them further apart than any debounce would catch, so a bulk edit
      // would otherwise read out one sentence per event.
      if (moreQueued) return;

      if (announceTimerRef.current !== null) {
        clearTimeout(announceTimerRef.current);
      }
      announceTimerRef.current = setTimeout(() => {
        const queued = announceQueueRef.current;
        announceQueueRef.current = [];
        announceTimerRef.current = null;
        setAnnouncement(summarize(queued));
      }, ANNOUNCE_DEBOUNCE_MS);
    },
    [],
  );

  const runMutation = useCallback(
    async (
      signal: CalendarMutation,
      next: CalendarEvent[],
      queueDepth: number,
    ) => {
      const frame = frameRef.current;

      // `removed` never reaches the DOM — there is nothing left to emphasize.
      if (signal.kind !== "removed") {
        bus.mark(signal.id, signal.kind);
      }
      announce(signal, queueDepth > 0);

      const anchor = captureFocus(frame);

      marksSuspendedRef.current = true;
      try {
        await runCalendarMotion({
          eventId: signal.id,
          kind: signal.kind,
          frame,
          sourceDayKey: signal.before
            ? calendarDayKey(signal.before.start)
            : null,
          destinationDayKey: signal.after
            ? calendarDayKey(signal.after.start)
            : null,
          direction: timeDirection(signal),
          multiSegment:
            spansMultipleDays(signal.before) || spansMultipleDays(signal.after),
          queueDepth,
          commit: () => {
            flushSync(() => {
              setEvents(next);
            });
            restoreFocus(frameRef.current, anchor);
          },
        });
      } finally {
        marksSuspendedRef.current = false;
        // The ring lands once the event has arrived, not while it travels.
        bus.syncMarks(frameRef.current);
      }
    },
    [announce, bus, frameRef],
  );

  const enqueue = useCallback(
    (signal: CalendarMutation, next: CalendarEvent[]) => {
      depthRef.current += 1;
      const task = async () => {
        // Everything still waiting behind this one, excluding itself.
        const queueDepth = depthRef.current - 1;
        try {
          await runMutation(signal, next, queueDepth);
        } finally {
          depthRef.current -= 1;
        }
      };
      const run = chainRef.current.then(task, task);
      chainRef.current = run.catch(() => {});
      return run;
    },
    [runMutation],
  );

  const reload = useCallback(async () => {
    const next = await repository.list();
    const signal = bus.takeAgentMutation();

    if (!signal) {
      // Ordinary reconciliation: hydrate, ?reset=1, or a human drag that has
      // already moved the element under the pointer.
      setEvents(next);
      return;
    }

    await enqueue(signal, next);
  }, [bus, enqueue, repository]);

  const onEventDidMount = useCallback(
    (info: MountInfo<EventDisplayInfo>) => {
      const element = info.el;
      element.dataset.ptEventId = info.event.id;

      if (marksSuspendedRef.current) return;

      const mark = bus.markFor(info.event.id);
      if (!mark) return;

      // Deferred emphasis: an event mutated off-screen plays its treatment when
      // the user navigates to it, instead of the calendar chasing the mutation.
      element.dataset.ptMutation = mark.kind;
      element.dataset.ptMutationAt = String(mark.markedAt);
    },
    [bus],
  );

  const onViewChanged = useCallback(() => {
    // Never animate across a view change; the whole grid is different.
    resetCalendarMotion();
    bus.syncMarks(frameRef.current);
  }, [bus, frameRef]);

  return {
    events,
    reload,
    agentRepository: bus.agent,
    humanRepository: bus.human,
    onEventDidMount,
    onViewChanged,
    announcement,
  };
}
