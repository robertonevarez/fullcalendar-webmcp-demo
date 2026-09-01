import type { MutationKind } from "./mutation-signal";

/**
 * How long a mutation stays visually marked.
 *
 * Long enough that a mutation on a week the user is not looking at still
 * announces itself when they navigate there, short enough that it never
 * becomes persistent decoration on the event.
 */
export const MUTATION_MARK_TTL_MS = 8_000;

export type MutationMark = {
  kind: MutationKind;
  markedAt: number;
};

/** Attribute selector for one event's rendered segments, safe without `CSS.escape`. */
export function eventSelector(id: string): string {
  const escaped =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(id)
      : id.replace(/["\\]/g, "\\$&");
  return `[data-pt-event-id="${escaped}"]`;
}

/**
 * Recent mutations keyed by event id.
 *
 * Decoupling the mark from the render pass is what lets emphasis follow the
 * event rather than the viewport: an event mutated off-screen carries its mark
 * until it mounts, then plays the treatment on arrival. Nothing scrolls.
 */
export class MutationMarkStore {
  private readonly marks = new Map<string, MutationMark>();

  mark(id: string, kind: MutationKind, now: number = Date.now()): void {
    this.marks.set(id, { kind, markedAt: now });
  }

  markFor(id: string, now: number = Date.now()): MutationMark | null {
    const mark = this.marks.get(id);
    if (!mark) return null;
    if (now - mark.markedAt > MUTATION_MARK_TTL_MS) {
      this.marks.delete(id);
      return null;
    }
    return mark;
  }

  forget(id: string): void {
    this.marks.delete(id);
  }

  prune(now: number = Date.now()): void {
    for (const [id, mark] of this.marks) {
      if (now - mark.markedAt > MUTATION_MARK_TTL_MS) {
        this.marks.delete(id);
      }
    }
  }

  clear(): void {
    this.marks.clear();
  }

  get size(): number {
    return this.marks.size;
  }
}

/**
 * Reconciles `data-pt-mutation` across every rendered event segment.
 *
 * Safe to call after any commit and from `eventDidMount`; both paths read the
 * same store, so a late-mounting event picks up an earlier mutation.
 */
export function syncMutationMarks(
  root: ParentNode | null | undefined,
  store: MutationMarkStore,
  now: number = Date.now(),
): void {
  if (!root) return;

  store.prune(now);

  const elements = root.querySelectorAll<HTMLElement>("[data-pt-event-id]");
  for (const element of Array.from(elements)) {
    const id = element.dataset.ptEventId;
    const mark = id ? store.markFor(id, now) : null;

    if (!mark) {
      delete element.dataset.ptMutation;
      delete element.dataset.ptMutationAt;
      continue;
    }

    const stamp = String(mark.markedAt);
    if (
      element.dataset.ptMutation === mark.kind &&
      element.dataset.ptMutationAt === stamp
    ) {
      continue;
    }

    // Retrigger the emphasis keyframes when a replayed or repeated mutation
    // lands on an event that is already marked.
    delete element.dataset.ptMutation;
    void element.offsetWidth;
    element.dataset.ptMutation = mark.kind;
    element.dataset.ptMutationAt = stamp;
  }
}
