import Skeleton from "@/components/ui/Skeleton";
import { DarkBar, DarkHero, SkeletonPage, VehicleCard } from "@/components/ui/PageSkeleton";

/** Dealer page: the dark header (logo, name and type · city, rating and since, Follow and Share, then the counts strip), vehicles and reviews, then contact. */
export default function DealerLoading() {
  return (
    <SkeletonPage>
      <DarkHero>
        <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <div className="min-w-0">
              <div className="flex items-center gap-4 sm:gap-5">
                <DarkBar className="h-16 w-16 flex-shrink-0 rounded-xl sm:h-20 sm:w-20" />
                <div className="min-w-0 space-y-2.5">
                  <DarkBar className="h-8 w-56 max-w-full" />
                  <DarkBar className="h-3.5 w-40" />
                </div>
              </div>
              {/* Rating and since */}
              <DarkBar className="mt-5 h-4 w-64 max-w-full sm:ml-[100px] sm:mt-[-12px]" />
            </div>
            {/* Follow and Share */}
            <div className="flex gap-2.5">
              <DarkBar className="h-10 flex-1 rounded-lg sm:w-28 sm:flex-none" />
              <DarkBar className="h-10 w-24 rounded-lg" />
            </div>
          </div>
          <DarkBar className="mt-8 h-[74px] max-w-lg rounded-xl" />
        </div>
      </DarkHero>
      <div className="mx-auto grid max-w-[1120px] gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {/* Phones and tablets: the contact card comes first */}
          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 lg:hidden">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div>
            <Skeleton className="mb-3 h-5 w-56" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <VehicleCard key={i} />)}
            </div>
          </div>
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <aside className="space-y-4">
          <div className="hidden space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 lg:block">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
        </aside>
      </div>
    </SkeletonPage>
  );
}
