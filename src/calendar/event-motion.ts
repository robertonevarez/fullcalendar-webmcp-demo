import { eventSelector } from "./mutation-marks";
import type { MutationKind } from "./mutation-signal";

/**
 * Spatial layer for agent-driven calendar mutations.
 *
 * Built on Web Animations over the real event elements rather than the View
 * Transitions API. FullCalendar's dayGrid positions a moved or created event in
 * a `requestAnimationFrame` pass and keeps it `visibility: hidden` until then —
 * and rendering, including rAF, is suspended inside a view transition's update
 * callback. The element is therefore still hidden when the browser captures the
 * new state, so it gets no snapshot and a reschedule degrades into a fade-out
 * at the source. Animating the live elements sidesteps that entirely, and has
 * two further benefits: motion is clipped by the calendar frame instead of
 * escaping into the top layer, and it works in every browser.
 *
 * Everything here is progressive enhancement. When a gate fails the commit
 * still runs, unanimated, and the emphasis layer carries the meaning.
 */

/** Beyond this backlog the spatial layer switches off so bulk edits stay calm. */
export const MAX_QUEUE_DEPTH_FOR_MOTION = 3;

/** Animated participants per mutation, keeping the compositor cost bounded. */
export const MAX_PARTICIPANTS = 12;

const ENTER_DURATION_MS = 180;
const EXIT_DURATION_MS = 140;

/** How far a departing event drifts, in the direction it moved through time. */
const EXIT_DRIFT_PX = 8;
const MOVE_MIN_DURATION_MS = 200;
const MOVE_MAX_DURATION_MS = 300;
const SIBLING_DURATION_MS = 200;

/** dayGrid needs two frames to position and reveal; allow a little headroom. */
const MAX_LAYOUT_FRAMES = 5;

/** Below this, a "move" is layout noise and not worth animating. */
const MIN_TRAVEL_PX = 2;

/** Tolerance for the "is it inside the frame" test, in CSS pixels. */
const FRAME_TOLERANCE_PX = 2;

const EASE_OUT_FALLBACK = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_MOVE_FALLBACK = "cubic-bezier(0.77, 0, 0.175, 1)";

let easingCache: { out: string; move: string } | null = null;

/** Reads the motion tokens so CSS stays the single source of truth. */
function easings(): { out: string; move: string } {
  if (easingCache) return easingCache;
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { out: EASE_OUT_FALLBACK, move: EASE_MOVE_FALLBACK };
  }
  const styles = getComputedStyle(document.documentElement);
  easingCache = {
    out: styles.getPropertyValue("--pt-ease-out").trim() || EASE_OUT_FALLBACK,
    move: styles.getPropertyValue("--pt-ease-move").trim() || EASE_MOVE_FALLBACK,
  };
  return easingCache;
}

export type SpatialGateInput = {
  kind: MutationKind;
  multiSegment: boolean;
  queueDepth: number;
  reducedMotion: boolean;
  supported: boolean;
  documentVisible: boolean;
};

/**
 * Whether a mutation earns the spatial layer.
 *
 * A rename moves nothing, so it gets emphasis only — animating it would be
 * motion for its own sake.
 */
export function shouldAnimateSpatially(input: SpatialGateInput): boolean {
  if (!input.supported) return false;
  if (!input.documentVisible) return false;
  if (input.reducedMotion) return false;
  if (input.multiSegment) return false;
  if (input.queueDepth > MAX_QUEUE_DEPTH_FOR_MOTION) return false;
  if (input.kind === "updated") return false;
  return true;
}

/** Implements the viewport policy: animate only what the user can actually see. */
export function rectWithinFrame(
  rect: DOMRect | null | undefined,
  frame: DOMRect | null | undefined,
): boolean {
  if (!rect || !frame) return false;
  if (rect.width === 0 && rect.height === 0) return false;
  return (
    rect.top >= frame.top - FRAME_TOLERANCE_PX &&
    rect.bottom <= frame.bottom + FRAME_TOLERANCE_PX &&
    rect.left >= frame.left - FRAME_TOLERANCE_PX &&
    rect.right <= frame.right + FRAME_TOLERANCE_PX
  );
}

/** Looser test for day cells, which are routinely clipped at the grid edges. */
export function rectIntersectsFrame(
  rect: DOMRect | null | undefined,
  frame: DOMRect | null | undefined,
): boolean {
  if (!rect || !frame) return false;
  return (
    rect.bottom > frame.top &&
    rect.top < frame.bottom &&
    rect.right > frame.left &&
    rect.left < frame.right
  );
}

/**
 * Whether a date is one the current view actually draws.
 *
 * Every view exposes its range as `data-date` day cells — 42 of them in month
 * (which is why late September and early October are both on screen at once),
 * 7 in week, 1 in day — so this one query answers "would an event on this date
 * be rendered?" without reaching for the FullCalendar API.
 */
export function isDayVisible(
  root: ParentNode | null | undefined,
  dayKey: string | null,
  frameRect: DOMRect | null,
): boolean {
  if (!root || !dayKey) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return false;

  const cells = Array.from(
    root.querySelectorAll<HTMLElement>(
      `[role="gridcell"][data-date="${dayKey}"]`,
    ),
  );
  if (cells.length === 0) return false;
  if (!frameRect) return true;
  return cells.some((cell) =>
    rectIntersectsFrame(cell.getBoundingClientRect(), frameRect),
  );
}

/** Travel distance scales the move so a nudge and a cross-week jump both read well. */
export function moveDurationMs(from: DOMRect | null, to: DOMRect | null): number {
  if (!from || !to) return MOVE_MIN_DURATION_MS;
  const distance = Math.hypot(to.left - from.left, to.top - from.top);
  const scaled = MOVE_MIN_DURATION_MS + distance * 0.12;
  return Math.round(
    Math.min(MOVE_MAX_DURATION_MS, Math.max(MOVE_MIN_DURATION_MS, scaled)),
  );
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function supportsWebAnimations(): boolean {
  return (
    typeof Element !== "undefined" &&
    typeof Element.prototype.animate === "function"
  );
}

function eventElements(
  root: ParentNode | null | undefined,
  id: string,
): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(eventSelector(id)));
}

/** FullCalendar hides an event until its measurement pass has placed it. */
function isRendered(element: HTMLElement): boolean {
  if (getComputedStyle(element).visibility === "hidden") return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Events sharing a day cell with the mutation, so they slide rather than jump
 * when space is made or reclaimed.
 */
function siblingIds(
  root: ParentNode | null | undefined,
  eventId: string,
  dayKeys: string[],
): string[] {
  if (!root) return [];

  const cells = new Set<Element>();
  for (const element of eventElements(root, eventId)) {
    const cell = element.closest('[role="gridcell"]');
    if (cell) cells.add(cell);
  }
  for (const key of dayKeys) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    for (const cell of Array.from(
      root.querySelectorAll(`[role="gridcell"][data-date="${key}"]`),
    )) {
      cells.add(cell);
    }
  }

  const ids: string[] = [];
  for (const cell of cells) {
    for (const element of Array.from(
      cell.querySelectorAll<HTMLElement>("[data-pt-event-id]"),
    )) {
      const id = element.dataset.ptEventId;
      if (!id || id === eventId || ids.includes(id)) continue;
      ids.push(id);
    }
  }
  return ids.slice(0, MAX_PARTICIPANTS - 1);
}

type RectMap = Map<string, DOMRect>;

/** Only single-segment events are measurable as one box. */
function measure(root: ParentNode | null, ids: string[]): RectMap {
  const rects: RectMap = new Map();
  for (const id of ids) {
    const elements = eventElements(root, id);
    if (elements.length !== 1) continue;
    rects.set(id, elements[0]!.getBoundingClientRect());
  }
  return rects;
}

const active = new Set<Animation>();

function play(
  element: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation | null {
  // Never let two animations fight over the same element's transform.
  for (const animation of Array.from(active)) {
    const effect = animation.effect;
    const target =
      typeof KeyframeEffect !== "undefined" && effect instanceof KeyframeEffect
        ? effect.target
        : null;
    if (target === element) {
      animation.cancel();
      active.delete(animation);
    }
  }

  let animation: Animation;
  try {
    animation = element.animate(keyframes, options);
  } catch {
    return null;
  }

  active.add(animation);
  const forget = () => active.delete(animation);
  animation.finished.then(forget, forget);
  return animation;
}

function nextFrame(): Promise<void> {
  if (typeof requestAnimationFrame !== "function") return Promise.resolve();
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * Waits for FullCalendar's positioning pass.
 *
 * Resolves inside the microtask that follows the frame callback, so a caller
 * can measure and start an animation before the browser paints — the moved
 * element is never shown at its destination first.
 */
async function waitForLayout(
  frame: HTMLElement,
  ids: string[],
  mustExist: string | null,
): Promise<void> {
  for (let index = 0; index < MAX_LAYOUT_FRAMES; index += 1) {
    await nextFrame();
    if (mustExist && eventElements(frame, mustExist).length !== 1) continue;
    const settled = ids.every((id) => {
      const element = eventElements(frame, id)[0];
      return element ? isRendered(element) : true;
    });
    if (settled) return;
  }
}

function flip(
  element: HTMLElement,
  from: DOMRect,
  to: DOMRect,
  duration: number,
  easing: string,
): Animation | null {
  const dx = from.left - to.left;
  const dy = from.top - to.top;
  if (Math.abs(dx) < MIN_TRAVEL_PX && Math.abs(dy) < MIN_TRAVEL_PX) return null;
  return play(
    element,
    [
      { transform: `translate3d(${dx}px, ${dy}px, 0)` },
      { transform: "translate3d(0px, 0px, 0px)" },
    ],
    { duration, easing, composite: "replace" },
  );
}

function enter(element: HTMLElement, easing: string): Animation | null {
  return play(
    element,
    [
      { opacity: 0, transform: "scale(0.98)" },
      { opacity: 1, transform: "scale(1)" },
    ],
    { duration: ENTER_DURATION_MS, easing },
  );
}

/**
 * `drift` separates the two ways an event can leave the screen: 0 for a
 * deletion, which simply stops existing, and ±1 for a move out of the visible
 * range, which slides a little the way it travelled through time. It is the
 * only cue that distinguishes "cancelled" from "now in October".
 */
function exit(
  element: HTMLElement,
  easing: string,
  drift: TimeDirection = 0,
): Animation | null {
  const offset = drift * EXIT_DRIFT_PX;
  return play(
    element,
    [
      { opacity: 1, transform: "translate3d(0px, 0px, 0) scale(1)" },
      { opacity: 0, transform: `translate3d(0px, ${offset}px, 0) scale(0.98)` },
    ],
    { duration: EXIT_DURATION_MS, easing, fill: "forwards" },
  );
}

async function settle(animations: Array<Animation | null>): Promise<void> {
  await Promise.all(
    animations
      .filter((animation): animation is Animation => animation !== null)
      .map((animation) => animation.finished.catch(() => {})),
  );
}

/** +1 for a move later in time, -1 for earlier, 0 when nothing moved. */
export type TimeDirection = -1 | 0 | 1;

export type CalendarMotionOptions = {
  eventId: string;
  kind: MutationKind;
  /** Applies the React state change; must be synchronous (`flushSync`). */
  commit: () => void;
  /** Scroll/clip container used for viewport gating and DOM queries. */
  frame: HTMLElement | null;
  /** `YYYY-MM-DD` key the event started on, if it had one. */
  sourceDayKey: string | null;
  /** `YYYY-MM-DD` key the event lands on, if it still exists. */
  destinationDayKey: string | null;
  direction: TimeDirection;
  multiSegment: boolean;
  queueDepth: number;
};

/**
 * Commits a mutation, animating it when every gate passes.
 *
 * Resolves once the motion settles, which serializes back-pressure onto the
 * caller: overlapping WebMCP mutations queue instead of fighting over the same
 * elements.
 */
export async function runCalendarMotion(
  options: CalendarMotionOptions,
): Promise<void> {
  const {
    eventId,
    kind,
    commit,
    frame,
    sourceDayKey,
    destinationDayKey,
    direction,
    multiSegment,
    queueDepth,
  } = options;

  const documentVisible =
    typeof document === "undefined" || document.visibilityState === "visible";

  const allowed = shouldAnimateSpatially({
    kind,
    multiSegment,
    queueDepth,
    reducedMotion: prefersReducedMotion(),
    supported: supportsWebAnimations(),
    documentVisible,
  });

  if (!allowed || !frame) {
    commit();
    return;
  }

  const { out, move } = easings();
  const frameRect = frame.getBoundingClientRect();
  const dayKeys = [sourceDayKey, destinationDayKey].filter(
    (key): key is string => key !== null,
  );
  const siblings = siblingIds(frame, eventId, dayKeys);
  const tracked = [eventId, ...siblings];

  // FIRST: everything that might move, measured before the DOM changes.
  const before = measure(frame, tracked);
  const sourceRect = before.get(eventId) ?? null;

  // A move to a date this view does not draw ends the same way a deletion does:
  // the element is about to disappear. Deciding that before the commit is what
  // makes the exit possible at all — afterwards there is no element left to
  // animate, which is why such a move used to vanish on a single frame.
  const leavesView =
    kind === "rescheduled" &&
    !isDayVisible(frame, destinationDayKey, frameRect);

  if (kind === "removed" || leavesView) {
    const departing = eventElements(frame, eventId)[0];
    if (departing && rectWithinFrame(sourceRect, frameRect)) {
      // Play the exit on the real element, then commit. Holding the commit for
      // 140ms avoids cloning a ghost out of FullCalendar's DOM.
      await settle([exit(departing, out, leavesView ? direction : 0)]);
    }
    commit();
    await waitForLayout(frame, siblings, null);
    const after = measure(frame, siblings);
    await settle(
      siblings.map((id) => {
        const element = eventElements(frame, id)[0];
        const from = before.get(id);
        const to = after.get(id);
        if (!element || !from || !to) return null;
        return flip(element, from, to, SIBLING_DURATION_MS, move);
      }),
    );
    return;
  }

  commit();
  await waitForLayout(frame, tracked, eventId);

  const after = measure(frame, tracked);
  const destinationRect = after.get(eventId) ?? null;
  const subject = eventElements(frame, eventId)[0] ?? null;

  // The destination must be on screen. An off-screen mutation keeps its mark
  // and plays the treatment when the user navigates to it instead.
  if (!subject || !destinationRect) return;
  if (!rectWithinFrame(destinationRect, frameRect)) return;

  const animations: Array<Animation | null> = [];

  // The mirror of `leavesView`: an event arriving from a date this view was not
  // drawing has no on-screen origin, so it is introduced rather than moved.
  const originRect = rectWithinFrame(sourceRect, frameRect) ? sourceRect : null;

  const travel = originRect
    ? Math.hypot(
        destinationRect.left - originRect.left,
        destinationRect.top - originRect.top,
      )
    : Number.POSITIVE_INFINITY;

  if (kind === "created" || !originRect || travel > frameRect.height) {
    // Either there is no visible source, or it is far enough that a long slide
    // would read as flying rather than moving.
    animations.push(enter(subject, out));
  } else {
    animations.push(
      flip(
        subject,
        originRect,
        destinationRect,
        moveDurationMs(originRect, destinationRect),
        move,
      ),
    );
  }

  for (const id of siblings) {
    const element = eventElements(frame, id)[0];
    const from = before.get(id);
    const to = after.get(id);
    if (!element || !from || !to) continue;
    animations.push(flip(element, from, to, SIBLING_DURATION_MS, move));
  }

  await settle(animations);
}

/** Drops any in-flight motion, e.g. when the user navigates mid-animation. */
export function resetCalendarMotion(): void {
  for (const animation of Array.from(active)) {
    animation.cancel();
  }
  active.clear();
}
