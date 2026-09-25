import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";
import { defineConfig } from "vitest/config";

const unitDataDir = path.join(tmpdir(), `milo-unit-${process.pid}-${Date.now()}`);
process.env.MILO_DATA_DIR = unitDataDir;
process.env.STORAGE_DIR = path.join(unitDataDir, "uploads");

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts", "tests/contract/**/*.test.ts"],
  },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
