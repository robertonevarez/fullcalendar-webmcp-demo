'use client';

import type { DemoActivityStep } from '@/demo/types';
import { cn } from '@/lib/utils';
import { Badge, CheckIcon, RetryIcon, SpinnerRing, XIcon } from '@/components/demo/task-rows';

export type StepStatus = 'running' | 'resolved';

export interface VisualStepEvent {
  step: DemoActivityStep;
  status: StepStatus;
  completedSteps: DemoActivityStep[];
}

type Props = {
  step: DemoActivityStep;
  status: StepStatus;
  completedSteps?: DemoActivityStep[];
  reducedMotion?: boolean;
  className?: string;
};

const surfaceCard = 'overflow-hidden rounded-lg border border-line bg-surface p-2 shadow-card';

export function AgentInteractionOverlay({
  step,
  status,
  completedSteps = [],
  className,
}: Props) {
  const isRunning = status === 'running';
  const target = step.target;

  const searchStep = completedSteps.find((s) => s.target === 'services') ?? (target === 'services' ? step : undefined);
  const areaStep = completedSteps.find((s) => s.target === 'service_area') ?? (target === 'service_area' ? step : undefined);
  const availStep = completedSteps.find((s) => s.target === 'availability') ?? (target === 'availability' ? step : undefined);
  const bookingStep = completedSteps.find((s) => s.target === 'booking') ?? (target === 'booking' ? step : undefined);

  const hasSearch = completedSteps.some((s) => s.target === 'services') || target === 'services';
  const hasArea = completedSteps.some((s) => s.target === 'service_area') || target === 'service_area';
  const hasAvail = completedSteps.some((s) => s.target === 'availability') || target === 'availability';
  const hasBooking = completedSteps.some((s) => s.target === 'booking') || target === 'booking';

  return (
    <div
      role="status"
      aria-live="polite"
      data-demo-target="overlay"
      data-demo-overlay-target={target}
      data-demo-overlay-status={status}
      className={cn('flex w-full max-w-sm flex-col gap-2 text-sm leading-snug', className)}
    >
      {hasSearch && (
        <div className={surfaceCard} style={{ animation: 'fade-up 350ms cubic-bezier(0.23,1,0.32,1) both' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {target === 'services' && isRunning ? (
                <SpinnerRing active>1</SpinnerRing>
              ) : (
                <Badge tone="green">{CheckIcon}</Badge>
              )}
              <span className="font-medium text-ink">
                {target === 'services' && isRunning
                  ? 'Finding the right service'
                  : searchStep?.result?.service_name || 'AC Diagnostic Visit'}
              </span>
            </div>
            <span className="font-mono text-ink-3">search_services</span>
          </div>

          <div className="mt-1.5 flex items-center justify-between border-t border-line/60 pt-1.5 text-ink-2">
            {target === 'services' && isRunning ? (
              <span>Matching &quot;{searchStep?.result?.query?.trim() || 'AC cooling upstairs'}&quot;</span>
            ) : (
              <span>
                {searchStep?.result?.price_label || '$89'} · {searchStep?.result?.duration_minutes ?? 90} min
              </span>
            )}
            <span className="rounded-full bg-green-tint px-1.5 py-0.5 font-medium text-green">
              {target === 'services' && isRunning ? 'Searching…' : 'Available'}
            </span>
          </div>
        </div>
      )}

      {hasArea && (
        <div className={surfaceCard} style={{ animation: 'fade-up 350ms cubic-bezier(0.23,1,0.32,1) both' }}>
          {(() => {
            const isFailed = areaStep?.result?.eligible === false;
            const postalCode = areaStep?.result?.postal_code?.trim() || '78701';
            return (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {target === 'service_area' && isRunning ? (
                      <SpinnerRing active>2</SpinnerRing>
                    ) : isFailed ? (
                      <Badge tone="red">{XIcon}</Badge>
                    ) : (
                      <Badge tone="green">{CheckIcon}</Badge>
                    )}
                    <span className="font-medium text-ink">
                      {target === 'service_area' && isRunning
                        ? 'Checking service area'
                        : isFailed
                          ? `Not available in ${postalCode}`
                          : `Available in ${postalCode}`}
                    </span>
                  </div>
                  <span className="font-mono text-ink-3">check_service_area</span>
                </div>

                <div className="mt-1.5 flex items-center justify-between border-t border-line/60 pt-1.5 text-ink-2">
                  <span>
                    {isFailed
                      ? (step.detail || `${postalCode} is outside the service area`)
                      : `Postal code ${postalCode}`}
                  </span>
                  {isFailed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-tint px-1.5 py-0.5 font-medium text-red">
                      Failed <span style={{ animation: 'spin 1.2s linear infinite' }} className="flex">{RetryIcon}</span>
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-tint px-1.5 py-0.5 font-medium text-green">
                      Eligible
                    </span>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {hasAvail && (
        <div className={surfaceCard} style={{ animation: 'fade-up 350ms cubic-bezier(0.23,1,0.32,1) both' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {target === 'availability' && isRunning ? (
                <SpinnerRing active>3</SpinnerRing>
              ) : (
                <Badge tone="green">{CheckIcon}</Badge>
              )}
              <span className="font-medium text-ink">
                {target === 'availability' && isRunning
                  ? 'Finding available times'
                  : 'Available tomorrow'}
              </span>
            </div>
            <span className="font-mono text-ink-3">get_availability</span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1 border-t border-line/60 pt-1.5">
            {(availStep?.result?.slot_labels?.length
              ? availStep.result.slot_labels
              : ['4:00 PM', '4:15 PM', '4:30 PM']
            ).map((slot) => (
              <span
                key={slot}
                className="rounded-full bg-field px-2 py-0.5 font-medium text-ink shadow-xs"
              >
                {slot}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasBooking && (
        <div className={surfaceCard} style={{ animation: 'fade-up 350ms cubic-bezier(0.23,1,0.32,1) both' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {target === 'booking' && isRunning ? (
                <SpinnerRing active>4</SpinnerRing>
              ) : (
                <Badge tone="green">{CheckIcon}</Badge>
              )}
              <span className="font-medium text-ink">
                {target === 'booking' && isRunning
                  ? 'Booking appointment'
                  : 'Appointment confirmed'}
              </span>
            </div>
            <span className="font-mono text-ink-3">create_appointment</span>
          </div>

          <div className="mt-1.5 space-y-0.5 border-t border-line/60 pt-1.5 text-ink-2">
            <div className="flex items-center justify-between">
              <span>{bookingStep?.result?.service_name || 'AC Diagnostic Visit'}</span>
              <span className="rounded-full bg-green-tint px-1.5 py-0.5 font-medium text-green">
                Confirmed
              </span>
            </div>
            <div className="flex items-center justify-between text-ink-3">
              <span>{bookingStep?.result?.when_label || 'Tomorrow at 4:30 PM'}</span>
              <span>Technician: {bookingStep?.result?.provider_name || 'James'}</span>
            </div>
          </div>
        </div>
      )}

      {!hasSearch && !hasArea && !hasAvail && !hasBooking && (
        <div className={surfaceCard}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SpinnerRing active={isRunning}>1</SpinnerRing>
              <span className="font-medium text-ink">{step.label}</span>
            </div>
            <span className="font-mono text-ink-3">{step.tool || step.id}</span>
          </div>
          {step.detail && step.detail.trim() && (
            <div className="mt-1.5 border-t border-line/60 pt-1.5 text-ink-2">
              {step.detail}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
