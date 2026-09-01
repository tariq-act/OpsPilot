import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";
import { resolveDatabaseUrlForPrismaCli } from "./src/database/database-url.js";

const rootDir = dirname(fileURLToPath(import.meta.url));
const envFile = join(rootDir, ".env");

if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: resolveDatabaseUrlForPrismaCli(),
  },
});
