"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import type { EventDisplayInfo } from "@fullcalendar/react";
import { useLayoutEffect, useRef, useState } from "react";

export type EventPresentationMeta = {
  location?: string;
  team?: string;
  attendees?: string[];
};

/** Split "Name — Place" enterprise titles into headline + place. */
export function splitEnterpriseTitle(title: string): {
  headline: string;
  place?: string;
} {
  const sep = " — ";
  const index = title.indexOf(sep);
  if (index === -1) return { headline: title };
  const headline = title.slice(0, index).trim();
  const place = title.slice(index + sep.length).trim();
  if (!headline || !place) return { headline: title };
  return { headline, place };
}

function readMeta(info: EventDisplayInfo): EventPresentationMeta {
  const props = info.event.extendedProps as Record<string, unknown>;
  const location =
    typeof props.location === "string" && props.location
      ? props.location
      : undefined;
  const team =
    typeof props.team === "string" && props.team ? props.team : undefined;
  const attendees = Array.isArray(props.attendees)
    ? props.attendees.filter((a): a is string => typeof a === "string")
    : undefined;
  return {
    location,
    team,
    attendees: attendees?.length ? attendees : undefined,
  };
}

function formatAttendees(attendees: string[]): string {
  if (attendees.length <= 2) return attendees.join(", ");
  return `${attendees.slice(0, 2).join(", ")} +${attendees.length - 2}`;
}

function resolvePlace(
  meta: EventPresentationMeta,
  placeFromTitle?: string,
): string | undefined {
  return meta.location ?? placeFromTitle;
}

function detailLine(
  meta: EventPresentationMeta,
  place?: string,
): string | null {
  const parts: string[] = [];
  if (place) parts.push(place);
  if (meta.team) parts.push(meta.team);
  if (meta.attendees?.length) parts.push(formatAttendees(meta.attendees));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function useIsTruncated(measureKey: string) {
  const ref = useRef<HTMLElement>(null);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      setTruncated(
        el.scrollWidth > el.clientWidth + 1 ||
          el.scrollHeight > el.clientHeight + 1,
      );
    };

    measure();
    const raf = requestAnimationFrame(() => {
      measure();
      requestAnimationFrame(measure);
    });

    if (typeof ResizeObserver === "undefined") {
      return () => cancelAnimationFrame(raf);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.parentElement) observer.observe(el.parentElement);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [measureKey]);

  return { ref, truncated };
}

function EventTooltipBody({
  title,
  timeText,
  meta,
  place,
  allDay,
}: {
  title: string;
  timeText: string;
  meta: EventPresentationMeta;
  place?: string;
  allDay: boolean;
}) {
  return (
    <>
      <div className="pt-event-tooltip__title">{title}</div>
      <div className="pt-event-tooltip__time">
        {allDay ? "All day" : timeText || "Timed"}
      </div>
      {place ? <div className="pt-event-tooltip__meta">{place}</div> : null}
      {meta.team ? (
        <div className="pt-event-tooltip__meta">{meta.team}</div>
      ) : null}
      {meta.attendees?.length ? (
        <div className="pt-event-tooltip__meta">
          {meta.attendees.join(", ")}
        </div>
      ) : null}
    </>
  );
}

function MonthEventContent({
  title,
  headline,
  timeText,
  meta,
  place,
  allDay,
}: {
  title: string;
  headline: string;
  timeText: string;
  meta: EventPresentationMeta;
  place?: string;
  allDay: boolean;
}) {
  const { ref, truncated } = useIsTruncated(
    [headline, timeText, place ?? "", meta.team ?? ""].join("\0"),
  );
  const secondary = [
    allDay ? "All day" : timeText || null,
    place,
    meta.team,
  ]
    .filter(Boolean)
    .join(" · ");

  const accessibleName = [title, secondary].filter(Boolean).join(". ");

  const body = (
    <span ref={ref} className="pt-event__stack">
      <span className="pt-event__title">{headline}</span>
      {secondary ? <span className="pt-event__secondary">{secondary}</span> : null}
    </span>
  );

  return (
    <span className="pt-event pt-event--month">
      {truncated ? (
        <Tooltip.Root>
          <Tooltip.Trigger
            className="pt-event__title-trigger"
            aria-label={accessibleName}
            delay={350}
          >
            {body}
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              className="pt-event-tooltip__positioner"
              sideOffset={6}
            >
              <Tooltip.Popup className="pt-event-tooltip">
                <EventTooltipBody
                  title={title}
                  timeText={timeText}
                  meta={meta}
                  place={place}
                  allDay={allDay}
                />
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ) : (
        body
      )}
    </span>
  );
}

function TimeGridEventContent({
  title,
  headline,
  timeText,
  meta,
  place,
  allDay,
  isShort,
  isNarrow,
}: {
  title: string;
  headline: string;
  timeText: string;
  meta: EventPresentationMeta;
  place?: string;
  allDay: boolean;
  isShort: boolean;
  isNarrow: boolean;
}) {
  const details = detailLine(meta, place);
  const showTime = !allDay && Boolean(timeText) && !isShort;
  const showDetails = Boolean(details) && !isShort;

  const accessibleName = [
    title,
    allDay ? "All day" : timeText,
    details,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <span className="pt-event pt-event--block" aria-label={accessibleName}>
      <span className="pt-event__title">{headline}</span>
      {showTime ? <span className="pt-event__secondary">{timeText}</span> : null}
      {allDay && !isShort ? (
        <span className="pt-event__secondary">All day</span>
      ) : null}
      {showDetails && !isNarrow ? (
        <span className="pt-event__secondary pt-event__secondary--detail">
          {details}
        </span>
      ) : null}
      {showDetails && isNarrow && !showTime ? (
        <span className="pt-event__secondary pt-event__secondary--detail">
          {details}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Custom FullCalendar event body.
 * Surfaces title, time, place, and host-selected metadata when present.
 */
export function CalendarEventContent(info: EventDisplayInfo) {
  const title = info.event.title;
  const { headline, place: placeFromTitle } = splitEnterpriseTitle(title);
  const timeText = info.timeText?.trim() ?? "";
  const meta = readMeta(info);
  const place = resolvePlace(meta, placeFromTitle);
  const allDay = Boolean(info.event.allDay);
  const isMonth = info.view.type === "dayGridMonth";

  if (isMonth) {
    return (
      <MonthEventContent
        title={title}
        headline={headline}
        timeText={timeText}
        meta={meta}
        place={place}
        allDay={allDay}
      />
    );
  }

  return (
    <TimeGridEventContent
      title={title}
      headline={headline}
      timeText={timeText}
      meta={meta}
      place={place}
      allDay={allDay}
      isShort={info.isShort}
      isNarrow={info.isNarrow}
    />
  );
}
