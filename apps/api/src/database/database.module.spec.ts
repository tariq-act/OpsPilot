import { Injectable, Module } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DatabaseModule } from "./database.module.js";
import { DatabaseService } from "./database.service.js";
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

describe("DatabaseModule", () => {
  let moduleRef: TestingModule | undefined;

  beforeEach(() => {
    clearDatabaseEnv();
  });

  afterEach(async () => {
    await moduleRef?.close();
    moduleRef = undefined;
    clearDatabaseEnv();
  });

  it("exports DatabaseService and PrismaService to modules that import it", async () => {
    @Injectable()
    class PersistenceConsumer {
      constructor(
        readonly database: DatabaseService,
        readonly prisma: PrismaService,
      ) {}
    }

    @Module({
      imports: [DatabaseModule],
      providers: [PersistenceConsumer],
    })
    class PersistenceConsumerModule {}

    moduleRef = await Test.createTestingModule({
      imports: [PersistenceConsumerModule],
    }).compile();

    const consumer = moduleRef.get(PersistenceConsumer);
    expect(consumer.database).toBeInstanceOf(DatabaseService);
    expect(consumer.prisma).toBeInstanceOf(PrismaService);
  });

  it("does not expose providers to modules that do not import it", async () => {
    @Injectable()
    class UnauthorizedConsumer {
      constructor(readonly prisma: PrismaService) {}
    }

    @Module({
      providers: [UnauthorizedConsumer],
    })
    class UnauthorizedModule {}

    await expect(
      Test.createTestingModule({
        imports: [DatabaseModule, UnauthorizedModule],
      }).compile(),
    ).rejects.toThrow(/PrismaService/);
  });
});
