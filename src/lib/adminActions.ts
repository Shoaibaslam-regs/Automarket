// Client-safe names for admin log actions (written by logAdminAction in src/lib/adminLog.ts).

/** Plain-English names for logged actions, used by /admin/activity. */
export const ADMIN_ACTION_LABEL: Record<string, string> = {
  "user.role": "Changed role",
  "user.delete": "Deleted account",
  "user.plan": "Changed plan",
  "user.planRevoke": "Revoked plan",
  "user.makeAdmin": "Made admin (setup secret)",
  "business.warn": "Warned business",
  "business.suspend": "Suspended business",
  "business.reinstate": "Reinstated business",
  "business.verify": "Granted Verified badge",
  "business.rejectVerification": "Refused Verified badge",
  "business.unverify": "Removed Verified badge",
  "listing.update": "Edited listing",
  "listing.delete": "Deleted listing",
  "deal.disable": "Switched deal off",
  "deal.enable": "Switched deal back on",
  "deal.delete": "Deleted deal",
  "report.resolve": "Resolved report",
  "report.dismiss": "Dismissed report",
};
