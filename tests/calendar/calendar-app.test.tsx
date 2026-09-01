import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

async function renderCalendar(repository: LocalCalendarEventRepository) {
  cleanup();
  render(<CalendarApp repository={repository} />);
  await waitFor(() => {
    expect(screen.getByTestId("calendar-title")).toHaveTextContent(
      /September 2026/i,
    );
  });
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
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it("renders September month view with seeded enterprise events", async () => {
    await renderCalendar(repository);

    expect(screen.getByTestId("calendar-title")).toHaveTextContent(
      /September 2026/i,
    );
    expect(screen.getByTestId("calendar-view-month")).toHaveAttribute(
      "data-pressed",
      "",
    );

    await waitFor(() => {
      expect(screen.getAllByText("Site Survey").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Deployment").length).toBeGreaterThan(0);
    });
  });

  it("passes a representative timed event to FullCalendar with start/end", async () => {
    await renderCalendar(repository);

    await waitFor(() => {
      expect(screen.getAllByText("Equipment Inspection").length).toBeGreaterThan(
        0,
      );
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
    await renderCalendar(repository);

    await waitFor(() => {
      expect(screen.getAllByText("Site Survey").length).toBeGreaterThan(0);
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
      expect(document.body.textContent).toMatch(/Site Survey/i);
    });

    const refreshed = await repository.get("seed-sep-site-survey");
    expect(refreshed?.title).toBe("Site Survey — Relocated Campus");
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
    cleanup();
    render(<CalendarApp repository={repository} />);

    await waitFor(() => {
      expect(screen.getAllByText("Site Survey").length).toBeGreaterThan(0);
      expect(screen.getAllByText(/North Campus/).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("Mutated")).not.toBeInTheDocument();
    expect(window.location.search).toBe("");

    const restored = await repository.get("seed-sep-site-survey");
    expect(restored?.start).toBe("2026-09-02T08:00:00-04:00");
    expect(restored?.allDay).toBe(false);
  });
});

describe("CalendarApp Base UI toolbar (D4.2)", () => {
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
    vi.useFakeTimers({
      toFake: ["Date"],
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    window.history.replaceState({}, "", "/");
  });

  it("navigates with Previous / Next / Today through CalendarApi", async () => {
    vi.setSystemTime(new Date("2026-09-15T16:00:00.000Z"));

    await renderCalendar(repository);

    fireEvent.click(screen.getByTestId("calendar-next"));
    await waitFor(() => {
      expect(screen.getByTestId("calendar-title")).toHaveTextContent(
        /October 2026/i,
      );
    });

    fireEvent.click(screen.getByTestId("calendar-prev"));
    await waitFor(() => {
      expect(screen.getByTestId("calendar-title")).toHaveTextContent(
        /September 2026/i,
      );
    });

    fireEvent.click(screen.getByTestId("calendar-next"));
    await waitFor(() => {
      expect(screen.getByTestId("calendar-title")).toHaveTextContent(
        /October 2026/i,
      );
    });

    fireEvent.click(screen.getByTestId("calendar-today"));
    await waitFor(() => {
      expect(screen.getByTestId("calendar-title")).toHaveTextContent(
        /September 2026/i,
      );
    });
  });

  it("changes views through changeView and keeps selection synced", async () => {
    await renderCalendar(repository);

    expect(screen.getByTestId("calendar-view-month")).toHaveAttribute(
      "data-pressed",
      "",
    );

    fireEvent.click(screen.getByTestId("calendar-view-week"));
    await waitFor(() => {
      expect(screen.getByTestId("calendar-view-week")).toHaveAttribute(
        "data-pressed",
        "",
      );
      expect(screen.getByTestId("calendar-view-month")).not.toHaveAttribute(
        "data-pressed",
      );
    });

    fireEvent.click(screen.getByTestId("calendar-view-day"));
    await waitFor(() => {
      expect(screen.getByTestId("calendar-view-day")).toHaveAttribute(
        "data-pressed",
        "",
      );
      expect(screen.getByTestId("calendar-view-week")).not.toHaveAttribute(
        "data-pressed",
      );
    });

    fireEvent.click(screen.getByTestId("calendar-view-month"));
    await waitFor(() => {
      expect(screen.getByTestId("calendar-view-month")).toHaveAttribute(
        "data-pressed",
        "",
      );
      expect(screen.getByTestId("calendar-title")).toHaveTextContent(
        /September 2026|August 2026|October 2026/i,
      );
    });
  });

  it("does not deselect the active view when the pressed toggle is clicked again", async () => {
    await renderCalendar(repository);

    fireEvent.click(screen.getByTestId("calendar-view-month"));
    expect(screen.getByTestId("calendar-view-month")).toHaveAttribute(
      "data-pressed",
      "",
    );
  });
});
