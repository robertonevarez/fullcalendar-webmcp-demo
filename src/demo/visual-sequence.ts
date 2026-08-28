import type { DemoActivityStep } from '@/demo/types';

export type VisualPhase = 'idle' | 'entering' | 'operating' | 'returning';
export type StepStatus = 'running' | 'resolved';

export interface VisualStepEvent {
  step: DemoActivityStep;
  status: StepStatus;
  completedSteps: DemoActivityStep[];
}

const TRAVEL_MS = 600;
const STEP_WORKING_MS = 850;
const STEP_HOLD_MS = 1100;
const SETTLE_MS = 350;

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

export type VisualSequenceTimings = {
  travelMs?: number;
  stepWorkingMs?: number;
  stepHoldMs?: number;
  settleMs?: number;
};

/** Timings tuned for smooth comprehension during self-driving product walkthrough. */
export const WALKTHROUGH_VISUAL_TIMINGS: Required<VisualSequenceTimings> = {
  travelMs: 600,
  stepWorkingMs: 850,
  stepHoldMs: 1100,
  settleMs: 350,
};

/**
 * Plays a visual sequence derived from real orchestration activity.
 * Coordinates cursor travel, agent-access website state, and structured capability overlay.
 */
export async function playVisualSequence(options: {
  activity: DemoActivityStep[];
  reducedMotion: boolean;
  signal?: AbortSignal;
  timings?: VisualSequenceTimings;
  onPhase: (phase: VisualPhase) => void;
  onStepEvent: (event: VisualStepEvent | null) => void;
}): Promise<void> {
  const { activity, reducedMotion, signal, timings, onPhase, onStepEvent } = options;
  const travel = reducedMotion ? 0 : (timings?.travelMs ?? TRAVEL_MS);
  const stepWorking = reducedMotion ? 0 : (timings?.stepWorkingMs ?? STEP_WORKING_MS);
  const stepHold = reducedMotion ? 0 : (timings?.stepHoldMs ?? STEP_HOLD_MS);
  const settle = reducedMotion ? 0 : (timings?.settleMs ?? SETTLE_MS);

  if (!activity.length) {
    onPhase('idle');
    onStepEvent(null);
    return;
  }

  // 1. Cursor leaves chat, travels to business website
  onPhase('entering');
  onStepEvent(null);
  await wait(travel, signal);

  // 2. Website in agent-access mode, centered overlay runs operations
  onPhase('operating');
  const completedSteps: DemoActivityStep[] = [];

  for (const step of activity) {
    // Working state
    onStepEvent({
      step,
      status: 'running',
      completedSteps: [...completedSteps],
    });
    await wait(stepWorking, signal);

    // Resolved state
    completedSteps.push(step);
    onStepEvent({
      step,
      status: 'resolved',
      completedSteps: [...completedSteps],
    });
    await wait(stepHold, signal);
  }

  // 3. Overlay dismisses, website restores, cursor returns to chat
  onPhase('returning');
  onStepEvent(null);
  await wait(settle + travel, signal);

  // 4. Idle
  onPhase('idle');
}
