/**
 * Self-driving product walkthrough.
 *
 * The scripted driver supplies simulated USER messages only.
 * Agent replies, activity[], and domain outcomes come from the existing
 * interaction layer (processDemoTurn / /api/demo/turn).
 */

export type PlaybackState = 'idle' | 'playing' | 'completed';

/** Canonical Acme Heating & Air walkthrough — simulated user turns only. */
export const CANONICAL_WALKTHROUGH_SCRIPT = [
  "my ac is blowing warm air, can you check what's up?",
  'yeah please',
  '78701',
  'sounds good',
  '4:30 works',
  'yes please',
] as const;

export type WalkthroughScript = readonly string[];

/** Presentation pacing — controls rhythm, not business correctness. */
export const WALKTHROUGH_PACING = {
  /** Orient the viewer before the first message. */
  initialPauseMs: 900,
  /** Beat after a user bubble appears, before the turn request starts. */
  afterUserAppearMs: 450,
  /** Reading pause after a purely conversational agent reply. */
  afterConversationalReplyMs: 2500,
  /** Reading pause after a tool/website visit settles and the reply appears. */
  afterToolReplyMs: 3000,
} as const;

export type WalkthroughTurnResult = {
  /** True when the turn produced business activity (cursor/terminal visit). */
  hadActivity: boolean;
};

export type PlayWalkthroughOptions = {
  script: WalkthroughScript;
  signal: AbortSignal;
  /** Called once per scripted user message; must settle agent + visuals before resolving. */
  runTurn: (message: string) => Promise<WalkthroughTurnResult>;
  onStateChange?: (state: PlaybackState) => void;
  /** Override pacing for tests. */
  pacing?: Partial<typeof WALKTHROUGH_PACING>;
  /**
   * When true (default), advancement pauses while the document is hidden.
   * Pass false in unit tests without a document.
   */
  respectVisibility?: boolean;
  /** Injected wait — tests can use a no-op or fake clock. */
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
};

function defaultWait(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function documentIsHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

/**
 * Wait `ms`, but freeze while the tab is hidden so the walkthrough
 * does not race ahead in the background.
 */
async function pacedWait(
  ms: number,
  signal: AbortSignal,
  wait: (ms: number, signal: AbortSignal) => Promise<void>,
  respectVisibility: boolean,
): Promise<void> {
  if (!respectVisibility) {
    await wait(ms, signal);
    return;
  }

  let remaining = ms;
  while (remaining > 0) {
    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    while (documentIsHidden()) {
      await waitForDocumentVisible(signal);
    }

    const chunkStart = Date.now();
    const chunk = Math.min(remaining, 250);
    await wait(chunk, signal);

    if (documentIsHidden()) {
      // Time while hidden does not count toward presentation pacing.
      continue;
    }
    remaining -= Date.now() - chunkStart;
  }
}

function waitForDocumentVisible(signal: AbortSignal): Promise<void> {
  if (!documentIsHidden()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const onAbort = () => {
      document.removeEventListener('visibilitychange', onVisibility);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const onVisibility = () => {
      if (!documentIsHidden()) {
        document.removeEventListener('visibilitychange', onVisibility);
        signal.removeEventListener('abort', onAbort);
        resolve();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Runs the self-driving walkthrough once.
 * Resolves when complete; rejects with AbortError on cancel.
 * Does not loop.
 */
export async function playWalkthrough(
  options: PlayWalkthroughOptions,
): Promise<void> {
  const {
    script,
    signal,
    runTurn,
    onStateChange,
    pacing: pacingOverrides,
    respectVisibility = true,
    wait = defaultWait,
  } = options;

  const pacing = { ...WALKTHROUGH_PACING, ...pacingOverrides };

  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  onStateChange?.('playing');

  try {
    await pacedWait(pacing.initialPauseMs, signal, wait, respectVisibility);

    for (let i = 0; i < script.length; i++) {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      const message = script[i]!;
      const result = await runTurn(message);

      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      // No reading pause after the final confirmation — completed state should land.
      if (i < script.length - 1) {
        const pause = result.hadActivity
          ? pacing.afterToolReplyMs
          : pacing.afterConversationalReplyMs;
        await pacedWait(pause, signal, wait, respectVisibility);
      }
    }

    onStateChange?.('completed');
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw error;
  }
}

/**
 * Helper for the UI turn runner: beat after the user bubble is shown,
 * before the orchestration request begins.
 */
export async function waitAfterUserAppear(
  signal: AbortSignal,
  options?: {
    ms?: number;
    respectVisibility?: boolean;
    wait?: (ms: number, signal: AbortSignal) => Promise<void>;
  },
): Promise<void> {
  const ms = options?.ms ?? WALKTHROUGH_PACING.afterUserAppearMs;
  const respectVisibility = options?.respectVisibility ?? true;
  const wait = options?.wait ?? defaultWait;
  await pacedWait(ms, signal, wait, respectVisibility);
}

export { isAbortError };
