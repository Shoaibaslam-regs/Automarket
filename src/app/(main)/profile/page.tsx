"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { UploadButton } from "@/lib/uploadthing-client";
import Image from "next/image";

type UserProfile = {
  name?: string;
  email: string;
  phone?: string;
  image?: string;
  role: string;
  createdAt: string;
};

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  const [form, setForm] = useState({ name: "", phone: "", image: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.json())
      .then(d => {
        setProfile(d.user);
        setForm({ name: d.user?.name || "", phone: d.user?.phone || "", image: d.user?.image || "" });
        setLoading(false);
      });
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error); return; }
    setProfile(prev => prev ? { ...prev, ...data.user } : prev);
    setSuccess("Profile updated successfully!");
    await update({ name: data.user.name, image: data.user.image });
    setTimeout(() => setSuccess(""), 3000);
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error); return; }
    setSuccess("Password changed successfully!");
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setTimeout(() => setSuccess(""), 3000);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f6f8fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#57606a", fontSize: "14px" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f6f8fa", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", padding: "32px 24px" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <div style={{ position: "relative", width: "72px", height: "72px", borderRadius: "50%", overflow: "hidden", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {form.image ? (
              <Image src={form.image} alt="Profile" fill sizes="72px" style={{ objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: "28px", fontWeight: 700, color: "white" }}>
                {profile?.name?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0d1117", marginBottom: "2px" }}>{profile?.name}</h1>
            <p style={{ fontSize: "13px", color: "#57606a" }}>{profile?.email}</p>
            <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: profile?.role === "ADMIN" ? "#fff8c5" : "#f6f8fa", color: profile?.role === "ADMIN" ? "#7d4e00" : "#57606a", marginTop: "4px", display: "inline-block" }}>
              {profile?.role}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", background: "white", border: "1px solid #e1e4e8", borderRadius: "10px", padding: "4px", marginBottom: "20px", width: "fit-content" }}>
          {(["profile", "password"] as const).map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setError(""); setSuccess(""); }}
              style={{ padding: "7px 20px", borderRadius: "7px", border: "none", fontSize: "13px", fontWeight: 500, cursor: "pointer", background: activeTab === tab ? "#0d1117" : "transparent", color: activeTab === tab ? "white" : "#57606a", textTransform: "capitalize" }}>
              {tab === "profile" ? "Profile info" : "Change password"}
            </button>
          ))}
        </div>

        {success && (
          <div style={{ background: "#dafbe1", border: "1px solid #56d364", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#1a7f37", marginBottom: "16px" }}>
            ✅ {success}
          </div>
        )}
        {error && (
          <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "12px 16px", fontSize: "13px", color: "#cf222e", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {activeTab === "profile" && (
          <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "24px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0d1117", marginBottom: "20px" }}>Profile information</h2>

            {/* Avatar upload */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#0d1117", marginBottom: "8px" }}>
                Profile photo
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", overflow: "hidden", background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 }}>
                  {form.image ? (
                    <Image src={form.image} alt="" fill sizes="48px" style={{ objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: "18px", fontWeight: 700, color: "white" }}>{profile?.name?.[0]?.toUpperCase()}</span>
                  )}
                </div>
                <UploadButton
                  endpoint="vehicleImages"
                  onClientUploadComplete={(res) => {
                    const url = res[0]?.ufsUrl || res[0]?.url;
                    if (url) setForm(prev => ({ ...prev, image: url }));
                  }}
                  onUploadError={(err) => setError(err.message)}
                  appearance={{
                    button: "bg-gray-900 text-white text-xs px-3 py-2 rounded-lg hover:bg-gray-700 transition",
                    allowedContent: "hidden",
                  }}
                  content={{ button: "Upload photo" }}
                />
                {form.image && (
                  <button onClick={() => setForm(prev => ({ ...prev, image: "" }))}
                    style={{ fontSize: "12px", color: "#cf222e", background: "none", border: "none", cursor: "pointer" }}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#0d1117", marginBottom: "6px" }}>Full name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#0d1117", marginBottom: "6px" }}>Email address</label>
                <input value={profile?.email || ""} disabled
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", background: "#f6f8fa", color: "#57606a", boxSizing: "border-box" }} />
                <p style={{ fontSize: "11px", color: "#8c959f", marginTop: "4px" }}>Email cannot be changed</p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#0d1117", marginBottom: "6px" }}>Phone number</label>
                <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+92 300 0000000"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
              </div>
              <button type="submit" disabled={saving}
                style={{ padding: "11px", background: saving ? "#8c959f" : "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "password" && (
          <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "24px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0d1117", marginBottom: "20px" }}>Change password</h2>
            <form onSubmit={savePassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { label: "Current password", key: "currentPassword", placeholder: "Enter current password" },
                { label: "New password", key: "newPassword", placeholder: "Min 6 characters" },
                { label: "Confirm new password", key: "confirmPassword", placeholder: "Repeat new password" },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 500, color: "#0d1117", marginBottom: "6px" }}>{field.label}</label>
                  <input
                    type="password"
                    value={passwordForm[field.key as keyof typeof passwordForm]}
                    onChange={e => setPasswordForm(p => ({ ...p, [field.key]: e.target.value }))}
                    required placeholder={field.placeholder}
                    style={{ width: "100%", padding: "10px 12px", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              ))}
              <button type="submit" disabled={saving}
                style={{ padding: "11px", background: saving ? "#8c959f" : "#0d1117", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Updating..." : "Update password"}
              </button>
            </form>
          </div>
        )}

        {/* Member since */}
        <p style={{ fontSize: "12px", color: "#8c959f", textAlign: "center", marginTop: "16px" }}>
          Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-PK", { month: "long", year: "numeric" }) : "—"}
        </p>
      </div>
    </div>
  );
}
