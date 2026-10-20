import Skeleton from "@/components/ui/Skeleton";
import { SkeletonPage, TitleBlock, VehicleCard } from "@/components/ui/PageSkeleton";

/** Saved: Saved searches (with their alert note), then the saved vehicles grid. */
export default function SavedLoading() {
  return (
    <SkeletonPage>
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-10">
        <TitleBlock eyebrow lines={0} className="mb-8" />
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-2 h-3 w-72 max-w-full" />
        <Skeleton className="mb-10 mt-4 h-28 w-full rounded-2xl" />
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="grid grid-cols-2 gap-2.5 min-[400px]:gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <VehicleCard key={i} />)}
        </div>
      </div>
    </SkeletonPage>
  );
}
