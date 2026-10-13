const BLOCKED_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'credentials',
  'cardNumber',
  'cvv',
  'cvc',
  'email',
  'phone',
  'recipient',
]);

/**
 * Drop sensitive keys and truncate nested objects for audit metadata.
 */
export function sanitizeAuditMetadata(
  input: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!input) return {};
  return scrub(input, 0) as Record<string, unknown>;
}

function scrub(value: unknown, depth: number): unknown {
  if (depth > 4) return '[truncated]';
  if (value == null) return value;
  if (typeof value === 'string') return value.slice(0, 500);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => scrub(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (BLOCKED_KEYS.has(key)) continue;
      if (/password|token|secret|credential|cvv|cvc/i.test(key)) continue;
      out[key] = scrub(child, depth + 1);
    }
    return out;
  }
  return String(value).slice(0, 200);
}
