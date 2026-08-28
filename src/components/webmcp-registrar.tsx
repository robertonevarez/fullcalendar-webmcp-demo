'use client';

import { useLayoutEffect, useRef } from 'react';
import {
  logRegistrationState,
  registerBusinessToolsWhenReady,
  type WebMCPRegistrationState,
  isWebMCPSupported,
} from '@/lib/webmcp-client';

export interface WebMCPRegistrarProps {
  businessSlug: string;
  businessName: string;
  apiBaseUrl?: string;
  onStateChange?: (state: WebMCPRegistrationState) => void;
}

/**
 * Registers business WebMCP tools as early as possible in the page lifecycle.
 * Routes tool calls to the external Protocol Tooling API.
 */
export function WebMCPRegistrar({
  businessSlug,
  businessName,
  apiBaseUrl,
  onStateChange,
}: WebMCPRegistrarProps) {
  const onStateChangeRef = useRef(onStateChange);

  useLayoutEffect(() => {
    onStateChangeRef.current = onStateChange;
  });

  useLayoutEffect(() => {
    const controller = new AbortController();
    let active = true;

    const publish = (state: WebMCPRegistrationState) => {
      if (!active) return;
      logRegistrationState(state);
      onStateChangeRef.current?.(state);
    };

    if (isWebMCPSupported()) {
      publish({ phase: 'registering', supported: true, attempted: true });
    } else {
      publish({ phase: 'waiting', supported: false, attempted: false });
    }

    registerBusinessToolsWhenReady({
      businessSlug,
      businessName,
      apiBaseUrl,
      signal: controller.signal,
    })
      .then((state) => publish(state))
      .catch((error) => {
        publish({
          phase: 'failed',
          supported: isWebMCPSupported(),
          attempted: true,
          registered: [],
          errors: [{ message: error instanceof Error ? error.message : String(error) }],
          businessSlug,
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [businessSlug, businessName, apiBaseUrl]);

  return null;
}
