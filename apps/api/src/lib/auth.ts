import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from '../auth/auth.constants.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { resolveWebOrigin } from './web-origin.js';

function resolveAuthBaseUrl(): string {
  const raw = process.env.BETTER_AUTH_URL?.trim() || 'http://localhost:3000';
  try {
    return new URL(raw).origin;
  } catch {
    throw new Error(
      `BETTER_AUTH_URL must be a valid URL (for example https://api.example.com): ${raw}`,
    );
  }
}

const authBaseUrl = resolveAuthBaseUrl();
const useSecureCookies =
  process.env.NODE_ENV === 'production' || authBaseUrl.startsWith('https://');

export const auth = betterAuth({
  baseURL: authBaseUrl,
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
  advanced: {
    useSecureCookies,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: useSecureCookies,
      path: '/',
    },
  },
});
