import { NextRequest, NextResponse } from 'next/server';
import { resetDemoMutableState } from '@/db/seed';

export const runtime = 'nodejs';

/**
 * Restores mutable demo booking state (appointments / tokens / idempotency).
 * Does not drop schema or catalog seed data.
 * Disabled unless DEMO_RESET_TOKEN is configured.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.DEMO_RESET_TOKEN;
  if (!expected) {
    return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Not found.' } }, { status: 404 });
  }

  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  if (!token || token !== expected) {
    return NextResponse.json(
      { ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid demo reset token.' } },
      { status: 401 },
    );
  }

  const result = await resetDemoMutableState();
  return NextResponse.json({ ok: true, data: { reseeds: true, ...result } });
}
