"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import VerifyCodeForm from "@/components/auth/VerifyCodeForm";
import type { CodeChannel } from "@/lib/signupCode";
import Navbar from "@/components/Navbar";
import { PASSWORD_MIN, passwordProblem } from "@/lib/password";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/terms";
import { useRateLock } from "@/hooks/useRateLock";

export default function RegisterPage() {
  // After sign-up: where the 6-digit code went (the account can only sign in once it's confirmed)
  const [sent, setSent] = useState<{ channel: CodeChannel; sentTo: string } | null>(null);
  // Codes by SMS, when SMS is set up on the server
  const [smsAvailable, setSmsAvailable] = useState(false);
  const [channel, setChannel] = useState<CodeChannel>("email");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirm: "",
  });
  const regLock = useRateLock("register");
  const [error, setError] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/verify-code").then(r => r.json()).then(d => setSmsAvailable(d?.phone === true)).catch(() => {});
  }, []);

  /** The code was right: sign in with the details just typed. A full load, so menus pick up the session. */
  async function signInAfterCode() {
    const res = await signIn("credentials", { email: form.email.trim(), password: form.password, redirect: false });
    if (res?.error) {
      window.location.assign(`/login?verified=1&email=${encodeURIComponent(form.email.trim())}`);
      return;
    }
    window.location.assign("/dashboard");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const weak = passwordProblem(form.password, { email: form.email, name: form.name });
    if (weak) {
      setError(weak);
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (!acceptTerms) {
      setError("Please accept the Terms & Conditions to continue");
      return;
    }
    if (form.phone.trim().length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        acceptTerms,
        channel: smsAvailable ? channel : "email",
      }),
    });
    const data = await res.json();
    setLoading(false);
    regLock.check(res, data);
    if (!res.ok) { setError(data.error); return; }
    // The same answer comes back whether the email is new or already has an account (it's never revealed)
    setSent({ channel: data.channel, sentTo: data.sentTo });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--gh-f6f8fa)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", display: "flex", flexDirection: "column" }}>
<Navbar />


      {/* Form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: "440px", background: "var(--gh-ffffff)", border: "1px solid var(--gh-e1e4e8)", borderRadius: "12px", padding: "32px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--gh-0d1117)", marginBottom: "4px" }}>Create account</h1>
          <p style={{ fontSize: "13px", color: "var(--gh-57606a)", marginBottom: "24px" }}>Join AutoGO — buy, sell and rent vehicles</p>

          {error && (
            <div style={{ background: "var(--gh-fff0f0)", border: "1px solid var(--gh-ffcdd2)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--gh-cf222e)", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          {sent ? (
            <VerifyCodeForm
              email={form.email.trim()}
              sentTo={sent.sentTo}
              channel={sent.channel}
              smsOption={smsAvailable}
              onVerified={signInAfterCode}
              onBack={() => setSent(null)}
            />
          ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { label: "Full name", name: "name", type: "text", placeholder: "Full Name" },
              { label: "Email", name: "email", type: "email", placeholder: "you@example.com" },
              { label: "Phone number", name: "phone", type: "tel", placeholder: "+92 300 0000000" },
              { label: "Password", name: "password", type: "password", placeholder: `At least ${PASSWORD_MIN} characters` },
              { label: "Confirm password", name: "confirm", type: "password", placeholder: "Repeat password" },
            ].map((field) => (
              <div key={field.name}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "var(--gh-0d1117)", marginBottom: "6px" }}>
                  {field.label}
                  <span style={{ color: "var(--gh-cf222e)", marginLeft: "2px" }}>*</span>
                </label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange}
                  required
                  placeholder={field.placeholder}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", color: "var(--gh-0d1117)", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}

            {smsAvailable && (
              <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
                <legend style={{ fontSize: "13px", fontWeight: 500, color: "var(--gh-0d1117)", marginBottom: "6px" }}>Send my code by</legend>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["email", "phone"] as const).map(c => (
                    <label key={c} style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", border: `1px solid ${channel === c ? "var(--gh-0d1117)" : "var(--gh-d0d7de)"}`, borderRadius: "8px", fontSize: "13px", color: "var(--gh-0d1117)", cursor: "pointer" }}>
                      <input type="radio" name="channel" checked={channel === c} onChange={() => setChannel(c)} style={{ accentColor: "var(--gh-0d1117)" }} />
                      {c === "email" ? "Email" : "SMS to my phone"}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", color: "var(--gh-57606a)", lineHeight: 1.5, cursor: "pointer" }}>
              <input type="checkbox" checked={acceptTerms} onChange={e => setAcceptTerms(e.target.checked)} required
                style={{ marginTop: "3px", width: "15px", height: "15px", accentColor: "var(--gh-0d1117)", flexShrink: 0 }} />
              <span>
                I agree to the{" "}
                <Link href={TERMS_PATH} target="_blank" style={{ color: "var(--gh-0d1117)", fontWeight: 600, textDecoration: "underline" }}>Terms &amp; Conditions</Link>
                {" "}and the{" "}
                <Link href={PRIVACY_PATH} target="_blank" style={{ color: "var(--gh-0d1117)", fontWeight: 600, textDecoration: "underline" }}>Privacy Policy</Link>
              </span>
            </label>

            <button type="submit" disabled={loading || regLock.locked}
              style={{ padding: "11px", background: loading || regLock.locked ? "var(--gh-8c959f)" : "var(--gh-0d1117)", color: "var(--gh-ffffff)", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: loading || regLock.locked ? "not-allowed" : "pointer", marginTop: "4px" }}>
              {regLock.locked ? regLock.text : loading ? "Creating account..." : "Create account"}
            </button>
          </form>
          )}

          <p style={{ textAlign: "center", fontSize: "13px", color: "var(--gh-57606a)", marginTop: "20px" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--gh-0d1117)", fontWeight: 600, textDecoration: "underline" }}>Sign in</Link>
          </p>
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
