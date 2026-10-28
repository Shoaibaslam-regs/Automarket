"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Navbar from "@/components/Navbar";
import { PASSWORD_MIN, passwordProblem } from "@/lib/password";
import { useTurnstile } from "@/components/ui/Turnstile";

const card = { width: "100%", maxWidth: "400px", background: "var(--gh-ffffff)", border: "1px solid var(--gh-e1e4e8)", borderRadius: "12px", padding: "32px" } as const;
const input = { width: "100%", padding: "10px 12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", color: "var(--gh-0d1117)", outline: "none", boxSizing: "border-box" } as const;

/** Sets a new password from the emailed link, then signs the user in. */
function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  // Signing in with the new password needs the human check like the sign-in page
  const human = useTurnstile("reset-password");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const weak = passwordProblem(password);
    if (weak) { setError(weak); return; }
    if (password !== confirm) { setError("The passwords don't match"); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setSaving(false); setError(data.error || "Something went wrong. Please try again."); return; }
    // Sign straight in with the new password
    const signed = await signIn("credentials", { email: data.email, password, cf: await human.take(), redirect: false });
    router.push(signed?.error ? "/login" : "/dashboard");
    router.refresh();
  }

  if (!token) {
    return (
      <p style={{ fontSize: "13px", color: "var(--gh-cf222e)" }}>
        This link is missing its code. <Link href="/forgot-password" style={{ fontWeight: 600, textDecoration: "underline" }}>Ask for a new reset link</Link>.
      </p>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {error && (
        <div role="alert" style={{ background: "var(--gh-fff0f0)", border: "1px solid var(--gh-ffcdd2)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--gh-cf222e)" }}>
          {error}{" "}
          {/expired|valid/.test(error) && <Link href="/forgot-password" style={{ fontWeight: 600, textDecoration: "underline" }}>Get a new link</Link>}
        </div>
      )}
      <div>
        <label htmlFor="rp-pass" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--gh-0d1117)", marginBottom: "6px" }}>New password</label>
        <input id="rp-pass" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={PASSWORD_MIN} placeholder={`At least ${PASSWORD_MIN} characters`} autoComplete="new-password" style={input} />
      </div>
      <div>
        <label htmlFor="rp-confirm" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--gh-0d1117)", marginBottom: "6px" }}>Confirm new password</label>
        <input id="rp-confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repeat password" autoComplete="new-password" style={input} />
      </div>
      <button type="submit" disabled={saving}
        style={{ padding: "11px", background: saving ? "var(--gh-8c959f)" : "var(--gh-0d1117)", color: "var(--gh-ffffff)", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
        {saving ? "Saving..." : "Save new password"}
      </button>
      {human.widget}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--gh-f6f8fa)", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={card}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--gh-0d1117)", marginBottom: "4px" }}>Choose a new password</h1>
          <p style={{ fontSize: "13px", color: "var(--gh-57606a)", marginBottom: "24px" }}>After saving, you&apos;ll be signed in with your new password.</p>
          <Suspense fallback={null}><ResetForm /></Suspense>
        </div>
      </div>
    </div>
  );
}
