import { describe, expect, it } from 'vitest';
import type { DemoActivityStep } from '@/demo/types';
import { playVisualSequence, type VisualPhase, type VisualStepEvent } from '@/demo/visual-sequence';

function step(
  id: string,
  label: string,
  target: DemoActivityStep['target'],
  result?: DemoActivityStep['result'],
): DemoActivityStep {
  return { id, label, target, tool: id, result };
}

describe('demo visual sequence', () => {
  it('plays orchestration steps through running and resolved statuses in order without inventing extras', async () => {
    const phases: VisualPhase[] = [];
    const events: Array<{ id: string; status: string }> = [];
    const activity = [
      step('search_services', 'Search services', 'services', { service_name: 'AC Diagnostic Visit' }),
      step('check_service_area', 'Check service area', 'service_area', { postal_code: '78701', eligible: true }),
      step('get_availability', 'Find availability', 'availability', { slot_labels: ['4:00 PM', '4:15 PM', '4:30 PM'] }),
    ];

    await playVisualSequence({
      activity,
      reducedMotion: true,
      onPhase: (phase) => phases.push(phase),
      onStepEvent: (event) => {
        if (event) {
          events.push({ id: event.step.id, status: event.status });
        }
      },
    });

    expect(events).toEqual([
      { id: 'search_services', status: 'running' },
      { id: 'search_services', status: 'resolved' },
      { id: 'check_service_area', status: 'running' },
      { id: 'check_service_area', status: 'resolved' },
      { id: 'get_availability', status: 'running' },
      { id: 'get_availability', status: 'resolved' },
    ]);
    expect(phases).toEqual(['entering', 'operating', 'returning', 'idle']);
  });

  it('skips visualization when activity is empty', async () => {
    const events: VisualStepEvent[] = [];
    const phases: VisualPhase[] = [];

    await playVisualSequence({
      activity: [],
      reducedMotion: true,
      onPhase: (phase) => phases.push(phase),
      onStepEvent: (event) => {
        if (event) events.push(event);
      },
    });

    expect(events).toEqual([]);
    expect(phases).toEqual(['idle']);
  });

  it('aborts cleanly when signal is triggered mid-flight', async () => {
    const controller = new AbortController();
    const activity = [
      step('search_services', 'Search services', 'services'),
      step('check_service_area', 'Check service area', 'service_area'),
    ];

    const promise = playVisualSequence({
      activity,
      reducedMotion: false,
      timings: { travelMs: 200, stepWorkingMs: 200, stepHoldMs: 200, settleMs: 200 },
      signal: controller.signal,
      onPhase: () => {
        controller.abort();
      },
      onStepEvent: () => undefined,
    });

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
