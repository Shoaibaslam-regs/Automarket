// Server-only. The admin access key (the hidden entry on /login, see src/lib/adminGate.ts) can be changed by the
// platform owner from the admin Overview. A changed key is stored as a salted scrypt hash in the "adminAccessKey"
// SiteSetting, never as text, and then replaces ADMIN_ACCESS_KEY: the env key only works while no key has been set
// in the panel, so changing it really retires a leaked key. `npm run reset-admin-key` deletes the setting to go back
// to the env key (for when the panel key is forgotten).
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { connectDB } from "@/lib/mongodb";
import { SiteSetting } from "@/models/SiteSetting";
import { isAdminAccessKey as isEnvAccessKey } from "@/lib/adminGate";

const scryptAsync = promisify(scrypt) as (key: string, salt: Buffer, len: number) => Promise<Buffer>;
const SETTING = "adminAccessKey";
const KEY_LEN = 32;

export const ADMIN_KEY_MIN = 16;
export const ADMIN_KEY_MAX = 128;

type StoredKey = { salt: string; hash: string; changedAt: string };

async function storedKey(): Promise<StoredKey | null> {
  await connectDB();
  const doc = await SiteSetting.findOne({ key: SETTING }).select("value").lean<{ value?: StoredKey }>();
  return doc?.value?.salt && doc.value.hash ? doc.value : null;
}

/** Where the working key comes from: the admin panel, the env, or nowhere (the admin form can't be opened). */
export async function adminKeyStatus(): Promise<{ source: "panel" | "env" | "none"; changedAt: string | null }> {
  const stored = await storedKey();
  if (stored) return { source: "panel", changedAt: stored.changedAt };
  const env = process.env.ADMIN_ACCESS_KEY;
  return { source: env && env.length >= ADMIN_KEY_MIN ? "env" : "none", changedAt: null };
}

/** Checks a value typed on /login: against the panel key when one is set, otherwise against ADMIN_ACCESS_KEY. */
export async function checkAdminAccessKey(input: string): Promise<boolean> {
  if (!input) return false;
  const stored = await storedKey();
  if (!stored) return isEnvAccessKey(input);
  const hash = await scryptAsync(input, Buffer.from(stored.salt, "base64"), KEY_LEN);
  const expected = Buffer.from(stored.hash, "base64");
  return hash.length === expected.length && timingSafeEqual(hash, expected);
}

/** Why a new key can't be used, or null. No "@" (the login field treats those as emails) and no spaces. */
export function adminKeyProblem(key: string): string | null {
  if (key.length < ADMIN_KEY_MIN) return `The key must be at least ${ADMIN_KEY_MIN} characters`;
  if (key.length > ADMIN_KEY_MAX) return `The key can be at most ${ADMIN_KEY_MAX} characters`;
  if (/\s/.test(key)) return "The key can't contain spaces";
  if (key.includes("@")) return "The key can't contain \"@\" (the login page would read it as an email)";
  return null;
}

export async function setAdminAccessKey(key: string, adminId: unknown): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(key, salt, KEY_LEN);
  const changedAt = new Date().toISOString();
  await connectDB();
  await SiteSetting.updateOne(
    { key: SETTING },
    { $set: { value: { salt: salt.toString("base64"), hash: hash.toString("base64"), changedAt }, updatedBy: adminId } },
    { upsert: true }
  );
  return changedAt;
}
