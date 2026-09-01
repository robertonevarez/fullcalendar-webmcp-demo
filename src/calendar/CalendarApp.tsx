"use client";

import "temporal-polyfill/global";
import FullCalendar, {
  type CalendarApi,
  type CalendarRef,
  type DatesSetInfo,
  type EventDropInfo,
  type EventResizeDoneInfo,
} from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import pulseTheme from "@fullcalendar/react/themes/pulse";
import {
  useFullCalendarWebMCP,
  type CalendarEvent,
} from "@protocoltooling/fullcalendar";
import { Tooltip } from "@base-ui/react/tooltip";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  CalendarEventContent,
} from "./CalendarEventContent";
import { CalendarToolbar } from "./CalendarToolbar";
import {
  isCalendarViewType,
  type CalendarViewType,
} from "./calendar-views";
import { persistHumanMove } from "./human-move";
import { LocalCalendarEventRepository } from "./local-calendar-repository";
import { paletteForEventId } from "./event-palette";
import { shouldResetFromSearch, stripResetParam } from "./reset";
import {
  createSeedEvents,
  DEMO_INITIAL_DATE,
  DEMO_STORAGE_KEY,
  DEMO_TIME_ZONE,
  DEMO_VALID_RANGE,
} from "./seed-events";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/pulse/theme.css";
import "@fullcalendar/react/themes/pulse/palettes/blue.css";
import "./calendar-theme.css";

function subscribe() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

type NavButtonState = {
  isDisabled: boolean;
};

type CalendarApiWithButtons = CalendarApi & {
  getButtonState: () => {
    prev: NavButtonState;
    next: NavButtonState;
    today: NavButtonState;
  };
};

function readButtonState(api: CalendarApi) {
  const withButtons = api as CalendarApiWithButtons;
  if (typeof withButtons.getButtonState !== "function") {
    return { prevDisabled: false, nextDisabled: false, todayDisabled: false };
  }
  const state = withButtons.getButtonState();
  return {
    prevDisabled: state.prev.isDisabled,
    nextDisabled: state.next.isDisabled,
    todayDisabled: state.today.isDisabled,
  };
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
  const [title, setTitle] = useState("September 2026");
  const [viewType, setViewType] = useState<CalendarViewType>("dayGridMonth");
  const [prevDisabled, setPrevDisabled] = useState(false);
  const [nextDisabled, setNextDisabled] = useState(false);
  const [todayDisabled, setTodayDisabled] = useState(false);

  const reloadEvents = useCallback(async () => {
    setEvents(await repository.list());
  }, [repository]);

  const syncFromCalendar = useCallback((api: CalendarApi) => {
    const nextView = api.view.type;
    if (isCalendarViewType(nextView)) {
      setViewType(nextView);
    }
    setTitle(api.view.title);
    const nav = readButtonState(api);
    setPrevDisabled(nav.prevDisabled);
    setNextDisabled(nav.nextDisabled);
    setTodayDisabled(nav.todayDisabled);
  }, []);

  const onDatesSet = useCallback(
    (info: DatesSetInfo) => {
      syncFromCalendar(info.view.calendar);
    },
    [syncFromCalendar],
  );

  const getApi = useCallback(() => calendarRef.current?.getApi() ?? null, []);

  const onPrev = useCallback(() => {
    getApi()?.prev();
  }, [getApi]);

  const onNext = useCallback(() => {
    getApi()?.next();
  }, [getApi]);

  const onToday = useCallback(() => {
    getApi()?.today();
  }, [getApi]);

  const onViewChange = useCallback(
    (view: CalendarViewType) => {
      getApi()?.changeView(view);
    },
    [getApi],
  );

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
      <Tooltip.Provider>
        <CalendarToolbar
          title={title}
          viewType={viewType}
          prevDisabled={prevDisabled}
          nextDisabled={nextDisabled}
          todayDisabled={todayDisabled}
          onPrev={onPrev}
          onNext={onNext}
          onToday={onToday}
          onViewChange={onViewChange}
        />
        <div className="calendar-frame">
          {isClient ? (
            <FullCalendar
              ref={calendarRef}
              plugins={[pulseTheme, dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              initialDate={DEMO_INITIAL_DATE}
              validRange={DEMO_VALID_RANGE}
              timeZone={DEMO_TIME_ZONE}
              headerToolbar={false}
              eventTimeFormat={{
                hour: "numeric",
                minute: "2-digit",
                meridiem: "short",
              }}
              displayEventEnd
              editable
              events={events.map((event) => {
                const swatch = paletteForEventId(event.id);
                return {
                  id: event.id,
                  title: event.title,
                  start: event.start,
                  end: event.end ?? undefined,
                  allDay: event.allDay,
                  // Presentation-only FullCalendar EventUi inputs — not persisted.
                  color: swatch.color,
                  contrastColor: swatch.contrastColor,
                };
              })}
              eventContent={CalendarEventContent}
              height="100%"
              expandRows={false}
              slotMinHeight={28}
              eventMinHeight={16}
              datesSet={onDatesSet}
              dayCellDidMount={(info) => {
                info.el.dataset.ptDay = info.isOther ? "other" : "current";
                if (info.isToday) {
                  info.el.dataset.ptToday = "true";
                } else {
                  delete info.el.dataset.ptToday;
                }
              }}
              eventDrop={(info) => void onHumanMove(info)}
              eventResize={(info) => void onHumanMove(info)}
            />
          ) : null}
        </div>
      </Tooltip.Provider>
    </div>
  );
}
