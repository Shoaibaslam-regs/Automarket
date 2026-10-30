"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// The always-loaded half of Send feedback: openFeedback(), the footer link and the host that loads the dialog
// (FeedbackDialog.tsx, with Radix and the Cloudflare check, about 45 KB) the first time someone opens it, so
// every other page view skips that download.

export const OPEN_FEEDBACK_EVENT = "am:open-feedback";

/** Opens the feedback dialog from anywhere (menus, footer). */
export function openFeedback() {
  window.dispatchEvent(new Event(OPEN_FEEDBACK_EVENT));
}

/** A plain text link that opens the dialog, for server components such as the footer. */
export function FeedbackLink({ className = "" }: { className?: string }) {
  return <button type="button" onClick={openFeedback} className={className}>Send feedback</button>;
}

const FeedbackDialog = dynamic(() => import("@/components/FeedbackDialog"), { ssr: false });

/** Mounted once in Providers: loads the dialog on the first openFeedback(), which it then opens itself. */
export default function FeedbackHost() {
  const [wanted, setWanted] = useState(false);
  useEffect(() => {
    if (wanted) return;
    const load = () => setWanted(true);
    window.addEventListener(OPEN_FEEDBACK_EVENT, load);
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, load);
  }, [wanted]);
  return wanted ? <FeedbackDialog startOpen /> : null;
}
