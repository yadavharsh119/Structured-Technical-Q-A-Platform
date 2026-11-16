import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { config } from './index';
import { Database } from '../types/database';

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  connectionTimeoutMillis: 3000,
  max: 20,
  idleTimeoutMillis: 30000,
});

export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool,
  }),
});

export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    // Perform simple ping query
    await sql`SELECT 1`.execute(db);
    const latencyMs = Date.now() - start;
    return { connected: true, latencyMs };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown database error';
    return { connected: false, error };
  }
}

export async function closeDatabaseConnection(): Promise<void> {
  await db.destroy();
}
