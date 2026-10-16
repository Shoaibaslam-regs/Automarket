"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useRateLock } from "@/hooks/useRateLock";

const card = { width: "100%", maxWidth: "400px", background: "var(--gh-ffffff)", border: "1px solid var(--gh-e1e4e8)", borderRadius: "12px", padding: "32px" } as const;
const input = { width: "100%", padding: "10px 12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", color: "var(--gh-0d1117)", outline: "none", boxSizing: "border-box" } as const;

/** Asks for an email and sends a one-time password-reset link. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const lock = useRateLock("passwordReset");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    lock.check(res, data);
    if (!res.ok) { setError(data.error || "Something went wrong. Please try again."); return; }
    setSent(data.message);
  }

  const blocked = sending || lock.locked;
  return (
    <div style={{ minHeight: "100vh", background: "var(--gh-f6f8fa)", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={card}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--gh-0d1117)", marginBottom: "4px" }}>Forgot your password?</h1>
          <p style={{ fontSize: "13px", color: "var(--gh-57606a)", marginBottom: "24px" }}>Enter the email you signed up with and we&apos;ll send you a link to choose a new one.</p>

          {sent ? (
            <div role="status" style={{ background: "var(--gh-dafbe1)", border: "1px solid var(--gh-56d364)", borderRadius: "8px", padding: "12px 14px", fontSize: "13px", color: "var(--gh-1a7f37)", lineHeight: 1.5 }}>
              {sent} The link expires in 1 hour.
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {error && (
                <div role="alert" style={{ background: "var(--gh-fff0f0)", border: "1px solid var(--gh-ffcdd2)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--gh-cf222e)" }}>{error}</div>
              )}
              <div>
                <label htmlFor="fp-email" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--gh-0d1117)", marginBottom: "6px" }}>Email</label>
                <input id="fp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" autoComplete="email" style={input} />
              </div>
              <button type="submit" disabled={blocked}
                style={{ padding: "11px", background: blocked ? "var(--gh-8c959f)" : "var(--gh-0d1117)", color: "var(--gh-ffffff)", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: blocked ? "not-allowed" : "pointer" }}>
                {lock.locked ? lock.text : sending ? "Sending link..." : "Send reset link"}
              </button>
            </form>
          )}

          <p style={{ textAlign: "center", fontSize: "13px", color: "var(--gh-57606a)", marginTop: "20px" }}>
            Remembered it? <Link href="/login" style={{ color: "var(--gh-0d1117)", fontWeight: 600, textDecoration: "underline" }}>Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
