import { resolveWebOrigin } from './web-origin.js';

const MIN_AUTH_SECRET_LENGTH = 32;

export type ApiRuntimeEnv = {
  nodeEnv: string;
  isProduction: boolean;
  port: number;
  databaseUrl: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  webOrigin: string;
};

function requireNonEmpty(name: string, value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    throw new Error(`${name} must be set`);
  }
  return trimmed;
}

/**
 * Validate and normalize API process environment.
 * Call once at bootstrap before NestFactory.create.
 */
export function loadApiEnv(
  env: NodeJS.ProcessEnv = process.env,
): ApiRuntimeEnv {
  const nodeEnv = (env.NODE_ENV ?? 'development').trim() || 'development';
  const isProduction = nodeEnv === 'production';

  const databaseUrl = requireNonEmpty('DATABASE_URL', env.DATABASE_URL);

  const betterAuthSecret = requireNonEmpty(
    'BETTER_AUTH_SECRET',
    env.BETTER_AUTH_SECRET,
  );
  if (betterAuthSecret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new Error(
      `BETTER_AUTH_SECRET must be at least ${MIN_AUTH_SECRET_LENGTH} characters. Generate one with: openssl rand -base64 32`,
    );
  }

  // In production, refuse localhost defaults so a misconfigured deploy fails fast.
  if (isProduction) {
    requireNonEmpty('BETTER_AUTH_URL', env.BETTER_AUTH_URL);
    requireNonEmpty('WEB_ORIGIN', env.WEB_ORIGIN);
  }

  const betterAuthUrlRaw =
    env.BETTER_AUTH_URL?.trim() || 'http://localhost:3000';
  let betterAuthUrl: string;
  try {
    const parsed = new URL(betterAuthUrlRaw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('protocol');
    }
    if (parsed.username || parsed.password) {
      throw new Error('credentials');
    }
    betterAuthUrl = parsed.origin;
  } catch {
    throw new Error(
      `BETTER_AUTH_URL must be a concrete http(s) origin (for example https://api.example.com): ${betterAuthUrlRaw}`,
    );
  }

  if (isProduction && !betterAuthUrl.startsWith('https://')) {
    throw new Error(
      'BETTER_AUTH_URL must use https in production (secure session cookies)',
    );
  }

  const webOrigin = resolveWebOrigin(env.WEB_ORIGIN);
  if (isProduction && !webOrigin.startsWith('https://')) {
    throw new Error('WEB_ORIGIN must use https in production');
  }

  const portRaw = env.PORT?.trim();
  const port = portRaw ? Number(portRaw) : 3000;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer 1–65535, got: ${env.PORT}`);
  }

  return {
    nodeEnv,
    isProduction,
    port,
    databaseUrl,
    betterAuthSecret,
    betterAuthUrl,
    webOrigin,
  };
}
