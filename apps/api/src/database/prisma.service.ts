import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { resolveDatabaseUrl } from "./database-url.js";

function readSslEnabled(): boolean {
  const raw = process.env.DATABASE_SSL?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "require";
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly client: PrismaClient | null;
  private disconnected = false;

  constructor() {
    const url = resolveDatabaseUrl();
    if (!url) {
      this.client = null;
      this.logger.warn(
        "Database URL is unavailable; Prisma client is not configured",
      );
      return;
    }

    const sslEnabled = readSslEnabled();
    const pool = new Pool({
      connectionString: url,
      connectionTimeoutMillis: 5_000,
      ...(sslEnabled ? { ssl: { rejectUnauthorized: true } } : {}),
    });
    pool.on("error", (error: Error) => {
      this.logger.error(`Prisma PostgreSQL pool error: ${error.message}`);
    });

    const adapter = new PrismaPg(pool);
    this.client = new PrismaClient({ adapter });
  }

  /** Returns the Prisma client when configured; otherwise throws. */
  get prisma(): PrismaClient {
    if (!this.client) {
      throw new Error("Prisma client is not configured");
    }

    return this.client;
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async onModuleInit(): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.disconnected) {
      return;
    }

    this.disconnected = true;

    if (this.client) {
      await this.client.$disconnect();
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "unknown error";
      this.logger.error(`Prisma ping failed: ${message}`);
      return false;
    }
  }
}
