import type { CalendarEventRepository } from "@protocoltooling/fullcalendar";

import { MutationMarkStore, syncMutationMarks } from "./mutation-marks";
import type {
  CalendarMutation,
  MutationKind,
  MutationOrigin,
} from "./mutation-signal";
import { withMutationSignals } from "./observable-repository";

/**
 * A signal older than this is assumed orphaned — a write happened but its
 * refresh never arrived — and the next refresh is treated as ordinary.
 */
export const SIGNAL_STALE_MS = 1_000;

type PendingSignal = {
  signal: CalendarMutation;
  at: number;
};

/**
 * Non-React home for the mutation pipeline's mutable state.
 *
 * The repository decorator emits a signal, then the WebMCP tool calls
 * `onEventsChanged`. Holding the signal here bridges those two steps so the
 * refresh knows which semantic operation it belongs to, while keeping all
 * mutation outside of React state.
 */
/** Ceiling on unconsumed signals, so a missing refresh cannot grow the queue. */
const MAX_PENDING = 32;

export class CalendarMutationBus {
  /** Origin-tagged handle for `useFullCalendarWebMCP`. */
  readonly agent: CalendarEventRepository;
  /** Origin-tagged handle for human drag/resize persistence. */
  readonly human: CalendarEventRepository;

  private readonly marks = new MutationMarkStore();
  private readonly pending: PendingSignal[] = [];

  constructor(
    inner: CalendarEventRepository,
    private readonly now: () => number = Date.now,
  ) {
    const record = (signal: CalendarMutation) => {
      this.pending.push({ signal, at: this.now() });
      if (this.pending.length > MAX_PENDING) this.pending.shift();
    };
    this.agent = withMutationSignals(inner, record, "agent");
    this.human = withMutationSignals(inner, record, "human");
  }

  /**
   * Consumes the oldest signal still owed feedback.
   *
   * A queue rather than a single slot because concurrent tool calls all write
   * before any of them refreshes; a single slot would silently drop every
   * mutation but the last, and the user would miss them.
   *
   * Returns `null` for an ordinary reconciliation. Stale signals and human
   * drag/resize are discarded — the latter has already been shown under the
   * pointer and must not replay as agent motion.
   */
  takeAgentMutation(): CalendarMutation | null {
    const cutoff = this.now() - SIGNAL_STALE_MS;
    while (this.pending.length > 0) {
      const next = this.pending.shift()!;
      if (next.at < cutoff) continue;
      if (next.signal.origin !== "agent") continue;
      return next.signal;
    }
    return null;
  }

  /** Origin of the next signal to be consumed. */
  peekOrigin(): MutationOrigin | null {
    return this.pending[0]?.signal.origin ?? null;
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  mark(id: string, kind: MutationKind): void {
    this.marks.mark(id, kind, this.now());
  }

  markFor(id: string) {
    return this.marks.markFor(id, this.now());
  }

  syncMarks(root: ParentNode | null | undefined): void {
    syncMutationMarks(root, this.marks, this.now());
  }

  dispose(): void {
    this.marks.clear();
    this.pending.length = 0;
  }
}
