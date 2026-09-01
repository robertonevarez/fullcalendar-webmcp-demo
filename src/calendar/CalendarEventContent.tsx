"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import type { EventDisplayInfo } from "@fullcalendar/react";
import { useLayoutEffect, useRef, useState } from "react";

function useIsTruncated(deps: unknown[]) {
  const ref = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      setTruncated(el.scrollWidth > el.clientWidth + 1);
    };

    measure();
    // FullCalendar may finalize cell width after the first layout pass.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- measure when listed deps change
  }, deps);

  return { ref, truncated };
}

function MonthEventContent({
  title,
  timeText,
}: {
  title: string;
  timeText: string;
}) {
  const { ref, truncated } = useIsTruncated([title, timeText]);
  const accessibleName = timeText ? `${title}. ${timeText}` : title;

  const titleNode = (
    <span ref={ref} className="pt-event__title">
      {title}
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
            {titleNode}
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner
              className="pt-event-tooltip__positioner"
              sideOffset={6}
            >
              <Tooltip.Popup className="pt-event-tooltip">
                <div className="pt-event-tooltip__title">{title}</div>
                {timeText ? (
                  <div className="pt-event-tooltip__time">{timeText}</div>
                ) : null}
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      ) : (
        titleNode
      )}
      {timeText ? <span className="pt-event__time">{timeText}</span> : null}
    </span>
  );
}

/**
 * Custom FullCalendar event body.
 * Month: compact schedule row (title + time). Time-grid: title only.
 */
export function CalendarEventContent(info: EventDisplayInfo) {
  const title = info.event.title;
  const timeText = info.timeText?.trim() ?? "";
  const isMonth = info.view.type === "dayGridMonth";

  if (!isMonth) {
    return <span className="pt-event pt-event--block">{title}</span>;
  }

  return <MonthEventContent title={title} timeText={timeText} />;
}
