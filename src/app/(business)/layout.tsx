import type { Metadata } from "next";
import mongoose from "mongoose";
import BusinessSidebar from "@/components/business/BusinessSidebar";
import SuspensionGate from "@/components/business/SuspensionGate";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";

/** The signed-in user's business, if an admin has suspended it. */
async function getSuspension() {
  const session = await auth();
  if (!session?.user?.id) return null;
  await connectDB();
  const user = await User.findById(session.user.id).select("organizationId").lean<{ organizationId?: mongoose.Types.ObjectId }>();
  if (!user?.organizationId) return null;
  const org = await Organization.findOne({ _id: user.organizationId, isActive: false })
    .select("name suspension")
    .lean<{ name: string; suspension?: { reason: string; at: Date } }>();
  return org ? { name: org.name, reason: org.suspension?.reason ?? "Suspended by an admin", at: new Date(org.suspension?.at ?? Date.now()).toISOString() } : null;
}

export const metadata: Metadata = {
  title: { default: "AutoMarket Business", template: "%s — AutoMarket Business" },
  description: "Manage your automobile business",
};

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const suspension = await getSuspension();
  return (
    <>
      <style>{`
        .biz-root {
          display: flex;
          min-height: 100vh;
          background: #f6f8fa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .biz-content {
          flex: 1;
          overflow-y: auto;
          min-width: 0;
        }
        @media (max-width: 768px) {
          .biz-content {
            padding-top: 48px;
          }
        }
      `}</style>
      <div className="biz-root">
        <BusinessSidebar />
        <div className="biz-content">
          <SuspensionGate suspension={suspension}>{children}</SuspensionGate>
        </div>
      </div>
    </>
  );
}