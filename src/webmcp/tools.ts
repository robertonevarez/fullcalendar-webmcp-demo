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

export type ToolExecuteOptions = {
  signal?: AbortSignal;
};

/** Structured `{ ok: false, error: { code } }` payloads from booking APIs. */
export function isStructuredDomainError(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const record = payload as { ok?: unknown; error?: unknown };
  if (record.ok !== false || !record.error || typeof record.error !== 'object') return false;
  const code = (record.error as { code?: unknown }).code;
  return typeof code === 'string' && code.length > 0;
}

function logUnexpectedWebmcpFailure(details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[webmcp]', details);
  }
}

/**
 * Shared WebMCP execute wrapper.
 *
 * Chrome's current executeTool path invokes callbacks with only the input
 * object (argc === 1). Spec/docs also allow a second options bag with
 * `signal`. Never require that second argument — destructuring it from
 * undefined throws before fetch and surfaces as a generic inspector error.
 *
 * Expected domain rejections (e.g. OUTSIDE_SERVICE_AREA) are successful tool
 * executions that return structured `{ ok: false, error }` — do not console.error them.
 */
export async function postJson<T>(
  url: string,
  body: unknown,
  options?: ToolExecuteOptions,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      signal: options?.signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network request failed';
    logUnexpectedWebmcpFailure({ url, message });
    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Tool request failed before a response was received.',
        retryable: true,
      },
    } as T;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse JSON response';
    logUnexpectedWebmcpFailure({ url, status: response.status, message });
    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Tool HTTP response was not JSON (status ${response.status}).`,
        retryable: true,
      },
    } as T;
  }

  // Structured domain outcomes (4xx with { ok:false, error.code }) are not runtime failures.
  if (!response.ok && !isStructuredDomainError(payload)) {
    logUnexpectedWebmcpFailure({ url, status: response.status, payload });
  }

  return payload as T;
}

function toolExecute<TInput extends object>(url: string) {
  return async (input: TInput, options?: ToolExecuteOptions) => postJson(url, input ?? {}, options);
}

export function createBusinessTools(businessSlug: string, businessName: string) {
  const base = `/api/businesses/${businessSlug}`;

  return [
    {
      name: 'search_services',
      description: `Search the ${businessName} service catalog using deterministic keyword matching. Returns ranked services with reusable service_id values for the current business.`,
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Optional search text such as AC cooling or haircut.' },
        },
      },
      annotations: { readOnlyHint: true },
      execute: toolExecute<{ query?: string }>(`${base}/search-services`),
    },
    {
      name: 'get_service_details',
      description: `Return duration, price, location policy, required resources, and intake fields for a ${businessName} service.`,
      inputSchema: {
        type: 'object',
        properties: {
          service_id: { type: 'string', description: 'Service identifier from search_services.' },
        },
        required: ['service_id'],
      },
      annotations: { readOnlyHint: true },
      execute: toolExecute<{ service_id: string }>(`${base}/get-service-details`),
    },
    {
      name: 'check_service_area',
      description: `Check whether a postal code is eligible for field services at ${businessName}. Call before get_availability when service_area_required is true. If OUTSIDE_SERVICE_AREA, do not request availability for that same service/location unless the user provides a different postal code. Returns not_required for in-location services.`,
      inputSchema: {
        type: 'object',
        properties: {
          postal_code: { type: 'string', description: 'Customer postal code when service area applies.' },
          service_id: { type: 'string', description: 'Optional service identifier.' },
        },
      },
      annotations: { readOnlyHint: true },
      execute: toolExecute<{ postal_code?: string; service_id?: string }>(`${base}/check-service-area`),
    },
    {
      name: 'get_availability',
      description: `Return viable appointment slots for a ${businessName} service within a date range. Each slot includes a reusable slot_id for create_appointment or reschedule_appointment. For services with service_area_required, call only after check_service_area confirms eligibility; skip when the current location is already outside the service area.`,
      inputSchema: {
        type: 'object',
        properties: {
          service_id: { type: 'string' },
          start_date: { type: 'string', format: 'date' },
          end_date: { type: 'string', format: 'date' },
          postal_code: { type: 'string', description: 'Required for field services with service-area rules.' },
          time_preference: { type: 'string', description: 'Examples: after 16:00, morning, afternoon.' },
          preferred_resource_id: { type: 'string', description: 'Optional provider/resource preference.' },
        },
        required: ['service_id', 'start_date', 'end_date'],
      },
      annotations: { readOnlyHint: true },
      execute: toolExecute<Record<string, unknown>>(`${base}/get-availability`),
    },
    {
      name: 'create_appointment',
      description: `Create a confirmed ${businessName} appointment after human confirmation. Requires slot_id from get_availability; returns reusable appointment_id. Revalidates service area, slot, and resources atomically.`,
      inputSchema: {
        type: 'object',
        properties: {
          service_id: { type: 'string' },
          slot_id: { type: 'string' },
          idempotency_key: { type: 'string' },
          postal_code: { type: 'string' },
          customer: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              service_address: {
                type: 'object',
                properties: {
                  line1: { type: 'string' },
                  city: { type: 'string' },
                  region: { type: 'string' },
                  postal_code: { type: 'string' },
                },
              },
            },
            required: ['name'],
          },
          notes: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              location_detail: { type: 'string' },
            },
          },
        },
        required: ['service_id', 'slot_id', 'customer', 'idempotency_key'],
      },
      annotations: { readOnlyHint: false },
      execute: toolExecute<Record<string, unknown>>(`${base}/create-appointment`),
    },
    {
      name: 'get_appointment',
      description: 'Retrieve a compact appointment summary by appointment_id for the current business.',
      inputSchema: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string' },
        },
        required: ['appointment_id'],
      },
      annotations: { readOnlyHint: true },
      execute: toolExecute<{ appointment_id: string }>(`${base}/appointments/get`),
    },
    {
      name: 'reschedule_appointment',
      description: 'Reschedule an appointment to a new slot_id after human confirmation. Use a fresh slot_id from get_availability.',
      inputSchema: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string' },
          new_slot_id: { type: 'string' },
          idempotency_key: { type: 'string' },
        },
        required: ['appointment_id', 'new_slot_id', 'idempotency_key'],
      },
      annotations: { readOnlyHint: false },
      execute: toolExecute<Record<string, unknown>>(`${base}/appointments/reschedule`),
    },
    {
      name: 'cancel_appointment',
      description: 'Cancel an appointment after human confirmation and release all resource allocations.',
      inputSchema: {
        type: 'object',
        properties: {
          appointment_id: { type: 'string' },
          idempotency_key: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['appointment_id', 'idempotency_key'],
      },
      annotations: { readOnlyHint: false },
      execute: toolExecute<Record<string, unknown>>(`${base}/appointments/cancel`),
    },
  ];
}

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

export { registrationErrorMessage };

export async function registerBusinessTools(
  businessSlug: string,
  businessName: string,
  signal: AbortSignal,
): Promise<RegistrationResult> {
  const modelContext = getModelContext();
  if (!modelContext?.registerTool) {
    return {
      supported: false,
      attempted: false,
      registered: [],
      errors: [],
      businessSlug,
    };
  }

  const tools = createBusinessTools(businessSlug, businessName);
  const registered: string[] = [];
  const errors: RegistrationError[] = [];

  for (const tool of tools) {
    if (signal.aborted) break;
    try {
      await modelContext.registerTool(tool, { signal });
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
    businessSlug,
  };
}
