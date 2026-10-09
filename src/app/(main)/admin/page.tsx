"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, Building2, Calendar, Car, CircleCheck, Crown, Flag, Gift, KeyRound, Store, Undo2, Users, Wallet } from "lucide-react";
import PlanGiftDialog, { fmtPlanDate } from "@/components/admin/PlanGiftDialog";
import { useAdminAccess } from "@/components/admin/AdminAccess";
import { planInfo, type PlanId } from "@/lib/plans";
import {
  Badge,
  ConfirmDialog,
  CopyId,
  DataTable,
  PageHeader,
  Panel,
  Segmented,
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
  type: string;
  plan: PlanId;
  planExpiresAt?: string | null;
  planSource?: "PAID" | "ADMIN_GRANT" | null;
  city: string;
  isActive: boolean;
  staffCount: number;
  vehicleCount: number;
  createdAt: string;
  ownerId: { _id: string; name?: string; email: string };
};

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
  async function giftPlan(plan: PlanId, months: number | null) {
    const org = giftFor;
    if (!org?.ownerId?._id) return;
    const res = await fetch(`/api/admin/users/${org.ownerId._id}/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, months }),
    });
    const data = await res.json().catch(() => ({}));
    setNotice(res.ok ? { ok: true, text: `${org.name} now has ${planInfo(plan).name} for free.` } : { ok: false, text: data.error || "Failed to gift plan" });
    setGiftFor(null);
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
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200/70">
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
          <StatGrid>
            <StatCard label="Total businesses" value={organizations.length} icon={Building2} tone="neutral" />
            <StatCard label="Active" value={organizations.filter(o => o.isActive).length} icon={CircleCheck} tone="green" />
            <StatCard label="Premium plans" value={organizations.filter(o => o.plan === "STARTER" || o.plan === "PRO").length} icon={Briefcase} tone="blue" />
            <StatCard label="Unlimited plan" value={organizations.filter(o => o.plan === "UNLIMITED").length} icon={Briefcase} tone="amber" />
            <StatCard label="Dealers" value={organizations.filter(o => o.type === "DEALER" || o.type === "BOTH").length} icon={Store} tone="violet" />
            <StatCard label="Rental co." value={organizations.filter(o => o.type === "RENTAL" || o.type === "BOTH").length} icon={KeyRound} tone="orange" />
          </StatGrid>

          <DataTable
            rows={organizations}
            rowKey={o => o._id}
            cols="md:grid-cols-[minmax(0,2.1fr)_minmax(0,1.9fr)_minmax(0,0.8fr)_minmax(0,1.1fr)_64px_56px_150px]"
            empty="No businesses registered yet"
            columns={[
              {
                header: "Business",
                cell: org => (
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-500 text-sm font-bold text-white">
                      {org.name[0]}
                    </span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{org.name}</p>
                        {!org.isActive && <Badge tone="red">Inactive</Badge>}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <CopyId id={org._id} />
                        <span className="truncate text-xs text-slate-500">{org.city}</span>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                header: "Owner",
                full: true,
                cell: org => (
                  <UserCell size={30} name={org.ownerId?.name || "Unknown"} email={org.ownerId?.email} meta={<CopyId id={org.ownerId?._id} />} />
                ),
              },
              { header: "Type", cell: org => <Badge tone="neutral">{org.type}</Badge> },
              {
                header: "Plan",
                cell: org => {
                  const plan = planInfo(org.plan);
                  return (
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold" style={{ color: plan.accent }}>
                        {org.plan !== "FREE" && <Crown size={13} />}
                        {plan.name}
                        {org.planSource === "ADMIN_GRANT" && org.plan !== "FREE" && <Gift size={12} className="text-violet-500" aria-label="Gifted by an admin" />}
                      </p>
                      {org.plan !== "FREE" && (
                        <p className="truncate text-xs text-slate-400">{org.planExpiresAt ? `until ${fmtPlanDate(org.planExpiresAt)}` : "no end date"}</p>
                      )}
                    </div>
                  );
                },
              },
              { header: "Vehicles", align: "right", cell: org => <p className="text-sm font-semibold tabular-nums text-slate-900">{org.vehicleCount}</p> },
              { header: "Staff", align: "right", cell: org => <p className="text-sm font-semibold tabular-nums text-slate-900">{org.staffCount}</p> },
              {
                header: "Actions",
                full: true,
                hideLabel: true,
                align: "right",
                cell: org =>
                  !canWrite ? (
                    <p className="text-xs text-slate-400 md:text-right">View only</p>
                  ) : !org.ownerId?._id ? (
                    <p className="text-xs text-slate-400 md:text-right">No owner</p>
                  ) : (
                    <div className="flex gap-1.5 md:justify-end">
                      <button onClick={() => setGiftFor(org)} className={`${btn.base} ${btn.secondary} flex-1 md:flex-none`} title="Gift a plan">
                        <Gift size={13} /> Gift plan
                      </button>
                      {org.planSource === "ADMIN_GRANT" && org.plan !== "FREE" && (
                        <button onClick={() => setRevokeFor(org)} aria-label="Revoke gifted plan" title="Revoke gifted plan" className={`${btn.base} ${btn.danger}`}>
                          <Undo2 size={13} />
                        </button>
                      )}
                    </div>
                  ),
              },
            ]}
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
