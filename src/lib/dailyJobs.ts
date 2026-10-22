import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Booking } from "@/models/Booking";
import { Deal } from "@/models/Deal";
import { Employee } from "@/models/Employee";
import { FollowUp } from "@/models/FollowUp";
import { Organization } from "@/models/Organization";
import { Purchase } from "@/models/Purchase";
import { Rental } from "@/models/Rental";
import { User } from "@/models/User";
import { can, type BusinessRole } from "@/lib/businessPermissions";
import { sendPush, type PushPayload } from "@/lib/push";
import { sendPlanExpiringEmail } from "@/lib/email";
import { planInfo } from "@/lib/plans";
import { pkDay, pkRange } from "@/lib/money";
import { digestText, type DigestCounts as Counts } from "@/lib/today";
import { reportError } from "@/lib/errorLog";

const DAY_MS = 24 * 60 * 60 * 1000;
/** How many days before a paid plan ends its owner is reminded */
export const PLAN_REMINDER_DAYS = 3;
// One cron run must finish inside the 30 s function limit, and Gmail allows about 500 emails a day
const MAX_PLAN_REMINDERS = 100;

/** Runs `fn` over `items` a few at a time, so hundreds of pushes don't open hundreds of connections at once. */
async function inBatches<T>(items: T[], size: number, fn: (item: T) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
}

/**
 * Emails (and pushes to) everyone whose paid plan ends within PLAN_REMINDER_DAYS, once per plan period:
 * `planReminderFor` is set to the end date before sending, so a second run (or a renewal) can't send it twice.
 */
export async function remindExpiringPlans(now = new Date()): Promise<number> {
  const users = await User.find({
    plan: { $ne: "FREE" },
    planExpiresAt: { $gt: now, $lte: new Date(now.getTime() + PLAN_REMINDER_DAYS * DAY_MS) },
    $expr: { $ne: ["$planReminderFor", "$planExpiresAt"] },
  })
    .select("name email plan planExpiresAt")
    .limit(MAX_PLAN_REMINDERS)
    .lean<Array<{ _id: mongoose.Types.ObjectId; name?: string; email: string; plan: string; planExpiresAt: Date }>>();

  let sent = 0;
  await inBatches(users, 5, async u => {
    // Claim it first: only the run that sets the field sends
    const claimed = await User.updateOne({ _id: u._id, planExpiresAt: u.planExpiresAt, planReminderFor: { $ne: u.planExpiresAt } }, { $set: { planReminderFor: u.planExpiresAt } });
    if (!claimed.modifiedCount) return;
    const daysLeft = Math.max(1, Math.ceil((u.planExpiresAt.getTime() - now.getTime()) / DAY_MS));
    const planName = planInfo(u.plan).name;
    try {
      await sendPlanExpiringEmail({ to: u.email, name: u.name, planName, endsAt: u.planExpiresAt, daysLeft });
    } catch (e) {
      reportError("Plan reminder email failed:", e);
    }
    await sendPush([u._id], {
      title: `Your ${planName} plan ends ${daysLeft <= 1 ? "tomorrow" : `in ${daysLeft} days`}`,
      body: "Renew it to keep your limits. After it ends your account moves to the Free plan.",
      url: "/pricing",
      tag: "plan-expiry",
    });
    sent++;
  });
  return sent;
}

/**
 * The morning reminder: a phone notification to each business member (by what their role handles) and each
 * private owner listing what is due today or overdue: returns, pickups, installments and follow-ups.
 * These are the same items as the console's Today card.
 */
export async function sendMorningDigest(now = new Date()): Promise<{ businesses: number; people: number }> {
  const { to: todayEnd } = pkRange(pkDay(now));

  const [bookings, plans, followUps] = await Promise.all([
    Booking.find({
      deletedByOwner: { $ne: true },
      $or: [
        { status: "CONFIRMED", startDate: { $lt: todayEnd } },
        { status: "ACTIVE", dueBackAt: { $lt: todayEnd } },
        { status: "ACTIVE", dueBackAt: { $exists: false }, endDate: { $lt: todayEnd } },
      ],
    }).select("status rentalId dealId organizationId").lean<Array<{ status: string; rentalId?: unknown; dealId?: unknown; organizationId?: unknown }>>(),
    Purchase.find({
      deletedByBusiness: { $ne: true },
      status: { $in: ["ACCEPTED", "COMPLETED"] },
      "installmentPlan.items": { $elemMatch: { paidAt: { $exists: false }, dueDate: { $lt: todayEnd } } },
    }).select("organizationId").lean<Array<{ organizationId: unknown }>>(),
    FollowUp.aggregate<{ _id: unknown; n: number }>([
      { $match: { doneAt: { $exists: false }, dueAt: { $lt: todayEnd } } },
      { $group: { _id: "$organizationId", n: { $sum: 1 } } },
    ]),
  ]);

  // Who each booking belongs to: its business (off-list walk-ins and deals carry it), or the rental's owner,
  // who is either a business member (then it counts for the business) or a private owner
  const rentalIds = bookings.map(b => b.rentalId).filter(Boolean);
  const dealIds = bookings.map(b => b.dealId).filter(Boolean);
  const [rentals, deals] = await Promise.all([
    Rental.find({ _id: { $in: rentalIds } }).select("ownerId").lean<Array<{ _id: unknown; ownerId: unknown }>>(),
    Deal.find({ _id: { $in: dealIds } }).select("organizationId").lean<Array<{ _id: unknown; organizationId: unknown }>>(),
  ]);
  const ownerOfRental = new Map(rentals.map(r => [String(r._id), String(r.ownerId)]));
  const orgOfDeal = new Map(deals.map(d => [String(d._id), String(d.organizationId)]));
  const ownerIds = [...new Set(rentals.map(r => String(r.ownerId)))];
  const owners = await User.find({ _id: { $in: ownerIds } }).select("organizationId").lean<Array<{ _id: unknown; organizationId?: unknown }>>();
  const orgOfOwner = new Map(owners.filter(o => o.organizationId).map(o => [String(o._id), String(o.organizationId)]));

  const byOrg = new Map<string, Counts>();
  const byPerson = new Map<string, Counts>();
  const bump = (map: Map<string, Counts>, key: string, field: keyof Counts, n = 1) => {
    const c = map.get(key) ?? { pickups: 0, returns: 0, installments: 0, followUps: 0 };
    c[field] += n;
    map.set(key, c);
  };
  for (const b of bookings) {
    const field = b.status === "ACTIVE" ? "returns" : "pickups";
    const owner = b.rentalId ? ownerOfRental.get(String(b.rentalId)) : undefined;
    const org = b.organizationId ? String(b.organizationId) : b.dealId ? orgOfDeal.get(String(b.dealId)) : owner ? orgOfOwner.get(owner) : undefined;
    if (org) bump(byOrg, org, field);
    else if (owner) bump(byPerson, owner, field);
  }
  for (const p of plans) bump(byOrg, String(p.organizationId), "installments");
  for (const f of followUps) bump(byOrg, String(f._id), "followUps", f.n);

  // Suspended businesses can't act on any of it, so they aren't nagged
  const orgs = await Organization.find({ _id: { $in: [...byOrg.keys()] }, isActive: { $ne: false } }).select("name").lean<Array<{ _id: unknown; name: string }>>();
  const members = await Employee.find({ organizationId: { $in: orgs.map(o => o._id) } }).select("userId role organizationId")
    .lean<Array<{ userId: unknown; role: BusinessRole; organizationId: unknown }>>();
  const orgName = new Map(orgs.map(o => [String(o._id), o.name]));

  const pushes: Array<{ userId: string; payload: PushPayload }> = [];
  for (const m of members) {
    const all = byOrg.get(String(m.organizationId));
    if (!all) continue;
    const mine: Counts = {
      pickups: can(m.role, "manageBookings") ? all.pickups : 0,
      returns: can(m.role, "manageBookings") ? all.returns : 0,
      installments: can(m.role, "manageSales") ? all.installments : 0,
      followUps: can(m.role, "editCustomers") ? all.followUps : 0,
    };
    const body = digestText(mine);
    if (body) pushes.push({ userId: String(m.userId), payload: { title: `Today at ${orgName.get(String(m.organizationId))}`, body, url: "/business", tag: "today" } });
  }
  for (const [userId, c] of byPerson) {
    const body = digestText(c);
    if (body) pushes.push({ userId, payload: { title: "Today on AutoMarket", body, url: "/bookings", tag: "today" } });
  }
  await inBatches(pushes, 20, p => sendPush([p.userId], p.payload));
  return { businesses: orgs.length, people: pushes.length };
}

/** Everything the daily cron does. Each job is separate, so one failing doesn't stop the others. */
export async function runDailyJobs(now = new Date()) {
  await connectDB();
  const result: Record<string, unknown> = {};
  try {
    result.planReminders = await remindExpiringPlans(now);
  } catch (e) {
    reportError("Daily job plan reminders failed:", e);
    result.planReminders = "failed";
  }
  try {
    result.digest = await sendMorningDigest(now);
  } catch (e) {
    reportError("Daily job morning digest failed:", e);
    result.digest = "failed";
  }
  return result;
}
