import { Employee } from "@/models/Employee";
import { User } from "@/models/User";
import { can, type BusinessPermission, type BusinessRole } from "@/lib/businessPermissions";
import { triggerPusher } from "@/lib/support";
import { reportError } from "@/lib/errorLog";

type EventData = Record<string, unknown>;

/**
 * Notifies every member of a business whose role handles this kind of request (badge refresh plus a phone
 * alert through triggerPusher), for example all booking managers for a new booking request.
 * `skip` leaves out people already told another way (such as the seller who got a chat message). Never throws.
 */
export async function notifyTeam(organizationId: unknown, permission: BusinessPermission, data: EventData, skip: string[] = []) {
  try {
    const members = await Employee.find({ organizationId }).select("userId role").lean<Array<{ userId: unknown; role: BusinessRole }>>();
    const ids = [...new Set(members.filter(m => can(m.role, permission)).map(m => String(m.userId)))].filter(id => !skip.includes(id));
    await Promise.all(ids.map(id => triggerPusher(`user-${id}`, "new-notification", data)));
  } catch (e) {
    reportError("Team notification failed:", e);
  }
}

/** The business a user belongs to, if any (for vehicles listed by a member). */
export async function organizationOf(userId: unknown): Promise<unknown | null> {
  const u = await User.findById(userId).select("organizationId").lean<{ organizationId?: unknown }>();
  return u?.organizationId ?? null;
}
