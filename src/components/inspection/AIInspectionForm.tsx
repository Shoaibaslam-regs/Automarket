"use client";

import { useState } from "react";
import { UploadDropzone } from "@/lib/uploadthing-client";

interface Report {
  make?: string;
  model?: string;
  year?: number;
  condition?: string;
  damageScore?: number;
  estimate?: number;
  damages?: string[];
  positives?: string[];
  summary?: string;
  rawResponse?: Record<string, unknown>;
  createdAt?: string;
  _isDemo?: boolean;
}

interface Props {
  listingId: string;
  listingImages: string[];
  existingReport: Report | null;
}

const CONDITION_COLORS: Record<string, { bg: string; color: string }> = {
  EXCELLENT: { bg: "#dafbe1", color: "#1a7f37" },
  GOOD:      { bg: "#ddf4ff", color: "#0550ae" },
  FAIR:      { bg: "#fff8c5", color: "#7d4e00" },
  POOR:      { bg: "#fff0f0", color: "#cf222e" },
};

function DamageBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score <= 2 ? "#2da44e" : score <= 5 ? "#e3b341" : score <= 7 ? "#f0883e" : "#cf222e";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
        <span style={{ color: "#57606a" }}>Damage score</span>
        <span style={{ fontWeight: 700, color }}>{score}/10</span>
      </div>
      <div style={{ background: "#e1e4e8", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "4px", transition: "width 0.5s ease" }} />
      </div>
      <p style={{ fontSize: "11px", color: "#8c959f", marginTop: "4px" }}>
        {score <= 2 ? "No significant damage" : score <= 5 ? "Minor damage present" : score <= 7 ? "Moderate damage" : "Significant damage"}
      </p>
    </div>
  );
}

function ReportCard({ report }: { report: Report }) {
  const condStyle = CONDITION_COLORS[report.condition ?? "GOOD"] ?? CONDITION_COLORS.GOOD;

  return (
    <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", overflow: "hidden", marginTop: "24px" }}>

      {/* Header */}
      <div style={{ background: "#0d1117", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "white", marginBottom: "2px" }}>AI Inspection Report</p>
          {report.createdAt && (
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
              Generated {new Date(report.createdAt).toLocaleString("en-PK")}
            </p>
          )}
        </div>
        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: "8px", padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "16px" }}>🤖</span>
          <span style={{ fontSize: "12px", color: "white", fontWeight: 500 }}>
            {report._isDemo ? "Demo Report" : "AI Powered"}
          </span>
        </div>
      </div>

      {/* Demo warning */}
      {report._isDemo && (
        <div style={{ background: "#fff8c5", padding: "10px 20px", fontSize: "12px", color: "#7d4e00", borderBottom: "1px solid #e3b341", display: "flex", alignItems: "center", gap: "6px" }}>
          ⚠️ Demo report — AI quota exceeded. Report is based on listing data.
        </div>
      )}

      <div style={{ padding: "20px" }}>

        {/* Vehicle identity */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Detected make", value: report.make || "Unknown" },
            { label: "Detected model", value: report.model || "Unknown" },
            { label: "Estimated year", value: report.year?.toString() || "Unknown" },
            { label: "Condition", value: report.condition || "Unknown", badge: true },
          ].map(item => (
            <div key={item.label} style={{ background: "#f6f8fa", borderRadius: "8px", padding: "12px" }}>
              <p style={{ fontSize: "11px", color: "#8c959f", marginBottom: "4px" }}>{item.label}</p>
              {item.badge ? (
                <span style={{ fontSize: "12px", fontWeight: 600, padding: "3px 8px", borderRadius: "20px", background: condStyle.bg, color: condStyle.color }}>
                  {item.value}
                </span>
              ) : (
                <p style={{ fontSize: "13px", fontWeight: 600, color: "#0d1117" }}>{item.value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Damage score */}
        {report.damageScore !== undefined && (
          <div style={{ background: "#f6f8fa", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
            <DamageBar score={report.damageScore} />
          </div>
        )}

        {/* Estimated value */}
        {report.estimate && (
          <div style={{ background: "#dafbe1", border: "1px solid #56d364", borderRadius: "8px", padding: "14px 16px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "12px", color: "#1a7f37", marginBottom: "2px" }}>Estimated market value</p>
              <p style={{ fontSize: "22px", fontWeight: 800, color: "#1a7f37" }}>PKR {report.estimate.toLocaleString()}</p>
            </div>
            <span style={{ fontSize: "28px" }}>💰</span>
          </div>
        )}

        {/* Summary */}
        {report.summary && (
          <div style={{ background: "#f6f8fa", borderRadius: "8px", padding: "14px 16px", marginBottom: "20px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#0d1117", marginBottom: "6px" }}>Overall assessment</p>
            <p style={{ fontSize: "13px", color: "#57606a", lineHeight: 1.6 }}>{report.summary}</p>
          </div>
        )}

        {/* Damages & Positives */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {report.damages && report.damages.length > 0 && (
            <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "14px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#cf222e", marginBottom: "10px" }}>⚠️ Issues found</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {report.damages.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                    <span style={{ color: "#cf222e", fontSize: "12px", flexShrink: 0 }}>•</span>
                    <span style={{ fontSize: "12px", color: "#57606a", lineHeight: 1.5 }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {report.positives && report.positives.length > 0 && (
            <div style={{ background: "#dafbe1", border: "1px solid #56d364", borderRadius: "8px", padding: "14px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#1a7f37", marginBottom: "10px" }}>✅ Good points</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {report.positives.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                    <span style={{ color: "#1a7f37", fontSize: "12px", flexShrink: 0 }}>•</span>
                    <span style={{ fontSize: "12px", color: "#57606a", lineHeight: 1.5 }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AIInspectionForm({ listingId, listingImages, existingReport }: Props) {
  const [images, setImages] = useState<string[]>(listingImages || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(existingReport);
  const [uploading, setUploading] = useState(false);

  async function runInspection() {
    if (images.length === 0) { setError("Please upload at least one image"); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/ai-inspection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, images }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error); return; }
    setReport({ ...data.report, createdAt: new Date().toISOString() });
  }

  return (
    <div>
      {/* Upload section */}
      <div style={{ background: "white", border: "1px solid #e1e4e8", borderRadius: "12px", padding: "24px", marginBottom: "16px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#0d1117", marginBottom: "4px" }}>Vehicle photos</h2>
        <p style={{ fontSize: "13px", color: "#57606a", marginBottom: "16px" }}>
          Upload clear photos from multiple angles — front, rear, sides, interior, and any damage areas.
        </p>

        {images.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "16px" }}>
            {images.map((url, i) => (
              <div key={url} style={{ position: "relative", aspectRatio: "16/9", borderRadius: "8px", overflow: "hidden", border: "1px solid #e1e4e8" }}>
                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                  style={{ position: "absolute", top: "4px", right: "4px", width: "20px", height: "20px", background: "#cf222e", color: "white", border: "none", borderRadius: "50%", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ×
                </button>
                {i === 0 && (
                  <span style={{ position: "absolute", bottom: "4px", left: "4px", background: "rgba(0,0,0,0.6)", color: "white", fontSize: "9px", padding: "2px 5px", borderRadius: "4px" }}>Main</span>
                )}
              </div>
            ))}
          </div>
        )}

        <UploadDropzone
          endpoint="vehicleImages"
          onUploadBegin={() => setUploading(true)}
          onClientUploadComplete={(res) => {
            setUploading(false);
            const newUrls = res.map((r) => r.ufsUrl || r.url);
            setImages((prev) => [...prev, ...newUrls]);
          }}
          onUploadError={(err) => { setUploading(false); setError(err.message); }}
          appearance={{
            container: "border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-gray-400 transition",
            label: "text-sm text-gray-500",
            allowedContent: "text-xs text-gray-400",
            button: "bg-gray-900 text-white text-sm px-4 py-2 rounded-lg",
          }}
          content={{
            label: uploading ? "Uploading..." : "Drop more photos here or click to upload",
            allowedContent: "Images up to 4MB each",
          }}
        />
      </div>

      {/* Tips */}
      <div style={{ background: "#fff8c5", border: "1px solid #e3b341", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
        <p style={{ fontSize: "12px", color: "#7d4e00", fontWeight: 600, marginBottom: "6px" }}>💡 Tips for best results</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
          {[
            "Take photos in good lighting",
            "Include front, rear and both sides",
            "Photograph any scratches or dents closely",
            "Include interior and dashboard",
          ].map((tip, i) => (
            <p key={i} style={{ fontSize: "12px", color: "#7d4e00" }}>• {tip}</p>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "12px 14px", fontSize: "13px", color: "#cf222e", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      <button
        onClick={runInspection}
        disabled={loading || images.length === 0}
        style={{
          width: "100%", padding: "13px",
          background: loading || images.length === 0 ? "#8c959f" : "#0d1117",
          color: "white", border: "none", borderRadius: "8px",
          fontSize: "14px", fontWeight: 600,
          cursor: loading || images.length === 0 ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
        }}>
        {loading ? (
          <>
            <span style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />
            Analyzing vehicle... this may take 15-30 seconds
          </>
        ) : (
          <>🔍 {report ? "Re-run inspection" : "Run AI inspection"}</>
        )}
      </button>

      {report && <ReportCard report={report} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
