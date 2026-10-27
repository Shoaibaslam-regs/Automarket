// Which tick an AutoGO team member gets beside their name. Client-safe and unit-tested.
//
// Admins with full access show a blue tick, view-only admins a grey one, everyone else none. It is read from the
// account's role (set only by admins), so a name like "AutoGO Support" without the tick isn't the team.

export type AdminBadgeKind = "full" | "view";

export function adminBadgeKind(user?: { role?: string | null; adminAccess?: string | null } | null): AdminBadgeKind | null {
  if (user?.role !== "ADMIN") return null;
  // A missing access level means full access (User.adminAccess)
  return user.adminAccess === "READ_ONLY" ? "view" : "full";
}

export const ADMIN_BADGE_TITLE: Record<AdminBadgeKind, string> = {
  full: "AutoGO team: admin",
  view: "AutoGO team: view-only admin",
};
