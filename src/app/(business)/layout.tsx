import type { Metadata } from "next";
import mongoose from "mongoose";
import BusinessSidebar from "@/components/business/BusinessSidebar";
import SuspensionGate from "@/components/business/SuspensionGate";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import { Employee } from "@/models/Employee";
import { can, type BusinessRole } from "@/lib/business";
import QuickNew from "@/components/business/QuickNew";
import { PushPrompt } from "@/components/pwa/PushCard";

type WarningRow = { reason: string; at: Date; acknowledgedAt?: Date };

/** The signed-in user's business moderation state: a suspension, or open admin warnings. */
async function getModeration() {
  const session = await auth();
  if (!session?.user?.id) return { suspension: null, warning: null };
  await connectDB();
  const user = await User.findById(session.user.id).select("organizationId").lean<{ organizationId?: mongoose.Types.ObjectId }>();
  if (!user?.organizationId) return { suspension: null, warning: null };
  const org = await Organization.findById(user.organizationId)
    .select("name isActive suspension warnings")
    .lean<{ name: string; isActive?: boolean; suspension?: { reason: string; at: Date }; warnings?: WarningRow[] }>();
  if (!org) return { suspension: null, warning: null };

  if (org.isActive === false) {
    return {
      suspension: { name: org.name, reason: org.suspension?.reason ?? "Suspended by an admin", at: new Date(org.suspension?.at ?? Date.now()).toISOString() },
      warning: null,
    };
  }
  const open = (org.warnings ?? []).filter(w => !w.acknowledgedAt);
  if (open.length === 0) return { suspension: null, warning: null };
  const role = (await Employee.findOne({ organizationId: user.organizationId, userId: session.user.id }).select("role").lean<{ role: BusinessRole }>())?.role;
  const latest = open[open.length - 1];
  return {
    suspension: null,
    warning: {
      reason: latest.reason,
      at: new Date(latest.at).toISOString(),
      open: open.length,
      total: org.warnings?.length ?? open.length,
      canAcknowledge: can(role, "manageTeam"),
    },
  };
}

export const metadata: Metadata = {
  title: { default: "AutoGO Business", template: "%s — AutoGO Business" },
  description: "Manage your automobile business",
};

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const { suspension, warning } = await getModeration();
  return (
    <>
      <style>{`
        .biz-root {
          display: flex;
          min-height: 100vh;
          background: var(--gh-f6f8fa);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .biz-content {
          flex: 1;
          overflow-y: auto;
          min-width: 0;
          /* Room so the floating "+ New" button never covers the last row */
          padding-bottom: 84px;
        }
        /* Phones and tablets: room for the bottom bar plus the "+ New" button above it */
        @media (max-width: 768px) { .biz-content { padding-bottom: calc(128px + env(safe-area-inset-bottom)); } }
        @media print { .biz-content { padding-bottom: 0; } }
        @media (max-width: 768px) {
          .biz-content {
            padding-top: 48px;
          }
        }
      `}</style>
      <div className="biz-root">
        <BusinessSidebar />
        <div className="biz-content">
          <SuspensionGate suspension={suspension} warning={warning}>{children}</SuspensionGate>
        </div>
        {!suspension && <QuickNew />}
        <PushPrompt className="top-14 md:left-auto md:right-6 md:top-6 md:mx-0 md:w-[380px]" />
      </div>
    </>
  );
}