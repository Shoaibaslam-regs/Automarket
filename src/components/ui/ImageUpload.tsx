"use client";

import { useState } from "react";
import { UploadDropzone } from "@/lib/uploadthing-client";

interface Props {
  images: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

export default function ImageUpload({ images, onChange, maxImages = 8 }: Props) {
  const [uploading, setUploading] = useState(false);

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
          onUploadBegin={() => setUploading(true)}
          onClientUploadComplete={(res) => {
            setUploading(false);
            const newUrls = res.map((r) => r.ufsUrl || r.url);
            onChange([...images, ...newUrls]);
          }}
          onUploadError={(error) => {
            setUploading(false);
            alert("Upload failed: " + error.message);
          }}
          appearance={{
            container: "border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-gray-400 transition",
            label: "text-sm text-gray-500",
            allowedContent: "text-xs text-gray-400",
            button: "bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition",
          }}
          content={{
            label: uploading ? "Uploading..." : "Drop images here or click to upload",
            allowedContent: `Up to ${maxImages - images.length} more · Max 4MB each`,
          }}
        />
      )}

      {images.length >= maxImages && (
        <p style={{ fontSize: "12px", color: "#8c959f", textAlign: "center" }}>Maximum {maxImages} images reached</p>
      )}
    </div>
  );
}
