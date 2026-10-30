// Starts everything the browser tests need, completely apart from the real app and database:
// a throwaway in-memory MongoDB (a one-node replica set, so money transactions work), test data (e2e/seed.ts),
// a production build in .next-e2e and `next start` on E2E_PORT (3100). Email, Pusher, push, Gemini and the
// Cloudflare check are switched off, so nothing leaves this machine. Playwright runs this as its webServer and
// stops it at the end, which also deletes the database.
//   E2E_SKIP_BUILD=1  reuse the last .next-e2e build (only when nothing in src changed)

import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { seed } from "./seed";

const PORT = process.env.E2E_PORT || "3100";
const DIST = ".next-e2e";
const NEXT = "node_modules/next/dist/bin/next";

async function main() {
  const repl = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  const uri = repl.getUri("autogo_e2e");
  await seed(uri);
  console.log(`[e2e] test database ready and seeded`);

  // Values set here win over .env (Next only fills in variables that aren't set), so these turn things off
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    NEXT_DIST_DIR: DIST,
    DATABASE_URL: uri,
    NEXTAUTH_URL: `http://127.0.0.1:${PORT}`,
    AUTH_URL: `http://127.0.0.1:${PORT}`,
    AUTH_TRUST_HOST: "true",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || "e2e-only-secret-not-for-production-0123456789",
    EMAIL_DISABLED: "1",
    EMAIL_USER: "",
    EMAIL_PASS: "",
    SMTP_HOST: "",
    PUSHER_APP_ID: "",
    PUSHER_KEY: "",
    PUSHER_SECRET: "",
    NEXT_PUBLIC_PUSHER_KEY: "",
    VAPID_PRIVATE_KEY: "",
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: "",
    TURNSTILE_SECRET_KEY: "",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
    GEMINI_API_KEY: "",
    TWILIO_ACCOUNT_SID: "",
    CRON_SECRET: "",
  };

  if (process.env.E2E_SKIP_BUILD !== "1" || !existsSync(`${DIST}/BUILD_ID`)) {
    console.log(`[e2e] building the app into ${DIST} (a few minutes)…`);
    // Not spawnSync: blocking this process stalls the in-memory MongoDB, whose output it reads, and the pages
    // that query it at build time then time out
    const status = await new Promise<number | null>(resolve =>
      spawn(process.execPath, [NEXT, "build"], { env, stdio: "inherit" }).on("exit", resolve));
    if (status !== 0) {
      await repl.stop();
      process.exit(status ?? 1);
    }
  }

  const app = spawn(process.execPath, [NEXT, "start", "-p", PORT, "-H", "127.0.0.1"], { env, stdio: "inherit" });
  // Playwright signals every process at once when the tests end, so the app may log a few "ECONNREFUSED" lines
  // for the database that stopped first; they're harmless
  const stop = async () => {
    app.kill("SIGTERM");
    await repl.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
  app.on("exit", async code => {
    await repl.stop().catch(() => {});
    process.exit(code ?? 0);
  });
}

main().catch(error => {
  console.error("[e2e] failed to start:", error);
  process.exit(1);
});
