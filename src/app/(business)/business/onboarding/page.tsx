"use client";

import { useMemo, useState } from "react";
import { OfficialAvatar, OfficialName } from "@/components/business/Official";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Building2, Car, KeyRound, Rocket } from "lucide-react";
import Link from "next/link";
import Select from "@/components/ui/Select";
import LaunchOverlay, { LAUNCH_TEXT } from "@/components/launch/LaunchOverlay";
import { PLAN_LIST, formatLimit, formatPlanPrice, planInfo } from "@/lib/plans";
import { useSubscription } from "@/components/subscription/useSubscription";

import { useFormDraft } from "@/hooks/useFormDraft";
import DraftNote from "@/components/ui/DraftNote";
const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta"];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  // Plays the launch animation once the business is created, then opens the console
  const [launched, setLaunched] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "DEALER" as "DEALER" | "RENTAL" | "BOTH",
    phone: "",
    email: "",
    city: "",
    address: "",
    description: "",
    // Follow AutoGO Official for announcements, updates and offers (on by default; can be changed in Updates)
    followOfficial: true,
  });
  // The details and the step reached are kept in this browser until the business is created
  const draftValue = useMemo(() => ({ form, step }), [form, step]);
  const draft = useFormDraft("onboarding", draftValue, d => { setForm(prev => ({ ...prev, ...d.form })); setStep(Math.min(3, Math.max(1, d.step || 1))); },
    { isEmpty: d => !d.form.name.trim() && !d.form.phone.trim() && !d.form.city.trim() && !d.form.address.trim() && !d.form.description.trim() });
  // A business runs on its owner's plan, so this is the plan the new business will start on
  const { data: sub } = useSubscription(!!session?.user);
  const currentPlan = planInfo(sub?.planId);
  // The plan picked on the "Choose plan" step; a paid plan other than the current one is requested from the team on launch
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const chosenPlan = planInfo(selectedPlan ?? currentPlan.id);
  const requestsPlan = chosenPlan.price > 0 && chosenPlan.price > currentPlan.price;

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
    // No online payments: a paid plan picked here goes to the AutoGO team as a request in Messages
    if (requestsPlan) {
      await fetch("/api/support/upgrade-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: chosenPlan.id }) }).catch(() => {});
    }
    draft.clear();
    // The launch animation, then the console
    setLaunched(true);
  }

  const steps = ["Business type", "Details", "Choose plan", "Launch"];

  return (
    <div style={{ minHeight: "100vh", background: "var(--gh-f6f8fa)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <LaunchOverlay show={launched} {...LAUNCH_TEXT.business(form.name.trim() || undefined)} onDone={() => router.push("/business/dashboard")} />

      {/* Header */}
      <div style={{ background: "var(--gh-ffffff)", borderBottom: "1px solid var(--gh-e1e4e8)", padding: "16px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "13px", color: "var(--gh-57606a)", fontWeight: 500 }}>Business setup</span>
      </div>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 20px" }}>

        {/* Progress steps */}
        <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "40px" }}>
          {steps.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: step > i + 1 ? "var(--gh-1a7f37)" : step === i + 1 ? "var(--gh-0d1117)" : "var(--gh-e1e4e8)",
                  color: step >= i + 1 ? "var(--gh-ffffff)" : "var(--gh-8c959f)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "13px", fontWeight: 700, flexShrink: 0,
                }}>
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: "10px", color: step === i + 1 ? "var(--gh-0d1117)" : "var(--gh-8c959f)", fontWeight: step === i + 1 ? 600 : 400, whiteSpace: "nowrap" }}>{s}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: "2px", background: step > i + 1 ? "var(--gh-1a7f37)" : "var(--gh-e1e4e8)", margin: "0 8px", marginBottom: "16px", transition: "background 0.3s" }} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: "var(--gh-fff0f0)", border: "1px solid var(--gh-ffcdd2)", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "var(--gh-cf222e)", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {/* Step 1 — Business type */}
        {step === 1 && (
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--gh-0d1117)", marginBottom: "8px" }}>What type of business are you?</h1>
            <p style={{ fontSize: "14px", color: "var(--gh-57606a)", marginBottom: "28px" }}>We'll customize your dashboard based on your business type.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { id: "DEALER", icon: Car, title: "Car Dealer", desc: "Buy and sell cars, manage inventory, track sales and customers" },
                { id: "RENTAL", icon: KeyRound, title: "Rental Company", desc: "Manage a fleet of vehicles available for daily, weekly or monthly rent" },
                { id: "BOTH", icon: Building2, title: "Dealer + Rental", desc: "Full automobile business — sell and rent vehicles from one platform" },
              ].map(opt => (
                <div key={opt.id} onClick={() => setForm(p => ({ ...p, type: opt.id as "DEALER" | "RENTAL" | "BOTH" }))}
                  style={{ padding: "20px", background: "var(--gh-ffffff)", border: `2px solid ${form.type === opt.id ? "var(--gh-0d1117)" : "var(--gh-e1e4e8)"}`, borderRadius: "12px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "14px", transition: "all 0.15s" }}>
                  <span style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gh-0d1117)" }}><opt.icon size={22} strokeWidth={1.75} /></span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--gh-0d1117)", marginBottom: "4px" }}>{opt.title}</p>
                    <p style={{ fontSize: "13px", color: "var(--gh-57606a)" }}>{opt.desc}</p>
                  </div>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${form.type === opt.id ? "var(--gh-0d1117)" : "var(--gh-d0d7de)"}`, background: form.type === opt.id ? "var(--gh-0d1117)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                    {form.type === opt.id && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--gh-ffffff)" }} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Business details */}
        {step === 2 && (
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--gh-0d1117)", marginBottom: "8px" }}>Tell us about your business</h1>
            <p style={{ fontSize: "14px", color: "var(--gh-57606a)", marginBottom: "28px" }}>This information will appear on your business profile.</p>
            <div style={{ background: "var(--gh-ffffff)", border: "1px solid var(--gh-e1e4e8)", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--gh-0d1117)", marginBottom: "6px" }}>Business name *</label>
                <input name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Al-Rehman Motors"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--gh-0d1117)", marginBottom: "6px" }}>Phone *</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="+92 300 0000000"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--gh-0d1117)", marginBottom: "6px" }}>Email</label>
                  <input name="email" value={form.email} onChange={handleChange} placeholder="business@example.com"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--gh-0d1117)", marginBottom: "6px" }}>City *</label>
                  <Select name="city" value={form.city} onChange={v => setForm(p => ({ ...p, city: v }))} ariaLabel="City"
                    options={[{ value: "", label: "Select city" }, ...CITIES.map(c => ({ value: c, label: c }))]}
                    className="h-[42px] rounded-lg border-[var(--gh-d0d7de)] font-normal text-[var(--gh-0d1117)]" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--gh-0d1117)", marginBottom: "6px" }}>Address</label>
                  <input name="address" value={form.address} onChange={handleChange} placeholder="Street address"
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--gh-0d1117)", marginBottom: "6px" }}>Business description</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                  placeholder="Tell customers about your business..."
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", outline: "none", resize: "none", boxSizing: "border-box" }} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Choose plan */}
        {step === 3 && (
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--gh-0d1117)", marginBottom: "8px" }}>Choose your plan</h1>
            <p style={{ fontSize: "14px", color: "var(--gh-57606a)", marginBottom: "28px" }}>
              Your whole team shares one plan. You&apos;re on <strong style={{ color: currentPlan.accent }}>{currentPlan.name}</strong> now; pick another to ask for it.
            </p>
            <div role="radiogroup" aria-label="Plan" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {PLAN_LIST.map(plan => {
                const current = plan.id === currentPlan.id;
                const selected = plan.id === chosenPlan.id;
                return (
                  <button key={plan.id} type="button" role="radio" aria-checked={selected} onClick={() => setSelectedPlan(plan.id)}
                    style={{ textAlign: "left", fontFamily: "inherit", cursor: "pointer", padding: "18px 20px", background: selected ? "var(--gh-0d1117)" : "var(--gh-ffffff)", color: selected ? "var(--gh-ffffff)" : "var(--gh-0d1117)", border: `${selected ? 2 : 1}px solid ${selected ? "var(--gh-0d1117)" : "var(--gh-e1e4e8)"}`, borderRadius: "12px", position: "relative" }}>
                    {current && (
                      <span style={{ position: "absolute", top: "-10px", left: "20px", background: "linear-gradient(90deg,#fcd34d,#f59e0b)", color: "var(--gh-0d1117)", fontSize: "10px", fontWeight: 700, padding: "2px 10px", borderRadius: "20px" }}>
                        YOUR PLAN
                      </span>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "10px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                        {/* Radio dot */}
                        <span aria-hidden style={{ width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0, marginTop: "2px", border: selected ? "5px solid #fcd34d" : "2px solid var(--gh-d0d7de)", background: selected ? "var(--gh-0d1117)" : "transparent" }} />
                        <div>
                          <p style={{ fontSize: "16px", fontWeight: 700, marginBottom: "2px" }}>{plan.name}</p>
                          <p style={{ fontSize: "12px", color: selected ? "var(--gh-9ca3af)" : "var(--gh-8c959f)" }}>{plan.tagline}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span style={{ fontSize: "20px", fontWeight: 800, color: selected ? "#fcd34d" : plan.accent }}>{formatPlanPrice(plan.price)}</span>
                        <span style={{ fontSize: "12px", color: "var(--gh-8c959f)" }}>{plan.price ? "/month" : ""}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: "12px", color: selected ? "var(--gh-d1d5db)" : "var(--gh-57606a)", paddingLeft: "30px" }}>
                      {formatLimit(plan.limits.listings)} listings · {formatLimit(plan.limits.staff)} team members · {formatLimit(plan.limits.customers)} customers
                    </p>
                  </button>
                );
              })}
            </div>
            <p style={{ marginTop: "16px", padding: "12px 14px", borderRadius: "10px", fontSize: "12px", lineHeight: 1.6, background: requestsPlan ? "var(--gh-fff8c5)" : "var(--gh-f6f8fa)", color: requestsPlan ? "var(--gh-7d4e00)" : "var(--gh-57606a)", border: `1px solid ${requestsPlan ? "var(--gh-e3b341)" : "var(--gh-e1e4e8)"}` }}>
              {requestsPlan
                ? <>When you launch, we&apos;ll send your request for <strong>{chosenPlan.name}</strong> ({formatPlanPrice(chosenPlan.price)}/month) to the AutoGO team. They&apos;ll reply in Messages to arrange payment and switch it on. Your business starts on {currentPlan.name} until then.</>
                : chosenPlan.id === currentPlan.id
                  ? <>Your business starts on {currentPlan.name}. You can upgrade anytime from <Link href="/pricing" style={{ color: "var(--gh-0d1117)", fontWeight: 600 }}>Pricing</Link>.</>
                  : <>You already have {currentPlan.name}, so your business keeps it. Plans can be changed later from <Link href="/pricing" style={{ color: "var(--gh-0d1117)", fontWeight: 600 }}>Pricing</Link>.</>}
            </p>
          </div>
        )}

        {/* Step 4 — Launch */}
        {step === 4 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gh-8c959f)" }}><Rocket size={40} strokeWidth={1.5} /></div>
            <h1 style={{ fontSize: "28px", fontWeight: 800, color: "var(--gh-0d1117)", marginBottom: "12px" }}>Ready to launch!</h1>
            <p style={{ fontSize: "15px", color: "var(--gh-57606a)", marginBottom: "8px" }}>
              You&apos;re setting up <strong style={{ color: "var(--gh-0d1117)" }}>{form.name}</strong>
            </p>
            <p style={{ fontSize: "13px", color: "var(--gh-8c959f)", marginBottom: "32px" }}>
              {form.type === "DEALER" ? "Car dealer" : form.type === "RENTAL" ? "Rental company" : "Dealer + Rental"} · {form.city} · {currentPlan.name} plan{requestsPlan ? ` · ${chosenPlan.name} requested` : ""}
            </p>
            <div style={{ background: "var(--gh-ffffff)", border: "1px solid var(--gh-e1e4e8)", borderRadius: "12px", padding: "20px", textAlign: "left", marginBottom: "28px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--gh-0d1117)", marginBottom: "12px" }}>What happens next:</p>
              {[
                "Your business dashboard is created",
                "You can add vehicles to your inventory",
                "Start tracking customers and sales",
                form.type !== "DEALER" ? "Set up your rental fleet and pricing" : "Post listings to the public marketplace",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0", borderBottom: i < 3 ? "1px solid var(--gh-f6f8fa)" : "none" }}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "var(--gh-dafbe1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "var(--gh-1a7f37)", fontWeight: 700, flexShrink: 0 }}>✓</div>
                  <span style={{ fontSize: "13px", color: "var(--gh-57606a)" }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Follow the AutoGO Official channel */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: "12px", textAlign: "left", background: "var(--gh-ffffff)", border: `1px solid ${form.followOfficial ? "var(--gh-0d1117)" : "var(--gh-e1e4e8)"}`, borderRadius: "12px", padding: "14px 16px", marginBottom: "28px", cursor: "pointer" }}>
              <input type="checkbox" checked={form.followOfficial} onChange={e => setForm(p => ({ ...p, followOfficial: e.target.checked }))}
                style={{ width: "18px", height: "18px", marginTop: "2px", accentColor: "var(--gh-0d1117)", flexShrink: 0 }} />
              <span style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <OfficialAvatar size={36} />
                <span>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: 700, color: "var(--gh-0d1117)" }}>Follow <OfficialName /></span>
                  <span style={{ display: "block", fontSize: "12px", color: "var(--gh-57606a)", marginTop: "2px", lineHeight: 1.5 }}>
                    Get important announcements, new features and offers for businesses as notifications in your console. You can unfollow any time from Updates.
                  </span>
                </span>
              </span>
            </label>
          </div>
        )}

        <DraftNote className="mt-5" restoredAt={draft.restoredAt} savedAt={draft.savedAt}
          onDiscard={() => { draft.clear(); setForm(f => ({ ...f, name: "", phone: "", email: "", city: "", address: "", description: "" })); setStep(1); }} />

        {/* Navigation buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "28px" }}>
          {step > 1 ? (
            <button onClick={() => setStep(s => s - 1)}
              style={{ padding: "11px 24px", background: "var(--gh-ffffff)", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer", color: "var(--gh-0d1117)", fontFamily: "inherit" }}>
              ← Back
            </button>
          ) : (
            <button onClick={() => router.push("/")}
              style={{ padding: "11px 24px", background: "var(--gh-ffffff)", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", color: "var(--gh-57606a)", cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button onClick={() => {
              if (step === 2 && (!form.name || !form.city)) { setError("Business name and city are required"); return; }
              setError("");
              setStep(s => s + 1);
            }}
              style={{ padding: "11px 28px", background: "var(--gh-0d1117)", color: "var(--gh-ffffff)", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              Continue →
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              style={{ padding: "11px 28px", background: loading ? "var(--gh-8c959f)" : "var(--gh-1a7f37)", color: "var(--gh-ffffff)", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: "8px" }}>
              {loading ? "Creating..." : "Launch my business"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
