"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Building2, Car, KeyRound, Rocket } from "lucide-react";

const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"];

const PLANS = [
  {
    id: "FREE",
    name: "Free",
    price: "PKR 0",
    period: "/forever",
    color: "#57606a",
    features: ["Up to 20 vehicles", "1 staff member", "Basic inventory", "Customer tracking"],
    limit: "Perfect to get started",
  },
  {
    id: "PRO",
    name: "Pro",
    price: "PKR 2,999",
    period: "/month",
    color: "#0550ae",
    popular: true,
    features: ["Up to 200 vehicles", "5 staff members", "Rental management", "Customer CRM", "Sales reports", "AI inspection"],
    limit: "Best for growing dealers",
  },
  {
    id: "BUSINESS",
    name: "Business",
    price: "PKR 7,999",
    period: "/month",
    color: "#1a7f37",
    features: ["Unlimited vehicles", "Unlimited staff", "Multiple branches", "Advanced analytics", "API access", "Priority support"],
    limit: "For established businesses",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "DEALER" as "DEALER" | "RENTAL" | "BOTH",
    phone: "",
    email: "",
    city: "",
    address: "",
    description: "",
    plan: "FREE",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleSubmit() {
    if (!session?.user) { router.push("/login"); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/business/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error); return; }
    router.push("/business/dashboard");
  }

  const steps = ["Business type", "Details", "Choose plan", "Launch"];

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #e1e4e8", padding: "16px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <Image src="/logo-1771205663069.png" alt="AutoMarket" width={120} height={32} style={{ width: "auto", height: "30px" }} />
        <div style={{ width: "1px", height: "20px", background: "#e1e4e8" }} />
        <span style={{ fontSize: "13px", color: "#57606a", fontWeight: 500 }}>Business setup</span>
      </div>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 20px" }}>

        {/* Progress steps */}
        <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "40px" }}>
          {steps.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: step > i + 1 ? "#1a7f37" : step === i + 1 ? "#0d1117" : "#e1e4e8",
                  color: step >= i + 1 ? "white" : "#8c959f",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", fontWeight: 700, flexShrink: 0,
                }}>
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: "10px", color: step === i + 1 ? "#0d1117" : "#8c959f", fontWeight: step === i + 1 ? 600 : 400, whiteSpace: "nowrap" }}>{s}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: "2px", background: step > i + 1 ? "#1a7f37" : "#e1e4e8", margin: "0 8px", marginBottom: "16px", transition: "background 0.3s" }} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#cf222e", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {/* Step 1 — Business type */}
        {step === 1 && (
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0d1117", marginBottom: "8px" }}>What type of business are you?</h1>
            <p style={{ fontSize: "14px", color: "#57606a", marginBottom: "28px" }}>We'll customize your dashboard based on your business type.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { id: "DEALER", icon: Car, title: "Car Dealer", desc: "Buy and sell cars, manage inventory, track sales and customers" },
                { id: "RENTAL", icon: KeyRound, title: "Rental Company", desc: "Manage a fleet of vehicles available for daily, weekly or monthly rent" },
                { id: "BOTH", icon: Building2, title: "Dealer + Rental", desc: "Full automobile business — sell and rent vehicles from one platform" },
              ].map(opt => (
                <div key={opt.id} onClick={() => setForm(p => ({ ...p, type: opt.id as "DEALER" | "RENTAL" | "BOTH" }))}
                  style={{ padding: "20px", background: "white", border: `2px solid ${form.type === opt.id ? "#0d1117" : "#e1e4e8"}`, borderRadius: "12px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "14px", transition: "all 0.15s" }}>
                  <span style={{ width: "44px", height: "44px", flexShrink: 0, borderRadius: "10px", background: "#f6f8fa", border: "1px solid #e1e4e8", display: "flex", alignItems: "center", justifyContent: "center", color: "#0d1117" }}><opt.icon size={22} strokeWidth={1.75} /></span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "#0d1117", marginBottom: "4px" }}>{opt.title}</p>
                    <p style={{ fontSize: "13px", color: "#57606a" }}>{opt.desc}</p>
                  </div>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${form.type === opt.id ? "#0d1117" : "#d0d7de"}`, background: form.type === opt.id ? "#0d1117" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                    {form.type === opt.id && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "white" }} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Business details */}
        {step === 2 && (
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0d1117", marginBottom: "8px" }}>Tell us about your business</h1>
            <p style={{ fontSize: "14px", color: "#57606a", marginBottom: "28px" }}>This information will appear on your business profile.</p>
            <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>Business name *</label>
                <input name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Al-Rehman Motors"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>Phone *</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="+92 300 0000000"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>Email</label>
                  <input name="email" value={form.email} onChange={handleChange} placeholder="business@example.com"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>City *</label>
                  <select name="city" value={form.city} onChange={handleChange}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", outline: "none", background: "white" }}>
                    <option value="">Select city</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>Address</label>
                  <input name="address" value={form.address} onChange={handleChange} placeholder="Street address"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>Business description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                  placeholder="Tell customers about your business..."
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", outline: "none", resize: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Plan selection */}
        {step === 3 && (
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0d1117", marginBottom: "8px" }}>Choose your plan</h1>
            <p style={{ fontSize: "14px", color: "#57606a", marginBottom: "28px" }}>Start free and upgrade anytime. No credit card required for Free plan.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {PLANS.map(plan => (
                <div key={plan.id} onClick={() => setForm(p => ({ ...p, plan: plan.id }))}
                  style={{ padding: "20px", background: "white", border: `2px solid ${form.plan === plan.id ? plan.color : "#e1e4e8"}`, borderRadius: "12px", cursor: "pointer", position: "relative", transition: "all 0.15s" }}>
                  {plan.popular && (
                    <span style={{ position: "absolute", top: "-10px", left: "20px", background: "#0550ae", color: "white", fontSize: "10px", fontWeight: 700, padding: "2px 10px", borderRadius: "20px" }}>
                      MOST POPULAR
                    </span>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <p style={{ fontSize: "16px", fontWeight: 700, color: "#0d1117", marginBottom: "2px" }}>{plan.name}</p>
                      <p style={{ fontSize: "12px", color: "#8c959f" }}>{plan.limit}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "20px", fontWeight: 800, color: plan.color }}>{plan.price}</span>
                      <span style={{ fontSize: "12px", color: "#8c959f" }}>{plan.period}</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                    {plan.features.map(f => (
                      <p key={f} style={{ fontSize: "12px", color: "#57606a", display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ color: plan.color, fontWeight: 700 }}>✓</span> {f}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 — Launch */}
        {step === 4 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "center", color: "#8c959f" }}><Rocket size={40} strokeWidth={1.5} /></div>
            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0d1117", marginBottom: "12px" }}>Ready to launch!</h1>
            <p style={{ fontSize: "15px", color: "#57606a", marginBottom: "8px" }}>
              You&apos;re setting up <strong style={{ color: "#0d1117" }}>{form.name}</strong>
            </p>
            <p style={{ fontSize: "13px", color: "#8c959f", marginBottom: "32px" }}>
              {form.type === "DEALER" ? "Car dealer" : form.type === "RENTAL" ? "Rental company" : "Dealer + Rental"} · {form.city} · {form.plan} plan
            </p>
            <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "20px", textAlign: "left", marginBottom: "28px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117", marginBottom: "12px" }}>What happens next:</p>
              {[
                "Your business dashboard is created",
                "You can add vehicles to your inventory",
                "Start tracking customers and sales",
                form.type !== "DEALER" ? "Set up your rental fleet and pricing" : "Post listings to the public marketplace",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0", borderBottom: i < 3 ? "1px solid #f6f8fa" : "none" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#dafbe1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#1a7f37", fontWeight: 700, flexShrink: 0 }}>✓</div>
                  <span style={{ fontSize: "13px", color: "#57606a" }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "28px" }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)}
              style={{ padding: "11px 24px", background: "white", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer", color: "#0d1117", fontFamily: "inherit" }}>
              ← Back
            </button>
          ) : (
            <button onClick={() => router.push("/")}
              style={{ padding: "11px 24px", background: "white", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", color: "#57606a", cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button onClick={() => {
              if (step === 2 && (!form.name || !form.city)) { setError("Business name and city are required"); return; }
              setError("");
              setStep(s => s + 1);
            }}
              style={{ padding: "11px 28px", background: "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              style={{ padding: "11px 28px", background: loading ? "#8c959f" : "#1a7f37", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "8px" }}>
              {loading ? "Creating..." : "Launch my business"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
