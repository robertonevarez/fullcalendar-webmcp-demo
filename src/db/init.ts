import { seedDatabase } from '@/db/seed';

let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Ensures demo catalog data exists. Does not create schema (run migrations separately).
 * Safe to call from concurrent requests; only seeds when businesses table is empty.
 */
export async function ensureDatabaseSeeded() {
  if (initialized) return;
  if (!initPromise) {
    initPromise = seedDatabase(false)
      .then(() => {
        initialized = true;
      })
      .catch((error) => {
        initPromise = null;
        throw error;
      });
  }
  await initPromise;
}

/** Test helper: allow re-init after force reseed. */
export function resetInitFlagForTests() {
  initialized = false;
  initPromise = null;
}
