import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSeeded } from '@/db/init';
import { bookingService, handleServiceError } from '@/services/booking-service';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  await ensureDatabaseSeeded();
  const { slug } = await context.params;
  const body = await request.json();
  try {
    const result = await bookingService.rescheduleAppointment({ businessSlug: slug, ...body });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(handleServiceError(error), { status: 400 });
  }
}
