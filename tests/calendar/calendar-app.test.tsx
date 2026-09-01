import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "temporal-polyfill/global";
import type {
  CalendarEvent,
  CalendarEventRepository,
} from "@protocoltooling/fullcalendar";

const onEventsChangedRef: {
  current: (() => unknown | Promise<unknown>) | null;
} = {
  current: null,
};

/**
 * The origin-tagged handle CalendarApp hands to WebMCP. Driving tests through
 * this exercises the real path a tool takes: repository write emits a signal,
 * then `onEventsChanged` consumes it.
 */
const agentRepositoryRef: { current: CalendarEventRepository | null } = {
  current: null,
};

vi.mock("@protocoltooling/fullcalendar", async () => {
  const actual = await vi.importActual<
    typeof import("@protocoltooling/fullcalendar")
  >("@protocoltooling/fullcalendar");
  return {
    ...actual,
    useFullCalendarWebMCP: (options: {
      events: CalendarEventRepository;
      onEventsChanged: () => unknown | Promise<unknown>;
    }) => {
      onEventsChangedRef.current = options.onEventsChanged;
      agentRepositoryRef.current = options.events;
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

/**
 * jsdom has no Web Animations API. This stands in for it so tests can assert
 * whether the spatial layer was reached at all.
 */
function installFakeAnimate() {
  type Host = { animate?: Element["animate"] };
  const host = Element.prototype as unknown as Host;
  const had = "animate" in Element.prototype;
  const previous = host.animate;

  const spy = vi.fn(() => ({
    finished: Promise.resolve(),
    cancel: () => {},
    effect: null,
  }));
  host.animate = spy as unknown as Element["animate"];

  return {
    spy,
    restore: () => {
      if (had) host.animate = previous;
      else delete host.animate;
    },
  };
}

function setReducedMotion(reduced: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) =>
    ({
      matches: reduced && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

function markedEvents(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-pt-mutation]"));
}

function marksFor(id: string): string[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`[data-pt-event-id="${id}"]`),
  ).map((element) => element.dataset.ptMutation ?? "");
}

describe("CalendarApp agent mutation feedback (D5)", () => {
  let repository: LocalCalendarEventRepository;
  let restoreMotion: (() => void) | null = null;

  beforeEach(() => {
    onEventsChangedRef.current = null;
    agentRepositoryRef.current = null;
    repository = new LocalCalendarEventRepository({
      storage: memoryStorage(),
      storageKey: DEMO_STORAGE_KEY,
      seedEvents: createSeedEvents(),
      createId: () => "created-1",
    });
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    restoreMotion?.();
    restoreMotion = null;
    cleanup();
    window.history.replaceState({}, "", "/");
  });

  it("stamps a stable event id onto every rendered segment", async () => {
    await renderCalendar(repository);

    await waitFor(() => {
      expect(
        document.querySelectorAll("[data-pt-event-id]").length,
      ).toBeGreaterThan(0);
    });
    expect(
      document.querySelectorAll(
        '[data-pt-event-id="seed-sep-site-survey"]',
      ).length,
    ).toBeGreaterThan(0);
  });

  it("marks an agent-created event and announces it", async () => {
    await renderCalendar(repository);

    await agentRepositoryRef.current!.create({
      title: "Readiness Review",
      start: "2026-09-15T14:00:00-04:00",
      end: "2026-09-15T15:00:00-04:00",
    });
    await onEventsChangedRef.current?.();

    await waitFor(() => {
      expect(marksFor("created-1")).toContain("created");
    });
    await waitFor(() => {
      expect(screen.getByTestId("calendar-announcer")).toHaveTextContent(
        /Added Readiness Review/i,
      );
    });
  });

  it("marks an agent reschedule as moved rather than created", async () => {
    await renderCalendar(repository);

    await agentRepositoryRef.current!.update("seed-sep-site-survey", {
      start: "2026-09-22T14:00:00-04:00",
      end: "2026-09-22T15:30:00-04:00",
    });
    await onEventsChangedRef.current?.();

    await waitFor(() => {
      expect(marksFor("seed-sep-site-survey")).toContain("rescheduled");
    });
    await waitFor(() => {
      expect(screen.getByTestId("calendar-announcer")).toHaveTextContent(
        /Site Survey.*moved to/i,
      );
    });
  });

  it("distinguishes an in-place rename from a move", async () => {
    await renderCalendar(repository);

    const current = (await repository.get("seed-sep-site-survey"))!;
    await agentRepositoryRef.current!.update("seed-sep-site-survey", {
      title: "Site Survey — Relocated Campus",
      start: current.start,
      end: current.end,
    });
    await onEventsChangedRef.current?.();

    await waitFor(() => {
      expect(marksFor("seed-sep-site-survey")).toContain("updated");
    });
  });

  it("removes a deleted event and leaves no mark behind", async () => {
    await renderCalendar(repository);

    await agentRepositoryRef.current!.delete("seed-sep-site-survey");
    await onEventsChangedRef.current?.();

    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-pt-event-id="seed-sep-site-survey"]'),
      ).toHaveLength(0);
    });
    await waitFor(() => {
      expect(screen.getByTestId("calendar-announcer")).toHaveTextContent(
        /Removed Site Survey/i,
      );
    });
    expect(markedEvents()).toHaveLength(0);
  });

  it("treats a refresh with no signal as ordinary reconciliation", async () => {
    await renderCalendar(repository);

    // Writing straight to the injected store bypasses the origin-tagged handle,
    // which is what an ordinary refresh or a human drag looks like.
    await repository.update("seed-sep-site-survey", {
      title: "Quietly Changed Survey",
      start: "2026-09-23T14:00:00-04:00",
      end: "2026-09-23T15:30:00-04:00",
    });
    await onEventsChangedRef.current?.();

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Quietly Changed Survey/i);
    });
    expect(markedEvents()).toHaveLength(0);
    expect(screen.getByTestId("calendar-announcer")).toHaveTextContent("");
  });

  it("never implies success when a mutation fails", async () => {
    await renderCalendar(repository);

    await expect(
      agentRepositoryRef.current!.delete("does-not-exist"),
    ).rejects.toThrow(/was not found/);
    await onEventsChangedRef.current?.();

    expect(markedEvents()).toHaveLength(0);
    expect(screen.getByTestId("calendar-announcer")).toHaveTextContent("");
  });

  it("keeps every mark through a rapid sequence of agent mutations", async () => {
    await renderCalendar(repository);

    const agent = agentRepositoryRef.current!;

    // Concurrent tool calls all write before any of them refreshes.
    await agent.create({
      title: "Readiness Review",
      start: "2026-09-15T14:00:00-04:00",
      end: "2026-09-15T15:00:00-04:00",
    });
    await agent.update("seed-sep-site-survey", {
      start: "2026-09-24T14:00:00-04:00",
      end: "2026-09-24T15:30:00-04:00",
    });
    await Promise.all([
      onEventsChangedRef.current?.(),
      onEventsChangedRef.current?.(),
    ]);

    await waitFor(() => {
      expect(marksFor("created-1")).toContain("created");
      expect(marksFor("seed-sep-site-survey")).toContain("rescheduled");
    });

    // A burst collapses into one summary rather than reading out a sentence
    // per event; mixed operations fall back to the neutral verb.
    await waitFor(() => {
      expect(screen.getByTestId("calendar-announcer")).toHaveTextContent(
        /^2 events updated\.$/,
      );
    });
  });

  it("names the operation when a burst is all the same kind", async () => {
    await renderCalendar(repository);

    const agent = agentRepositoryRef.current!;
    await agent.delete("seed-sep-site-survey");
    await agent.delete("seed-sep-deployment");
    await Promise.all([
      onEventsChangedRef.current?.(),
      onEventsChangedRef.current?.(),
    ]);

    await waitFor(() => {
      expect(screen.getByTestId("calendar-announcer")).toHaveTextContent(
        /^2 events removed\.$/,
      );
    });
  });

  it("skips the spatial layer under reduced motion but keeps the semantics", async () => {
    restoreMotion = setReducedMotion(true);
    const animate = installFakeAnimate();

    try {
      await renderCalendar(repository);

      await agentRepositoryRef.current!.create({
        title: "Readiness Review",
        start: "2026-09-15T14:00:00-04:00",
        end: "2026-09-15T15:00:00-04:00",
      });
      await onEventsChangedRef.current?.();

      // No animation is created at all, rather than one that is neutralized.
      expect(animate.spy).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(marksFor("created-1")).toContain("created");
      });
      await waitFor(() => {
        expect(screen.getByTestId("calendar-announcer")).toHaveTextContent(
          /Added Readiness Review/i,
        );
      });
    } finally {
      animate.restore();
    }
  });

  it("carries a mark to the destination when a move leaves the visible range", async () => {
    await renderCalendar(repository);

    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-pt-event-id="seed-sep-site-survey"]')
          .length,
      ).toBeGreaterThan(0);
    });

    // October 20 is past the trailing days the September grid draws.
    await agentRepositoryRef.current!.update("seed-sep-site-survey", {
      start: "2026-10-20T14:00:00-04:00",
      end: "2026-10-20T15:30:00-04:00",
    });
    await onEventsChangedRef.current?.();

    await waitFor(() => {
      expect(
        document.querySelectorAll('[data-pt-event-id="seed-sep-site-survey"]'),
      ).toHaveLength(0);
    });

    // The live region still says where it went, which is the only cue that
    // separates this from a deletion.
    await waitFor(() => {
      expect(screen.getByTestId("calendar-announcer")).toHaveTextContent(
        /Site Survey.*moved to Tuesday, October 20/i,
      );
    });

    fireEvent.click(screen.getByTestId("calendar-next"));

    await waitFor(() => {
      expect(marksFor("seed-sep-site-survey")).toContain("rescheduled");
    });
  });

  it("plays emphasis on arrival for a mutation made off-screen", async () => {
    await renderCalendar(repository);

    // October is outside the visible September grid.
    await agentRepositoryRef.current!.create({
      title: "Quarterly Handover",
      start: "2026-10-14T14:00:00-04:00",
      end: "2026-10-14T15:00:00-04:00",
    });
    await onEventsChangedRef.current?.();

    expect(
      document.querySelectorAll('[data-pt-event-id="created-1"]'),
    ).toHaveLength(0);

    fireEvent.click(screen.getByTestId("calendar-next"));

    await waitFor(() => {
      expect(screen.getByTestId("calendar-title")).toHaveTextContent(
        /October 2026/i,
      );
    });
    await waitFor(() => {
      expect(marksFor("created-1")).toContain("created");
    });
  });
});
