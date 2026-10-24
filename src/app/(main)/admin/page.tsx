"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BadgeCheck, Ban, Calendar, Car, CircleCheck, Crown, Flag, Gift, MoreHorizontal, ShieldCheck, Store, Undo2, Users, Wallet, type LucideIcon } from "lucide-react";
import PlanGiftDialog, { fmtPlanDate, type PlanSourceChoice } from "@/components/admin/PlanGiftDialog";
import PlanLookup from "@/components/admin/PlanLookup";
import PaymentSettings from "@/components/admin/PaymentSettings";
import AdminKeySettings from "@/components/admin/AdminKeySettings";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { isFreeGrant, isVerified, planInfo, type BadgeVerification, type PlanId, type PlanSource } from "@/lib/plans";
import VerifyBadgeDialog, { type BadgeAction } from "@/components/admin/VerifyBadgeDialog";
import VerifiedBadge from "@/components/VerifiedBadge";
import {
  Badge,
  ConfirmDialog,
  CopyId,
  DataTable,
  PageHeader,
  Panel,
  SearchField,
  Segmented,
  SelectField,
  StatCard,
  StatGrid,
  StatusBadge,
  UserCell,
  btn,
} from "@/components/admin/ui";

type Stats = {
  totalUsers: number;
  totalListings: number;
  activeListings: number;
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  totalRevenue: number;
  platformFee: number;
};

type RecentUser = { _id: string; name: string; email: string; role: string; createdAt: string };
type RecentListing = { _id: string; title: string; make: string; model: string; year: number; price: number; status: string };
type Organization = {
  _id: string;
  name: string;
  /** Public shop page: /dealers/<slug> */
  slug?: string;
  type: string;
  plan: PlanId;
  planExpiresAt?: string | null;
  planSource?: PlanSource | null;
  city: string;
  isActive: boolean;
  suspension?: { reason: string; at: string } | null;
  warnings?: Array<{ reason: string; at: string; acknowledgedAt?: string }>;
  verification?: BadgeVerification | null;
  staffCount: number;
  vehicleCount: number;
  createdAt: string;
  ownerId: { _id: string; name?: string; email: string };
};

const TYPE_NAME: Record<string, string> = { DEALER: "Dealer", RENTAL: "Rental", BOTH: "Dealer + rental" };

type MenuItem = { label: string; icon: LucideIcon; onClick?: () => void; href?: string; tone?: "danger" | "warn"; dot?: boolean };

/**
 * A row's less frequent actions behind a ⋯ button. The menu is fixed-positioned so the table panel's
 * rounded overflow can't clip it; it closes on outside click, Escape, scroll or resize.
 */
function RowMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => {
      if (e instanceof MouseEvent && ref.current?.contains(e.target as Node)) return;
      setPos(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [pos]);

  const dot = items.some(i => i.dot);
  const toneClass = (t?: MenuItem["tone"]) => (t === "danger" ? "text-rose-600 hover:bg-rose-50" : t === "warn" ? "text-amber-700 hover:bg-amber-50" : "text-slate-700 hover:bg-slate-50");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        onClick={e => {
          if (pos) { setPos(null); return; }
          const r = e.currentTarget.getBoundingClientRect();
          const right = Math.max(8, window.innerWidth - r.right);
          // Open upwards when the menu wouldn't fit below the button
          const height = items.length * 38 + 8;
          setPos(r.bottom + 6 + height > window.innerHeight && r.top > height + 6
            ? { bottom: window.innerHeight - r.top + 6, right }
            : { top: r.bottom + 6, right });
        }}
        className={`${btn.base} ${btn.secondary} relative w-9 px-0 ${pos ? "bg-slate-50 ring-slate-300" : ""}`}
      >
        <MoreHorizontal size={15} />
        {dot && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-sky-500 ring-2 ring-white" />}
      </button>
      {pos && (
        <div role="menu" style={{ top: pos.top, bottom: pos.bottom, right: pos.right }} className="fixed z-[60] w-56 overflow-hidden rounded-xl bg-white p-1 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.25)] ring-1 ring-slate-200">
          {items.map(i => {
            const cls = `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition ${toneClass(i.tone)}`;
            const body = <><i.icon size={14} className="flex-shrink-0" /> <span className="flex-1">{i.label}</span>{i.dot && <span className="h-2 w-2 rounded-full bg-sky-500" />}</>;
            return i.href ? (
              <a key={i.label} role="menuitem" href={i.href} target="_blank" rel="noreferrer" onClick={() => setPos(null)} className={cls}>{body}</a>
            ) : (
              <button key={i.label} role="menuitem" type="button" onClick={() => { setPos(null); i.onClick?.(); }} className={cls}>{body}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatPKR(n: number) {
  if (n >= 1_000_000) return `PKR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `PKR ${(n / 1_000).toFixed(0)}K`;
  return `PKR ${n.toLocaleString()}`;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentListings, setRecentListings] = useState<RecentListing[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "businesses">("overview");
  const { canWrite } = useAdminAccess();
  const [giftFor, setGiftFor] = useState<Organization | null>(null);
  const [revokeFor, setRevokeFor] = useState<Organization | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const reloadOrganizations = () =>
    fetch("/api/admin/organizations")
      .then(r => r.json())
      .then(d => setOrganizations(d.organizations || []))
      .catch(() => {});

  // Business plans live on the owner's account, so both actions target the owner's user id
  async function giftPlan(plan: PlanId, months: number, source: PlanSourceChoice) {
    const org = giftFor;
    if (!org?.ownerId?._id) return;
    const res = await fetch(`/api/admin/users/${org.ownerId._id}/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, months, source }),
    });
    const data = await res.json().catch(() => ({}));
    setNotice(res.ok
      ? { ok: true, text: source === "PAID" ? `${org.name} has ${planInfo(plan).name} for 30 days.` : `${org.name} now has ${planInfo(plan).name} for free.` }
      : { ok: false, text: data.error || "Failed to update the plan" });
    setGiftFor(null);
    reloadOrganizations();
  }

  // Businesses tab: search, status filter and suspension
  const [bizSearch, setBizSearch] = useState("");
  const [bizStatus, setBizStatus] = useState("");
  const [suspendFor, setSuspendFor] = useState<Organization | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [reinstateFor, setReinstateFor] = useState<Organization | null>(null);
  const [warnFor, setWarnFor] = useState<Organization | null>(null);
  const [warnReason, setWarnReason] = useState("");
  const [suspending, setSuspending] = useState(false);

  const bq = bizSearch.trim().toLowerCase().replace(/^#/, "");
  const matchesStatus = (o: Organization) =>
    !bizStatus ||
    (bizStatus === "Suspended" ? !o.isActive
      : bizStatus === "Badge requests" ? !!o.verification?.requestedAt
      : bizStatus === "Verified" ? isVerified(o.verification)
      : o.isActive);
  const shownOrgs = organizations.filter(o =>
    (!bq || [o.name, o.city, o.ownerId?.name ?? "", o.ownerId?.email ?? "", o._id, o.ownerId?._id ?? ""].some(v => v.toLowerCase().includes(bq))) &&
    matchesStatus(o)
  );
  const badgeRequests = organizations.filter(o => o.verification?.requestedAt);

  // Verified badge: approve (paid or gift), reject the owner's request, or remove it
  const [badgeFor, setBadgeFor] = useState<Organization | null>(null);
  async function saveBadge(body: BadgeAction) {
    const org = badgeFor;
    if (!org) return;
    const res = await fetch(`/api/admin/organizations/${org._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setNotice({ ok: false, text: data.error || "Failed to update the badge" });
    else if (body.action === "verify") setNotice({ ok: true, text: `${org.name} is verified${data.expiresAt ? ` until ${fmtPlanDate(data.expiresAt)}` : ""}. The owner was told in Messages.` });
    else if (body.action === "rejectVerification") setNotice({ ok: true, text: `${org.name}'s badge request was rejected and the owner was told why.` });
    else setNotice({ ok: true, text: `The Verified badge was removed from ${org.name}.` });
    setBadgeFor(null);
    reloadOrganizations();
  }

  async function changeSuspension(org: Organization, body: { action: "suspend" | "warn"; reason: string } | { action: "reinstate" }) {
    setSuspending(true);
    const res = await fetch(`/api/admin/organizations/${org._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSuspending(false);
    if (!res.ok) {
      setNotice({ ok: false, text: data.error || "Failed to update business" });
    } else if (body.action === "warn") {
      setNotice({ ok: true, text: `${org.name} was warned (${data.warnings} warning${data.warnings === 1 ? "" : "s"} in total). The owner got your message and sees a banner in their console.` });
    } else if (body.action === "suspend") {
      setNotice({ ok: true, text: `${org.name} is suspended. ${data.hiddenListings ?? 0} listing${data.hiddenListings === 1 ? " was" : "s were"} hidden and the owner was notified in Messages.` });
    } else {
      setNotice({ ok: true, text: `${org.name} is reinstated. ${data.restoredListings ?? 0} listing${data.restoredListings === 1 ? " is" : "s are"} live again.` });
    }
    setSuspendFor(null);
    setSuspendReason("");
    setReinstateFor(null);
    setWarnFor(null);
    setWarnReason("");
    reloadOrganizations();
  }

  async function revokePlan() {
    const org = revokeFor;
    if (!org?.ownerId?._id) return;
    setRevoking(true);
    const res = await fetch(`/api/admin/users/${org.ownerId._id}/plan`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setRevoking(false);
    setNotice(res.ok ? { ok: true, text: `${org.name}'s gifted plan was revoked. It's back on Free.` } : { ok: false, text: data.error || "Failed to revoke plan" });
    setRevokeFor(null);
    reloadOrganizations();
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then(r => r.json()),
      fetch("/api/admin/organizations").then(r => r.json()),
    ]).then(([statsData, orgData]) => {
      setStats(statsData.stats);
      setRecentUsers(statsData.recentUsers || []);
      setRecentListings(statsData.recentListings || []);
      setOrganizations(orgData.organizations || []);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Platform health at a glance"
        actions={
          <Segmented
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: "overview", label: "Overview" },
              {
                value: "businesses",
                label: (
                  <>
                    Businesses
                    <span className="rounded-full bg-slate-200 px-1.5 text-[11px] font-semibold text-slate-600">{organizations.length}</span>
                  </>
                ),
              },
            ]}
          />
        }
      />

      {loading ? (
        <StatGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[108px] animate-pulse rounded-2xl border border-slate-200/80 bg-white" />
          ))}
        </StatGrid>
      ) : activeTab === "overview" ? (
        <>
          {stats && (
            <StatGrid>
              <StatCard label="Total users" value={stats.totalUsers.toLocaleString()} icon={Users} tone="blue" />
              <StatCard label="Total listings" value={stats.totalListings.toLocaleString()} icon={Car} tone="violet" />
              <StatCard
                label="Active listings"
                value={stats.activeListings.toLocaleString()}
                icon={CircleCheck}
                tone="green"
                hint={stats.totalListings ? `${Math.round((stats.activeListings / stats.totalListings) * 100)}% of all listings` : undefined}
              />
              <StatCard label="Total bookings" value={stats.totalBookings.toLocaleString()} icon={Calendar} tone="orange" />
              <StatCard label="Completed" value={stats.completedBookings.toLocaleString()} icon={Flag} tone="neutral" />
              <StatCard label="Platform fee" value={formatPKR(stats.platformFee)} icon={Wallet} tone="green" />
            </StatGrid>
          )}

          <PlanLookup />

          <PaymentSettings />

          <AdminKeySettings />

          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            <Panel
              title="Recent users"
              action={
                <Link href="/admin/users" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900">
                  View all <ArrowRight size={13} />
                </Link>
              }
              bodyClassName="divide-y divide-slate-100"
            >
              {recentUsers.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No users yet</p>}
              {recentUsers.length > 0 && (
                <div className="hidden grid-cols-[minmax(0,1fr)_88px_72px] gap-x-4 bg-slate-50/80 px-5 py-2 sm:grid">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">User</p>
                  <p className="text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Joined</p>
                  <p className="text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Role</p>
                </div>
              )}
              {recentUsers.map(user => (
                <div
                  key={user._id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-3 transition-colors hover:bg-slate-50/70 sm:grid-cols-[minmax(0,1fr)_88px_72px] sm:px-5"
                >
                  <UserCell name={user.name} email={user.email} meta={<CopyId id={user._id} />} />
                  <p className="hidden text-right text-xs tabular-nums text-slate-500 sm:block">
                    {new Date(user.createdAt).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                  </p>
                  <div className="flex justify-end">
                    <StatusBadge status={user.role} />
                  </div>
                </div>
              ))}
            </Panel>

            <Panel
              title="Recent listings"
              action={
                <Link href="/admin/listings" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900">
                  View all <ArrowRight size={13} />
                </Link>
              }
              bodyClassName="divide-y divide-slate-100"
            >
              {recentListings.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">No listings yet</p>}
              {recentListings.length > 0 && (
                <div className="hidden grid-cols-[minmax(0,1fr)_112px_72px] gap-x-4 bg-slate-50/80 px-5 py-2 sm:grid">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Listing</p>
                  <p className="text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Price</p>
                  <p className="text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Status</p>
                </div>
              )}
              {recentListings.map(listing => (
                <div
                  key={listing._id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-3 transition-colors hover:bg-slate-50/70 sm:grid-cols-[minmax(0,1fr)_112px_72px] sm:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex flex-shrink-0 items-center justify-center text-slate-500">
                      <Car size={16} />
                    </span>
                    <div className="min-w-0 leading-tight">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{listing.title}</p>
                        <CopyId id={listing._id} />
                      </div>
                      <p className="mt-0.5 truncate text-[13px] text-slate-500">
                        {listing.make} {listing.model} · {listing.year}
                        <span className="font-medium text-slate-700 sm:hidden"> · PKR {listing.price.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                  <p className="hidden text-right text-sm font-semibold tabular-nums text-slate-900 sm:block">
                    PKR {listing.price.toLocaleString()}
                  </p>
                  <div className="flex justify-end">
                    <StatusBadge status={listing.status} />
                  </div>
                </div>
              ))}
            </Panel>
          </div>
        </>
      ) : (
        /* BUSINESSES TAB */
        <>
          {notice && (
            <div
              role={notice.ok ? "status" : "alert"}
              className={`mb-4 rounded-xl px-4 py-3 text-sm ring-1 ring-inset ${notice.ok ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`}
            >
              {notice.text}
            </div>
          )}
          {/* One compact strip instead of seven cards; Active, Suspended and Verified also filter the list */}
          <div className="mb-4 grid grid-cols-4 divide-x divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 sm:grid-cols-7 sm:divide-y-0">
            {[
              { label: "Businesses", value: organizations.length, filter: "" },
              { label: "Active", value: organizations.filter(o => o.isActive).length, filter: "Active", color: "text-emerald-600" },
              { label: "Suspended", value: organizations.filter(o => !o.isActive).length, filter: "Suspended", color: "text-rose-600" },
              // A running badge only: an expired one keeps its verifiedAt, so count with isVerified like the filter does
              { label: "Verified", value: organizations.filter(o => isVerified(o.verification)).length, filter: "Verified", color: "text-sky-600" },
              { label: "Paid plans", value: organizations.filter(o => o.plan !== "FREE").length, color: "text-amber-600" },
              { label: "Dealers", value: organizations.filter(o => o.type === "DEALER" || o.type === "BOTH").length },
              { label: "Rental co.", value: organizations.filter(o => o.type === "RENTAL" || o.type === "BOTH").length },
            ].map(m => {
              const body = (
                <>
                  <span className={`block text-xl font-bold tabular-nums ${m.color ?? "text-slate-900"}`}>{m.value}</span>
                  <span className="block truncate text-[11px] font-medium text-slate-500">{m.label}</span>
                </>
              );
              return m.filter !== undefined ? (
                <button key={m.label} type="button" onClick={() => setBizStatus(m.filter!)} aria-pressed={bizStatus === m.filter}
                  className={`px-3 py-3 text-left transition hover:bg-slate-50 ${bizStatus === m.filter && m.filter ? "bg-slate-50" : ""}`}>{body}</button>
              ) : (
                <div key={m.label} className="px-3 py-3">{body}</div>
              );
            })}
          </div>

          {badgeRequests.length > 0 && bizStatus !== "Badge requests" && (
            <div className="mb-4 flex flex-col gap-3 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800 ring-1 ring-inset ring-sky-200 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2">
                <BadgeCheck size={16} className="flex-shrink-0" />
                {badgeRequests.length === 1 ? `${badgeRequests[0].name} asked` : `${badgeRequests.length} businesses asked`} for the Verified badge.
              </p>
              <button onClick={() => setBizStatus("Badge requests")} className="inline-flex items-center gap-1 self-start rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 transition hover:bg-sky-100 sm:self-auto">
                Review <ArrowRight size={13} />
              </button>
            </div>
          )}

          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {shownOrgs.length === organizations.length ? `${organizations.length} businesses` : `${shownOrgs.length} of ${organizations.length} businesses`}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchField value={bizSearch} onChange={setBizSearch} placeholder="Business, city, owner, email or ID…" />
              <SelectField value={bizStatus} onChange={setBizStatus} options={["Active", "Suspended", "Verified", "Badge requests"]} allLabel="All statuses" ariaLabel="Filter by status" />
            </div>
          </div>

          <DataTable
            rows={shownOrgs}
            rowKey={o => o._id}
            cols="md:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_150px]"
            empty={organizations.length ? "No businesses match your search" : "No businesses registered yet"}
            columns={[
              {
                header: "Business",
                cell: org => {
                  const warnings = org.warnings?.length ?? 0;
                  // One status chip, most important first
                  const chip = !org.isActive ? <Badge tone="red">Suspended</Badge>
                    : org.verification?.requestedAt ? <Badge tone="blue"><BadgeCheck size={10} /> Badge request</Badge>
                    : warnings > 0 ? <span title={`Last warning: ${org.warnings![warnings - 1].reason}`}><Badge tone="amber"><AlertTriangle size={10} /> {warnings} warning{warnings !== 1 ? "s" : ""}</Badge></span>
                    : null;
                  return (
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white">
                        {org.name[0]}
                      </span>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {/* Suspended shops are offline (their page is a 404), so only live ones link */}
                          {org.slug && org.isActive ? (
                            <a href={`/dealers/${org.slug}`} target="_blank" rel="noreferrer" title={`Open ${org.name}'s shop page`}
                              className="truncate text-sm font-semibold text-slate-900 hover:text-indigo-600 hover:underline">{org.name}</a>
                          ) : (
                            <p className="truncate text-sm font-semibold text-slate-900" title={org.name}>{org.name}</p>
                          )}
                          {isVerified(org.verification) && <VerifiedBadge variant="icon" />}
                          {chip}
                        </div>
                        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                          <CopyId id={org._id} />
                          <span className="truncate">{org.city}</span>
                        </div>
                        {!org.isActive && org.suspension?.reason && (
                          <p className="mt-0.5 truncate text-xs text-rose-600" title={org.suspension.reason}>Reason: {org.suspension.reason}</p>
                        )}
                      </div>
                    </div>
                  );
                },
              },
              {
                header: "Owner",
                full: true,
                cell: org => (
                  <UserCell size={30} name={org.ownerId?.name || "Unknown"} email={org.ownerId?.email} meta={<CopyId id={org.ownerId?._id} />} />
                ),
              },
              {
                header: "Plan",
                cell: org => {
                  const plan = planInfo(org.plan);
                  return (
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold" style={{ color: plan.accent }}>
                        {org.plan !== "FREE" && <Crown size={13} />}
                        {plan.name}
                        {isFreeGrant(org.planSource) && org.plan !== "FREE" && <Gift size={12} className="text-violet-500" aria-label={org.planSource === "TRIAL" ? "Free trial" : "Gifted by an admin"} />}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {TYPE_NAME[org.type] ?? org.type}
                        {org.plan !== "FREE" && ` · ${org.planExpiresAt ? `until ${fmtPlanDate(org.planExpiresAt)}` : "no end date"}`}
                      </p>
                    </div>
                  );
                },
              },
              {
                header: "Fleet",
                cell: org => (
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold tabular-nums text-slate-900">{org.vehicleCount}</span> vehicle{org.vehicleCount !== 1 ? "s" : ""}
                    {" · "}
                    <span className="font-semibold tabular-nums text-slate-900">{org.staffCount}</span> staff
                  </p>
                ),
              },
              {
                header: "Actions",
                full: true,
                hideLabel: true,
                align: "right",
                cell: org => {
                  const items: MenuItem[] = [];
                  if (org.slug && org.isActive) items.push({ label: "Open shop page", icon: Store, href: `/dealers/${org.slug}` });
                  if (canWrite && org.ownerId?._id) {
                    items.push({ label: org.verification?.requestedAt ? "Review badge request" : "Verified badge", icon: BadgeCheck, onClick: () => setBadgeFor(org), dot: !!org.verification?.requestedAt });
                    if (isFreeGrant(org.planSource) && org.plan !== "FREE") items.push({ label: "Revoke gifted plan", icon: Undo2, onClick: () => setRevokeFor(org), tone: "danger" });
                    if (org.isActive) items.push({ label: "Send a warning", icon: AlertTriangle, onClick: () => { setWarnReason(""); setWarnFor(org); }, tone: "warn" });
                    items.push(org.isActive
                      ? { label: "Suspend business", icon: Ban, onClick: () => { setSuspendReason(""); setSuspendFor(org); }, tone: "danger" }
                      : { label: "Reinstate business", icon: ShieldCheck, onClick: () => setReinstateFor(org), tone: "warn" });
                  }
                  return (
                    <div className="flex items-center gap-1.5 md:justify-end">
                      {canWrite && org.ownerId?._id ? (
                        <button onClick={() => setGiftFor(org)} className={`${btn.base} ${btn.secondary} flex-1 md:flex-none`} title="Activate a paid plan or gift one">
                          <Gift size={13} /> Plan
                        </button>
                      ) : (
                        <p className="flex-1 text-xs text-slate-400 md:flex-none">{!canWrite ? "View only" : "No owner"}</p>
                      )}
                      {items.length > 0 && <RowMenu items={items} label={`Actions for ${org.name}`} />}
                    </div>
                  );
                },
              },
            ]}
          />

          <ConfirmDialog
            open={warnFor !== null}
            onOpenChange={o => { if (!o) { setWarnFor(null); setWarnReason(""); } }}
            onConfirm={() => {
              if (!warnFor) return;
              if (warnReason.trim().length < 5) { setNotice({ ok: false, text: "Give a reason of at least 5 characters" }); return; }
              changeSuspension(warnFor, { action: "warn", reason: warnReason.trim() });
            }}
            loading={suspending}
            tone="warn"
            icon={AlertTriangle}
            title={`Warn ${warnFor?.name ?? "business"}?`}
            confirmLabel="Send warning"
            loadingLabel="Sending…"
            description={
              <>
                <span className="block">
                  Nothing is hidden or locked. The owner gets your message in Messages and sees an amber warning banner in their console until they acknowledge it.
                  {warnFor && (warnFor.warnings?.length ?? 0) > 0 && <> This will be warning #{warnFor.warnings!.length + 1}.</>}
                </span>
                <span className="mt-3 flex flex-wrap gap-1.5">
                  {["Spam listings", "Misleading prices or photos", "Duplicate listings", "Complaints from buyers", "Slow or no responses to customers"].map(r => (
                    <button key={r} type="button" onClick={() => setWarnReason(r)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${warnReason === r ? "bg-amber-500 text-white ring-amber-500" : "text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>
                      {r}
                    </button>
                  ))}
                </span>
                <textarea
                  value={warnReason}
                  onChange={e => setWarnReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="What should they fix? Shown to the owner…"
                  aria-label="Warning reason"
                  className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />
              </>
            }
          />
          <ConfirmDialog
            open={suspendFor !== null}
            onOpenChange={o => { if (!o) { setSuspendFor(null); setSuspendReason(""); } }}
            onConfirm={() => {
              if (!suspendFor) return;
              if (suspendReason.trim().length < 5) { setNotice({ ok: false, text: "Give a reason of at least 5 characters" }); return; }
              changeSuspension(suspendFor, { action: "suspend", reason: suspendReason.trim() });
            }}
            loading={suspending}
            tone="danger"
            icon={Ban}
            title={`Suspend ${suspendFor?.name ?? "business"}?`}
            confirmLabel="Suspend business"
            loadingLabel="Suspending…"
            description={
              <>
                {suspendFor && (suspendFor.warnings?.length ?? 0) === 0 && (
                  <span className="mb-2 block rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200">
                    This business hasn&apos;t been warned yet. You can send a warning first instead. It&apos;s optional.
                  </span>
                )}
                {suspendFor && (suspendFor.warnings?.length ?? 0) > 0 && (
                  <span className="mb-2 block rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-inset ring-slate-200">
                    Warned {suspendFor.warnings!.length} time{suspendFor.warnings!.length !== 1 ? "s" : ""}, last for: {suspendFor.warnings![suspendFor.warnings!.length - 1].reason}
                  </span>
                )}
                <span className="block">
                  Its live listings are hidden, its public page goes offline and its console is locked except Help &amp; support.
                  The owner gets a message with your reason. Reinstating brings the same listings back.
                </span>
                <span className="mt-3 flex flex-wrap gap-1.5">
                  {["Spam listings", "Fake or misleading vehicles", "Scam reports from buyers", "Abusive behaviour", "Duplicate accounts"].map(r => (
                    <button key={r} type="button" onClick={() => setSuspendReason(r)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${suspendReason === r ? "bg-rose-600 text-white ring-rose-600" : "text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>
                      {r}
                    </button>
                  ))}
                </span>
                <textarea
                  value={suspendReason}
                  onChange={e => setSuspendReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Reason shown to the owner…"
                  aria-label="Suspension reason"
                  className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />
              </>
            }
          />
          <ConfirmDialog
            open={reinstateFor !== null}
            onOpenChange={o => !o && setReinstateFor(null)}
            onConfirm={() => reinstateFor && changeSuspension(reinstateFor, { action: "reinstate" })}
            loading={suspending}
            tone="warn"
            icon={ShieldCheck}
            title={`Reinstate ${reinstateFor?.name ?? "business"}?`}
            confirmLabel="Reinstate business"
            loadingLabel="Reinstating…"
            description={
              <>
                The public page comes back online, the console unlocks, and the listings hidden by the suspension go live again.
                {reinstateFor?.suspension?.reason && <> It was suspended for: <strong className="font-semibold text-slate-900">{reinstateFor.suspension.reason}</strong>.</>}
              </>
            }
          />

          <VerifyBadgeDialog
            target={badgeFor && { name: badgeFor.name, ownerLabel: badgeFor.ownerId?.name || badgeFor.ownerId?.email, verification: badgeFor.verification }}
            onClose={() => setBadgeFor(null)}
            onSave={saveBadge}
          />
          <PlanGiftDialog
            target={giftFor && {
              name: giftFor.name,
              ownerLabel: giftFor.ownerId?.name || giftFor.ownerId?.email,
              effectivePlan: giftFor.plan,
              planExpiresAt: giftFor.planExpiresAt,
            }}
            onClose={() => setGiftFor(null)}
            onSave={giftPlan}
          />
          <ConfirmDialog
            open={revokeFor !== null}
            onOpenChange={o => !o && setRevokeFor(null)}
            onConfirm={revokePlan}
            loading={revoking}
            tone="danger"
            icon={Undo2}
            title={`Revoke ${revokeFor ? planInfo(revokeFor.plan).name : "plan"} from ${revokeFor?.name ?? "this business"}?`}
            description={
              <>
                <strong className="font-semibold text-slate-900">{revokeFor?.name}</strong> and its owner{" "}
                <strong className="font-semibold text-slate-900">{revokeFor?.ownerId?.name || revokeFor?.ownerId?.email}</strong> go back to the
                Free plan straight away. Existing vehicles, staff and customers stay, but the team can&apos;t add more past the Free limits.
              </>
            }
            confirmLabel="Revoke plan"
            loadingLabel="Revoking…"
          />
        </>
      )}
    </>
  );
}
