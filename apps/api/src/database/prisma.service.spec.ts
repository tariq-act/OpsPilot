import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "./prisma.service.js";

const DATABASE_ENV_KEYS = [
  "DATABASE_URL",
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

describe("PrismaService", () => {
  let service: PrismaService;

  afterEach(async () => {
    await service?.onModuleDestroy();
    clearDatabaseEnv();
  });

  it("is not configured when database env is unset", () => {
    clearDatabaseEnv();
    service = new PrismaService();
    expect(service.isConfigured).toBe(false);
  });

  it("throws when accessing prisma without configuration", () => {
    clearDatabaseEnv();
    service = new PrismaService();
    expect(() => service.prisma).toThrow("Prisma client is not configured");
  });

  it("ping returns false when database env is unset", async () => {
    clearDatabaseEnv();
    service = new PrismaService();
    await expect(service.ping()).resolves.toBe(false);
  });

  it("connects and disconnects cleanly when configured", async () => {
    process.env.DATABASE_HOST = "127.0.0.1";
    process.env.DATABASE_PORT = "1";
    process.env.DATABASE_NAME = "opspilot";
    process.env.DATABASE_USER = "opspilot";
    process.env.DATABASE_PASSWORD = "opspilot";

    service = new PrismaService();
    expect(service.isConfigured).toBe(true);

    await service.onModuleInit();
    await expect(service.ping()).resolves.toBe(false);
    await service.onModuleDestroy();
  });

  it("is a singleton when provided through Nest DI", async () => {
    clearDatabaseEnv();
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get(PrismaService);
    const second = module.get(PrismaService);
    expect(service).toBe(second);
    await module.close();
  });
});
