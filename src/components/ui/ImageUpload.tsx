"use client";

import { useState } from "react";
import { UploadDropzone } from "@/lib/uploadthing-client";
import { splitVehicleUploads, type RejectedUpload } from "@/lib/vehicleUploads";

interface Props {
  images: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

export default function ImageUpload({ images, onChange, maxImages = 8 }: Props) {
  const [uploading, setUploading] = useState(false);
  const [rejected, setRejected] = useState<RejectedUpload[]>([]);

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {images.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {images.map((url, i) => (
            <div key={url} style={{ position: "relative", aspectRatio: "16/9", borderRadius: "8px", overflow: "hidden", border: "1px solid #e1e4e8" }}>
              <img src={url} alt={`Vehicle image ${i + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {i === 0 && (
                <span style={{ position: "absolute", top: "6px", left: "6px", background: "#0d1117", color: "white", fontSize: "10px", padding: "2px 7px", borderRadius: "20px", fontWeight: 600 }}>
                  Main
                </span>
              )}
              <button type="button" onClick={() => removeImage(i)}
                style={{ position: "absolute", top: "6px", right: "6px", width: "22px", height: "22px", background: "#cf222e", color: "white", border: "none", borderRadius: "50%", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <UploadDropzone
          endpoint="vehicleImages"
          onUploadBegin={() => {
            setUploading(true);
            setRejected([]);
          }}
          onClientUploadComplete={(res) => {
            setUploading(false);
            const { accepted, rejected } = splitVehicleUploads(res);
            setRejected(rejected);
            if (accepted.length) onChange([...images, ...accepted]);
          }}
          onUploadError={(error) => {
            setUploading(false);
            setRejected([{ name: "Upload", reason: error.message }]);
          }}
          appearance={{
            container: "border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-gray-400 transition",
            label: "text-sm text-gray-500",
            allowedContent: "text-xs text-gray-400",
            button: "bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition",
          }}
          content={{
            label: uploading ? "Uploading & checking photos with AI…" : "Drop vehicle photos here or click to upload",
            allowedContent: `Car or bike photos only · Up to ${maxImages - images.length} more · Max 4MB each`,
          }}
        />
      )}

      {rejected.length > 0 && (
        <div role="alert" style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "10px", padding: "12px 14px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#cf222e", marginBottom: "6px" }}>
            {rejected.length === 1 ? "1 photo was rejected" : `${rejected.length} photos were rejected`} — only car or bike photos are allowed
          </p>
          <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "3px" }}>
            {rejected.map((r, i) => (
              <li key={`${r.name}-${i}`} style={{ fontSize: "12px", color: "#82071e" }}>
                <strong style={{ fontWeight: 600 }}>{r.name}</strong>: {r.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {images.length >= maxImages && (
        <p style={{ fontSize: "12px", color: "#8c959f", textAlign: "center" }}>Maximum {maxImages} images reached</p>
      )}
    </div>
  );
}
