// Client-safe: Priority support (PLAN_FEATURES.prioritySupport, Premium Plus and up). Conversations from people on
// those plans are marked Priority in Admin → Support and listed first while they wait, and the team aims to answer
// them within PRIORITY_REPLY_HOURS.
import { planHas, type PlanId } from "@/lib/plans";

/** The reply time the team aims for on Priority conversations (shown to the business and to admins). */
export const PRIORITY_REPLY_HOURS = 4;

export function isPrioritySupport(planId: PlanId): boolean {
  return planHas(planId, "prioritySupport");
}

/** Waiting longer than the target: a Priority conversation the person wrote in more than PRIORITY_REPLY_HOURS ago. */
export function priorityOverdue(waitingSince: Date | string | null | undefined, now = new Date()): boolean {
  if (!waitingSince) return false;
  return now.getTime() - new Date(waitingSince).getTime() > PRIORITY_REPLY_HOURS * 3_600_000;
}

/**
 * Inbox order: open Priority conversations first (the one waiting longest on top, so the oldest promise is kept),
 * then everything else newest first, as before.
 */
export function sortInbox<T extends { open: boolean; priority: boolean; lastAt: Date | string; waitingSince: Date | string | null }>(rows: T[]): T[] {
  const t = (d: Date | string | null) => (d ? new Date(d).getTime() : 0);
  const urgent = (r: T) => r.open && r.priority;
  return [...rows].sort((a, b) => {
    if (urgent(a) !== urgent(b)) return urgent(a) ? -1 : 1;
    if (urgent(a)) return t(a.waitingSince) - t(b.waitingSince);
    return t(b.lastAt) - t(a.lastAt);
  });
}

/** "45 min", "3 h", "2 days": how long someone has been waiting. */
export function waitingFor(since: Date | string, now = new Date()): string {
  const min = Math.max(1, Math.round((now.getTime() - new Date(since).getTime()) / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h`;
  return `${Math.round(h / 24)} days`;
}
