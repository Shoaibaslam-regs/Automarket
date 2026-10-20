import Skeleton from "@/components/ui/Skeleton";
import { DarkBar, DarkHero, SkeletonPage, VehicleCard } from "@/components/ui/PageSkeleton";

/** Dealer page: the dark header (logo, name, details, rating and three counts), vehicles and reviews, then contact. */
export default function DealerLoading() {
  return (
    <SkeletonPage>
      <DarkHero>
        <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 sm:py-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <DarkBar className="h-16 w-16 flex-shrink-0 rounded-2xl sm:h-20 sm:w-20" />
            <div className="min-w-0 flex-1 space-y-2.5">
              <DarkBar className="h-8 w-56" />
              <DarkBar className="h-3.5 w-64 max-w-full" />
              <DarkBar className="h-3.5 w-44" />
              <DarkBar className="h-7 w-40 rounded-full" />
            </div>
          </div>
          <div className="mt-7 grid grid-cols-3 gap-2 sm:max-w-md">
            {Array.from({ length: 3 }).map((_, i) => <DarkBar key={i} className="h-16 rounded-xl" />)}
          </div>
        </div>
      </DarkHero>
      <div className="mx-auto grid max-w-[1120px] gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <div>
            <Skeleton className="mb-3 h-5 w-56" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <VehicleCard key={i} />)}
            </div>
          </div>
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
        <aside className="space-y-4">
          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <Skeleton className="h-24 w-full rounded-2xl" />
        </aside>
      </div>
    </SkeletonPage>
  );
}
