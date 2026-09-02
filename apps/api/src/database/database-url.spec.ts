import {
  PRISMA_CLI_PLACEHOLDER_DATABASE_URL,
  resolveDatabaseUrl,
  resolveDatabaseUrlForPrismaCli,
} from "./database-url.js";

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

describe("resolveDatabaseUrl", () => {
  afterEach(() => {
    clearDatabaseEnv();
  });

  it("returns null when env is incomplete", () => {
    clearDatabaseEnv();
    expect(resolveDatabaseUrl()).toBeNull();
  });

  it("prefers DATABASE_URL when set", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@db.example.com:5432/app";
    process.env.DATABASE_HOST = "ignored";
    expect(resolveDatabaseUrl()).toBe(
      "postgresql://user:pass@db.example.com:5432/app",
    );
  });

  it("builds a URL from DATABASE_* variables", () => {
    process.env.DATABASE_HOST = "db.example.com";
    process.env.DATABASE_PORT = "5432";
    process.env.DATABASE_NAME = "opspilot";
    process.env.DATABASE_USER = "api_user";
    process.env.DATABASE_PASSWORD = "s3cret";
    process.env.DATABASE_SSL = "true";

    expect(resolveDatabaseUrl()).toBe(
      "postgresql://api_user:s3cret@db.example.com:5432/opspilot?sslmode=require",
    );
  });

  it("URL-encodes credentials with special characters", () => {
    process.env.DATABASE_HOST = "db.example.com";
    process.env.DATABASE_PORT = "5432";
    process.env.DATABASE_NAME = "opspilot";
    process.env.DATABASE_USER = "user@domain";
    process.env.DATABASE_PASSWORD = "p@ss:w/ord";

    expect(resolveDatabaseUrl()).toBe(
      "postgresql://user%40domain:p%40ss%3Aw%2Ford@db.example.com:5432/opspilot",
    );
  });

  it("falls back to a CLI placeholder when env is unset", () => {
    clearDatabaseEnv();
    expect(resolveDatabaseUrlForPrismaCli()).toBe(
      PRISMA_CLI_PLACEHOLDER_DATABASE_URL,
    );
  });
});
