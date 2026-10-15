"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteListing({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      alert("Failed to delete listing");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Delete listing"
        title="Delete listing"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--gh-cf222e)] ring-1 ring-inset ring-[var(--gh-ffcdd2)] transition hover:bg-[var(--gh-fff0f0)]"
      >
        <Trash2 size={14} />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--gh-ffffff)", borderRadius: "12px", width: "100%", maxWidth: "420px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
          >
            {/* Header */}
            <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ width: "40px", height: "40px", background: "var(--gh-fff0f0)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                <Trash2 size={20} strokeWidth={1.75} color="#cf222e" />
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gh-8c959f)", fontSize: "20px", lineHeight: 1, padding: "0" }}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "16px 24px 24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--gh-0d1117)", marginBottom: "8px" }}>
                Delete this listing?
              </h3>
              <p style={{ fontSize: "14px", color: "var(--gh-57606a)", lineHeight: 1.6, marginBottom: "24px" }}>
                This action cannot be undone. The listing and all its data will be permanently removed from <span style={{color:"#d71212ec"}}>AutoMarket.</span>
              </p>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  style={{ padding: "8px 18px", background: "var(--gh-f6f8fa)", border: "1px solid var(--gh-d0d7de)", borderRadius: "8px", fontSize: "14px", fontWeight: 500, color: "var(--gh-0d1117)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  style={{ padding: "8px 18px", background: loading ? "#f85149" : "var(--gh-cf222e)", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, color: "var(--gh-ffffff)", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {loading ? (
                    <>
                      <span style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "var(--gh-ffffff)", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />
                      Deleting...
                    </>
                  ) : (
                    "Delete listing"
                  )}
                </button>
              </div>
            </div>
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </>
  );
}
