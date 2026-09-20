const DEFAULT_WEB_ORIGIN = 'http://localhost:3001';

/**
 * Resolve the browser origin allowed to call the API with credentials.
 * Rejects wildcards and empty values so CORS cannot be left wide open.
 */
export function resolveWebOrigin(
  value: string | undefined = process.env.WEB_ORIGIN,
): string {
  const origin = (value ?? DEFAULT_WEB_ORIGIN).trim();
  if (!origin || origin === '*' || origin.includes('*')) {
    throw new Error(
      'WEB_ORIGIN must be a concrete origin (for example http://localhost:3001), not a wildcard',
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(`WEB_ORIGIN is not a valid URL: ${origin}`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`WEB_ORIGIN must use http or https: ${origin}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error('WEB_ORIGIN must not include credentials');
  }
  // Origin only: scheme + host (+ port). No path/query/hash.
  return parsed.origin;
}
