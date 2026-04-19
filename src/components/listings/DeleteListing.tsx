"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
        style={{ fontSize: "12px", color: "#cf222e", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: "4px" }}
      >
        Delete
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "white", borderRadius: "12px", width: "100%", maxWidth: "420px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
          >
            {/* Header */}
            <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ width: "40px", height: "40px", background: "#fff0f0", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                🗑️
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8c959f", fontSize: "20px", lineHeight: 1, padding: "0" }}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "16px 24px 24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0d1117", marginBottom: "8px" }}>
                Delete this listing?
              </h3>
              <p style={{ fontSize: "14px", color: "#57606a", lineHeight: 1.6, marginBottom: "24px" }}>
                This action cannot be undone. The listing and all its data will be permanently removed from AutoMarket.
              </p>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  style={{ padding: "8px 18px", background: "#f6f8fa", border: "1px solid #d0d7de", borderRadius: "8px", fontSize: "14px", fontWeight: 500, color: "#0d1117", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  style={{ padding: "8px 18px", background: loading ? "#f85149" : "#cf222e", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 600, color: "white", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", gap: "6px" }}
                >
                  {loading ? (
                    <>
                      <span style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />
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
