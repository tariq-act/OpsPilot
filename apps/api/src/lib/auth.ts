import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from '../auth/auth.constants.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { resolveWebOrigin } from './web-origin.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: AUTH_PASSWORD_MIN_LENGTH,
    maxPasswordLength: AUTH_PASSWORD_MAX_LENGTH,
  },
  trustedOrigins: [resolveWebOrigin()],
});
