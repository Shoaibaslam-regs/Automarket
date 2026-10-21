"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Navbar from "@/components/Navbar";
import { PRIVACY_PATH, TERMS_PATH } from "@/lib/terms";
import { useRateLock } from "@/hooks/useRateLock";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirm: "",
  });
  const regLock = useRateLock("register");
  const [error, setError] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
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
      }),
    });
    const data = await res.json();
    setLoading(false);
    regLock.check(res, data);
    if (!res.ok) { setError(data.error); return; }
    await signIn("credentials", {
      email: form.email,
      password: form.password,
      callbackUrl: "/dashboard",
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--gh-f6f8fa)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", display: "flex", flexDirection: "column" }}>
<Navbar />


      {/* Form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: "440px", background: "var(--gh-ffffff)", border: "1px solid var(--gh-e1e4e8)", borderRadius: "12px", padding: "32px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--gh-0d1117)", marginBottom: "4px" }}>Create account</h1>
          <p style={{ fontSize: "13px", color: "var(--gh-57606a)", marginBottom: "24px" }}>Join AutoMarket — buy, sell and rent vehicles</p>

          {error && (
            <div style={{ background: "var(--gh-fff0f0)", border: "1px solid var(--gh-ffcdd2)", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "var(--gh-cf222e)", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { label: "Full name", name: "name", type: "text", placeholder: "Full Name" },
              { label: "Email", name: "email", type: "email", placeholder: "you@example.com" },
              { label: "Phone number", name: "phone", type: "tel", placeholder: "+92 300 0000000" },
              { label: "Password", name: "password", type: "password", placeholder: "Min 6 characters" },
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
        <p style={{ fontSize: "11px", color: "var(--gh-8c959f)" }}>© 2025 AutoMarket Pakistan</p>
      </footer>
    </div>
  );
}
