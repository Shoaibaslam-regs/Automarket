import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdminApi } from "@/lib/adminAuth";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { deleteSupportConversations, supportConversations, supportPlans } from "@/lib/supportInbox";
import { isPrioritySupport, sortInbox } from "@/lib/supportPriority";
import { accountManagersFor } from "@/lib/accountManager";
import { isPlatformOwner } from "@/lib/adminAuth";
import { logAdminAction } from "@/lib/adminLog";
import { reportError } from "@/lib/errorLog";

export const dynamic = "force-dynamic";

type Oid = mongoose.Types.ObjectId;

/**
 * The shared Support inbox: every conversation with AutoGO Support, for every admin. `?filter=open` (default: the
 * person is waiting for the team), `priority` (open, from Premium Plus and up: src/lib/supportPriority.ts), `mine`
 * (open and taken by you), `done` or `all`; `?q=` searches name, email, business, Business ID and user ID;
 * `?count=1` only counts open conversations, for the sidebar badge. Open Priority conversations come first.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  try {
    const all = await supportConversations();
    const plans = await supportPlans(all.map(c => c.userId));
    const priority = (userId: string) => isPrioritySupport(plans.get(userId) ?? "FREE");
    const openPriority = all.filter(c => c.open && priority(c.userId)).length;
    if (req.nextUrl.searchParams.get("count") === "1") return NextResponse.json({ open: all.filter(c => c.open).length, priority: openPriority });

    const filter = req.nextUrl.searchParams.get("filter") ?? "open";
    const me = String(gate.admin._id);
    const users = await User.find({ _id: { $in: all.map(c => c.userId) } })
      .select("name email image organizationId")
      .lean<Array<{ _id: Oid; name?: string; email: string; image?: string; organizationId?: Oid }>>();
    const orgIds = users.map(u => u.organizationId).filter(Boolean) as Oid[];
    const orgs = await Organization.find({ _id: { $in: orgIds } }).select("name slug").lean<Array<{ _id: Oid; name: string; slug: string }>>();
    // Dedicated support (Ultimate): who looks after each business
    const managers = await accountManagersFor(all.map(c => c.userId));
    const admins = await User.find({ _id: { $in: all.map(c => c.takenBy).filter(Boolean) } }).select("name email").lean<Array<{ _id: Oid; name?: string; email: string }>>();
    const userById = new Map(users.map(u => [String(u._id), u]));
    const orgById = new Map(orgs.map(o => [String(o._id), o]));
    const adminById = new Map(admins.map(a => [String(a._id), a]));

    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase().replace(/^#/, "");
    const rows = sortInbox(all.map(c => ({ ...c, priority: priority(c.userId), plan: plans.get(c.userId) ?? "FREE", waitingSince: c.open ? c.lastUserAt : null })))
      .filter(c => filter === "all" || (filter === "done" ? !c.open : filter === "mine" ? c.open && c.takenBy === me : filter === "priority" ? c.open && c.priority : c.open))
      .map(c => {
        const u = userById.get(c.userId);
        const org = u?.organizationId ? orgById.get(String(u.organizationId)) : undefined;
        const taker = c.takenBy ? adminById.get(c.takenBy) : undefined;
        return {
          ...c,
          user: u ? { _id: String(u._id), name: u.name, email: u.email, image: u.image } : null,
          business: org ? { _id: String(org._id), name: org.name, slug: org.slug } : null,
          takenBy: taker ? { _id: String(taker._id), name: taker.name, email: taker.email } : null,
          dedicated: managers.has(c.userId) ? { manager: managers.get(c.userId)!.manager } : null,
        };
      })
      .filter(c => !q || [c.user?.name, c.user?.email, c.user?._id, c.business?.name, c.business?._id].some(v => v?.toLowerCase().includes(q)));
    return NextResponse.json({ conversations: rows, open: all.filter(c => c.open).length, priority: openPriority, me, canDelete: isPlatformOwner(gate.admin.email) });
  } catch (error) {
    reportError("Support inbox GET error:", error);
    return NextResponse.json({ error: "Failed to load the support inbox" }, { status: 500 });
  }
}

/**
 * Deletes finished conversations from the Support inbox in one go: `?olderThan=30|90` (days since the last message)
 * or every done one. Only the platform owner; conversations still waiting for the team are never touched. People keep
 * their copies. Logged as `support.clear`.
 */
export async function DELETE(req: NextRequest) {
  const gate = await requireAdminApi("read");
  if (!gate.ok) return gate.response;
  if (!isPlatformOwner(gate.admin.email)) return NextResponse.json({ error: "Only the platform owner can delete support conversations" }, { status: 403 });
  try {
    const older = req.nextUrl.searchParams.get("olderThan");
    const days = older === "30" || older === "90" ? Number(older) : null;
    const cutoff = days ? Date.now() - days * 86400000 : Infinity;
    const done = (await supportConversations(5000)).filter(c => !c.open && new Date(c.lastAt).getTime() < cutoff);
    const removed = await deleteSupportConversations(done.map(c => c.userId));
    await logAdminAction(gate.admin, "support.clear", { type: "SETTINGS", id: gate.admin._id, label: "Support inbox" },
      `${done.length} done conversation${done.length === 1 ? "" : "s"}${days ? ` older than ${days} days` : ""}, ${removed} messages`);
    return NextResponse.json({ ok: true, conversations: done.length, removed });
  } catch (error) {
    reportError("Support inbox DELETE error:", error);
    return NextResponse.json({ error: "Couldn't delete the conversations" }, { status: 500 });
  }
}
