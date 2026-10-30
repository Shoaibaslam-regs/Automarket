"use client";

import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageSquare } from "lucide-react";
import { PLANS, type Plan } from "@/lib/plans";
import { upgradeRequestText, whatsappLink } from "@/lib/supportContact";
import { useRateLock } from "@/hooks/useRateLock";
import { useMyBusiness } from "@/hooks/useMyBusiness";


/**
 * Ways to reach the AutoGO team about a plan: an in-app message to the support admin
 * (opens the conversation in Messages) and, when a number is configured, WhatsApp.
 */
export default function ContactTeam({ plan = PLANS.STARTER, tone = "light", className = "" }: {
  plan?: Plan;
  tone?: "light" | "dark";
  className?: string;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const supLock = useRateLock("support");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  // The WhatsApp text names the business too, like the in-app request
  const business = useMyBusiness(status === "authenticated");
  const wa = whatsappLink(upgradeRequestText(plan.name, plan.price, { id: session?.user?.id, email: session?.user?.email, business }));
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
    supLock.check(res, data);
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
          <button type="button" onClick={messageTeam} disabled={sending || supLock.locked} className={primary}>
            <MessageSquare size={16} /> {supLock.locked ? supLock.text : sending ? "Sending request…" : "Message the team"}
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
