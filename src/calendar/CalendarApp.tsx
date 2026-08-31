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
import { LocalCalendarEventRepository } from "./local-calendar-repository";
import { createSeedEvents } from "./seed-events";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";

function subscribe() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

function patchFromMove(info: EventDropInfo | EventResizeDoneInfo) {
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

export function CalendarApp() {
  const calendarRef = useRef<CalendarRef>(null);
  const isClient = useIsClient();
  const [repository] = useState(
    () =>
      new LocalCalendarEventRepository({
        seedEvents: createSeedEvents(),
      }),
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const reloadEvents = useCallback(async () => {
    setEvents(await repository.list());
  }, [repository]);

  useEffect(() => {
    if (!isClient) return;
    // Initial hydrate from the authoritative repository (localStorage).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async store read on client mount
    void reloadEvents();
  }, [isClient, reloadEvents]);

  useFullCalendarWebMCP({
    calendarRef,
    events: repository,
    onEventsChanged: reloadEvents,
  });

  const onHumanMove = useCallback(
    async (info: EventDropInfo | EventResizeDoneInfo) => {
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
