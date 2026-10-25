// Shapes and wording for the admin System usage page (database and UploadThing storage). Client-safe.

/** Past this share of a limit the meter turns amber, past DANGER red; the sidebar badge counts both. */
export const USAGE_WARN = 0.8;
export const USAGE_DANGER = 0.95;

/** MongoDB Atlas free (M0) clusters stop accepting writes at 512 MB; DB_STORAGE_LIMIT_MB overrides it for paid tiers. */
export const DEFAULT_DB_LIMIT_MB = 512;

export type UsageLevel = "ok" | "warn" | "danger" | "unknown";

/** Where a meter stands: unknown when there is no limit to compare with. */
export function usageLevel(used: number, limit: number | null | undefined): UsageLevel {
  if (!limit || limit <= 0) return "unknown";
  const share = used / limit;
  if (share >= USAGE_DANGER) return "danger";
  if (share >= USAGE_WARN) return "warn";
  return "ok";
}

/** Share of the limit as a whole percent for the bar and label (0–100, capped; a tiny use shows as "<1%"). */
export function usagePercent(used: number, limit: number | null | undefined): number {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.max(0, (used / limit) * 100));
}

export function percentText(used: number, limit: number | null | undefined): string {
  const p = usagePercent(used, limit);
  if (!limit) return "";
  if (p > 0 && p < 1) return "<1%";
  return `${Math.round(p)}%`;
}

/** "0 B", "812 KB", "3.4 MB", "1.25 GB": 1024-based, like the hosts' own dashboards. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  const digits = i === 0 ? 0 : v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return `${v.toFixed(digits).replace(/\.0+$|(\.\d*[1-9])0+$/, "$1")} ${units[i]}`;
}

export type CollectionUsage = { name: string; documents: number; dataBytes: number | null; indexBytes: number | null };

export type DbUsage = {
  ok: true;
  /** What the limit is measured against: data plus indexes (uncompressed), as Atlas counts it for shared tiers */
  usedBytes: number;
  dataBytes: number;
  indexBytes: number;
  /** On-disk size after compression, shown for reference */
  storageBytes: number;
  limitBytes: number;
  documents: number;
  collections: CollectionUsage[];
};

export type UploadUsage = {
  ok: true;
  /** This app's files */
  appBytes: number;
  /** Every app on the UploadThing account; the plan limit applies to this */
  accountBytes: number;
  limitBytes: number;
  files: number;
};

export type UsageFailure = { ok: false; error: string };

export type SystemUsage = {
  checkedAt: string;
  db: DbUsage | UsageFailure;
  uploads: UploadUsage | UsageFailure;
};

/** How many services are at or past the warning line, for the sidebar badge. */
export function usageAlerts(u: Pick<SystemUsage, "db" | "uploads">): number {
  let n = 0;
  if (u.db.ok && usageLevel(u.db.usedBytes, u.db.limitBytes) !== "ok") n++;
  if (u.uploads.ok && usageLevel(u.uploads.accountBytes, u.uploads.limitBytes) !== "ok") n++;
  return n;
}
