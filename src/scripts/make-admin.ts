import { connectDB } from "../lib/mongodb";
import { User } from "../models/User";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "your@email.com";

async function makeAdmin() {
  await connectDB();
  
  const user = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    { role: "ADMIN" },
    { new: true }
  );

  if (!user) {
    console.log(`❌ User not found: ${ADMIN_EMAIL}`);
    console.log("Make sure you register first, then run this script.");
  } else {
    console.log(`✅ ${user.email} is now ADMIN`);
  }

  process.exit(0);
}

makeAdmin().catch(console.error);
