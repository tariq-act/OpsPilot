import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "unit",
    globals: true,
    root: "./",
    environment: "node",
    include: ["src/**/*.spec.ts"],
    exclude: ["**/*.e2e-spec.ts", "test/**", "dist/**", "node_modules/**"],
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/main.ts"],
    },
  },
});
