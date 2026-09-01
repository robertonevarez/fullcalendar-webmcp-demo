import { describe, expect, it } from "vitest";

import {
  isDayVisible,
  MAX_QUEUE_DEPTH_FOR_MOTION,
  moveDurationMs,
  rectIntersectsFrame,
  rectWithinFrame,
  shouldAnimateSpatially,
  type SpatialGateInput,
} from "@/calendar/event-motion";

function gate(overrides: Partial<SpatialGateInput> = {}): SpatialGateInput {
  return {
    kind: "rescheduled",
    multiSegment: false,
    queueDepth: 0,
    reducedMotion: false,
    supported: true,
    documentVisible: true,
    ...overrides,
  };
}

function rect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("shouldAnimateSpatially", () => {
  it("animates a plain in-view reschedule", () => {
    expect(shouldAnimateSpatially(gate())).toBe(true);
  });

  it("animates creations and removals", () => {
    expect(shouldAnimateSpatially(gate({ kind: "created" }))).toBe(true);
    expect(shouldAnimateSpatially(gate({ kind: "removed" }))).toBe(true);
  });

  it("skips an in-place rename, which moves nothing", () => {
    expect(shouldAnimateSpatially(gate({ kind: "updated" }))).toBe(false);
  });

  it("skips when the browser lacks Web Animations", () => {
    expect(shouldAnimateSpatially(gate({ supported: false }))).toBe(false);
  });

  it("skips under reduced motion", () => {
    expect(shouldAnimateSpatially(gate({ reducedMotion: true }))).toBe(false);
  });

  it("skips while the document is hidden", () => {
    expect(shouldAnimateSpatially(gate({ documentVisible: false }))).toBe(false);
  });

  it("skips multi-segment events, which are not one measurable box", () => {
    expect(shouldAnimateSpatially(gate({ multiSegment: true }))).toBe(false);
  });

  it("stays calm once the mutation backlog builds up", () => {
    expect(
      shouldAnimateSpatially(gate({ queueDepth: MAX_QUEUE_DEPTH_FOR_MOTION })),
    ).toBe(true);
    expect(
      shouldAnimateSpatially(
        gate({ queueDepth: MAX_QUEUE_DEPTH_FOR_MOTION + 1 }),
      ),
    ).toBe(false);
  });
});

describe("rectWithinFrame", () => {
  const frame = rect(0, 0, 1000, 600);

  it("accepts a rect fully inside the frame", () => {
    expect(rectWithinFrame(rect(100, 100, 120, 20), frame)).toBe(true);
  });

  it("rejects a rect scrolled above the frame", () => {
    expect(rectWithinFrame(rect(100, -40, 120, 20), frame)).toBe(false);
  });

  it("rejects a rect running past the bottom edge", () => {
    expect(rectWithinFrame(rect(100, 580, 120, 40), frame)).toBe(false);
  });

  it("rejects a collapsed rect", () => {
    expect(rectWithinFrame(rect(100, 100, 0, 0), frame)).toBe(false);
  });

  it("rejects when either rect is missing", () => {
    expect(rectWithinFrame(null, frame)).toBe(false);
    expect(rectWithinFrame(rect(0, 0, 10, 10), null)).toBe(false);
  });

  it("tolerates sub-pixel overhang at the edges", () => {
    expect(rectWithinFrame(rect(0, -1, 120, 20), frame)).toBe(true);
  });
});

describe("rectIntersectsFrame", () => {
  const frame = rect(0, 0, 1000, 600);

  it("accepts a cell clipped by the bottom edge of the grid", () => {
    expect(rectIntersectsFrame(rect(100, 560, 140, 120), frame)).toBe(true);
  });

  it("rejects a cell scrolled entirely out of view", () => {
    expect(rectIntersectsFrame(rect(100, 900, 140, 120), frame)).toBe(false);
  });

  it("rejects when either rect is missing", () => {
    expect(rectIntersectsFrame(null, frame)).toBe(false);
    expect(rectIntersectsFrame(rect(0, 0, 10, 10), null)).toBe(false);
  });
});

describe("isDayVisible", () => {
  /** Mirrors the month grid, which draws trailing days of the next month. */
  function grid(dates: string[], rects?: Record<string, DOMRect>): HTMLElement {
    const root = document.createElement("div");
    for (const date of dates) {
      const cell = document.createElement("div");
      cell.setAttribute("role", "gridcell");
      cell.dataset.date = date;
      const stub = rects?.[date];
      if (stub) cell.getBoundingClientRect = () => stub;
      root.append(cell);
    }
    return root;
  }

  const frame = rect(0, 0, 1000, 600);

  it("sees a date the current view draws", () => {
    expect(isDayVisible(grid(["2026-09-24"]), "2026-09-24", null)).toBe(true);
  });

  it("sees early October while the September month grid is showing", () => {
    expect(isDayVisible(grid(["2026-10-05"]), "2026-10-05", null)).toBe(true);
  });

  it("rejects a date outside the rendered range", () => {
    expect(isDayVisible(grid(["2026-09-24"]), "2026-11-15", null)).toBe(false);
  });

  it("rejects a rendered date whose cell is scrolled out of the frame", () => {
    const root = grid(["2026-09-24"], { "2026-09-24": rect(0, 900, 140, 120) });
    expect(isDayVisible(root, "2026-09-24", frame)).toBe(false);
  });

  it("keeps a cell that is only clipped at the grid edge", () => {
    const root = grid(["2026-09-24"], { "2026-09-24": rect(0, 560, 140, 120) });
    expect(isDayVisible(root, "2026-09-24", frame)).toBe(true);
  });

  it("rejects a missing root, key, or malformed key", () => {
    expect(isDayVisible(null, "2026-09-24", null)).toBe(false);
    expect(isDayVisible(grid(["2026-09-24"]), null, null)).toBe(false);
    expect(isDayVisible(grid(["2026-09-24"]), "nope", null)).toBe(false);
  });
});

describe("moveDurationMs", () => {
  it("stays near the floor for a short nudge", () => {
    const duration = moveDurationMs(rect(0, 0, 100, 20), rect(0, 18, 100, 20));
    expect(duration).toBeGreaterThanOrEqual(200);
    expect(duration).toBeLessThan(210);
  });

  it("scales up with travel distance", () => {
    const short = moveDurationMs(rect(0, 0, 100, 20), rect(0, 120, 100, 20));
    const long = moveDurationMs(rect(0, 0, 100, 20), rect(700, 400, 100, 20));
    expect(short).toBeGreaterThan(200);
    expect(long).toBeGreaterThan(short);
  });

  it("never exceeds the 300ms ceiling", () => {
    expect(moveDurationMs(rect(0, 0, 100, 20), rect(4000, 4000, 100, 20))).toBe(
      300,
    );
  });

  it("falls back to the floor without measurements", () => {
    expect(moveDurationMs(null, null)).toBe(200);
  });
});
