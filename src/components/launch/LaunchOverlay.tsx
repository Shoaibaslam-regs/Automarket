"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";

// Framer Motion is only downloaded when a launch actually plays
const LaunchAnimation = dynamic(() => import("./LaunchAnimation"), { ssr: false });

/** If the animation can't load (offline, slow chunk), carry on after this long */
const FAILSAFE_MS = 5000;

/** Wording for each launch, so every place reads alike */
export const LAUNCH_TEXT = {
  listing: (title?: string) => ({ title: "Vehicle published!", subtitle: title ? `${title} is live on AutoMarket.` : "It's live on AutoMarket now." }),
  deal: (title?: string) => ({ title: "Deal published!", subtitle: title ? `${title} is live on the Deals page.` : "Your offer is live on the Deals page." }),
  business: (name?: string) => ({ title: "Your business is live!", subtitle: name ? `${name} is ready. Opening your console…` : "Opening your business console…" }),
  booking: (when?: string) => ({ title: "Booking request sent!", subtitle: when ? `${when}. The owner will confirm it soon.` : "The owner will confirm your dates soon." }),
  purchase: (business?: string) => ({ title: "Purchase request sent!", subtitle: business ? `${business} will contact you to agree the price.` : "The business will contact you to agree the price." }),
};

/**
 * Plays the launch animation over the page while `show` is true and calls onDone once, when it ends, is tapped,
 * or the failsafe fires. Used after publishing a vehicle (Sell), publishing a new deal, creating a business and
 * sending a booking request (BookingForm, for rentals and rent deals) or a purchase request (BuyRequestButton).
 */
export default function LaunchOverlay({ show, title, subtitle, onDone }: { show: boolean; title: string; subtitle: string; onDone: () => void }) {
  // The caller's callback may change every render; keep the latest without restarting the timers
  const latest = useRef(onDone);
  useEffect(() => { latest.current = onDone; });
  const fired = useRef(false);
  useEffect(() => { if (show) fired.current = false; }, [show]);
  const finish = useCallback(() => {
    if (fired.current) return;
    fired.current = true;
    latest.current();
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(finish, FAILSAFE_MS);
    return () => clearTimeout(t);
  }, [show, finish]);

  if (!show) return null;
  // Into <body>, so a transformed or blurred parent (a card, a sticky column) can't trap the full-screen overlay
  return createPortal(<LaunchAnimation title={title} subtitle={subtitle} onDone={finish} />, document.body);
}
