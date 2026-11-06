import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Database tests (`npm run test:db`): server code that guards money, limits and published data, run against a
// throwaway in-memory MongoDB (src/lib/__dbtests__/globalSetup.ts). Kept apart from `npm test`, which never touches a
// database. Files run one after another and each one empties the database first.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.dbtest.ts"],
    environment: "node",
    globalSetup: ["src/lib/__dbtests__/globalSetup.ts"],
    setupFiles: ["src/lib/__dbtests__/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
