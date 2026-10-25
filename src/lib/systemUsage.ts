import { unstable_cache } from "next/cache";
import mongoose from "mongoose";
import { UTApi } from "uploadthing/server";
import { connectDB } from "@/lib/mongodb";
import { reportError } from "@/lib/errorLog";
import { DEFAULT_DB_LIMIT_MB, type CollectionUsage, type DbUsage, type SystemUsage, type UploadUsage, type UsageFailure } from "@/lib/usageMeter";

export const SYSTEM_USAGE_TAG = "system-usage";
/** Read again at most this often; the admin's Refresh button skips the wait. */
const CACHE_SECONDS = 10 * 60;

const MB = 1024 * 1024;

function dbLimitBytes() {
  const mb = Number(process.env.DB_STORAGE_LIMIT_MB);
  return (Number.isFinite(mb) && mb > 0 ? mb : DEFAULT_DB_LIMIT_MB) * MB;
}

/** One collection's size; $collStats where the cluster allows it, else just its document count. */
async function collectionUsage(db: mongoose.mongo.Db, name: string): Promise<CollectionUsage> {
  const col = db.collection(name);
  try {
    const [s] = await col.aggregate<{ storageStats?: { count?: number; size?: number; totalIndexSize?: number } }>([{ $collStats: { storageStats: {} } }]).toArray();
    const st = s?.storageStats ?? {};
    return { name, documents: st.count ?? 0, dataBytes: st.size ?? 0, indexBytes: st.totalIndexSize ?? 0 };
  } catch {
    return { name, documents: await col.estimatedDocumentCount().catch(() => 0), dataBytes: null, indexBytes: null };
  }
}

/** The database's own size report (dbStats) plus each collection, biggest first. Read-only. */
export async function readDbUsage(): Promise<DbUsage | UsageFailure> {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return { ok: false, error: "Not connected to the database" };
    const stats = await db.stats();
    const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name).filter(n => !n.startsWith("system."));
    const collections = await Promise.all(names.map(n => collectionUsage(db, n)));
    collections.sort((a, b) => (b.dataBytes ?? 0) + (b.indexBytes ?? 0) - ((a.dataBytes ?? 0) + (a.indexBytes ?? 0)) || b.documents - a.documents);
    const dataBytes = Number(stats.dataSize) || 0;
    const indexBytes = Number(stats.indexSize) || 0;
    return {
      ok: true,
      usedBytes: dataBytes + indexBytes,
      dataBytes,
      indexBytes,
      storageBytes: Number(stats.storageSize) || 0,
      limitBytes: dbLimitBytes(),
      documents: Number(stats.objects) || 0,
      collections,
    };
  } catch (error) {
    reportError("System usage: database read failed:", error);
    return { ok: false, error: "Couldn't read the database's size" };
  }
}

/** UploadThing's usage report for the account behind UPLOADTHING_TOKEN. */
export async function readUploadUsage(): Promise<UploadUsage | UsageFailure> {
  if (!process.env.UPLOADTHING_TOKEN) return { ok: false, error: "UPLOADTHING_TOKEN isn't set" };
  try {
    const u = await new UTApi().getUsageInfo();
    return { ok: true, appBytes: u.appTotalBytes, accountBytes: u.totalBytes, limitBytes: u.limitBytes, files: u.filesUploaded };
  } catch (error) {
    reportError("System usage: UploadThing read failed:", error);
    return { ok: false, error: "Couldn't reach UploadThing" };
  }
}

/** Both reports, read now. */
export async function readSystemUsage(): Promise<SystemUsage> {
  const [db, uploads] = await Promise.all([readDbUsage(), readUploadUsage()]);
  return { checkedAt: new Date().toISOString(), db, uploads };
}

/** The same, saved for CACHE_SECONDS and shared by every admin, so opening the page or the badge adds no load. */
export const getSystemUsage = unstable_cache(readSystemUsage, ["system-usage-v1"], { revalidate: CACHE_SECONDS, tags: [SYSTEM_USAGE_TAG] });
