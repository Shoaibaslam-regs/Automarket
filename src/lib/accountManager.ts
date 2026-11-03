// Server-only. Dedicated support (PLAN_FEATURES.dedicatedSupport, Ultimate): a full admin or manager picks an account
// manager for a business (Organization.accountManagerId, Admin → Businesses). While the business is on a plan with
// Dedicated support and that person is still an admin, every conversation its team starts with AutoGO Support is
// taken by them (SupportThread.takenBy), the inbox says "Dedicated · <name>", and Help & support names them.
import mongoose from "mongoose";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { SupportThread } from "@/models/SupportThread";
import { effectivePlanId, planHas, type PlanId } from "@/lib/plans";
import { reportError } from "@/lib/errorLog";

type Oid = mongoose.Types.ObjectId;
export type AccountManager = { _id: string; name?: string; email: string };

/**
 * For each person: whether their business's plan includes Dedicated support, and its account manager when one is
 * set and still an admin. People without a business, or on another plan, are left out.
 */
export async function accountManagersFor(userIds: string[]): Promise<Map<string, { manager: AccountManager | null }>> {
  const out = new Map<string, { manager: AccountManager | null }>();
  const users = await User.find({ _id: { $in: userIds }, organizationId: { $exists: true } }).select("organizationId").lean<Array<{ _id: Oid; organizationId?: Oid }>>();
  if (!users.length) return out;
  const orgs = await Organization.find({ _id: { $in: users.map(u => u.organizationId) } })
    .select("ownerId accountManagerId").lean<Array<{ _id: Oid; ownerId: Oid; accountManagerId?: Oid }>>();
  const people = await User.find({ _id: { $in: [...orgs.map(o => o.ownerId), ...orgs.map(o => o.accountManagerId).filter(Boolean)] } })
    .select("name email role plan planExpiresAt").lean<Array<{ _id: Oid; name?: string; email: string; role?: string; plan?: string; planExpiresAt?: Date }>>();
  const byId = new Map(people.map(p => [String(p._id), p]));
  const orgById = new Map(orgs.map(o => [String(o._id), o]));
  for (const u of users) {
    const org = orgById.get(String(u.organizationId));
    const owner = org && byId.get(String(org.ownerId));
    const plan: PlanId = effectivePlanId(owner?.plan, owner?.planExpiresAt);
    if (!org || !planHas(plan, "dedicatedSupport")) continue;
    const m = org.accountManagerId ? byId.get(String(org.accountManagerId)) : undefined;
    out.set(String(u._id), { manager: m && m.role === "ADMIN" ? { _id: String(m._id), name: m.name, email: m.email } : null });
  }
  return out;
}

/**
 * Called when someone writes to AutoGO Support: a Dedicated support business's message goes to its account manager,
 * unless another admin has already taken the conversation. Never throws.
 */
export async function routeToAccountManager(userId: string): Promise<AccountManager | null> {
  try {
    const manager = (await accountManagersFor([userId])).get(userId)?.manager ?? null;
    if (!manager) return null;
    await SupportThread.updateOne(
      { userId, $or: [{ takenBy: { $exists: false } }, { takenBy: null }] },
      { $set: { takenBy: new mongoose.Types.ObjectId(manager._id), takenAt: new Date() } }
    );
    // A first message has no thread yet
    await SupportThread.updateOne({ userId }, { $setOnInsert: { takenBy: new mongoose.Types.ObjectId(manager._id), takenAt: new Date() } }, { upsert: true });
    return manager;
  } catch (e) {
    reportError("Account manager routing failed:", e);
    return null;
  }
}
