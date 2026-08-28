import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyConversationState } from '@/demo/engine';
import { processDemoTurn } from '@/demo/conversation';
import { getDefaultPreset } from '@/demo/presets';
import {
  CANONICAL_WALKTHROUGH_SCRIPT,
  playWalkthrough,
  WALKTHROUGH_PACING,
  type PlaybackState,
} from '@/demo/walkthrough';

afterEach(() => {
  vi.useRealTimers();
});

describe('canonical walkthrough script', () => {
  it('starts from the ambiguous AC prompt and ends with booking confirmation', () => {
    expect(CANONICAL_WALKTHROUGH_SCRIPT[0]).toBe("my ac is blowing warm air, can you check what's up?");
    expect(CANONICAL_WALKTHROUGH_SCRIPT).toEqual([
      "my ac is blowing warm air, can you check what's up?",
      'yeah please',
      '78701',
      'sounds good',
      '4:30 works',
      'yes please',
    ]);
  });

  it('drives the real interaction layer without premature tools or writes', () => {
    const config = getDefaultPreset().config;
    let conversation = emptyConversationState();
    const activityByTurn: string[][] = [];

    for (const message of CANONICAL_WALKTHROUGH_SCRIPT) {
      const turn = processDemoTurn({ config, conversation, message });
      conversation = turn.conversation;
      activityByTurn.push(turn.activity.map((step) => step.tool ?? step.id));
    }

    expect(activityByTurn[0]).toEqual([]);
    expect(activityByTurn[1]).toEqual([]);
    expect(activityByTurn[2]).toEqual(['search_services', 'check_service_area']);
    expect(activityByTurn[3]).toEqual(['get_availability']);
    expect(activityByTurn[4]).toEqual([]);
    expect(activityByTurn[5]).toEqual(['create_appointment']);

    expect(conversation.phase).toBe('booked');
    expect(conversation.appointments).toHaveLength(1);
    expect(conversation.lastBooking?.service_name).toBe('AC Diagnostic Visit');
  });

  it('does not create an appointment when the slot is chosen', () => {
    const config = getDefaultPreset().config;
    let conversation = emptyConversationState();

    for (const message of CANONICAL_WALKTHROUGH_SCRIPT.slice(0, 5)) {
      const turn = processDemoTurn({ config, conversation, message });
      conversation = turn.conversation;
    }

    expect(conversation.phase).toBe('awaiting_booking_confirmation');
    expect(conversation.appointments).toHaveLength(0);
  });
});

describe('playWalkthrough controller', () => {
  it('autoplays the script once, waits for turn settlement, and completes without looping', async () => {
    const states: PlaybackState[] = [];
    const seen: string[] = [];
    let runCount = 0;

    await playWalkthrough({
      script: CANONICAL_WALKTHROUGH_SCRIPT,
      signal: new AbortController().signal,
      respectVisibility: false,
      pacing: {
        initialPauseMs: 0,
        afterUserAppearMs: 0,
        afterConversationalReplyMs: 0,
        afterToolReplyMs: 0,
      },
      wait: async () => undefined,
      onStateChange: (state) => states.push(state),
      runTurn: async (message) => {
        runCount += 1;
        seen.push(message);
        return { hadActivity: message === '78701' || message === 'sounds good' || message === 'yes please' };
      },
    });

    expect(seen).toEqual([...CANONICAL_WALKTHROUGH_SCRIPT]);
    expect(runCount).toBe(CANONICAL_WALKTHROUGH_SCRIPT.length);
    expect(states).toEqual(['playing', 'completed']);
  });

  it('cancels cleanly when aborted mid-flight', async () => {
    const controller = new AbortController();
    const seen: string[] = [];
    let settled = 0;

    const playPromise = playWalkthrough({
      script: CANONICAL_WALKTHROUGH_SCRIPT,
      signal: controller.signal,
      respectVisibility: false,
      pacing: {
        initialPauseMs: 0,
        afterConversationalReplyMs: 50,
        afterToolReplyMs: 50,
      },
      wait: (ms, signal) =>
        new Promise((resolve, reject) => {
          const id = setTimeout(resolve, ms);
          signal.addEventListener(
            'abort',
            () => {
              clearTimeout(id);
              reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
          );
        }),
      runTurn: async (message) => {
        seen.push(message);
        settled += 1;
        if (settled === 2) controller.abort();
        return { hadActivity: false };
      },
    });

    await expect(playPromise).rejects.toMatchObject({ name: 'AbortError' });
    expect(seen.length).toBeLessThan(CANONICAL_WALKTHROUGH_SCRIPT.length);
    expect(seen.length).toBeGreaterThanOrEqual(2);
  });

  it('does not start a second automatic loop after completion', async () => {
    let completions = 0;
    await playWalkthrough({
      script: ['ping'],
      signal: new AbortController().signal,
      respectVisibility: false,
      pacing: { initialPauseMs: 0, afterConversationalReplyMs: 0, afterToolReplyMs: 0 },
      wait: async () => undefined,
      onStateChange: (state) => {
        if (state === 'completed') completions += 1;
      },
      runTurn: async () => ({ hadActivity: false }),
    });
    expect(completions).toBe(1);
  });

  it('uses longer reading pauses after tool visits than conversational turns', () => {
    expect(WALKTHROUGH_PACING.afterToolReplyMs).toBeGreaterThan(
      WALKTHROUGH_PACING.afterConversationalReplyMs,
    );
    expect(WALKTHROUGH_PACING.initialPauseMs).toBeGreaterThanOrEqual(500);
    expect(WALKTHROUGH_PACING.initialPauseMs).toBeLessThanOrEqual(1200);
  });
});
