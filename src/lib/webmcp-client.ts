/**
 * Lightweight browser WebMCP client adapter for the showcase frontend.
 * Discovers and registers tools against the remote Protocol Tooling API backend.
 */
import { getProtocolToolingApiUrl } from '@/lib/protocoltooling-client';

export const WEBMCP_TOOL_NAMES = [
  'search_services',
  'get_service_details',
  'check_service_area',
  'get_availability',
  'create_appointment',
  'get_appointment',
  'reschedule_appointment',
  'cancel_appointment',
] as const;

export type WebMCPToolName = (typeof WEBMCP_TOOL_NAMES)[number];

export type RegistrationError = {
  tool?: string;
  message: string;
};

export type RegistrationResult = {
  supported: boolean;
  attempted: boolean;
  registered: string[];
  errors: RegistrationError[];
  businessSlug: string;
};

export type WebMCPRegistrationState =
  | { phase: 'waiting'; supported: false; attempted: false }
  | { phase: 'registering'; supported: true; attempted: true }
  | ({ phase: 'registered' } & RegistrationResult)
  | ({ phase: 'failed' } & RegistrationResult);

export interface WaitForModelContextOptions {
  timeoutMs?: number;
  intervalMs?: number;
  signal?: AbortSignal;
}

export interface RegisterBusinessToolsOptions {
  businessSlug: string;
  businessName: string;
  apiBaseUrl?: string;
  signal?: AbortSignal;
}

export function getModelContext(): { registerTool?: Function } | undefined {
  if (typeof document === 'undefined') return undefined;
  const doc = document as Document & { modelContext?: { registerTool?: Function } };
  const nav = navigator as Navigator & { modelContext?: { registerTool?: Function } };
  return doc.modelContext ?? nav.modelContext;
}

export function isWebMCPSupported(): boolean {
  const modelContext = getModelContext();
  return typeof modelContext?.registerTool === 'function';
}

function registrationErrorMessage(error: unknown): string {
  if (error instanceof DOMException) return `${error.name}: ${error.message}`;
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function waitForModelContext(
  options: WaitForModelContextOptions = {},
): Promise<{ registerTool?: Function } | undefined> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const intervalMs = options.intervalMs ?? 100;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (options.signal?.aborted) return undefined;

    const modelContext = getModelContext();
    if (modelContext?.registerTool) return modelContext;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, intervalMs);
      options.signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer);
          reject(options.signal!.reason);
        },
        { once: true },
      );
    }).catch(() => undefined);
  }

  return getModelContext()?.registerTool ? getModelContext() : undefined;
}

export async function registerPingTool(signal: AbortSignal): Promise<RegistrationResult> {
  const modelContext = getModelContext();
  if (!modelContext?.registerTool) {
    return {
      supported: false,
      attempted: false,
      registered: [],
      errors: [],
      businessSlug: 'debug',
    };
  }

  try {
    await modelContext.registerTool(
      {
        name: 'ping',
        description: 'Health check for WebMCP discovery. Returns ok: true with no side effects.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true },
        execute: async () => ({ ok: true }),
      },
      { signal },
    );
    return {
      supported: true,
      attempted: true,
      registered: ['ping'],
      errors: [],
      businessSlug: 'debug',
    };
  } catch (error) {
    return {
      supported: true,
      attempted: true,
      registered: [],
      errors: [{ tool: 'ping', message: registrationErrorMessage(error) }],
      businessSlug: 'debug',
    };
  }
}

export function createDemoBusinessTools(options: RegisterBusinessToolsOptions) {
  const base = options.apiBaseUrl || getProtocolToolingApiUrl();
  const endpointBase = `${base}/api/businesses/${encodeURIComponent(options.businessSlug)}`;

  const toolExecute = (url: string) => async (input: unknown) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input ?? {}),
    });
    return res.json();
  };

  return WEBMCP_TOOL_NAMES.map((name) => ({
    name,
    description: `WebMCP tool ${name} for ${options.businessName}`,
    inputSchema: { type: 'object', properties: {} },
    annotations: {
      readOnlyHint: ['search_services', 'get_service_details', 'check_service_area', 'get_availability', 'get_appointment'].includes(name),
    },
    execute: toolExecute(`${endpointBase}/${name.replace(/_/g, '-')}`),
  }));
}

export async function registerBusinessTools(
  options: RegisterBusinessToolsOptions,
): Promise<RegistrationResult> {
  const modelContext = getModelContext();
  if (!modelContext?.registerTool) {
    return {
      supported: false,
      attempted: false,
      registered: [],
      errors: [],
      businessSlug: options.businessSlug,
    };
  }

  const tools = createDemoBusinessTools(options);
  const registered: string[] = [];
  const errors: RegistrationError[] = [];

  for (const tool of tools) {
    if (options.signal?.aborted) break;
    try {
      await modelContext.registerTool(tool, { signal: options.signal });
      registered.push(tool.name);
    } catch (error) {
      errors.push({ tool: tool.name, message: registrationErrorMessage(error) });
    }
  }

  return {
    supported: true,
    attempted: true,
    registered,
    errors,
    businessSlug: options.businessSlug,
  };
}

export async function registerBusinessToolsWhenReady(
  options: RegisterBusinessToolsOptions & WaitForModelContextOptions,
): Promise<WebMCPRegistrationState> {
  const modelContext = await waitForModelContext(options);
  if (!modelContext?.registerTool) {
    return {
      phase: 'failed',
      supported: false,
      attempted: false,
      registered: [],
      errors: [{ message: 'WebMCP modelContext.registerTool not available before timeout.' }],
      businessSlug: options.businessSlug,
    };
  }

  const result = await registerBusinessTools(options);
  return result.registered.length > 0
    ? { phase: 'registered', ...result }
    : { phase: 'failed', ...result };
}

export function logRegistrationState(state: WebMCPRegistrationState) {
  if (process.env.NODE_ENV === 'production') return;

  const payload = {
    phase: state.phase,
    supported: 'supported' in state ? state.supported : false,
    attempted: 'attempted' in state ? state.attempted : false,
    registered: 'registered' in state ? state.registered : [],
    errors: 'errors' in state ? state.errors : [],
    businessSlug: 'businessSlug' in state ? state.businessSlug : undefined,
  };

  if (state.phase === 'registered') {
    console.info('[webmcp]', payload);
  } else if (state.phase === 'failed') {
    console.warn('[webmcp]', payload);
  }
}
