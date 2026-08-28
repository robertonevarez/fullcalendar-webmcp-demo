'use client';

import { useLayoutEffect, useState } from 'react';
import { Page } from '@/components/layout';
import { spacing } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import {
  logRegistrationState,
  registerPingTool,
  waitForModelContext,
} from '@/webmcp/lifecycle';
import { getModelContext, isWebMCPSupported } from '@/webmcp/tools';

type DebugState = {
  modelContextPresent: boolean;
  registration: Awaited<ReturnType<typeof registerPingTool>> | null;
};

export default function WebMCPDebugPage() {
  const [state, setState] = useState<DebugState>({
    modelContextPresent: isWebMCPSupported(),
    registration: null,
  });

  useLayoutEffect(() => {
    const controller = new AbortController();

    (async () => {
      await waitForModelContext({ signal: controller.signal });
      const registration = await registerPingTool(controller.signal);
      logRegistrationState(
        registration.registered.length
          ? { phase: 'registered', ...registration }
          : { phase: 'failed', ...registration },
      );
      setState({
        modelContextPresent: Boolean(getModelContext()?.registerTool),
        registration,
      });
    })();

    return () => controller.abort();
  }, []);

  const pingRegistered = state.registration?.registered.includes('ping') ?? false;
  const registrationPhase = state.registration
    ? state.registration.registered.length > 0
      ? 'registered'
      : 'failed'
    : 'pending';

  return (
    <Page>
      <h1 className="text-2xl font-semibold tracking-tight">WebMCP debug</h1>
      <dl className={cn('text-sm', spacing.stack)}>
        <div className={cn('flex', spacing.gap)}>
          <dt className="w-44 shrink-0 text-muted-foreground">document.modelContext</dt>
          <dd>
            {typeof document !== 'undefined' && 'modelContext' in document ? 'present' : 'absent'}
          </dd>
        </div>
        <div className={cn('flex', spacing.gap)}>
          <dt className="w-44 shrink-0 text-muted-foreground">registerTool callable</dt>
          <dd>{state.modelContextPresent ? 'yes' : 'no'}</dd>
        </div>
        <div className={cn('flex', spacing.gap)}>
          <dt className="w-44 shrink-0 text-muted-foreground">Registration phase</dt>
          <dd>{registrationPhase}</dd>
        </div>
        <div className={cn('flex', spacing.gap)}>
          <dt className="w-44 shrink-0 text-muted-foreground">Registered tools</dt>
          <dd>
            {state.registration?.registered.length
              ? state.registration.registered.join(', ')
              : 'none yet'}
          </dd>
        </div>
        <div className={cn('flex', spacing.gap)}>
          <dt className="w-44 shrink-0 text-muted-foreground">Ping tool</dt>
          <dd>{pingRegistered ? 'registered' : 'not registered'}</dd>
        </div>
      </dl>
      {process.env.NODE_ENV !== 'production' && state.registration?.errors.length ? (
        <ul className={cn('list-disc text-sm text-muted-foreground', spacing.stack, 'pl-3')}>
          {state.registration.errors.map((error, index) => (
            <li key={index}>
              {error.tool ? `${error.tool}: ` : ''}
              {error.message}
            </li>
          ))}
        </ul>
      ) : null}
    </Page>
  );
}
