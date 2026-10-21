"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { toggleFavorite, useIsFavorite } from "@/hooks/useFavorites";

/** Heart toggle. "overlay" sits on a card photo; "pill" is the labelled button on the listing page. */
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
    await toggleFavorite(listingId);
  }

  const label = saved ? "Remove from saved" : "Save listing";
  const icon = (
    <Heart
      key={pop}
      size={variant === "pill" ? 16 : 15}
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
        // A plain text action (no border or fill), like Compare and Share beside it
        className={`inline-flex items-center gap-1.5 py-1.5 text-sm font-medium transition ${
          saved ? "text-rose-600" : "text-slate-600 hover:text-slate-900"
        }`}
      >
        {icon}
        {saved ? "Saved" : "Save"}
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
