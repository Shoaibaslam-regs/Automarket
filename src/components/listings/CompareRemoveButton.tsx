"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useCompare } from "@/hooks/useCompare";

/** Drops one vehicle from the comparison: updates the tray and the page URL. */
export default function CompareRemoveButton({ id, remainingIds }: { id: string; remainingIds: string[] }) {
  const router = useRouter();
  const remove = useCompare(s => s.remove);

  return (
    <button
      type="button"
      onClick={() => {
        remove(id);
        router.replace(remainingIds.length ? `/compare?ids=${remainingIds.join(",")}` : "/listings");
      }}
      aria-label="Remove from comparison"
      className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
    >
      <X size={14} strokeWidth={2.5} />
    </button>
  );
}
