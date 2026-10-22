"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { toggleFavorite, useIsFavorite } from "@/hooks/useFavorites";
import { toast } from "@/lib/toast";

/** Heart toggle. "overlay" sits on a card photo; "pill" is the icon button on the listing page. Both confirm with a toast. */
export default function FavoriteButton({ listingId, variant = "overlay" }: { listingId: string; variant?: "overlay" | "pill" }) {
  const { status } = useSession();
  const router = useRouter();
  const saved = useIsFavorite(listingId);
  const [pop, setPop] = useState(0);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }
    if (!saved) setPop(p => p + 1);
    const wasSaved = saved;
    const nowSaved = await toggleFavorite(listingId);
    if (nowSaved === wasSaved) toast("Couldn't update your saved list. Please try again.");
    else if (nowSaved) toast("Saved to your list", { tone: "saved", action: { label: "View saved", href: "/saved" } });
    else toast("Removed from saved", { tone: "removed" });
  }

  const label = saved ? "Remove from saved" : "Save listing";
  const icon = (
    <Heart
      key={pop}
      size={variant === "pill" ? 19 : 15}
      strokeWidth={2}
      fill={saved ? "currentColor" : "none"}
      className={`${saved ? "text-rose-500" : ""} ${pop ? "bl-pop" : ""}`}
    />
  );

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        aria-label={label}
        title={label}
        // An icon button with no fill, like Compare and Share beside it
        className={`flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-slate-100 active:scale-95 ${
          saved ? "text-rose-600" : "text-slate-600 hover:text-slate-900"
        }`}
      >
        {icon}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:scale-105 hover:bg-white active:scale-95"
    >
      {icon}
    </button>
  );
}
