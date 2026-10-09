"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageSquare } from "lucide-react";
import { PLANS, type Plan } from "@/lib/plans";
import { upgradeRequestText, whatsappLink } from "@/lib/supportContact";

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.02c0-5.2 4.23-9.43 9.44-9.43 2.52 0 4.89.98 6.67 2.77a9.37 9.37 0 0 1 2.76 6.67c0 5.2-4.24 9.43-9.44 9.43m8.03-17.46A11.27 11.27 0 0 0 12.05.7C5.8.7.7 5.79.7 12.05c0 2 .52 3.95 1.52 5.67L.6 23.3l5.71-1.5a11.33 11.33 0 0 0 5.73 1.47h.01c6.25 0 11.35-5.1 11.35-11.35 0-3.03-1.18-5.88-3.32-8.02" />
    </svg>
  );
}

/**
 * Ways to reach the AutoMarket team about a plan: an in-app message to the support admin
 * (opens the conversation in Messages) and, when a number is configured, WhatsApp.
 */
export default function ContactTeam({ plan = PLANS.STARTER, tone = "light", className = "" }: {
  plan?: Plan;
  tone?: "light" | "dark";
  className?: string;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const wa = whatsappLink(upgradeRequestText(plan.name, plan.price, { id: session?.user?.id, email: session?.user?.email }));
  const dark = tone === "dark";

  async function messageTeam() {
    setSending(true);
    setError("");
    const res = await fetch("/api/support/upgrade-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: plan.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSending(false);
      setError(data.error || "Couldn't send your request. Please try again.");
      return;
    }
    router.push(`/messages?with=${data.supportUserId}`);
  }

  const primary = `inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
    dark ? "bg-white text-slate-950 hover:bg-slate-100" : "bg-slate-900 text-white hover:bg-slate-800"
  }`;

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 sm:flex-row">
        {status === "authenticated" ? (
          <button type="button" onClick={messageTeam} disabled={sending} className={primary}>
            <MessageSquare size={16} /> {sending ? "Sending request…" : "Message the team"}
          </button>
        ) : (
          <Link href="/login" className={primary}>
            <MessageSquare size={16} /> Sign in to message us
          </Link>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#25D366]/25 transition hover:bg-[#1ebe5b]"
          >
            <WhatsAppIcon /> WhatsApp us
          </a>
        )}
      </div>
      {error && <p role="alert" className={`mt-2 text-xs ${dark ? "text-rose-300" : "text-rose-600"}`}>{error}</p>}
    </div>
  );
}
