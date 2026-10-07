"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { create } from "zustand";

type FavoritesState = {
  /** Whose favourites are loaded, so signing in as someone else reloads them. */
  userId: string | null;
  saved: Record<string, true>;
};

const useFavoritesStore = create<FavoritesState>(() => ({ userId: null, saved: {} }));

let loadingFor: string | null = null;

async function load(userId: string) {
  if (loadingFor === userId || useFavoritesStore.getState().userId === userId) return;
  loadingFor = userId;
  try {
    const res = await fetch("/api/favorites");
    if (!res.ok) return;
    const { ids } = (await res.json()) as { ids: string[] };
    useFavoritesStore.setState({ userId, saved: Object.fromEntries(ids.map(id => [id, true])) });
  } finally {
    loadingFor = null;
  }
}

function setSaved(listingId: string, saved: boolean) {
  useFavoritesStore.setState(s => {
    const next = { ...s.saved };
    if (saved) next[listingId] = true;
    else delete next[listingId];
    return { saved: next };
  });
}

/** Saves or unsaves a listing optimistically, rolling back if the request fails. Returns the new state. */
export async function toggleFavorite(listingId: string): Promise<boolean> {
  const wasSaved = !!useFavoritesStore.getState().saved[listingId];
  setSaved(listingId, !wasSaved);
  try {
    const res = wasSaved
      ? await fetch(`/api/favorites?listingId=${listingId}`, { method: "DELETE" })
      : await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId }),
        });
    if (!res.ok) throw new Error(`Favorite request failed: ${res.status}`);
    return !wasSaved;
  } catch (err) {
    console.error(err);
    setSaved(listingId, wasSaved);
    return wasSaved;
  }
}

/** Whether a listing is in the signed-in user's favourites. Loads them once per user, shared by every heart. */
export function useIsFavorite(listingId: string): boolean {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;
  const storeUser = useFavoritesStore(s => s.userId);
  const saved = useFavoritesStore(s => !!s.saved[listingId]);

  useEffect(() => {
    if (userId) load(userId);
    else if (useFavoritesStore.getState().userId) useFavoritesStore.setState({ userId: null, saved: {} });
  }, [userId]);

  return !!userId && storeUser === userId && saved;
}
