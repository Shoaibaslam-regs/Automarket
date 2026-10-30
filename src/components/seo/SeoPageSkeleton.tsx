import Skeleton from "@/components/ui/Skeleton";
import { VehicleCard } from "@/components/ui/PageSkeleton";

/** Loading placeholder for the search-landing pages (SeoListingPage): breadcrumb, heading, intro, button, grid. */
export default function SeoPageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1280px] px-4 pb-12 pt-5 sm:px-6 sm:pt-8">
        <Skeleton className="mb-4 h-3.5 w-56" />
        <Skeleton className="h-7 w-2/3 max-w-md" />
        <div className="mt-3 max-w-3xl space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>
        <Skeleton className="mt-4 h-10 w-52 rounded-xl" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <VehicleCard key={i} />)}
        </div>
      </div>
    </div>
  );
}
