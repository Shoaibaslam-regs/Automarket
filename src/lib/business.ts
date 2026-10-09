import mongoose from "mongoose";
import { User } from "@/models/User";
import { Employee } from "@/models/Employee";
import { Rental } from "@/models/Rental";

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

export type BusinessRole = "OWNER" | "MANAGER" | "SALES" | "STAFF";

/** What each business role may do; mirrors the role guide on the staff page. */
export const BUSINESS_PERMISSIONS = {
  /** Add, re-role and remove team members */
  manageTeam: ["OWNER", "MANAGER"],
  /** Add customers and update their details or deal status */
  editCustomers: ["OWNER", "MANAGER", "SALES"],
  /** Delete a customer record, and only once its deal is closed */
  deleteCustomers: ["OWNER"],
  /** Create walk-in bookings and move bookings through their statuses */
  manageBookings: ["OWNER", "MANAGER", "SALES"],
} as const satisfies Record<string, readonly BusinessRole[]>;

export type BusinessPermission = keyof typeof BUSINESS_PERMISSIONS;

export function can(role: BusinessRole | null | undefined, permission: BusinessPermission): boolean {
  return !!role && (BUSINESS_PERMISSIONS[permission] as readonly BusinessRole[]).includes(role);
}

/**
 * The user's organization and role, read from their Employee record
 * (the source of truth, rather than the copy on the User document).
 */
export async function getMembership(userId: string): Promise<{ organizationId: mongoose.Types.ObjectId; role: BusinessRole } | null> {
  const user = await User.findById(userId).select("organizationId").lean<{ organizationId?: mongoose.Types.ObjectId }>();
  if (!user?.organizationId) return null;
  const employee = await Employee.findOne({ organizationId: user.organizationId, userId })
    .select("role")
    .lean<{ role: BusinessRole }>();
  if (!employee) return null;
  return { organizationId: user.organizationId, role: employee.role };
}

/**
 * Rental records for every vehicle in the user's business inventory (any member's listings),
 * so the whole team sees and manages the same bookings.
 */
export async function getBusinessRentals(userId: string) {
  const sellerIds = await getInventorySellerIds(userId);
  return Rental.find({ ownerId: { $in: sellerIds } })
    .select("_id listingId ownerId dailyRate weeklyRate monthlyRate deposit")
    .lean<Array<{ _id: mongoose.Types.ObjectId; listingId: mongoose.Types.ObjectId; ownerId: mongoose.Types.ObjectId; dailyRate: number; weeklyRate?: number; monthlyRate?: number; deposit: number }>>();
}
