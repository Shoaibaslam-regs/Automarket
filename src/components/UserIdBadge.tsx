"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

const KINDS = {
  // "ID" on its own in the marketplace; the console says "My ID" so it isn't mistaken for the business's
  user: { label: "ID", noun: "account ID" },
  me: { label: "My ID", noun: "account ID" },
  business: { label: "Business ID", noun: "business ID" },
};

/**
 * An account or business ID, shown the same way the admin panel shows it (last 6 characters),
 * so people can quote it to support. Clicking copies the full ID.
 */
export default function UserIdBadge({ id, kind = "user", className = "" }: { id?: string | null; kind?: keyof typeof KINDS; className?: string }) {
  const { label, noun } = KINDS[kind];
  const [copied, setCopied] = useState(false);
  if (!id) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(id!);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (e.g. insecure context); the short ID is still visible
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? "Copied" : `Copy your full ${noun} (${id})`}
      aria-label={copied ? "ID copied" : `Copy your ${noun}`}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] ring-1 ring-inset transition ${
        copied ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-white text-slate-500 ring-slate-200 hover:text-slate-800 hover:ring-slate-300"
      } ${className}`}
    >
      <span className="font-medium">{label}</span>
      <span className="font-mono font-semibold tracking-wide">#{id.slice(-6)}</span>
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}
