"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, BellOff, Check, Plus } from "lucide-react";
import SignInLink from "@/components/auth/SignInLink";
import { toast } from "@/lib/toast";

type State = { viewer: "anon" | "user" | "member"; following: boolean; muted: boolean };

/**
 * Follow a shop from its page (POST /api/businesses/[slug]/follow). The page is cached for everyone, so who is
 * looking is asked here: guests get "Follow" that signs them in and brings them back, the shop's own team sees
 * nothing, followers see "Following" (tap to unfollow) with a bell to mute or unmute the shop's notifications.
 * Made for the shop page's dark hero; `className` sizes it (full width on phones).
 */
export default function FollowShopButton({ slug, name, className = "" }: { slug: string; name: string; className?: string }) {
  const { status } = useSession();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/businesses/${slug}/follow`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setState({ viewer: d.viewer, following: !!d.following, muted: !!d.muted }))
      .catch(() => {});
  }, [slug, status]);

  const base = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-60";
  const primary = `${base} bg-white text-slate-950 hover:bg-slate-100`;

  if (status === "unauthenticated") {
    return <SignInLink className={`${primary} ${className}`}><Plus size={16} /> Follow</SignInLink>;
  }
  if (status === "loading" || !state) {
    return <span aria-hidden className={`${base} ${className} h-10 w-28 animate-pulse bg-white/10`} />;
  }
  if (state.viewer === "member") return null;

  async function act(action: "follow" | "unfollow" | "mute" | "unmute") {
    setBusy(true);
    const res = await fetch(`/api/businesses/${slug}/follow`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { toast(d.error || "Couldn't change it right now", { tone: "removed" }); return; }
    setState(s => s && { ...s, following: !!d.following, muted: !!d.muted });
    const text = {
      follow: `Following ${name}. Their new deals and announcements will reach you.`,
      unfollow: `Unfollowed ${name}`,
      mute: `Muted ${name}. You'll still see the shop in Saved.`,
      unmute: `${name} can notify you again`,
    }[action];
    toast(text, { tone: action === "unfollow" || action === "mute" ? "removed" : "saved", action: action === "follow" ? { label: "Your shops", href: "/saved#shops" } : undefined });
  }

  if (!state.following) {
    return (
      <button type="button" onClick={() => act("follow")} disabled={busy} className={`${primary} ${className}`}>
        <Plus size={16} /> Follow
      </button>
    );
  }
  return (
    <span className={`inline-flex gap-2 ${className}`}>
      <button type="button" onClick={() => act("unfollow")} disabled={busy} title="Tap to unfollow"
        className={`${base} flex-1 bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/15`}>
        <Check size={16} /> Following
      </button>
      <button type="button" onClick={() => act(state.muted ? "unmute" : "mute")} disabled={busy}
        aria-label={state.muted ? `Unmute ${name}` : `Mute ${name}`} aria-pressed={state.muted}
        title={state.muted ? "Notifications off. Tap to turn them on" : "Notifications on. Tap to mute"}
        className={`${base} w-10 !px-0 bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/15`}>
        {state.muted ? <BellOff size={16} /> : <Bell size={16} />}
      </button>
    </span>
  );
}
