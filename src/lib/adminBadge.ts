// Which tick an AutoGO team member gets beside their name. Client-safe and unit-tested.
//
// Full admins show a blue tick, managers (and the old view-only level) a grey one, everyone else none. It is read from the
// account's role (set only by admins), so a name like "AutoGO Support" without the tick isn't the team.

import { normalizeAdminAccess } from "@/lib/adminRoles";

export type AdminBadgeKind = "full" | "manager";

export function adminBadgeKind(user?: { role?: string | null; adminAccess?: string | null; isSupportAccount?: boolean | null } | null): AdminBadgeKind | null {
  // The shared AutoGO Support account speaks for the whole team
  if (user?.isSupportAccount) return "full";
  if (user?.role !== "ADMIN") return null;
  return normalizeAdminAccess(user.adminAccess) === "MANAGER" ? "manager" : "full";
}

export const ADMIN_BADGE_TITLE: Record<AdminBadgeKind, string> = {
  full: "AutoGO team: admin",
  manager: "AutoGO team: manager",
};
