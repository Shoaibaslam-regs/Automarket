// One-time: fills User.loginPhone (E.164) from the profile phone for accounts made before phone sign-in,
// so they can sign in with the number they registered. New and edited phones get it on save.
import { connectDB } from "../lib/mongodb";
import { User } from "../models/User";
import { normalizePkMobile } from "../lib/phone";

async function backfill() {
  await connectDB();
  const users = await User.find({ phone: { $exists: true, $ne: "" }, loginPhone: { $exists: false } }).select("phone").lean<{ _id: unknown; phone?: string }[]>();
  let filled = 0;
  for (const u of users) {
    const loginPhone = normalizePkMobile(u.phone);
    if (!loginPhone) continue;
    await User.updateOne({ _id: u._id }, { $set: { loginPhone } });
    filled++;
  }
  console.log(`Checked ${users.length} accounts, ${filled} can now sign in with their phone (others have no Pakistani mobile number).`);
  process.exit(0);
}

backfill().catch(e => {
  console.error(e);
  process.exit(1);
});
