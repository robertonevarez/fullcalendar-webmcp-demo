import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getProtocolToolingApiUrl, ProtocolToolingClient } from '@/lib/protocoltooling-client';

describe('ProtocolToolingClient & Backend Origin Contract', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('fails closed in production if NEXT_PUBLIC_PROTOCOLTOOLING_API_URL is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_PROTOCOLTOOLING_API_URL;

    expect(() => getProtocolToolingApiUrl()).toThrowError(
      'NEXT_PUBLIC_PROTOCOLTOOLING_API_URL is required in production.',
    );
  });

  it('uses NEXT_PUBLIC_PROTOCOLTOOLING_API_URL in production when provided', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_PROTOCOLTOOLING_API_URL = 'https://api.protocoltooling.com/';

    expect(getProtocolToolingApiUrl()).toBe('https://api.protocoltooling.com');
  });

  it('defaults to http://localhost:3000 in development when variable is unset', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.NEXT_PUBLIC_PROTOCOLTOOLING_API_URL;

    expect(getProtocolToolingApiUrl()).toBe('http://localhost:3000');
  });

  it('dispatches external requests to the configured backend origin', async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ ok: true, services: [{ id: 'svc_ac_diagnostic', name: 'AC Diagnostic' }] }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const client = new ProtocolToolingClient('https://api.protocoltooling.com');
    const result = await client.searchServices('acme-hvac', 'AC');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.protocoltooling.com/api/businesses/acme-hvac/search-services',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'AC' }),
      }),
    );
    expect(result).toEqual({ ok: true, services: [{ id: 'svc_ac_diagnostic', name: 'AC Diagnostic' }] });
  });
});
