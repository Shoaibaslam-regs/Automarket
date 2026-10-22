import mongoose from "mongoose";
import { BusinessLog, type BusinessLogTarget } from "@/models/BusinessLog";
import { User } from "@/models/User";
import { reportError } from "@/lib/errorLog";

type Oid = mongoose.Types.ObjectId;
const asId = (v: unknown) => (v && mongoose.Types.ObjectId.isValid(String(v)) ? new mongoose.Types.ObjectId(String(v)) : undefined);

/**
 * Records a business team member's action for the owner's Activity tab and the Performance numbers.
 * Pass the member's organization, or leave it out to look it up (skipped for people not in a business).
 * Never throws: a failed log write must not block the action itself.
 */
export async function logBusinessAction(
  who: { userId: unknown; organizationId?: unknown },
  action: string,
  target: { type: BusinessLogTarget; id?: unknown; label?: string },
  extra: { details?: string; amount?: number } = {}
): Promise<void> {
  try {
    const userId = asId(who.userId);
    if (!userId) return;
    const user = await User.findById(userId).select("name email organizationId").lean<{ name?: string; email: string; organizationId?: Oid }>();
    const organizationId = asId(who.organizationId) ?? user?.organizationId;
    if (!user || !organizationId) return;
    await BusinessLog.create({
      organizationId,
      userId,
      userName: user.name || user.email,
      action,
      targetType: target.type,
      targetId: asId(target.id),
      targetLabel: target.label?.slice(0, 200),
      details: extra.details?.slice(0, 500),
      amount: Number.isFinite(extra.amount) ? Math.round(extra.amount!) : undefined,
    });
  } catch (e) {
    reportError(`Business log write failed (${action}):`, e);
  }
}
