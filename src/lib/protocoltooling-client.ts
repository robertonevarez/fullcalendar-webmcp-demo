/**
 * Protocol Tooling API client.
 *
 * Used by the demo frontend to communicate with the canonical
 * Protocol Tooling core infrastructure backend.
 */

export function getProtocolToolingApiUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_PROTOCOLTOOLING_API_URL;

  if (process.env.NODE_ENV === 'production' && !configuredUrl) {
    throw new Error('NEXT_PUBLIC_PROTOCOLTOOLING_API_URL is required in production.');
  }

  return configuredUrl ? configuredUrl.trim().replace(/\/+$/, '') : 'http://localhost:3000';
}

export class ProtocolToolingClient {
  readonly getBaseUrl: () => string;

  constructor(baseUrlOrGetter?: string | (() => string)) {
    if (typeof baseUrlOrGetter === 'function') {
      this.getBaseUrl = baseUrlOrGetter;
    } else if (typeof baseUrlOrGetter === 'string') {
      const clean = baseUrlOrGetter.trim().replace(/\/+$/, '');
      this.getBaseUrl = () => clean;
    } else {
      this.getBaseUrl = getProtocolToolingApiUrl;
    }
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const base = this.getBaseUrl();
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({
        error: { code: 'HTTP_ERROR', message: `Request failed with status ${res.status}` },
      }));
      throw errorJson;
    }

    return res.json() as Promise<T>;
  }

  /**
   * Search for services offered by a business matching a natural language or keyword query.
   */
  async searchServices(businessSlug: string, query?: string) {
    return this.post<{
      services: Array<{
        id: string;
        name: string;
        description: string;
        price_cents: number;
        currency: string;
        duration_minutes: number;
        location_policy: string;
        service_area_required: boolean;
      }>;
    }>(`/api/businesses/${encodeURIComponent(businessSlug)}/search-services`, { query });
  }

  /**
   * Check if a postal code is eligible for service by this business.
   */
  async checkServiceArea(businessSlug: string, postalCode: string, serviceId?: string) {
    return this.post<{ status: 'eligible' | 'ineligible' | 'not_applicable'; postal_code?: string; message: string }>(
      `/api/businesses/${encodeURIComponent(businessSlug)}/check-service-area`,
      { postal_code: postalCode, service_id: serviceId },
    );
  }

  /**
   * Get available appointment slots for a service.
   */
  async getAvailability(
    businessSlug: string,
    params: {
      serviceId: string;
      startDate?: string;
      endDate?: string;
      postalCode?: string;
      timePreference?: string;
      limit?: number;
    },
  ) {
    return this.post<{ slots: Array<any> }>(
      `/api/businesses/${encodeURIComponent(businessSlug)}/get-availability`,
      {
        service_id: params.serviceId,
        start_date: params.startDate,
        end_date: params.endDate,
        postal_code: params.postalCode,
        time_preference: params.timePreference,
        limit: params.limit,
      },
    );
  }

  /**
   * Book an appointment with idempotency.
   */
  async createAppointment(
    businessSlug: string,
    params: {
      serviceId: string;
      slot: any;
      customer: {
        name: string;
        email?: string;
        phone?: string;
        service_address?: {
          line1: string;
          line2?: string;
          city: string;
          region: string;
          postal_code: string;
        };
      };
      postalCode?: string;
      idempotencyKey?: string;
      notes?: { description?: string; location_detail?: string };
    },
  ) {
    return this.post<{ appointment: any }>(
      `/api/businesses/${encodeURIComponent(businessSlug)}/create-appointment`,
      {
        service_id: params.serviceId,
        slot: params.slot,
        customer: params.customer,
        postal_code: params.postalCode,
        idempotency_key: params.idempotencyKey,
        notes: params.notes,
      },
    );
  }

  /**
   * Retrieve an existing appointment.
   */
  async getAppointment(businessSlug: string, appointmentId: string) {
    return this.post<{ appointment: any }>(
      `/api/businesses/${encodeURIComponent(businessSlug)}/appointments/get`,
      { appointment_id: appointmentId },
    );
  }

  /**
   * Reschedule an appointment to a new slot.
   */
  async rescheduleAppointment(
    businessSlug: string,
    params: {
      appointmentId: string;
      newSlot: any;
      idempotencyKey?: string;
    },
  ) {
    return this.post<{ appointment: any }>(
      `/api/businesses/${encodeURIComponent(businessSlug)}/appointments/reschedule`,
      {
        appointment_id: params.appointmentId,
        new_slot: params.newSlot,
        idempotency_key: params.idempotencyKey,
      },
    );
  }

  /**
   * Cancel an appointment.
   */
  async cancelAppointment(
    businessSlug: string,
    params: {
      appointmentId: string;
      reason?: string;
      idempotencyKey?: string;
    },
  ) {
    return this.post<{ appointment: any }>(
      `/api/businesses/${encodeURIComponent(businessSlug)}/appointments/cancel`,
      {
        appointment_id: params.appointmentId,
        reason: params.reason,
        idempotency_key: params.idempotencyKey,
      },
    );
  }
}

export const protocolClient = new ProtocolToolingClient();
