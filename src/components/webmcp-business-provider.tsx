'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { WebMCPRegistrar } from '@/components/webmcp-registrar';
import type { WebMCPRegistrationState } from '@/webmcp/lifecycle';
import { isWebMCPSupported } from '@/webmcp/tools';

function initialRegistrationState(): WebMCPRegistrationState {
  return isWebMCPSupported()
    ? { phase: 'registering', supported: true, attempted: true }
    : { phase: 'waiting', supported: false, attempted: false };
}

const WebMCPRegistrationContext = createContext<WebMCPRegistrationState>(initialRegistrationState());

export function useWebMCPRegistrationState(): WebMCPRegistrationState {
  return useContext(WebMCPRegistrationContext);
}

interface WebMCPBusinessProviderProps {
  businessSlug: string;
  businessName: string;
  children: ReactNode;
}

export function WebMCPBusinessProvider({
  businessSlug,
  businessName,
  children,
}: WebMCPBusinessProviderProps) {
  const [state, setState] = useState<WebMCPRegistrationState>(initialRegistrationState);

  return (
    <WebMCPRegistrationContext.Provider value={state}>
      <WebMCPRegistrar businessSlug={businessSlug} businessName={businessName} onStateChange={setState} />
      {children}
    </WebMCPRegistrationContext.Provider>
  );
}
