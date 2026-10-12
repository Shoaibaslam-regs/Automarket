"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AlertTriangle, Clock3, Headset, MessageSquare, Send, ShieldCheck } from "lucide-react";
import Select from "@/components/ui/Select";
import { SUPPORT_TOPICS, type SupportTopicId } from "@/lib/supportTopics";
import { SUPPORT_WHATSAPP, whatsappLink } from "@/lib/supportContact";

type Org = { name: string; isActive?: boolean; suspension?: { reason: string; at: string } };

/** Business console page for contacting the AutoMarket team about anything, including suspension appeals. */
export default function BusinessSupportPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [org, setOrg] = useState<Org | null>(null);
  const [topic, setTopic] = useState<SupportTopicId | "">("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/business/organizations")
      .then(r => r.json())
      .then(d => {
        setOrg(d.organization ?? null);
        // A suspended business most likely wants to appeal
        if (d.organization?.isActive === false) setTopic(t => t || "APPEAL");
      })
      .catch(() => {});
  }, []);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!topic) { setError("Choose a topic"); return; }
    setSending(true);
    setError("");
    const res = await fetch("/api/support/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, message }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setSending(false); setError(data.error || "Couldn't send your message"); return; }
    router.push(`/messages?with=${data.supportUserId}`);
  }

  const suspended = org?.isActive === false;
  const wa = whatsappLink(`Hi AutoMarket team, this is ${session?.user?.name ?? "a business user"}${org ? ` from ${org.name}` : ""} (ID #${session?.user?.id?.slice(-6) ?? ""}). `);

  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)]">
      <div className="border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-5 sm:px-6">
        <Link href="/business/dashboard" className="text-xs text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">← Dashboard</Link>
        <h1 className="mt-1 text-lg font-bold text-[var(--gh-0d1117)]">Help & support</h1>
        <p className="mt-0.5 text-xs text-[var(--gh-57606a)]">Reach the AutoMarket team about your plan, listings, bookings, a problem, or anything else</p>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        {suspended && (
          <div role="alert" className="mb-5 flex gap-3 rounded-2xl border border-[var(--gh-ffcdd2)] bg-[var(--gh-fff0f0)] p-4">
            <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-[var(--gh-cf222e)]" />
            <div className="text-[13px] text-[var(--gh-82071e)]">
              <p className="font-bold">{org?.name} is suspended</p>
              {org?.suspension?.reason && <p className="mt-0.5">Reason: {org.suspension.reason}</p>}
              <p className="mt-1">Your listings are hidden and your public page is offline. Send an appeal below and an admin will review it.</p>
            </div>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
          <form onSubmit={send} className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--gh-0d1117)] text-white"><Headset size={17} /></span>
              <div>
                <p className="text-sm font-bold text-[var(--gh-0d1117)]">Message the team</p>
                <p className="text-[11px] text-[var(--gh-57606a)]">Your business name and ID are attached automatically</p>
              </div>
            </div>

            <label className="mb-1.5 block text-xs font-semibold text-[var(--gh-0d1117)]">Topic *</label>
            <Select
              value={topic}
              onChange={v => setTopic(v as SupportTopicId)}
              ariaLabel="Topic"
              placeholder="What is this about?"
              options={SUPPORT_TOPICS.map(t => ({ value: t.id, label: t.label }))}
              className="h-10 rounded-lg border-[var(--gh-d0d7de)] text-[13px] font-normal"
            />

            <label htmlFor="support-msg" className="mb-1.5 mt-4 block text-xs font-semibold text-[var(--gh-0d1117)]">Message *</label>
            <textarea
              id="support-msg"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              maxLength={2000}
              required
              placeholder={suspended ? "Explain what happened and why your business should be reinstated…" : "Tell us what you need. Include listing titles or booking numbers if relevant."}
              className="w-full resize-none rounded-lg border border-[var(--gh-d0d7de)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--gh-0d1117)] focus:ring-2 focus:ring-[var(--gh-0d1117)]/10"
            />
            <p className="mt-1 text-right text-[11px] text-[var(--gh-8c959f)]">{message.trim().length}/2000</p>

            {error && <div role="alert" className="mt-2 rounded-lg border border-[var(--gh-ffcdd2)] bg-[var(--gh-fff0f0)] px-3 py-2.5 text-[13px] text-[var(--gh-cf222e)]">{error}</div>}

            <button type="submit" disabled={sending} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--gh-0d1117)] py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--gh-24292f)] disabled:opacity-50 sm:w-auto sm:px-5">
              <Send size={14} /> {sending ? "Sending…" : suspended && topic === "APPEAL" ? "Send appeal" : "Send message"}
            </button>
            <p className="mt-3 text-[11px] text-[var(--gh-57606a)]">The conversation opens in Messages, where the team replies and you can follow up.</p>
          </form>

          <div className="space-y-3">
            {SUPPORT_WHATSAPP && wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-[#25D366] p-4 text-white transition hover:bg-[#1ebe5b]">
                <MessageSquare size={18} />
                <span>
                  <span className="block text-sm font-bold">WhatsApp us</span>
                  <span className="block text-[11px] text-white/85">Quick questions</span>
                </span>
              </a>
            )}
            <Link href="/messages" className="flex items-center gap-3 rounded-2xl border border-[var(--gh-e1e4e8)] bg-white p-4 transition hover:bg-[var(--gh-f6f8fa)]">
              <MessageSquare size={18} className="text-[var(--gh-0d1117)]" />
              <span>
                <span className="block text-sm font-semibold text-[var(--gh-0d1117)]">Past conversations</span>
                <span className="block text-[11px] text-[var(--gh-57606a)]">Replies from the team are in Messages</span>
              </span>
            </Link>
            <div className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white p-4 text-[12px] text-[var(--gh-57606a)]">
              <p className="flex items-center gap-1.5 font-semibold text-[var(--gh-0d1117)]"><Clock3 size={13} /> Response time</p>
              <p className="mt-1">Usually within a day. Plan and suspension requests are handled by an admin.</p>
              <p className="mt-3 flex items-center gap-1.5 font-semibold text-[var(--gh-0d1117)]"><ShieldCheck size={13} /> Reporting abuse?</p>
              <p className="mt-1">Choose &ldquo;Report a problem or abuse&rdquo; and include links or booking numbers.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
