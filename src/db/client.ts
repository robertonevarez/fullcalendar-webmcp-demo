import { AsyncLocalStorage } from 'async_hooks';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

/**
 * Postgres client for Protocol Tooling.
 *
 * Driver: `pg` (PlanetScale first-party recommendation for Node.js / Vercel).
 * Production: DATABASE_URL with PlanetScale PgBouncer port 6432 + sslmode=verify-full.
 * Pool: module-level Pool reused across warm serverless instances.
 * On Vercel: attachDatabasePool closes idle connections before Fluid suspension.
 */

export type Queryable = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
};

const txStorage = new AsyncLocalStorage<PoolClient>();

let pool: Pool | null = null;
let attachAttempted = false;

function requiresSsl(connectionString: string): boolean {
  if (connectionString.includes('localhost') || connectionString.includes('127.0.0.1')) {
    return false;
  }
  return true;
}

export function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Use PlanetScale Postgres (port 6432 for app traffic).');
  }

  pool = new Pool({
    connectionString,
    ssl: requiresSsl(connectionString) ? { rejectUnauthorized: true } : undefined,
    // Small pool: PgBouncer is the real multiplexer; keep serverless clients light.
    max: Number(process.env.PG_POOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  if (!attachAttempted && process.env.VERCEL) {
    attachAttempted = true;
    void import('@vercel/functions')
      .then((mod) => {
        mod.attachDatabasePool(pool!);
      })
      .catch(() => {
        // Optional in non-Vercel / test environments.
      });
  }

  return pool;
}

export function getQueryable(): Queryable {
  return txStorage.getStore() ?? getPool();
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getQueryable().query<T>(text, params);
}

export async function runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const existing = txStorage.getStore();
  if (existing) {
    return fn();
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await txStorage.run(client, fn);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Close pool (tests / scripts). */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    attachAttempted = false;
  }
}

/** Reset module pool between tests when DATABASE_URL changes. */
export function resetPoolForTests(): void {
  if (pool) {
    void pool.end();
    pool = null;
    attachAttempted = false;
  }
}
