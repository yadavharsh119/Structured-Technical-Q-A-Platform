import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgrespassword'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'structured_qa'}`;

async function runMigrations() {
  console.log('[Migration] Starting database migration runner...');
  console.log(`[Migration] Connecting to database...`);

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
  });

  let client;
  try {
    client = await pool.connect();
  } catch (connErr: unknown) {
    const message = connErr instanceof Error ? connErr.message : String(connErr);
    console.error(`[Migration] Could not connect to PostgreSQL at ${connectionString}:`, message);
    await pool.end();
    throw new Error(
      'Database connection failed. Ensure PostgreSQL is running via docker-compose or locally.',
    );
  }

  try {
    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Get executed migrations
    const res = await client.query<{ name: string }>(
      'SELECT name FROM _migrations ORDER BY id ASC;',
    );
    const executedMigrations = new Set(res.rows.map((r) => r.name));

    // Read migration files
    const migrationsDir = path.resolve(__dirname, '../database/migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log(`[Migration] Directory ${migrationsDir} not found. Nothing to migrate.`);
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let appliedCount = 0;

    for (const file of files) {
      if (executedMigrations.has(file)) {
        console.log(`[Migration] Skipping already applied: ${file}`);
        continue;
      }

      console.log(`[Migration] Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1);', [file]);
        await client.query('COMMIT');
        console.log(`[Migration] Successfully applied: ${file}`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Migration] Failed to apply ${file}. Rolled back transaction.`, err);
        throw err;
      }
    }

    console.log(`[Migration] Migration complete. Applied ${appliedCount} new migration(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runMigrations().catch((err) => {
    console.error('[Migration] Migration error:', err.message);
    process.exit(1);
  });
}

export { runMigrations };
