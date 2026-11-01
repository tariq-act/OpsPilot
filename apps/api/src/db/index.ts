import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const isProduction = process.env.NODE_ENV === 'production';

/**
 * postgres.js client for the Nest API.
 * Prefer a direct or session-mode Supabase connection for this long-lived process.
 * Do not use the Supabase service-role key here — DATABASE_URL is a Postgres role URL only.
 */
export const sqlClient = postgres(databaseUrl, {
  max: isProduction ? 10 : 5,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle({ client: sqlClient });

export * as schema from './schema/index.js';
