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
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { updateEventInState } from "./event-ops";
import { createSeedEvents } from "./seed-events";
import type { CalendarEvent } from "./types";

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
  const [events, setEvents] = useState<CalendarEvent[]>(() => createSeedEvents());

  const onHumanMove = useCallback((info: EventDropInfo | EventResizeDoneInfo) => {
    const patch = patchFromMove(info);
    if (!patch) {
      info.revert();
      return;
    }
    setEvents((current) => updateEventInState(current, info.event.id, patch));
  }, []);

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
          eventDrop={onHumanMove}
          eventResize={onHumanMove}
        />
      ) : null}
    </div>
  );
}
