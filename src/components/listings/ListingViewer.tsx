"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ContactBar from "@/components/listings/ContactBar";

/**
 * The listing page is cached and served the same to everyone, so the parts that depend on who is looking (the
 * seller's Manage box, sign-in-only buttons, hiding Buy and Report from the seller's own team) are decided here,
 * in the browser. Signed-out visitors cost no request; signed-in ones ask `/api/listings/[id]/viewer` only when a
 * business listed the vehicle (to learn whether they're on its team).
 */
type Viewer = { status: "loading" | "guest" | "signedIn"; isOwner: boolean; /** null while unknown */ isTeam: boolean | null; business: boolean };

const ViewerContext = createContext<Viewer>({ status: "loading", isOwner: false, isTeam: null, business: false });

export function ListingViewerProvider({ listingId, sellerId, business, children }: {
  listingId: string;
  sellerId?: string;
  /** A business listed it, so its team can't buy or report it */
  business: boolean;
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const viewerId = session?.user?.id;
  const isOwner = !!viewerId && viewerId === sellerId;
  const [team, setTeam] = useState<{ for: string; isTeam: boolean } | null>(null);
  const needsTeam = status === "authenticated" && !!viewerId && business && !isOwner;

  useEffect(() => {
    if (!needsTeam || !viewerId) return;
    fetch(`/api/listings/${listingId}/viewer`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => setTeam({ for: viewerId, isTeam: d?.isTeam === true }))
      .catch(() => setTeam({ for: viewerId, isTeam: false }));
  }, [needsTeam, listingId, viewerId]);

  const value: Viewer = {
    status: status === "loading" ? "loading" : status === "authenticated" ? "signedIn" : "guest",
    isOwner,
    isTeam: isOwner ? true : !needsTeam ? false : team?.for === viewerId ? team.isTeam : null,
    business,
  };
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useListingViewer() {
  return useContext(ViewerContext);
}

/**
 * Shows its children only to some visitors:
 * - `owner`: the seller
 * - `notOwner`: everyone else (shown while the session loads, since that's nearly everyone)
 * - `notTeam`: neither the seller nor their business team (hidden until known)
 * - `signedIn` / `signedInNotOwner` / `guest`: by sign-in state (hidden while it loads)
 */
export function ShowFor({ who, children }: { who: "owner" | "notOwner" | "notTeam" | "signedIn" | "signedInNotOwner" | "guest"; children: React.ReactNode }) {
  const v = useListingViewer();
  const show =
    who === "owner" ? v.isOwner
    : who === "notOwner" ? !v.isOwner
    : who === "notTeam" ? v.status !== "loading" && v.isTeam === false
    : who === "signedIn" ? v.status === "signedIn"
    : who === "signedInNotOwner" ? v.status === "signedIn" && !v.isOwner
    : v.status === "guest";
  return show ? <>{children}</> : null;
}

/** The phone contact bar, with Message and online booking for signed-in visitors; never shown to the seller */
export function ListingContactBar({ messageHref, bookHref, ...props }: Omit<React.ComponentProps<typeof ContactBar>, "messageHref" | "bookHref"> & {
  /** Where Message goes for signed-in visitors */
  messageHref: string;
  /** Rentals: the booking page (guests are sent to sign in) */
  bookHref?: string;
}) {
  const v = useListingViewer();
  if (v.isOwner) return null;
  const signedIn = v.status === "signedIn";
  return (
    <ContactBar
      {...props}
      messageHref={signedIn ? messageHref : undefined}
      bookHref={bookHref ? (signedIn ? bookHref : "/login") : undefined}
    />
  );
}
