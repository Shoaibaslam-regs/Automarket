"use client";

import { useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing-client";

/**
 * The upload button for a single picture (profile photo, business logo, blog cover): a dark, softly lit button with a camera
 * icon that shows the upload's progress, used by Profile & settings and Business settings. Pair it with
 * RemovePhotoButton, which is text only so the main action stays the one that stands out.
 */
export default function PhotoUploadButton({ endpoint, hasPhoto, onUploaded, onError, onUploadingChange, disabled }: {
  endpoint: "profileImage" | "businessLogo" | "blogImage";
  /** "Change photo" instead of "Upload photo" */
  hasPhoto: boolean;
  onUploaded: (url: string) => void;
  onError: (message: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploadingState] = useState(false);
  const setUploading = (v: boolean) => { setUploadingState(v); onUploadingChange?.(v); };
  return (
    <UploadButton
      endpoint={endpoint}
      disabled={disabled}
      onUploadBegin={() => setUploading(true)}
      onClientUploadComplete={res => {
        setUploading(false);
        const url = res[0]?.ufsUrl || res[0]?.url;
        if (url) onUploaded(url);
      }}
      onUploadError={err => { setUploading(false); onError(err.message); }}
      appearance={{
        // ! beats UploadThing's own blue button styles
        button: [
          "!h-10 !w-auto !rounded-xl !px-4 !text-[13px] !font-semibold !text-white",
          "!bg-gradient-to-b !from-slate-800 !to-slate-900",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(15,23,42,0.25),0_8px_20px_-8px_rgba(15,23,42,0.55)]",
          "ring-1 ring-inset ring-white/10 transition hover:!from-slate-700 hover:!to-slate-900 active:scale-[0.98]",
          "focus-within:!ring-2 focus-within:!ring-indigo-400/60 ut-uploading:cursor-wait data-[state=disabled]:!opacity-50",
        ].join(" "),
        container: "!flex-row items-start",
        allowedContent: "hidden",
      }}
      content={{
        button: ({ uploadProgress }) => (
          <span className="inline-flex items-center gap-2">
            {uploading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Camera size={15} strokeWidth={2} aria-hidden />}
            {uploading ? (uploadProgress ? `Uploading ${Math.round(uploadProgress)}%` : "Uploading…") : hasPhoto ? "Change photo" : "Upload photo"}
          </span>
        ),
      }}
    />
  );
}

/** Text-only Remove beside PhotoUploadButton: no fill or border, red on hover. */
export function RemovePhotoButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="inline-flex h-10 items-center gap-1.5 px-1.5 text-[13px] font-semibold text-slate-500 transition hover:text-rose-600 disabled:opacity-50">
      <Trash2 size={14} aria-hidden /> Remove
    </button>
  );
}
