"use client";

import { Toolbar } from "@base-ui/react/toolbar";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import type { ComponentProps } from "react";
import {
  CALENDAR_VIEW_OPTIONS,
  isCalendarViewType,
  type CalendarViewType,
} from "./calendar-views";

export type CalendarToolbarProps = {
  title: string;
  viewType: CalendarViewType;
  prevDisabled: boolean;
  nextDisabled: boolean;
  todayDisabled: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: CalendarViewType) => void;
};

function ChevronLeftIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M10 3.5 5.5 8 10 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M6 3.5 10.5 8 6 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CalendarToolbar({
  title,
  viewType,
  prevDisabled,
  nextDisabled,
  todayDisabled,
  onPrev,
  onNext,
  onToday,
  onViewChange,
}: CalendarToolbarProps) {
  return (
    <Toolbar.Root
      className="calendar-toolbar"
      aria-label="Calendar"
      data-testid="calendar-toolbar"
    >
      <Toolbar.Group className="calendar-toolbar__nav" aria-label="Navigate">
        <Toolbar.Button
          className="calendar-control calendar-control--icon"
          aria-label="Previous period"
          disabled={prevDisabled}
          onClick={onPrev}
          data-testid="calendar-prev"
        >
          <ChevronLeftIcon />
        </Toolbar.Button>
        <Toolbar.Button
          className="calendar-control calendar-control--icon"
          aria-label="Next period"
          disabled={nextDisabled}
          onClick={onNext}
          data-testid="calendar-next"
        >
          <ChevronRightIcon />
        </Toolbar.Button>
        <Toolbar.Button
          className="calendar-control calendar-control--text"
          disabled={todayDisabled}
          onClick={onToday}
          data-testid="calendar-today"
        >
          Today
        </Toolbar.Button>
      </Toolbar.Group>

      <h2 className="calendar-toolbar__title" data-testid="calendar-title">
        {title}
      </h2>

      <ToggleGroup
        className="calendar-view-group"
        aria-label="Calendar view"
        value={[viewType]}
        onValueChange={(groupValue) => {
          const next = groupValue[0];
          if (!next || !isCalendarViewType(next)) return;
          onViewChange(next);
        }}
        data-testid="calendar-view-group"
      >
        {CALENDAR_VIEW_OPTIONS.map((option) => (
          <Toggle
            key={option.value}
            className="calendar-control calendar-control--toggle"
            value={option.value}
            aria-label={`${option.label} view`}
            data-testid={`calendar-view-${option.label.toLowerCase()}`}
          >
            {option.label}
          </Toggle>
        ))}
      </ToggleGroup>
    </Toolbar.Root>
  );
}
