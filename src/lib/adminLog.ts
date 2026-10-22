import mongoose from "mongoose";
import { AdminLog, type AdminLogTarget } from "@/models/AdminLog";
import { User } from "@/models/User";
import { reportError } from "@/lib/errorLog";

type Admin = { _id: mongoose.Types.ObjectId; email: string };

/**
 * Records an admin action. Never throws: a failed log write must not undo or block the action itself.
 *   await logAdminAction(gate.admin, "business.suspend", { type: "BUSINESS", id: org._id, label: org.name }, reason);
 */
export async function logAdminAction(
  admin: Admin,
  action: string,
  target: { type: AdminLogTarget; id?: unknown; label?: string },
  details?: string
): Promise<void> {
  try {
    const name = (await User.findById(admin._id).select("name").lean<{ name?: string }>())?.name;
    const targetId = target.id && mongoose.Types.ObjectId.isValid(String(target.id)) ? new mongoose.Types.ObjectId(String(target.id)) : undefined;
    await AdminLog.create({
      adminId: admin._id,
      adminEmail: admin.email,
      adminName: name,
      action,
      targetType: target.type,
      targetId,
      targetLabel: target.label?.slice(0, 200),
      details: details?.slice(0, 500),
    });
  } catch (e) {
    reportError(`Admin log write failed (${action}):`, e);
  }
}
