"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import FeedbackHost from "@/components/FeedbackHost";
import Toaster from "@/components/ui/Toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        {/* Opened from the menus and the footer with openFeedback(); the dialog loads on first use */}
        <FeedbackHost />
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  );
}