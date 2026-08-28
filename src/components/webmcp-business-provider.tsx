'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { WebMCPRegistrar } from '@/components/webmcp-registrar';
import { isWebMCPSupported, type WebMCPRegistrationState } from '@/lib/webmcp-client';

function initialRegistrationState(): WebMCPRegistrationState {
  return isWebMCPSupported()
    ? { phase: 'registering', supported: true, attempted: true }
    : { phase: 'waiting', supported: false, attempted: false };
}

const WebMCPRegistrationContext = createContext<WebMCPRegistrationState>(initialRegistrationState());

export function useWebMCPRegistrationState(): WebMCPRegistrationState {
  return useContext(WebMCPRegistrationContext);
}

export interface WebMCPBusinessProviderProps {
  businessSlug: string;
  businessName: string;
  apiBaseUrl?: string;
  children: ReactNode;
}

export function WebMCPBusinessProvider({
  businessSlug,
  businessName,
  apiBaseUrl,
  children,
}: WebMCPBusinessProviderProps) {
  const [state, setState] = useState<WebMCPRegistrationState>(initialRegistrationState);

  return (
    <WebMCPRegistrationContext.Provider value={state}>
      <WebMCPRegistrar
        businessSlug={businessSlug}
        businessName={businessName}
        apiBaseUrl={apiBaseUrl}
        onStateChange={setState}
      />
      {children}
    </WebMCPRegistrationContext.Provider>
  );
}
