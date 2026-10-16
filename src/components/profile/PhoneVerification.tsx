"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Smartphone } from "lucide-react";
import { formatPkMobile, normalizePkMobile } from "@/lib/phone";
import { useRateLock } from "@/hooks/useRateLock";

/** Seconds before another code can be requested, so people don't tap "Send" repeatedly. */
const RESEND_SEC = 60;

/**
 * Profile card that verifies a Pakistani mobile number with a 6-digit SMS code.
 * A verified phone shows a tick to buyers and is needed for the free trial.
 */
export default function PhoneVerification({ verifiedPhone, phoneVerifiedAt, currentPhone, onVerified }: {
  verifiedPhone?: string;
  phoneVerifiedAt?: string;
  currentPhone?: string;
  onVerified: (phone: string) => void;
}) {
  const [phone, setPhone] = useState(currentPhone ?? "");
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const lock = useRateLock("phoneOtp");

  // Count down the resend wait
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const verified = !!verifiedPhone && !!phoneVerifiedAt;
  const valid = !!normalizePkMobile(phone);

  async function sendCode() {
    if (!valid) { setError("Enter a Pakistani mobile number, e.g. 0300 1234567"); return; }
    setBusy(true);
    setError("");
    const res = await fetch("/api/profile/phone/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    lock.check(res, data);
    if (!res.ok) { setError(data.error || "Couldn't send the code"); return; }
    setStep("code");
    setCode("");
    setResendIn(RESEND_SEC);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/profile/phone/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error || "Couldn't verify the code"); return; }
    setStep("idle");
    onVerified(data.phone);
  }

  const field = "h-10 w-full rounded-lg border border-[var(--gh-d0d7de)] bg-white px-3 text-sm text-[var(--gh-0d1117)] outline-none focus:border-[var(--gh-0d1117)]";
  const primary = "inline-flex h-10 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--gh-0d1117)] px-4 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="rounded-xl border border-[var(--gh-e1e4e8)] bg-white p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${verified ? "bg-[var(--gh-dafbe1)] text-[var(--gh-1a7f37)]" : "bg-[var(--gh-f6f8fa)] text-[var(--gh-57606a)]"}`}>
          {verified ? <BadgeCheck size={18} /> : <Smartphone size={18} />}
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-[var(--gh-0d1117)]">Phone verification</h2>
          <p className="mt-0.5 text-[13px] text-[var(--gh-57606a)]">
            {verified
              ? <>Verified: <strong className="text-[var(--gh-0d1117)]">{formatPkMobile(verifiedPhone)}</strong>. Buyers see a &ldquo;Phone verified&rdquo; tick on your listings.</>
              : "Verify your mobile number with a code by SMS. Buyers trust verified sellers more, and it's needed for the free trial."}
          </p>
        </div>
      </div>

      {(!verified || step === "code") && (
        step === "idle" ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={phone} onChange={e => { setPhone(e.target.value); setError(""); }} inputMode="tel" placeholder="0300 1234567" aria-label="Mobile number" className={field} />
            <button type="button" onClick={sendCode} disabled={busy || lock.locked || !valid} className={primary}>
              {lock.locked ? lock.text : busy ? "Sending…" : "Send code"}
            </button>
          </div>
        ) : (
          <form onSubmit={verify} className="space-y-2">
            <p className="text-[13px] text-[var(--gh-57606a)]">We texted a 6-digit code to <strong className="text-[var(--gh-0d1117)]">{formatPkMobile(normalizePkMobile(phone))}</strong>. It expires in 10 minutes.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }} inputMode="numeric" autoComplete="one-time-code" autoFocus
                placeholder="123456" aria-label="Verification code" className={`${field} font-mono tracking-[0.3em]`} />
              <button type="submit" disabled={busy || code.length !== 6} className={primary}>{busy ? "Checking…" : "Verify"}</button>
            </div>
            <p className="flex flex-wrap gap-x-4 text-xs text-[var(--gh-57606a)]">
              <button type="button" disabled={resendIn > 0 || busy || lock.locked} onClick={sendCode} className="font-semibold text-[var(--gh-0550ae)] disabled:cursor-not-allowed disabled:text-[var(--gh-8c959f)]">
                {lock.locked ? lock.text : resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              </button>
              <button type="button" onClick={() => { setStep("idle"); setError(""); }} className="font-semibold text-[var(--gh-57606a)]">Change number</button>
            </p>
          </form>
        )
      )}
      {verified && (
        <p className="text-xs text-[var(--gh-8c959f)]">To use another number, change the phone in Profile information above and verify the new one.</p>
      )}
      {error && <p role="alert" className="mt-2 rounded-lg bg-[var(--gh-fff0f0)] px-3 py-2 text-xs text-[var(--gh-cf222e)]">{error}</p>}
    </div>
  );
}
