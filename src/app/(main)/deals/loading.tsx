import Skeleton from "@/components/ui/Skeleton";
import { DarkBar, DarkHero, SkeletonPage, VehicleCard } from "@/components/ui/PageSkeleton";

/** Hot deals: the dark hero, the count with type tabs and filters, then the deal cards. */
export default function DealsLoading() {
  return (
    <SkeletonPage>
      <DarkHero>
        <div className="mx-auto max-w-[1200px] px-4 pb-12 pt-10 sm:pt-14">
          <DarkBar className="h-6 w-36 rounded-full" />
          <DarkBar className="mt-4 h-9 w-48" />
          <DarkBar className="mt-3 h-3.5 w-full max-w-[560px]" />
          <DarkBar className="mt-2 h-3.5 w-2/3 max-w-[420px]" />
        </div>
      </DarkHero>
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-4 w-32" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-full rounded-xl sm:w-56" />
            <Skeleton className="h-10 flex-1 rounded-xl sm:w-36 sm:flex-none" />
            <Skeleton className="h-10 flex-1 rounded-xl sm:w-36 sm:flex-none" />
            <Skeleton className="h-10 w-full rounded-xl sm:w-36" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <VehicleCard key={i} />)}
        </div>
      </div>
    </SkeletonPage>
  );
}
