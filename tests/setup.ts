import { beforeEach } from 'vitest';

process.env.NEXT_PUBLIC_PROTOCOLTOOLING_API_URL =
  process.env.NEXT_PUBLIC_PROTOCOLTOOLING_API_URL ?? 'http://localhost:3000';

beforeEach(() => {
  // Pure presentation & in-memory demo tests (no database required)
});
