import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "temporal-polyfill/global";
import type { CalendarEvent } from "@protocoltooling/fullcalendar";

const onEventsChangedRef: { current: (() => unknown | Promise<unknown>) | null } = {
  current: null,
};

vi.mock("@protocoltooling/fullcalendar", async () => {
  const actual = await vi.importActual<typeof import("@protocoltooling/fullcalendar")>(
    "@protocoltooling/fullcalendar",
  );
  return {
    ...actual,
    useFullCalendarWebMCP: (options: {
      onEventsChanged: () => unknown | Promise<unknown>;
    }) => {
      onEventsChangedRef.current = options.onEventsChanged;
    },
  };
});

import { CalendarApp } from "@/calendar/CalendarApp";
import {
  LocalCalendarEventRepository,
  storageKeyForMonth,
} from "@/calendar/local-calendar-repository";
import { createSeedEvents } from "@/calendar/seed-events";

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("CalendarApp D1 wiring", () => {
  const anchor = new Date(2026, 7, 1);
  let repository: LocalCalendarEventRepository;

  beforeEach(() => {
    onEventsChangedRef.current = null;
    repository = new LocalCalendarEventRepository({
      storage: memoryStorage(),
      storageKey: storageKeyForMonth(anchor),
      seedEvents: createSeedEvents(anchor),
      createId: () => "created-1",
    });
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("renders month view with seeded enterprise events", async () => {
    render(<CalendarApp repository={repository} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    expect(screen.getByRole("tab", { name: /month view/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await waitFor(() => {
      expect(screen.getByText("Site Survey — North Campus")).toBeInTheDocument();
      expect(screen.getByText("Deployment — Regional Office")).toBeInTheDocument();
    });
  });

  it("refreshes from repository after an agent-style mutation via onEventsChanged", async () => {
    render(<CalendarApp repository={repository} />);

    await waitFor(() => {
      expect(screen.getByText("Site Survey — North Campus")).toBeInTheDocument();
    });

    await repository.update("seed-site-survey", {
      title: "Site Survey — Relocated Campus",
      start: "2026-08-20",
      end: null,
      allDay: true,
    });

    expect(onEventsChangedRef.current).toBeTypeOf("function");
    await onEventsChangedRef.current?.();

    await waitFor(() => {
      expect(
        screen.getByText("Site Survey — Relocated Campus"),
      ).toBeInTheDocument();
    });
  });

  it("honors ?reset=1 by restoring seed events and stripping the query", async () => {
    await repository.update("seed-site-survey", {
      title: "Site Survey — Mutated",
      start: "2026-08-28",
      end: null,
      allDay: true,
    } satisfies Partial<CalendarEvent>);

    window.history.replaceState({}, "", "/?reset=1");
    render(<CalendarApp repository={repository} />);

    await waitFor(() => {
      expect(screen.getByText("Site Survey — North Campus")).toBeInTheDocument();
    });
    expect(screen.queryByText("Site Survey — Mutated")).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
  });
});
