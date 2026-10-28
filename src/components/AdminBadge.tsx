import { BadgeCheck } from "lucide-react";
import { ADMIN_BADGE_TITLE, adminBadgeKind } from "@/lib/adminBadge";

/**
 * The AutoGO team tick beside a name: blue for full admins, grey for managers, nothing for anyone else.
 * Pass the person's `role` and `adminAccess` (or nothing renders). Business Verified ticks are `VerifiedBadge`.
 */
export default function AdminBadge({
  user,
  size = 14,
  className = "",
}: {
  user?: { role?: string | null; adminAccess?: string | null; isSupportAccount?: boolean | null } | null;
  size?: number;
  className?: string;
}) {
  const kind = adminBadgeKind(user);
  if (!kind) return null;
  return (
    <span title={ADMIN_BADGE_TITLE[kind]} aria-label={ADMIN_BADGE_TITLE[kind]} role="img" className={`inline-flex flex-shrink-0 ${className}`}>
      {/* theme-static keeps the white tick white in dark mode */}
      <BadgeCheck size={size} aria-hidden className={`theme-static ${kind === "full" ? "fill-blue-600" : "fill-slate-400"} text-white`} />
    </span>
  );
}
