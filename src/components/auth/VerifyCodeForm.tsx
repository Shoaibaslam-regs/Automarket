"use client";

import { useEffect, useState } from "react";
import { RESEND_AFTER_SECONDS, SIGNUP_CODE_LENGTH, SIGNUP_CODE_MINUTES, cleanCode, type CodeChannel } from "@/lib/signupCode";
import { countdownText } from "@/lib/waitText";
import { useRateLock } from "@/hooks/useRateLock";

type Props = {
  email: string;
  /** The password just typed: confirming needs it, so only the person who set it can confirm */
  password: string;
  /** Where the current code went, masked ("a***r@gmail.com", "+92 30* *** 4567") */
  sentTo: string;
  channel: CodeChannel;
  /** Seconds before "Send a new code" works, from the server (each code in a row waits longer; src/lib/resendWait.ts) */
  resendIn?: number;
  /** Offer "send it by SMS instead" (SMS is set up and the account has a phone) */
  smsOption?: boolean;
  /** Runs once the code is right; the page then signs in with the password it holds */
  onVerified: (info: { phoneVerified: boolean }) => Promise<void> | void;
  onBack?: () => void;
};

const input = { width: "100%", padding: "12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "22px", letterSpacing: "8px", textAlign: "center" as const, color: "var(--gh-0d1117)", outline: "none", boxSizing: "border-box" as const, fontVariantNumeric: "tabular-nums" };
const linkBtn = { padding: 0, background: "none", border: "none", color: "var(--gh-0d1117)", fontWeight: 600, fontSize: "13px", textDecoration: "underline", cursor: "pointer" };

/**
 * "Enter the 6-digit code" step after sign-up (and on sign-in for an account that hasn't confirmed yet):
 * Verify, "Send a new code" once the server's wait is over (1, 2, 5, then 10 minutes for codes in a row), and a
 * switch between email and SMS.
 */
export default function VerifyCodeForm({ email, password, sentTo: firstSentTo, channel: firstChannel, resendIn, smsOption, onVerified, onBack }: Props) {
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState(firstSentTo);
  const [channel, setChannel] = useState(firstChannel);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<"verify" | "resend" | null>(null);
  const [wait, setWait] = useState(resendIn ?? RESEND_AFTER_SECONDS);
  const verifyLock = useRateLock("signup-code");

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(w => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    const clean = cleanCode(code);
    if (!clean) { setError(`Enter the ${SIGNUP_CODE_LENGTH}-digit code`); return; }
    setBusy("verify");
    setError("");
    const res = await fetch("/api/auth/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code: clean, password }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res && verifyLock.check(res, data)) { setBusy(null); return; }
    if (!res?.ok) {
      setBusy(null);
      setError(data?.error ?? "Couldn't check the code. Try again.");
      return;
    }
    await onVerified({ phoneVerified: data?.phoneVerified === true });
    setBusy(null);
  }

  async function resend(to: CodeChannel) {
    setBusy("resend");
    setError("");
    setNotice("");
    const res = await fetch("/api/auth/verify-code/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, channel: to }) }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(null);
    // Too soon: the server says how long is left, and the earlier code still works
    if (res?.status === 429 && data?.retryAfter) {
      setWait(Number(data.retryAfter));
      setNotice(data.error ?? "");
      return;
    }
    if (!res?.ok) { setError(data?.error ?? "Couldn't send a new code. Try again in a moment."); return; }
    setCode("");
    setChannel(data.channel);
    setSentTo(data.sentTo);
    setWait(Number(data.resendIn) || RESEND_AFTER_SECONDS);
    setNotice(to === "phone" && data.channel !== "phone" ? "We couldn't text that number, so we sent the code by email." : "New code sent.");
  }

  const other: CodeChannel = channel === "phone" ? "email" : "phone";
  return (
    <form onSubmit={verify} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div>
        <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--gh-0d1117)" }}>Enter your code</p>
        <p style={{ fontSize: "13px", color: "var(--gh-57606a)", marginTop: "6px", lineHeight: 1.6 }}>
          We&apos;ve sent a {SIGNUP_CODE_LENGTH}-digit code {channel === "phone" ? "by SMS to" : "to"}{" "}
          <strong style={{ color: "var(--gh-0d1117)" }}>{sentTo}</strong>. It works for {SIGNUP_CODE_MINUTES} minutes
          {channel === "email" ? "; look in spam too" : ""}.
        </p>
      </div>

      {error && (
        <div role="alert" style={{ background: "var(--gh-fff0f0)", border: "1px solid var(--gh-ffcdd2)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--gh-cf222e)" }}>{error}</div>
      )}
      {notice && !error && (
        <div role="status" style={{ background: "var(--gh-dafbe1)", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--gh-1a7f37)" }}>{notice}</div>
      )}

      <input
        value={code}
        onChange={e => {
          const v = e.target.value.replace(/\D/g, "").slice(0, SIGNUP_CODE_LENGTH);
          setCode(v);
          setError("");
        }}
        inputMode="numeric" autoComplete="one-time-code" autoFocus aria-label="Code" placeholder={"•".repeat(SIGNUP_CODE_LENGTH)}
        style={input}
      />

      <button type="submit" disabled={busy !== null || verifyLock.locked || code.length !== SIGNUP_CODE_LENGTH}
        style={{ padding: "11px", background: busy || verifyLock.locked || code.length !== SIGNUP_CODE_LENGTH ? "var(--gh-8c959f)" : "var(--gh-0d1117)", color: "var(--gh-ffffff)", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: busy || verifyLock.locked ? "not-allowed" : "pointer" }}>
        {verifyLock.locked ? verifyLock.text : busy === "verify" ? "Checking…" : "Verify and sign in"}
      </button>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "8px", fontSize: "13px", color: "var(--gh-57606a)" }}>
        {wait > 0 ? (
          <span>Send a new code in {countdownText(wait)}</span>
        ) : (
          <button type="button" onClick={() => resend(channel)} disabled={busy !== null} style={linkBtn}>
            {busy === "resend" ? "Sending…" : "Send a new code"}
          </button>
        )}
        {smsOption && wait <= 0 && (
          <button type="button" onClick={() => resend(other)} disabled={busy !== null} style={linkBtn}>
            {other === "phone" ? "Send by SMS instead" : "Send by email instead"}
          </button>
        )}
      </div>
      {onBack && (
        <button type="button" onClick={onBack} style={{ ...linkBtn, fontWeight: 500, color: "var(--gh-57606a)", alignSelf: "flex-start" }}>← Back</button>
      )}
    </form>
  );
}
