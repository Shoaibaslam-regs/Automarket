import mongoose from "mongoose";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { Employee } from "@/models/Employee";
import { Listing } from "@/models/Listing";
import { Deal } from "@/models/Deal";

// Small builders for the database tests: accounts on a plan, a business with its team, vehicles and deals.
export const DAY = 86_400_000;
let n = 0;

export async function makeUser(plan = "FREE", daysLeft: number | null = null) {
  n++;
  return User.create({
    name: `Test ${n}`, email: `t${n}-${Date.now()}@test.local`, password: "x",
    plan, planSource: plan === "FREE" ? undefined : "PAID",
    planExpiresAt: daysLeft == null ? undefined : new Date(Date.now() + daysLeft * DAY),
  });
}

export async function makeBusiness(owner: { _id: mongoose.Types.ObjectId }, members: Array<{ user: { _id: mongoose.Types.ObjectId }; role: string }> = []) {
  n++;
  const org = await Organization.create({ name: `Org ${n}`, slug: `org-${n}-${Date.now()}`, type: "DEALER", ownerId: owner._id, isActive: true });
  for (const m of [{ user: owner, role: "OWNER" }, ...members]) {
    await Employee.create({ organizationId: org._id, userId: m.user._id, role: m.role });
    await User.updateOne({ _id: m.user._id }, { organizationId: org._id });
  }
  return org;
}

export const makeListing = (sellerId: mongoose.Types.ObjectId, extra: Record<string, unknown> = {}) =>
  Listing.create({ title: "Honda Civic", description: "d", price: 1, type: "SALE", condition: "GOOD", make: "Honda", model: "Civic", year: 2020, location: "Karachi", sellerId, status: "ACTIVE", ...extra });

export const makeDeal = (organizationId: mongoose.Types.ObjectId, createdBy: mongoose.Types.ObjectId) =>
  Deal.create({ organizationId, title: "Deal", make: "Honda", model: "City", year: 2022, condition: "GOOD", location: "Lahore", price: 100, discountType: "PERCENT", discountValue: 10, startsAt: new Date(Date.now() - DAY), endsAt: new Date(Date.now() + 10 * DAY), createdBy });

export const newId = () => new mongoose.Types.ObjectId();
