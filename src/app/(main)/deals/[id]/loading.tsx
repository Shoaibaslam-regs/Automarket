import Skeleton from "@/components/ui/Skeleton";
import { SkeletonPage } from "@/components/ui/PageSkeleton";

/** One deal: back link, photos and vehicle details on the left; the price card, actions and the business on the right. */
export default function DealLoading() {
  return (
    <SkeletonPage>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Skeleton className="mb-4 h-4 w-20" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-x-8">
          <div className="min-w-0 space-y-4 lg:col-span-2">
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
              <Skeleton className="aspect-[16/10] rounded-none" />
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-20 rounded-xl" />)}
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
              <Skeleton className="h-4 w-28" />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
              </div>
            </div>
          </div>
          <aside className="space-y-4">
            <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
              <div className="space-y-2.5 bg-slate-200/50 p-5">
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-7 w-36" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <div className="space-y-2.5 p-4">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
            <Skeleton className="h-16 w-full rounded-2xl" />
          </aside>
        </div>
      </div>
    </SkeletonPage>
  );
}
