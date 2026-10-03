import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export default async function BusinessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await connectDB();
  const user = await User.findById(session.user.id);

  if (user?.organizationId) {
    redirect("/business/dashboard");
  } else {
    redirect("/business/onboarding");
  }
}
