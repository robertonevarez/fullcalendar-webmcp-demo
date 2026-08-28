'use client';

import { Panel } from '@/components/layout';
import { useWebMCPRegistrationState } from '@/components/webmcp-business-provider';
import { spacing } from '@/lib/design-system';
import { WEBMCP_TOOL_NAMES } from '@/webmcp/tools';
import { cn } from '@/lib/utils';

interface WebMCPStatusProps {
  businessSlug: string;
  businessName: string;
}

function registrationLabel(state: ReturnType<typeof useWebMCPRegistrationState>): string {
  switch (state.phase) {
    case 'waiting':
      return 'Waiting for WebMCP API…';
    case 'registering':
      return 'Registering tools…';
    case 'registered':
      return 'Tools registered on this page.';
    case 'failed':
      if (!state.supported && !state.attempted) {
        return 'WebMCP API not available in this browser.';
      }
      if (state.registered.length > 0) {
        return `Partial registration (${state.registered.length} tools).`;
      }
      return 'Tool registration failed.';
    default:
      return 'Unknown registration state.';
  }
}

export function WebMCPStatus({ businessSlug, businessName }: WebMCPStatusProps) {
  const state = useWebMCPRegistrationState();

  const showDevErrors =
    process.env.NODE_ENV !== 'production' && state.phase === 'failed' && state.errors.length > 0;

  return (
    <Panel className="text-sm" aria-labelledby="webmcp-status-heading">
      <h3 id="webmcp-status-heading" className="font-medium">
        WebMCP status
      </h3>
      <dl className={spacing.stack}>
        <div className={cn('flex', spacing.gap)}>
          <dt className="text-muted-foreground">Business</dt>
          <dd>
            {businessName} (<code className="font-mono text-xs">{businessSlug}</code>)
          </dd>
        </div>
        <div className={cn('flex', spacing.gap)}>
          <dt className="text-muted-foreground">Supported</dt>
          <dd>
            {state.supported || state.phase === 'waiting'
              ? state.supported
                ? 'yes'
                : 'pending'
              : 'no'}
          </dd>
        </div>
        <div className={cn('flex', spacing.gap)}>
          <dt className="text-muted-foreground">Attempted</dt>
          <dd>{state.phase === 'waiting' ? 'pending' : state.attempted ? 'yes' : 'no'}</dd>
        </div>
        <div className={cn('flex', spacing.gap)}>
          <dt className="text-muted-foreground">Registration</dt>
          <dd
            className={cn(
              state.phase === 'registered' && 'font-medium text-foreground',
              state.phase === 'failed' && 'font-medium',
            )}
          >
            {registrationLabel(state)}
          </dd>
        </div>
      </dl>
      {state.phase === 'registered' && (
        <ul className={cn('list-inside list-disc font-mono text-xs', spacing.stack)}>
          {state.registered.map((tool) => (
            <li key={tool}>{tool}</li>
          ))}
        </ul>
      )}
      {state.phase === 'failed' && !state.supported && !state.attempted && (
        <p className="text-muted-foreground">
          Use ChatGPT&apos;s in-app browser or Chrome with{' '}
          <code className="font-mono text-xs">chrome://flags/#enable-webmcp-testing</code>.
        </p>
      )}
      {showDevErrors && (
        <details>
          <summary className="cursor-pointer text-muted-foreground">Registration errors</summary>
          <ul className={cn('list-disc', spacing.stack, 'pl-3')}>
            {state.errors.map((error, index) => (
              <li key={`${error.tool ?? 'general'}-${index}`}>
                {error.tool ? (
                  <>
                    <code className="font-mono text-xs">{error.tool}</code>: {error.message}
                  </>
                ) : (
                  error.message
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="font-mono text-xs text-muted-foreground">
        Expected: {WEBMCP_TOOL_NAMES.join(', ')}
      </p>
    </Panel>
  );
}
