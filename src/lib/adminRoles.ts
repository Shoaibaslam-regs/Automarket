// Admin access levels and what each may do. Client-safe and unit-tested; requireAdminApi (src/lib/adminAuth.ts)
// enforces the same rules on the server, and the admin pages hide what an admin can't do.
//
// FULL admins can do everything except the platform owner's own powers (deleting activity history, changing the
// shared access key). MANAGERs run the day-to-day work: plans and premiums, Verified badges, warning and suspending
// businesses, reports, ad requests and announcements, and they can see every page. They can't make or remove admins,
// delete users, take down listings or deals, or change the payment and site settings.

export type AdminAccess = "FULL" | "MANAGER";

export type AdminPermission =
  | "admins" // make someone an admin, change or remove an admin's access
  | "users" // delete user accounts
  | "listings" // take listings down or feature them
  | "deals" // switch deals off
  | "settings" // payment details and site settings
  | "plans" // activate, gift or revoke plans; plan lookup
  | "badges" // Verified badge requests
  | "businesses" // warn, suspend and reinstate businesses
  | "reports" // close reports
  | "ads" // sponsored ad requests
  | "announcements"; // AutoGO Official posts

const MANAGER_CAN: ReadonlySet<AdminPermission> = new Set(["plans", "badges", "businesses", "reports", "ads", "announcements"]);

/** Older accounts were FULL or READ_ONLY (view-only, since replaced by MANAGER); a missing value means FULL. */
export function normalizeAdminAccess(value?: string | null): AdminAccess {
  return value === "MANAGER" || value === "READ_ONLY" ? "MANAGER" : "FULL";
}

export function adminCan(access: AdminAccess | null | undefined, permission: AdminPermission): boolean {
  if (!access) return false;
  return access === "FULL" || MANAGER_CAN.has(permission);
}

export const ADMIN_ACCESS_LABEL: Record<AdminAccess, string> = { FULL: "Full admin", MANAGER: "Manager" };

export const ADMIN_ACCESS_HINT: Record<AdminAccess, string> = {
  FULL: "Everything, including making admins, deleting users and the site settings.",
  MANAGER: "Plans, Verified badges, suspending businesses, reports, ad requests and announcements. Can't make admins or delete history.",
};
