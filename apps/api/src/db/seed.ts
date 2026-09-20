import 'dotenv/config';
import { sqlClient } from './index.js';

/**
 * Local / staging seed entrypoint.
 * Do not put production secrets here. Organization onboarding seed comes later.
 */
async function seed() {
  console.log('No seed data configured yet.');
}

try {
  await seed();
} catch (error) {
  console.error('Seed failed', error);
  process.exitCode = 1;
} finally {
  await sqlClient.end({ timeout: 5 });
}
