import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "e2e",
    globals: true,
    root: "./",
    environment: "node",
    include: ["test/**/*.e2e-spec.ts"],
    exclude: ["dist/**", "node_modules/**"],
    restoreMocks: true,
    clearMocks: true,
    unstubEnvs: true,
    fileParallelism: false,
  },
});
