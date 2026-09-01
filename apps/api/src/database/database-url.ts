function readSslEnabled(): boolean {
  const raw = process.env.DATABASE_SSL?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "require";
}

function readDatabaseParts(): {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
} | null {
  const host = process.env.DATABASE_HOST?.trim();
  const database = process.env.DATABASE_NAME?.trim();
  const user = process.env.DATABASE_USER?.trim();
  const password = process.env.DATABASE_PASSWORD;
  const portRaw = process.env.DATABASE_PORT?.trim();

  if (!host || !database || !user || password === undefined || !portRaw) {
    return null;
  }

  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0) {
    return null;
  }

  return { host, port, database, user, password, ssl: readSslEnabled() };
}

/** Placeholder used only when Prisma CLI runs without database env (e.g. CI generate). */
export const PRISMA_CLI_PLACEHOLDER_DATABASE_URL =
  "postgresql://127.0.0.1:5432/prisma_cli_placeholder?schema=public";

/**
 * Resolves the PostgreSQL connection URL for Prisma and driver adapters.
 *
 * Prefers `DATABASE_URL` when set. Otherwise builds a URL from discrete
 * `DATABASE_*` variables used elsewhere in the API.
 */
export function resolveDatabaseUrl(): string | null {
  const direct = process.env.DATABASE_URL?.trim();
  if (direct) {
    return direct;
  }

  const parts = readDatabaseParts();
  if (!parts) {
    return null;
  }

  const user = encodeURIComponent(parts.user);
  const password = encodeURIComponent(parts.password);
  const sslQuery = parts.ssl ? "?sslmode=require" : "";

  return `postgresql://${user}:${password}@${parts.host}:${parts.port}/${parts.database}${sslQuery}`;
}

/** URL for Prisma CLI when no real database configuration is available. */
export function resolveDatabaseUrlForPrismaCli(): string {
  return resolveDatabaseUrl() ?? PRISMA_CLI_PLACEHOLDER_DATABASE_URL;
}
