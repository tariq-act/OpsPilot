import { AsyncLocalStorage } from 'node:async_hooks';

export type AuditRequestMeta = {
  ipAddress: string | null;
  userAgent: string | null;
};

const storage = new AsyncLocalStorage<AuditRequestMeta>();

export function runWithAuditRequestMeta<T>(
  meta: AuditRequestMeta,
  fn: () => T,
): T {
  return storage.run(meta, fn);
}

export function getAuditRequestMeta(): AuditRequestMeta {
  return (
    storage.getStore() ?? {
      ipAddress: null,
      userAgent: null,
    }
  );
}

export function extractAuditRequestMeta(req: {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): AuditRequestMeta {
  const forwarded = req.headers?.['x-forwarded-for'];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const fromForwarded = forwardedValue?.split(',')[0]?.trim();
  const ipAddress =
    fromForwarded || req.ip || req.socket?.remoteAddress || null;

  const rawUa = req.headers?.['user-agent'];
  const userAgent = Array.isArray(rawUa) ? rawUa[0] : (rawUa ?? null);

  return {
    ipAddress: ipAddress ? ipAddress.slice(0, 128) : null,
    userAgent: userAgent ? userAgent.slice(0, 512) : null,
  };
}
