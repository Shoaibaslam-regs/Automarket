import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for the client-safe logic in src/lib (money, bookings, plans). They never touch the database.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
