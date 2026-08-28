import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Stateless demo reset endpoint.
 * Resets any active conversation state in client memory.
 */
export async function POST() {
  return NextResponse.json({ ok: true, data: { reset: true } });
}
