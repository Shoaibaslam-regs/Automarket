"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { TERMS_PATH } from "@/lib/terms";
import { useRateLock } from "@/hooks/useRateLock";
import VerifyCodeForm from "@/components/auth/VerifyCodeForm";
import GoogleButton, { OrDivider } from "@/components/auth/GoogleButton";
import { parseLoginIdentifier, type CodeChannel } from "@/lib/signupCode";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // New accounts confirm with a 6-digit code before the first sign-in; a right password on one that hasn't
  // sends a fresh code and shows the code step (`code`)
  const [notice, setNotice] = useState("");
  const [code, setCode] = useState<{ channel: CodeChannel; sentTo: string; sms: boolean } | null>(null);
  // Locked per email after too many wrong passwords, matching the server's lock
  const lock = useRateLock(`login:${email.trim().toLowerCase()}`);
  // Hidden admin entry: a value without "@" in the email field is checked on the server as ADMIN_ACCESS_KEY
  // (POST /api/auth/admin-key). A correct key only reveals the admin form; that form still signs in with the
  // normal credentials provider (portal "admin"), which requires the ADMIN role. See src/lib/adminGate.ts.
  const [mode, setMode] = useState<"user" | "admin">("user");
  const keyLock = useRateLock("login:access");
  const looksLikeKey = !email.includes("@") && !parseLoginIdentifier(email);
  const adminLock = useRateLock("login:admin");

  // ?verified=1 after confirming with a code, ?email= to fill the field
  useEffect(() => {
    queueMicrotask(() => {
      const q = new URLSearchParams(window.location.search);
      if (q.get("email")) setEmail(q.get("email") ?? "");
      if (q.get("verified") === "1") setNotice("Email confirmed. Sign in to continue.");
    });
  }, []);

  /** Sends a new sign-up code for an account that hasn't confirmed yet, then shows the code step. */
  async function startCodeStep(value: string) {
    const [res, options] = await Promise.all([
      fetch("/api/auth/verify-code/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: value }) }).catch(() => null),
      fetch("/api/auth/verify-code").then(r => r.json()).catch(() => ({})),
    ]);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setError(data?.error ?? "Confirm your account first. We couldn't send a code just now, so try again in a moment.");
      return;
    }
    setCode({ channel: data.channel, sentTo: data.sentTo, sms: options?.phone === true });
  }

  /** The code was right: sign in with the password already typed. */
  async function signInAfterCode() {
    const res = await signIn("credentials", { email: email.trim(), password, redirect: false });
    if (res?.error) {
      setCode(null);
      setNotice("Account confirmed. Sign in to continue.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function checkAccessKey(key: string) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/admin-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (keyLock.check(res, data)) return;
    if (!res.ok) { setError("Invalid email or password"); return; }
    setEmail("");
    setPassword("");
    setMode("admin");
  }

  async function handleAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email: email.trim(), password, portal: "admin", redirect: false });
    setLoading(false);
    if (res?.error) {
      const limited = res.code?.match(/^rate_limited(?:_(\d+))?$/);
      if (limited) adminLock.lock(Number(limited[1]) || 15 * 60);
      else setError("Invalid admin credentials");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  function backToUserLogin() {
    fetch("/api/auth/admin-key", { method: "DELETE" }).catch(() => {});
    setMode("user");
    setEmail("");
    setPassword("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim();
    // Neither an email nor a phone number: checked as the admin key. Key attempts have their own lock, so a
    // locked key check never blocks normal sign-in
    if (!value.includes("@") && !parseLoginIdentifier(value)) {
      if (keyLock.locked) return;
      await checkAccessKey(value);
      return;
    }
    if (!password) { setError("Enter your password"); return; }
    setLoading(true);
    setError("");
    setNotice("");
    const res = await signIn("credentials", { email: value, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      const limited = res.code?.match(/^rate_limited(?:_(\d+))?$/);
      if (limited) {
        lock.lock(Number(limited[1]) || 15 * 60);
        setError("");
      } else if (res.code === "email_unverified" && !value.includes("@")) {
        // The code is sent to the email, so it's asked for with the email
        setError("Confirm your account first: sign in once with your email address and we'll send you a code.");
      } else if (res.code === "email_unverified") {
        setLoading(true);
        await startCodeStep(value);
        setLoading(false);
      } else {
        setError("Invalid email, phone or password");
      }
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--gh-f6f8fa)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", display: "flex", flexDirection: "column" }}>
<Navbar/>
  
      {/* Form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: "400px", background: "var(--gh-ffffff)", border: "1px solid var(--gh-e1e4e8)", borderRadius: "12px", padding: "32px" }}>
          {mode === "admin" ? (
            <>
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--gh-0d1117)", marginBottom: "4px" }}>Admin sign in</h1>
              <p style={{ fontSize: "13px", color: "var(--gh-57606a)", marginBottom: "24px" }}>For AutoGO administrators only</p>

              {adminLock.locked && (
                <div role="alert" style={{ background: "var(--gh-fff8c5)", border: "1px solid var(--gh-e3b341)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--gh-7d4e00)", marginBottom: "16px" }}>
                  Too many attempts, so sign-in is paused. {adminLock.text}.
                </div>
              )}
              {error && !adminLock.locked && (
                <div role="alert" style={{ background: "var(--gh-fff0f0)", border: "1px solid var(--gh-ffcdd2)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--gh-cf222e)", marginBottom: "16px" }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleAdminSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label htmlFor="admin-email" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--gh-0d1117)", marginBottom: "6px" }}>Admin email</label>
                  <input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="username"
                    placeholder="admin@example.com"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", color: "var(--gh-0d1117)", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label htmlFor="admin-password" style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--gh-0d1117)", marginBottom: "6px" }}>Admin password</label>
                  <input id="admin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                    placeholder="••••••••"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", color: "var(--gh-0d1117)", outline: "none", boxSizing: "border-box" }} />
                </div>
                <button type="submit" disabled={loading || adminLock.locked}
                  style={{ padding: "11px", background: loading || adminLock.locked ? "var(--gh-8c959f)" : "var(--gh-0d1117)", color: "var(--gh-ffffff)", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: loading || adminLock.locked ? "not-allowed" : "pointer" }}>
                  {adminLock.locked ? adminLock.text : loading ? "Signing in..." : "Sign in as admin"}
                </button>
              </form>

              <button type="button" onClick={backToUserLogin}
                style={{ marginTop: "18px", background: "none", border: "none", padding: 0, fontSize: "13px", color: "var(--gh-57606a)", cursor: "pointer", textDecoration: "underline" }}>
                ← Back to user login
              </button>
            </>
          ) : (
          <>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--gh-0d1117)", marginBottom: "4px" }}>Welcome back</h1>
          <p style={{ fontSize: "13px", color: "var(--gh-57606a)", marginBottom: "24px" }}>Sign in to your AutoGO account</p>

          {lock.locked && (
            <div role="alert" style={{ background: "var(--gh-fff8c5)", border: "1px solid var(--gh-e3b341)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--gh-7d4e00)", marginBottom: "16px" }}>
              Too many wrong passwords for this account, so sign-in is paused. {lock.text}.
            </div>
          )}
          {keyLock.locked && !lock.locked && looksLikeKey && (
            <div role="alert" style={{ background: "var(--gh-fff8c5)", border: "1px solid var(--gh-e3b341)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--gh-7d4e00)", marginBottom: "16px" }}>
              Too many attempts, so sign-in is paused. {keyLock.text}.
            </div>
          )}
          {notice && !error && (
            <div role="status" style={{ background: "var(--gh-dafbe1)", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--gh-1a7f37)", marginBottom: "16px" }}>
              {notice}
            </div>
          )}
          {error && !lock.locked && !(keyLock.locked && looksLikeKey) && (
            <div style={{ background: "var(--gh-fff0f0)", border: "1px solid var(--gh-ffcdd2)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--gh-cf222e)", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {code ? (
            <VerifyCodeForm email={email.trim()} password={password} sentTo={code.sentTo} channel={code.channel} smsOption={code.sms}
              onVerified={signInAfterCode} onBack={() => setCode(null)} />
          ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--gh-0d1117)", marginBottom: "6px" }}>Email or phone</label>
              {/* type="text": it takes an email, a verified phone number, or (neither) the hidden admin key */}
              <input type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="AutoGO@email.com"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", color: "var(--gh-0d1117)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--gh-0d1117)" }}>Password</label>
                <Link href="/forgot-password" style={{ fontSize: "12px", color: "var(--gh-0550ae)", textDecoration: "none" }}>Forgot password?</Link>
              </div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                placeholder="••••••••"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", color: "var(--gh-0d1117)", outline: "none", boxSizing: "border-box" }} />
            </div>
            <button type="submit" disabled={loading || lock.locked}
              style={{ padding: "11px", background: loading || lock.locked ? "var(--gh-8c959f)" : "var(--gh-0d1117)", color: "var(--gh-ffffff)", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: loading || lock.locked ? "not-allowed" : "pointer" }}>
              {lock.locked ? lock.text : loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          )}

          <OrDivider />
          <GoogleButton />

          <p style={{ textAlign: "center", fontSize: "13px", color: "var(--gh-57606a)", marginTop: "20px" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "var(--gh-0d1117)", fontWeight: 600, textDecoration: "underline" }}>Create one</Link>
          </p>
          </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "var(--gh-ffffff)", borderTop: "1px solid var(--gh-e1e4e8)", padding: "16px 24px", textAlign: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "8px", flexWrap: "wrap" }}>
          {[["Browse listings", "/listings"], ["Sell a vehicle", "/sell"], ["Rent a vehicle", "/listings?type=RENT"], ["Terms & Conditions", TERMS_PATH]].map(([label, href]) => (
            <Link key={label} href={href} style={{ fontSize: "12px", color: "var(--gh-57606a)", textDecoration: "none" }}>{label}</Link>
          ))}
        </div>
        <p style={{ fontSize: "11px", color: "var(--gh-8c959f)" }}>© 2025 AutoGO Pakistan</p>
      </footer>
    </div>
  );
}
