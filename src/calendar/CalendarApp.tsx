"use client";

import "temporal-polyfill/global";
import FullCalendar, {
  type CalendarRef,
  type EventDropInfo,
  type EventResizeDoneInfo,
} from "@fullcalendar/react";
import classicTheme from "@fullcalendar/react/themes/classic";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import {
  useFullCalendarWebMCP,
  type CalendarEvent,
} from "@protocoltooling/fullcalendar";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { persistHumanMove } from "./human-move";
import { LocalCalendarEventRepository } from "./local-calendar-repository";
import { shouldResetFromSearch, stripResetParam } from "./reset";
import {
  createSeedEvents,
  DEMO_INITIAL_DATE,
  DEMO_STORAGE_KEY,
  DEMO_VALID_RANGE,
} from "./seed-events";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";

function subscribe() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

type CalendarAppProps = {
  /** Test seam: inject a repository instead of constructing the browser-local default. */
  repository?: LocalCalendarEventRepository;
};

export function CalendarApp({ repository: injectedRepository }: CalendarAppProps = {}) {
  const calendarRef = useRef<CalendarRef>(null);
  const isClient = useIsClient();
  const [repository] = useState(
    () =>
      injectedRepository ??
      new LocalCalendarEventRepository({
        seedEvents: createSeedEvents(),
        storageKey: DEMO_STORAGE_KEY,
      }),
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const reloadEvents = useCallback(async () => {
    setEvents(await repository.list());
  }, [repository]);

  useEffect(() => {
    if (!isClient) return;

    if (shouldResetFromSearch(window.location.search)) {
      repository.resetToSeeds();
      window.history.replaceState(
        {},
        "",
        stripResetParam(window.location.href),
      );
    }

    // Initial hydrate from the authoritative repository (localStorage).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async store read on client mount
    void reloadEvents();
  }, [isClient, repository, reloadEvents]);

  useFullCalendarWebMCP({
    calendarRef,
    events: repository,
    onEventsChanged: reloadEvents,
  });

  const onHumanMove = useCallback(
    async (info: EventDropInfo | EventResizeDoneInfo) => {
      await persistHumanMove(repository, info, reloadEvents);
    },
    [repository, reloadEvents],
  );

  return (
    <div className="calendar-surface" data-testid="calendar-surface">
      {isClient ? (
        <FullCalendar
          ref={calendarRef}
          plugins={[classicTheme, dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate={DEMO_INITIAL_DATE}
          validRange={DEMO_VALID_RANGE}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          editable
          events={events.map((event) => ({
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end ?? undefined,
            allDay: event.allDay,
          }))}
          height="100%"
          eventDrop={(info) => void onHumanMove(info)}
          eventResize={(info) => void onHumanMove(info)}
        />
      ) : null}
    </div>
  );
}
