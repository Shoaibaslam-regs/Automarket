"use client";

import WhatsAppIcon from "@/components/ui/WhatsAppIcon";
import SignInLink from "@/components/auth/SignInLink";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BadgeCheck, Building2, CalendarClock, Check, Clock3, Gift, MessageSquare, XCircle } from "lucide-react";
import VerifiedBadge from "@/components/VerifiedBadge";
import { VERIFIED_BADGE, type BadgeState, type BadgeVerification } from "@/lib/plans";
import { badgeRequestText, whatsappLink } from "@/lib/supportContact";
import { useRateLock } from "@/hooks/useRateLock";
import PaymentDetailsCard from "@/components/subscription/PaymentDetailsCard";

type Status = {
  business: { id: string; name: string; slug: string } | null;
  suspended?: boolean;
  isOwner?: boolean;
  supportUserId?: string | null;
  state?: BadgeState;
  verification?: BadgeVerification;
};

const fmt = (d: Date | string) => new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });

/**
 * The Verified badge add-on on the pricing page. Business owners request it here; an admin approves it
 * from the Businesses tab once paid (or gifts it), the same way paid plans are activated.
 */
export default function VerifiedBadgeOffer() {
  const { data: session, status: authStatus } = useSession();
  const [status, setStatus] = useState<Status | null>(null);
  const supLock = useRateLock("support");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [supportUserId, setSupportUserId] = useState<string | null>(null);

  const load = () =>
    fetch("/api/business/verification")
      .then(r => (r.ok ? r.json() : null))
      .then(d => setStatus(d))
      .catch(() => setStatus(null));

  useEffect(() => {
    if (authStatus === "authenticated") load();
  }, [authStatus]);

  async function request() {
    setSending(true);
    setError("");
    const res = await fetch("/api/business/verification", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    supLock.check(res, data);
    if (!res.ok) { setError(data.error || "Couldn't send your request. Please try again."); return; }
    setSupportUserId(data.supportUserId);
    load();
  }

  const v = status?.verification;
  const pending = !!v?.requestedAt;
  const chatWith = supportUserId ?? status?.supportUserId;
  const wa = status?.business
    ? whatsappLink(badgeRequestText(status.business.name, VERIFIED_BADGE.price, { id: session?.user?.id, email: session?.user?.email, business: status.business }))
    : null;

  let action: React.ReactNode;
  if (authStatus !== "authenticated") {
    action = authStatus === "loading" ? null : (
      <SignInLink className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
        Sign in to get verified
      </SignInLink>
    );
  } else if (!status) {
    action = <div className="h-12 animate-pulse rounded-xl bg-slate-100" />;
  } else if (!status.business) {
    action = status.suspended ? (
      <Note icon={XCircle} tone="rose">Your business is suspended, so it can&apos;t be verified right now. Contact the team from Help &amp; support.</Note>
    ) : (
      <>
        <Note icon={Building2}>The Verified badge is for businesses. Set up your dealership or rental company first; it&apos;s free.</Note>
        <Link href="/business/onboarding" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
          <Building2 size={16} /> Set up a business
        </Link>
      </>
    );
  } else {
    const verified = status.state === "VERIFIED";
    // Ultimate includes the badge (source PLAN): nothing to request while the plan runs
    const included = verified && v?.source === "PLAN";
    action = (
      <>
        {verified && v && (
          <Note icon={BadgeCheck} tone="sky">
            <strong className="font-semibold">{status.business.name}</strong> is verified
            {v.expiresAt ? ` until ${fmt(v.expiresAt)}` : ""}.{v.source === "ADMIN_GRANT" && <> <Gift size={12} className="inline" /> Complimentary.</>}{included && <> Included with your Ultimate plan, so there&apos;s nothing to pay.</>}
          </Note>
        )}
        {!verified && status.state === "EXPIRED" && v?.expiresAt && (
          <Note icon={CalendarClock} tone="amber">Your badge ended on {fmt(v.expiresAt)}. Request it again to bring it back.</Note>
        )}
        {pending && v?.requestedAt && (
          <>
            <Note icon={Clock3} tone="amber">
              Request sent on {fmt(v.requestedAt)}. Pay to the account below and send the receipt in Messages; the team checks your business and turns the badge on.
            </Note>
            <PaymentDetailsCard compact className="mt-3" amount={{ label: VERIFIED_BADGE.name, price: VERIFIED_BADGE.price, period: "one month" }} />
          </>
        )}
        {!pending && v?.rejectedAt && !verified && (
          <Note icon={XCircle} tone="rose">Your last request wasn&apos;t approved{v.rejectionReason ? `: ${v.rejectionReason}` : ""}.</Note>
        )}

        {included ? null : !status.isOwner ? (
          <p className="mt-3 text-xs text-slate-500">Only the business owner can request the badge.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {pending ? (
              <Link href={`/messages${chatWith ? `?with=${chatWith}` : ""}`} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                <MessageSquare size={16} /> Open Messages
              </Link>
            ) : (
              <button type="button" onClick={request} disabled={sending || supLock.locked} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                <BadgeCheck size={16} /> {supLock.locked ? supLock.text : sending ? "Sending request…" : verified ? "Request renewal" : "Request Verified badge"}
              </button>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1ebe5b]">
                <WhatsAppIcon size={16} /> WhatsApp us
              </a>
            )}
          </div>
        )}
        {error && <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>}
      </>
    );
  }

  return (
    <section id="verified" className="mt-12 scroll-mt-24 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200/80 shadow-sm">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {status?.business ? (
              // The signed-in user's own business: its name, and the tick only once an admin has approved the badge
              // and it hasn't ended (state from badgeState/isVerified). Pending or expired badges show the name alone.
              <>
                <span className="min-w-0 max-w-full truncate text-sm font-semibold text-slate-900">{status.business.name}</span>
                {status.state === "VERIFIED" && <VerifiedBadge />}
              </>
            ) : (
              <>
                <span className="text-sm text-slate-500">For businesses, as an add-on</span>
                <VerifiedBadge />
              </>
            )}
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{VERIFIED_BADGE.name}</h2>
          <p className="mt-1 max-w-[520px] text-sm leading-relaxed text-slate-500">
            Show buyers your business is real. The AutoGO team checks your business details, then a blue tick appears next to your name across AutoGO.
          </p>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-slate-500">PKR</span>
            <span className="text-4xl font-bold tracking-tight tabular-nums text-slate-900">{VERIFIED_BADGE.price.toLocaleString()}</span>
            <span className="text-sm text-slate-500">/ month</span>
          </div>
          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {VERIFIED_BADGE.features.map(f => (
              <li key={f} className="flex items-start gap-2.5 text-[13px] text-slate-600">
                <Check size={15} strokeWidth={2.5} className="mt-0.5 flex-shrink-0 text-sky-600" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/70 p-6 sm:p-8 lg:border-l lg:border-t-0">
          <h3 className="text-sm font-semibold text-slate-900">How it works</h3>
          <ol className="mt-3 space-y-2 text-[13px] text-slate-600">
            <li><span className="font-semibold text-slate-900">1.</span> The business owner sends a request.</li>
            <li><span className="font-semibold text-slate-900">2.</span> Pay to the account shown and send the receipt in Messages.</li>
            <li><span className="font-semibold text-slate-900">3.</span> The team checks your business (phone, address, live vehicles, reports), then your tick goes live.</li>
          </ol>
          <div className="mt-5">{action}</div>
        </div>
      </div>
    </section>
  );
}

const NOTE_TONES = {
  slate: "bg-white text-slate-600 ring-slate-200",
  sky: "bg-sky-50 text-sky-800 ring-sky-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
};

function Note({ icon: Icon, tone = "slate", children }: { icon: typeof Check; tone?: keyof typeof NOTE_TONES; children: React.ReactNode }) {
  return (
    <p className={`mt-2 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[13px] leading-snug ring-1 ring-inset first:mt-0 ${NOTE_TONES[tone]}`}>
      <Icon size={15} className="mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </p>
  );
}
