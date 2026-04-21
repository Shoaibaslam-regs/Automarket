"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Navbar from "@/components/Navbar";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", confirm: "",
  });
  const [error, setError] = useState("");
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
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    await signIn("credentials", {
      email: form.email,
      password: form.password,
      callbackUrl: "/dashboard",
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", display: "flex", flexDirection: "column" }}>
<Navbar />


      {/* Form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: "440px", background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "32px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0d1117", marginBottom: "4px" }}>Create account</h1>
          <p style={{ fontSize: "13px", color: "#57606a", marginBottom: "24px" }}>Join AutoMarket — buy, sell and rent vehicles</p>

          {error && (
            <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#cf222e", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[
              { label: "Full name", name: "name", type: "text", placeholder: "John Smith" },
              { label: "Email", name: "email", type: "email", placeholder: "you@example.com" },
              { label: "Phone number", name: "phone", type: "tel", placeholder: "+92 300 0000000" },
              { label: "Password", name: "password", type: "password", placeholder: "Min 6 characters" },
              { label: "Confirm password", name: "confirm", type: "password", placeholder: "Repeat password" },
            ].map((field) => (
              <div key={field.name}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#0d1117", marginBottom: "6px" }}>
                  {field.label}
                  <span style={{ color: "#cf222e", marginLeft: "2px" }}>*</span>
                </label>
                <input
                  type={field.type}
                  name={field.name}
                  value={form[field.name as keyof typeof form]}
                  onChange={handleChange}
                  required
                  placeholder={field.placeholder}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", color: "#0d1117", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}

            <button type="submit" disabled={loading}
              style={{ padding: "11px", background: loading ? "#8c959f" : "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", marginTop: "4px" }}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "13px", color: "#57606a", marginTop: "20px" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#0d1117", fontWeight: 600, textDecoration: "underline" }}>Sign in</Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ background: "white", borderTop: "1px solid #e1e4e8", padding: "16px 24px", textAlign: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginBottom: "8px", flexWrap: "wrap" }}>
          {[["Browse listings", "/listings"], ["Sell a vehicle", "/sell"], ["Rent a vehicle", "/listings?type=RENT"]].map(([label, href]) => (
            <Link key={label} href={href} style={{ fontSize: "12px", color: "#57606a", textDecoration: "none" }}>{label}</Link>
          ))}
        </div>
        <p style={{ fontSize: "11px", color: "#8c959f" }}>© 2025 AutoMarket Pakistan</p>
      </footer>
    </div>
  );
}
