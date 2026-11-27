import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_NAME_MAX_LENGTH,
} from '../auth/auth.constants.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema/index.js';
import { resolveWebOrigin } from './web-origin.js';

export const auth = betterAuth<BetterAuthOptions>({
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
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/update-user') return;
      const { name, image } = ctx.body ?? {};
      if (
        name !== undefined &&
        (typeof name !== 'string' ||
          !name.trim() ||
          name.trim().length > AUTH_NAME_MAX_LENGTH)
      ) {
        throw new APIError('BAD_REQUEST', {
          message: 'Name must contain 1–100 characters',
        });
      }
      if (image !== undefined && image !== null) {
        let valid = false;
        if (typeof image === 'string' && image.length <= 2048) {
          try {
            valid = new URL(image).protocol === 'https:';
          } catch {
            /* invalid URL */
          }
        }
        if (!valid)
          throw new APIError('BAD_REQUEST', {
            message: 'Profile image must be an HTTPS URL',
          });
      }
      if (typeof name === 'string')
        return { context: { body: { ...ctx.body, name: name.trim() } } };
    }),
  },
});
