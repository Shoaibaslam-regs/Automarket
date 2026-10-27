import crypto from "node:crypto";

/** A new session key: every session carries the account's key, and replacing it signs the other devices out. */
export const newSessionKey = () => crypto.randomBytes(16).toString("hex");

/** Exact, case-insensitive email match (older accounts kept the capitals they signed up with). */
export const emailQuery = (email: string) => ({ email: new RegExp(`^${email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
