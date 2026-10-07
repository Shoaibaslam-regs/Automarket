import mongoose from "mongoose";
import { User } from "@/models/User";
import { Employee } from "@/models/Employee";

/** User ids of everyone employed by an organization (owner included). */
export async function getOrgUserIds(orgId: unknown): Promise<mongoose.Types.ObjectId[]> {
  const employees = await Employee.find({ organizationId: orgId }).select("userId").lean<{ userId: mongoose.Types.ObjectId }[]>();
  return employees.map(e => e.userId);
}

/**
 * The sellers whose listings make up the current user's business inventory:
 * every member of their organization, or just themselves when they have no organization.
 * The user's own id is always included so their listings never disappear from their inventory.
 */
export async function getInventorySellerIds(userId: string): Promise<mongoose.Types.ObjectId[]> {
  const own = new mongoose.Types.ObjectId(userId);
  const user = await User.findById(userId).select("organizationId").lean<{ organizationId?: mongoose.Types.ObjectId }>();
  if (!user?.organizationId) return [own];
  const members = await getOrgUserIds(user.organizationId);
  return members.some(id => id.equals(own)) ? members : [...members, own];
}
