import Skeleton from "@/components/ui/Skeleton";
import { StatCards } from "@/components/ui/PageSkeleton";

/** Business dashboard: its header (name, date, Guide, public page, Add vehicle), Today and stats (the setup checklist sits at the bottom). */
export default function BusinessDashboardLoading() {
  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)]" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="hidden h-3 w-40 sm:block" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-lg sm:w-20" />
          <Skeleton className="h-8 w-8 rounded-lg sm:w-32" />
          <Skeleton className="h-8 w-16 rounded-lg sm:w-28" />
        </div>
      </div>
      <div className="space-y-4 px-4 py-5 sm:px-6">
        <div className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white p-4">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="mt-2 h-3 w-32" />
          <Skeleton className="mt-4 h-10 w-full rounded-xl" />
        </div>
        <StatCards />
      </div>
    </div>
  );
}
