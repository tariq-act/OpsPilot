import 'dotenv/config';
import { AUTH_PASSWORD_MAX_LENGTH } from '../auth/auth.constants.js';
import { seedDemoData, SeedError } from './seed-demo-data.js';

function validateEnvironment(): string {
  if (process.env.NODE_ENV === 'production') {
    throw new SeedError('Demo seeding is disabled in production.');
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new SeedError('DATABASE_URL is required.');

  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new SeedError('DATABASE_URL is not a valid PostgreSQL URL.');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  ) {
    throw new SeedError(
      'Demo seeding requires a local PostgreSQL connection (localhost or loopback).',
    );
  }
  const password = process.env.DEMO_SEED_PASSWORD;
  if (
    !password ||
    password.length < 12 ||
    password.length > AUTH_PASSWORD_MAX_LENGTH
  ) {
    throw new SeedError(
      `Set DEMO_SEED_PASSWORD to a development password between 12 and ${AUTH_PASSWORD_MAX_LENGTH} characters.`,
    );
  }
  if ((process.env.BETTER_AUTH_SECRET?.trim().length ?? 0) < 32) {
    throw new SeedError('Configure BETTER_AUTH_SECRET before seeding.');
  }
  return password;
}

async function seed() {
  const password = validateEnvironment();
  // Do not initialize the database or auth client until the local-only guard passes.
  const { db, sqlClient } = await import('./index.js');
  try {
    const { auth } = await import('../lib/auth.js');
    await seedDemoData(db, auth.api, password);
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
}

try {
  await seed();
} catch (error) {
  console.error(
    error instanceof SeedError
      ? error.message
      : 'Demo seed failed. Check the local database, migrations, and Better Auth configuration.',
  );
  process.exitCode = 1;
}
