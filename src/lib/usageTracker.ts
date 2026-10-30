// Counts calls to outside services that cost money or have a daily cap, for the admin System usage page:
// every Gemini request (vehicle photo checks, AI inspection) and every email sent. One counter per service per
// Pakistan day (UsageCount), written after the response is sent and never throwing, so counting can't slow down
// or break the request it counts.

import { after } from "next/server";
import type { GenerativeModel } from "@google/generative-ai";
import { connectDB } from "@/lib/mongodb";
import { UsageCount } from "@/models/UsageCount";
import { USAGE_KEEP_DAYS, pkDayKey, type CountedService } from "@/lib/usageMeter";

const BUILDING = process.env.NEXT_PHASE === "phase-production-build";

async function save(service: CountedService, failed: boolean, tokens: number) {
  try {
    await connectDB();
    const now = new Date();
    await UsageCount.updateOne(
      { service, day: pkDayKey(now) },
      {
        $inc: { calls: failed ? 0 : 1, failures: failed ? 1 : 0, tokens: Math.max(0, Math.round(tokens) || 0) },
        $setOnInsert: { expiresAt: new Date(now.getTime() + USAGE_KEEP_DAYS * 86_400_000) },
      },
      { upsert: true }
    );
  } catch (e) {
    // Never report through reportError: a broken counter mustn't fill the error log
    console.error("Usage count failed:", e);
  }
}

/** Counts one use (or one failure). Runs after the response when inside a request. Never throws. */
export function trackUsage(service: CountedService, opts: { failed?: boolean; tokens?: number } = {}): void {
  if (BUILDING) return;
  const task = save(service, !!opts.failed, opts.tokens ?? 0);
  try {
    after(() => task);
  } catch {
    // Outside a request (scripts): the write still runs
  }
}

/** model.generateContent, counted (with its tokens) as one Gemini call, or one failure if it throws. */
export async function generateCounted(model: GenerativeModel, request: Parameters<GenerativeModel["generateContent"]>[0]) {
  try {
    const result = await model.generateContent(request);
    trackUsage("gemini", { tokens: result.response.usageMetadata?.totalTokenCount ?? 0 });
    return result;
  } catch (error) {
    trackUsage("gemini", { failed: true });
    throw error;
  }
}
