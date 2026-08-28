import { NextResponse } from 'next/server';
import { processDemoTurnSafe } from '@/demo/conversation';
import type { DemoTurnRequest } from '@/demo/types';

export const runtime = 'nodejs';

/**
 * Stateless demo turn endpoint.
 *
 * Isolation: the client sends the full demo config + conversation appointments
 * with every request. Nothing is written to Postgres or shared server state,
 * so sessions cannot leak and seeded businesses are never mutated.
 */
export async function POST(request: Request) {
  let body: DemoTurnRequest;
  try {
    body = (await request.json()) as DemoTurnRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body.' } },
      { status: 400 },
    );
  }

  if (!body?.config || !body.message) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'config and message are required.' },
      },
      { status: 400 },
    );
  }

  const result = processDemoTurnSafe({
    config: body.config,
    conversation: body.conversation ?? {
      phase: 'idle',
      appointments: [],
      serviceQuery: null,
      pendingService: null,
      pendingOffer: null,
      selectedSlotId: null,
      lastBooking: null,
    },
    message: body.message,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        reply: result.reply,
        error: result.error,
        conversation: body.conversation,
        activity: result.activity,
        businessNotice: null,
      },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
