import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseService } from "./database.service.js";

const DATABASE_ENV_KEYS = [
  "DATABASE_HOST",
  "DATABASE_PORT",
  "DATABASE_NAME",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
  "DATABASE_SSL",
] as const;

function clearDatabaseEnv(): void {
  for (const key of DATABASE_ENV_KEYS) {
    delete process.env[key];
  }
}

describe("DatabaseService", () => {
  let service: DatabaseService;

  afterEach(async () => {
    await service?.onModuleDestroy();
    clearDatabaseEnv();
  });

  it("reports unavailable when database env is unset", async () => {
    clearDatabaseEnv();
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseService],
    }).compile();

    service = module.get(DatabaseService);
    await expect(service.ping()).resolves.toBe(false);
  });

  it("reports unavailable when PostgreSQL is unreachable", async () => {
    process.env.DATABASE_HOST = "127.0.0.1";
    process.env.DATABASE_PORT = "1";
    process.env.DATABASE_NAME = "opspilot";
    process.env.DATABASE_USER = "opspilot";
    process.env.DATABASE_PASSWORD = "opspilot";
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseService],
    }).compile();

    service = module.get(DatabaseService);
    await expect(service.ping()).resolves.toBe(false);
  });
});
