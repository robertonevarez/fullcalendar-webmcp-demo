import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "temporal-polyfill/global";
import type { CalendarEvent } from "@protocoltooling/fullcalendar";

const onEventsChangedRef: {
  current: (() => unknown | Promise<unknown>) | null;
} = {
  current: null,
};

vi.mock("@protocoltooling/fullcalendar", async () => {
  const actual = await vi.importActual<
    typeof import("@protocoltooling/fullcalendar")
  >("@protocoltooling/fullcalendar");
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
import { LocalCalendarEventRepository } from "@/calendar/local-calendar-repository";
import { createSeedEvents, DEMO_STORAGE_KEY } from "@/calendar/seed-events";

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
  let repository: LocalCalendarEventRepository;

  beforeEach(() => {
    onEventsChangedRef.current = null;
    repository = new LocalCalendarEventRepository({
      storage: memoryStorage(),
      storageKey: DEMO_STORAGE_KEY,
      seedEvents: createSeedEvents(),
      createId: () => "created-1",
    });
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("renders September month view with seeded enterprise events", async () => {
    render(<CalendarApp repository={repository} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      /September 2026/i,
    );
    expect(screen.getByRole("tab", { name: /month view/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await waitFor(() => {
      expect(
        screen.getAllByText("Site Survey — North Campus").length,
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByText("Deployment — Regional Office").length,
      ).toBeGreaterThan(0);
    });
  });

  it("passes a representative timed event to FullCalendar with start/end", async () => {
    render(<CalendarApp repository={repository} />);

    await waitFor(() => {
      expect(
        screen.getAllByText("Equipment Inspection — Building 4").length,
      ).toBeGreaterThan(0);
    });

    const event = (await repository.get("seed-sep-equipment-inspection"))!;
    expect(event.allDay).toBe(false);
    expect(event.start).toBe("2026-09-04T09:00:00-04:00");
    expect(event.end).toBe("2026-09-04T10:30:00-04:00");

    // Native eventTimeFormat + displayEventEnd should expose readable time text.
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/9:00/i);
      expect(document.body.textContent).toMatch(/10:30\s*am/i);
    });
  });

  it("refreshes from repository after an agent timed mutation via onEventsChanged", async () => {
    render(<CalendarApp repository={repository} />);

    await waitFor(() => {
      expect(
        screen.getAllByText("Site Survey — North Campus").length,
      ).toBeGreaterThan(0);
    });

    await repository.update("seed-sep-site-survey", {
      title: "Site Survey — Relocated Campus",
      start: "2026-09-20T14:00:00-04:00",
      end: "2026-09-20T15:30:00-04:00",
      allDay: false,
    });

    expect(onEventsChangedRef.current).toBeTypeOf("function");
    await onEventsChangedRef.current?.();

    await waitFor(() => {
      expect(
        screen.getAllByText("Site Survey — Relocated Campus").length,
      ).toBeGreaterThan(0);
    });

    const refreshed = await repository.get("seed-sep-site-survey");
    expect(refreshed?.start).toBe("2026-09-20T18:00:00.000Z");
    expect(refreshed?.end).toBe("2026-09-20T19:30:00.000Z");
  });

  it("honors ?reset=1 by restoring timed seeds and stripping the query", async () => {
    await repository.update("seed-sep-site-survey", {
      title: "Site Survey — Mutated",
      start: "2026-09-28T09:00:00-04:00",
      end: "2026-09-28T10:00:00-04:00",
      allDay: false,
    } satisfies Partial<CalendarEvent>);

    window.history.replaceState({}, "", "/?reset=1");
    render(<CalendarApp repository={repository} />);

    await waitFor(() => {
      expect(
        screen.getAllByText("Site Survey — North Campus").length,
      ).toBeGreaterThan(0);
    });
    expect(screen.queryByText("Site Survey — Mutated")).not.toBeInTheDocument();
    expect(window.location.search).toBe("");

    const restored = await repository.get("seed-sep-site-survey");
    expect(restored?.start).toBe("2026-09-02T08:00:00-04:00");
    expect(restored?.allDay).toBe(false);
  });
});
