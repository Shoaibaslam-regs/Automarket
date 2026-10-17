import Skeleton from "@/components/ui/Skeleton";

/**
 * Shown by loading.tsx files while a page loads, so a tap gets an instant response even on slow mobile data.
 * "grid" is for vehicle and deal lists, "list" for bookings, purchases and messages, "detail" for one vehicle or deal.
 */
export default function PageSkeleton({ variant = "grid", tone = "main" }: { variant?: "grid" | "list" | "detail"; tone?: "main" | "business" }) {
  const bg = tone === "business" ? "bg-[var(--gh-f6f8fa)]" : "bg-slate-50";
  return (
    <div className={`min-h-screen ${bg}`} aria-busy="true" aria-label="Loading">
      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        <Skeleton className="mb-2 h-3 w-24" />
        <Skeleton className="mb-6 h-7 w-56" />
        {variant === "grid" && (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white p-1.5 ring-1 ring-slate-200/80">
                <Skeleton className="aspect-[4/3] rounded-xl" />
                <div className="space-y-2 p-2">
                  <Skeleton className="h-3 w-4/5 rounded" />
                  <Skeleton className="h-4 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
        {variant === "list" && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/80">
                <Skeleton className="h-14 w-16 flex-shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/3 rounded" />
                  <Skeleton className="h-3 w-1/3 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
        {variant === "detail" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
