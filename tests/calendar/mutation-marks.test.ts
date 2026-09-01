import { afterEach, describe, expect, it } from "vitest";

import {
  MUTATION_MARK_TTL_MS,
  MutationMarkStore,
  eventSelector,
  syncMutationMarks,
} from "@/calendar/mutation-marks";

afterEach(() => {
  document.body.innerHTML = "";
});

function frameWith(ids: string[]): HTMLElement {
  const frame = document.createElement("div");
  for (const id of ids) {
    const element = document.createElement("div");
    element.dataset.ptEventId = id;
    frame.appendChild(element);
  }
  document.body.appendChild(frame);
  return frame;
}

describe("MutationMarkStore", () => {
  it("returns a mark within its time to live", () => {
    const store = new MutationMarkStore();
    store.mark("a", "created", 1_000);

    expect(store.markFor("a", 1_000 + MUTATION_MARK_TTL_MS - 1)).toMatchObject({
      kind: "created",
      markedAt: 1_000,
    });
  });

  it("expires and drops a mark past its time to live", () => {
    const store = new MutationMarkStore();
    store.mark("a", "created", 1_000);

    expect(store.markFor("a", 1_000 + MUTATION_MARK_TTL_MS + 1)).toBeNull();
    expect(store.size).toBe(0);
  });

  it("overwrites rather than stacks when the same event mutates again", () => {
    const store = new MutationMarkStore();
    store.mark("a", "created", 1_000);
    store.mark("a", "rescheduled", 2_000);

    expect(store.size).toBe(1);
    expect(store.markFor("a", 2_000)).toMatchObject({
      kind: "rescheduled",
      markedAt: 2_000,
    });
  });

  it("prunes only expired entries", () => {
    const store = new MutationMarkStore();
    store.mark("stale", "created", 0);
    store.mark("fresh", "created", 10_000);

    store.prune(10_000);

    expect(store.markFor("stale", 10_000)).toBeNull();
    expect(store.markFor("fresh", 10_000)).not.toBeNull();
  });
});

describe("syncMutationMarks", () => {
  it("stamps the mutated event and leaves the rest untouched", () => {
    const frame = frameWith(["a", "b"]);
    const store = new MutationMarkStore();
    store.mark("a", "rescheduled", 1_000);

    syncMutationMarks(frame, store, 1_000);

    const [first, second] = Array.from(
      frame.querySelectorAll<HTMLElement>("[data-pt-event-id]"),
    );
    expect(first!.dataset.ptMutation).toBe("rescheduled");
    expect(second!.dataset.ptMutation).toBeUndefined();
  });

  it("marks every segment of a multi-segment event", () => {
    const frame = frameWith(["a", "a", "b"]);
    const store = new MutationMarkStore();
    store.mark("a", "created", 1_000);

    syncMutationMarks(frame, store, 1_000);

    expect(
      frame.querySelectorAll('[data-pt-event-id="a"][data-pt-mutation="created"]'),
    ).toHaveLength(2);
  });

  it("clears the attribute once the mark expires", () => {
    const frame = frameWith(["a"]);
    const store = new MutationMarkStore();
    store.mark("a", "created", 0);

    syncMutationMarks(frame, store, 0);
    expect(frame.firstElementChild).toHaveAttribute("data-pt-mutation");

    syncMutationMarks(frame, store, MUTATION_MARK_TTL_MS + 1);
    expect(frame.firstElementChild).not.toHaveAttribute("data-pt-mutation");
  });

  it("retriggers the treatment when a replayed mutation lands on a marked event", () => {
    const frame = frameWith(["a"]);
    const store = new MutationMarkStore();

    store.mark("a", "created", 1_000);
    syncMutationMarks(frame, store, 1_000);
    expect(frame.firstElementChild).toHaveAttribute("data-pt-mutation-at", "1000");

    store.mark("a", "created", 1_500);
    syncMutationMarks(frame, store, 1_500);
    expect(frame.firstElementChild).toHaveAttribute("data-pt-mutation-at", "1500");
  });

  it("tolerates a missing root", () => {
    expect(() =>
      syncMutationMarks(null, new MutationMarkStore(), 0),
    ).not.toThrow();
  });
});

describe("eventSelector", () => {
  it("builds a selector that matches the rendered attribute", () => {
    const frame = frameWith(["seed-sep-site-survey"]);
    expect(
      frame.querySelector(eventSelector("seed-sep-site-survey")),
    ).not.toBeNull();
  });

  it("escapes ids that would otherwise break the selector", () => {
    expect(() => eventSelector('weird"id')).not.toThrow();
    expect(eventSelector('weird"id')).toContain("data-pt-event-id");
  });
});
