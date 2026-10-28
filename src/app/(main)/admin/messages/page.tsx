import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import MessagesContent from "@/components/messages/MessagesContent";

/** The signed-in admin's own Messages inside the admin panel; support conversations are in Admin → Support inbox. */
export default function AdminMessagesPage() {
  return (
    <div>
      <PageHeader title="My messages" description="Your own chats. Support requests, plan and badge requests and appeals are in the Support inbox, for the whole team." />
      <Suspense fallback={<div className="h-[480px] animate-pulse rounded-2xl bg-white ring-1 ring-slate-200" />}>
        <MessagesContent embedded basePath="/admin/messages" />
      </Suspense>
    </div>
  );
}
