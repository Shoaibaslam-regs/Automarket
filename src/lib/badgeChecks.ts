// Client-safe: what an admin looks at before approving a Verified badge (Admin → Businesses or Requests →
// Badge, components/admin/VerifyBadgeDialog.tsx). The facts come from GET /api/admin/organizations/[id]/checks.
// The checks guide the admin; they don't block approving.

export type BadgeFacts = {
  phone: boolean; address: boolean; city: boolean; logo: boolean; description: boolean;
  liveListings: number; liveDeals: number; openReports: number; ageDays: number;
};
export type BadgeCheck = { label: string; ok: boolean; detail?: string };

/** A business at least this many days old has had time to show it is real. */
export const BADGE_MIN_AGE_DAYS = 7;

export function badgeChecks(f: BadgeFacts): BadgeCheck[] {
  const live = f.liveListings + f.liveDeals;
  return [
    { label: "Business phone added", ok: f.phone, detail: "Call it to confirm the business answers" },
    { label: "Address and city added", ok: f.address && f.city },
    { label: "Logo added", ok: f.logo },
    { label: "Description written", ok: f.description },
    { label: "Has live vehicles or deals", ok: live > 0, detail: live > 0 ? `${f.liveListings} vehicle${f.liveListings === 1 ? "" : "s"}, ${f.liveDeals} deal${f.liveDeals === 1 ? "" : "s"}` : undefined },
    { label: "No open reports", ok: f.openReports === 0, detail: f.openReports ? `${f.openReports} open in Admin → Reports` : undefined },
    { label: `On AutoGO for ${BADGE_MIN_AGE_DAYS} days or more`, ok: f.ageDays >= BADGE_MIN_AGE_DAYS, detail: `${f.ageDays} day${f.ageDays === 1 ? "" : "s"}` },
  ];
}
