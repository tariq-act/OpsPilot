import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";

function readSslEnabled(): boolean {
  const raw = process.env.DATABASE_SSL?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "require";
}

function readDatabaseConfig(): {
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

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool | null;

  constructor() {
    const config = readDatabaseConfig();
    if (!config) {
      this.pool = null;
      this.logger.warn(
        "PostgreSQL config is incomplete; database is unavailable",
      );
      return;
    }

    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      connectionTimeoutMillis: 5_000,
      ...(config.ssl ? { ssl: { rejectUnauthorized: true } } : {}),
    });
    this.pool.on("error", (error: Error) => {
      this.logger.error(`PostgreSQL pool error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }

  async ping(): Promise<boolean> {
    if (!this.pool) {
      return false;
    }

    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.error(`PostgreSQL ping failed: ${message}`);
      return false;
    }
  }
}
