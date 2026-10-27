"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Building2, Check, X } from "lucide-react";
import { toast } from "@/lib/toast";

type Invite = {
  _id: string;
  role: "MANAGER" | "SALES" | "STAFF";
  createdAt: string;
  organizationId: { _id: string; name: string; logo?: string; city?: string } | null;
  invitedBy?: { name?: string } | null;
};

const ROLE_TEXT: Record<Invite["role"], string> = {
  MANAGER: "a manager",
  SALES: "sales",
  STAFF: "staff",
};

/**
 * Invitations to join a business team (from Staff → Add staff member). Nothing changes on the account until the
 * person accepts here; declining just removes the invitation. Shown on the dashboard and Notifications; renders
 * nothing when there are none.
 */
export default function TeamInvites() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/invites").then(r => (r.ok ? r.json() : { invites: [] })).then(d => setInvites(d.invites ?? [])).catch(() => {});
  }, []);

  async function answer(invite: Invite, action: "accept" | "decline") {
    setBusy(invite._id);
    const res = await fetch(`/api/invites/${invite._id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(null);
    if (!res?.ok) {
      toast(data?.error || "Couldn't answer the invitation. Try again.", { tone: "info" });
      return;
    }
    if (action === "accept") {
      toast(`You joined ${invite.organizationId?.name ?? "the business"}`, { tone: "saved" });
      // A full load, so menus and the console pick up the new membership
      window.location.assign("/business/dashboard");
      return;
    }
    setInvites(list => list.filter(i => i._id !== invite._id));
    toast("Invitation declined", { tone: "removed" });
  }

  if (!invites.length) return null;
  return (
    <section className="mb-6 space-y-2">
      {invites.map(invite => (
        <div key={invite._id} className="flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-white p-4 shadow-[0_8px_30px_-22px_rgba(79,70,229,0.45)] sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-500">
              {invite.organizationId?.logo
                ? <Image src={invite.organizationId.logo} alt="" fill sizes="44px" className="object-cover" />
                : <Building2 size={20} />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {invite.organizationId?.name ?? "A business"} invited you to join its team as {ROLE_TEXT[invite.role]}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {invite.invitedBy?.name ? `From ${invite.invitedBy.name}. ` : ""}
                Joining lets the team see and manage your listings and rental bookings. You can leave later.
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <button type="button" onClick={() => answer(invite, "decline")} disabled={busy === invite._id}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
              <X size={14} /> Decline
            </button>
            <button type="button" onClick={() => answer(invite, "accept")} disabled={busy === invite._id}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">
              <Check size={14} /> {busy === invite._id ? "Joining…" : "Accept"}
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
