import Skeleton from "@/components/ui/Skeleton";
import { TitleBlock } from "@/components/ui/PageSkeleton";

/** Notifications: title and note, the phone notifications card, then one row per item. */
export default function NotificationsLoading() {
  return (
    <div className="min-h-screen bg-slate-50" aria-busy="true" aria-label="Loading">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <TitleBlock lines={2} className="mb-5" />
        <div className="mb-4 rounded-2xl border border-slate-200/80 bg-white p-4">
          <div className="flex gap-3">
            <Skeleton className="h-5 w-5 flex-shrink-0 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
          <Skeleton className="ml-auto mt-3 h-8 w-40 rounded-lg" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 rounded-2xl border border-slate-200/80 bg-white p-4">
              <Skeleton className="h-5 w-5 flex-shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
