// Deletes the admin access key set in the admin panel, so ADMIN_ACCESS_KEY from the env works again.
// For when the panel key is forgotten. See src/lib/adminKey.ts.
import { connectDB } from "../lib/mongodb";
import { SiteSetting } from "../models/SiteSetting";

async function resetAdminKey() {
  await connectDB();
  const { deletedCount } = await SiteSetting.deleteOne({ key: "adminAccessKey" });
  console.log(deletedCount
    ? "Admin panel key removed. ADMIN_ACCESS_KEY from the env works again."
    : "No admin panel key was set. ADMIN_ACCESS_KEY from the env is already in use.");
  process.exit(0);
}

resetAdminKey().catch(console.error);
