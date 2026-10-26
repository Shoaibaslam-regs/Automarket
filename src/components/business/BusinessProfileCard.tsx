"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, ExternalLink, Globe, ImageIcon, Trash2 } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing-client";
import { ORG_UPDATED_EVENT } from "@/components/business/BusinessSidebar";

/**
 * Business settings: the business picture (DP) shown on its public page, listings and console,
 * and the public page address with copy and open buttons.
 */
export default function BusinessProfileCard({ name, slug, logo, canEditLogo, onLogoChange }: {
  name: string;
  slug: string;
  logo?: string;
  canEditLogo: boolean;
  onLogoChange: (logo: string | undefined) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  // Client-only page, so window is always available here
  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/dealers/${slug}`;

  async function saveLogo(next: string) {
    setSaving(true);
    setError("");
    const res = await fetch("/api/business/organizations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logo: next }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(data.error || "Couldn't save the picture"); return; }
    onLogoChange(next || undefined);
    window.dispatchEvent(new Event(ORG_UPDATED_EVENT));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy. Select the address and copy it instead.");
    }
  }

  const busy = saving || uploading;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-bold text-slate-900">Business profile</h2>

      {/* Picture */}
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="relative flex-shrink-0 self-start rounded-2xl bg-gradient-to-br from-indigo-400 via-fuchsia-400 to-amber-300 p-[2px]">
          <span className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-[14px] bg-slate-900 text-3xl font-extrabold text-white">
            {logo ? <Image src={logo} alt={`${name} picture`} fill sizes="80px" className="object-cover" /> : name[0]?.toUpperCase() || "B"}
            {busy && <span className="absolute inset-0 animate-pulse bg-white/40" />}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-900">Business picture</p>
          <p className="mt-0.5 text-xs text-slate-500">Your logo or shop photo. Shown on your public page, your listings and here in the console. Square images look best, up to 4 MB.</p>
          {canEditLogo ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <UploadButton
                endpoint="businessLogo"
                onUploadBegin={() => { setUploading(true); setError(""); }}
                onClientUploadComplete={res => {
                  setUploading(false);
                  const url = res[0]?.ufsUrl || res[0]?.url;
                  if (url) saveLogo(url);
                }}
                onUploadError={err => { setUploading(false); setError(err.message); }}
                appearance={{
                  // ! beats UploadThing's own blue button styles
                  button: "!h-9 !w-auto !rounded-lg !bg-slate-900 !px-3 !text-xs !font-semibold !text-white transition hover:!bg-slate-800 ut-uploading:opacity-70",
                  container: "items-start",
                  allowedContent: "hidden",
                }}
                content={{ button: () => <span className="inline-flex items-center gap-1.5"><ImageIcon size={14} /> {logo ? "Change picture" : "Upload picture"}</span> }}
              />
              {logo && (
                <button
                  type="button"
                  onClick={() => saveLogo("")}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 size={13} /> Remove
                </button>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-400">Only the owner or a manager can change the picture.</p>
          )}
        </div>
      </div>

      {/* Public page */}
      <div className="mt-6 border-t border-slate-100 pt-5">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900"><Globe size={14} className="text-indigo-500" /> Public business page</p>
        <p className="mt-0.5 text-xs text-slate-500">Share this link with customers. The address can&apos;t be changed.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={publicUrl}
            onFocus={e => e.currentTarget.select()}
            aria-label="Public page address"
            className="h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 sm:flex-1 px-3 text-[13px] font-medium text-slate-700 outline-none focus:border-slate-900"
          />
          <div className="flex gap-2">
            <button type="button" onClick={copy} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 sm:flex-none">
              {copied ? <><Check size={14} className="text-emerald-600" /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
            <a href={`/dealers/${slug}`} target="_blank" rel="noreferrer" className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 sm:flex-none">
              <ExternalLink size={14} /> Open
            </a>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
