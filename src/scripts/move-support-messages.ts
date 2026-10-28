// One-time: moves support conversations out of admins' personal inboxes into the shared AutoGO Support account
// (Admin → Support inbox). Without --apply it only reports what it would move.
//   npm run move-support-messages            (report)
//   npm run move-support-messages -- --apply (move)
// A conversation between an admin and a user moves when it carries a support message: a request or Help & support
// message from the user ("Hi AutoGO team…", "[Topic] …") or a team notice from the admin (warnings, suspensions,
// badge and ad decisions). Admins' other chats (buying, selling) stay where they are. Admin messages that move keep
// their author in `sentBy`, so the Support inbox shows who wrote them. Safe to run again.
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import { User } from "../models/User";
import { Message } from "../models/Message";

type Oid = mongoose.Types.ObjectId;

const FROM_USER = [/^Hi AutoGO team/i, /^\[[^\]]{2,40}\] /];
const FROM_TEAM = [
  /^Warning (#\d+ )?for your business "/,
  /^Your business ".*" has been suspended on AutoGO/,
  /^Good news: your business ".*" has been reinstated/,
  /^Your business ".*" is now Verified on AutoGO/,
  /^Your Verified badge request for ".*" wasn't approved/,
  /^The Verified badge has been removed from your business/,
  /^Your (Top )?sponsored ad/,
  /^Your sponsored ad request/,
  /^Your .* request wasn't approved\. Reason:/,
];

async function supportAccount(): Promise<Oid> {
  const account = await User.findOneAndUpdate(
    { isSupportAccount: true },
    { $setOnInsert: { name: "AutoGO Support", email: "support@autogo.invalid", role: "USER", isSupportAccount: true, termsAcceptedAt: new Date(), emailVerified: new Date() } },
    { upsert: true, returnDocument: "after" }
  ).select("_id").lean<{ _id: Oid }>();
  return account!._id;
}

async function main() {
  const apply = process.argv.includes("--apply");
  await connectDB();
  const support = await supportAccount();
  const admins = await User.find({ role: "ADMIN" }).select("_id email").lean<Array<{ _id: Oid; email: string }>>();
  const adminIds = new Set(admins.map(a => String(a._id)));
  const adminOids = admins.map(a => a._id);

  // Every admin ↔ non-admin conversation
  const messages = await Message.find({ $or: [{ senderId: { $in: adminOids } }, { receiverId: { $in: adminOids } }] })
    .select("senderId receiverId content")
    .lean<Array<{ _id: Oid; senderId: Oid; receiverId: Oid; content: string }>>();
  const byPair = new Map<string, { admin: Oid; partner: Oid; ids: Oid[]; support: boolean }>();
  for (const m of messages) {
    const fromAdmin = adminIds.has(String(m.senderId));
    const admin = fromAdmin ? m.senderId : m.receiverId;
    const partner = fromAdmin ? m.receiverId : m.senderId;
    if (adminIds.has(String(partner)) || partner.equals(support)) continue;
    const key = `${admin}:${partner}`;
    const pair = byPair.get(key) ?? { admin, partner, ids: [], support: false };
    pair.ids.push(m._id);
    if ((fromAdmin ? FROM_TEAM : FROM_USER).some(re => re.test(m.content))) pair.support = true;
    byPair.set(key, pair);
  }

  const moving = [...byPair.values()].filter(p => p.support);
  const count = moving.reduce((n, p) => n + p.ids.length, 0);
  console.log(`${moving.length} support conversation${moving.length === 1 ? "" : "s"} (${count} messages) to move; ${byPair.size - moving.length} personal conversation${byPair.size - moving.length === 1 ? "" : "s"} stay.`);
  if (!apply) {
    console.log("Nothing changed. Run again with -- --apply to move them.");
    process.exit(0);
  }

  let moved = 0;
  for (const p of moving) {
    // The admin's own messages: now from AutoGO Support, written by that admin
    const a = await Message.updateMany(
      { _id: { $in: p.ids }, senderId: p.admin },
      { $set: { senderId: support, sentBy: p.admin }, $pull: { deletedFor: p.admin } }
    );
    // The user's messages: now to AutoGO Support
    const b = await Message.updateMany(
      { _id: { $in: p.ids }, receiverId: p.admin },
      { $set: { receiverId: support }, $pull: { deletedFor: p.admin } }
    );
    moved += a.modifiedCount + b.modifiedCount;
  }
  console.log(`Moved ${moved} messages into the AutoGO Support inbox.`);
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
