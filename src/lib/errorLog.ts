import { createHash } from "crypto";
import { after } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ErrorLog, type ErrorSource } from "@/models/ErrorLog";

type Occurrence = {
  source?: ErrorSource;
  where: string;
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  digest?: string;
};

// Numbers, hex ids and quoted values change between occurrences of the same bug, so they're blanked for grouping
const normalise = (s: string) =>
  s.replace(/[0-9a-f]{24}/gi, "<id>").replace(/"[^"]{0,80}"|'[^']{0,80}'/g, "<v>").replace(/\d+/g, "<n>").slice(0, 300);

const fingerprintOf = (o: Occurrence) => createHash("sha1").update(`${o.source}|${o.where}|${normalise(o.message)}`).digest("hex");

// Per instance: the same error is written at most once every 10 s, and the skipped ones are added to the next write,
// so an error storm (e.g. the database going down) can't turn into thousands of writes
const THROTTLE_MS = 10_000;
const recent = new Map<string, { at: number; skipped: number }>();

async function save(o: Occurrence): Promise<void> {
  const fingerprint = fingerprintOf(o);
  const now = Date.now();
  const seen = recent.get(fingerprint);
  if (seen && now - seen.at < THROTTLE_MS) {
    seen.skipped++;
    return;
  }
  const extra = seen?.skipped ?? 0;
  recent.set(fingerprint, { at: now, skipped: 0 });
  if (recent.size > 500) recent.delete(recent.keys().next().value!);
  try {
    await connectDB();
    await ErrorLog.updateOne(
      { fingerprint },
      {
        $set: {
          source: o.source ?? "SERVER",
          where: o.where.slice(0, 200),
          message: o.message.slice(0, 1000),
          stack: o.stack?.slice(0, 4000),
          path: o.path?.slice(0, 300),
          method: o.method?.slice(0, 10),
          digest: o.digest?.slice(0, 50),
          lastSeenAt: new Date(now),
        },
        $unset: { resolvedAt: 1 },
        $inc: { count: 1 + extra },
        $setOnInsert: { firstSeenAt: new Date(now) },
      },
      { upsert: true }
    );
  } catch (e) {
    // Never report the reporter's own failure (the database is often the thing that's down)
    console.error("Error log write failed:", e);
  }
}

/** Saves an occurrence after the response is sent when inside a request, otherwise right away. Never throws. */
export function recordError(o: Occurrence): Promise<void> {
  const task = save(o);
  try {
    after(() => task);
  } catch {
    // Outside a request (scripts, instrumentation); the caller may await the promise
  }
  return task;
}

/**
 * A drop-in for console.error in server code: prints the same thing and also records it in the admin
 * Errors page (/admin/errors), grouped by label and message.
 *   reportError("Create listing error:", error);
 * The first string is the label; the first non-string is the error.
 */
export function reportError(...args: unknown[]): void {
  console.error(...args);
  const label = args.find(a => typeof a === "string") as string | undefined;
  const err = args.find(a => typeof a !== "string");
  const e = err instanceof Error ? err : null;
  const message = e?.message || (err !== undefined ? safeString(err) : label) || "Unknown error";
  const where = label?.replace(/[:\s]+$/, "") || e?.stack?.split("\n")[1]?.trim().replace(/^at\s+/, "").slice(0, 120) || "Unlabelled";
  void recordError({ where, message, stack: e?.stack, digest: (e as { digest?: string } | null)?.digest });
}

function safeString(v: unknown): string {
  try {
    return typeof v === "object" ? JSON.stringify(v).slice(0, 1000) : String(v);
  } catch {
    return String(v);
  }
}
