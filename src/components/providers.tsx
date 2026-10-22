"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import FeedbackDialog from "@/components/FeedbackDialog";
import Toaster from "@/components/ui/Toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        {/* Opened from the menus and the footer with openFeedback() */}
        <FeedbackDialog />
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  );
}