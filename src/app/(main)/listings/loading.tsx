import Skeleton from "@/components/ui/Skeleton";
import { DarkBar, DarkHero, SkeletonPage, VehicleCard, VehicleRow } from "@/components/ui/PageSkeleton";

/** Browse: the dark hero with search and type chips, the filter sidebar (desktop), the toolbar and the results. */
export default function ListingsLoading() {
  return (
    <SkeletonPage>
      <DarkHero>
        <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-8 sm:px-6 sm:pb-12 sm:pt-12">
          <DarkBar className="h-3 w-24" />
          <DarkBar className="mt-3 h-7 w-56 sm:h-10 sm:w-80" />
          <DarkBar className="mt-3 h-4 w-full max-w-md" />
          <DarkBar className="mt-6 h-[52px] w-full max-w-2xl rounded-2xl" />
          <div className="mt-4 flex gap-2">
            {[48, 80, 80, 92].map(w => <DarkBar key={w} className="h-8 rounded-full" style={{ width: w }} />)}
          </div>
        </div>
      </DarkHero>
      <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:gap-8">
          <aside className="hidden space-y-5 rounded-[22px] border border-slate-200/80 bg-white p-5 lg:block">
            <Skeleton className="h-4 w-20" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            ))}
          </aside>
          <div className="min-w-0">
            {/* Toolbar: on phones the count, then [Hide sold | view], then [Filters | sort]; one row on wider screens */}
            <div className="mb-5 space-y-2.5 rounded-2xl border border-slate-200/80 bg-white px-3 py-2.5 sm:flex sm:items-center sm:gap-2 sm:space-y-0 sm:px-4 [&>*:first-child]:sm:mr-auto">
              <Skeleton className="h-4 w-36" />
              <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-2 sm:flex">
                <Skeleton className="h-10 rounded-xl sm:w-40" />
                <Skeleton className="h-10 rounded-xl sm:w-20" />
              </div>
              <div className="grid grid-cols-[100px_minmax(0,1fr)] gap-2 sm:flex">
                <Skeleton className="h-10 rounded-xl sm:w-28 lg:hidden" />
                <Skeleton className="h-10 rounded-xl sm:w-[190px]" />
              </div>
            </div>
            {/* Phones open in the list view, wider screens in the grid */}
            <div className="flex flex-col gap-3 sm:hidden">
              {Array.from({ length: 4 }).map((_, i) => <VehicleRow key={i} />)}
            </div>
            <div className="hidden grid-cols-2 gap-5 sm:grid md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <VehicleCard key={i} />)}
            </div>
          </div>
        </div>
      </div>
    </SkeletonPage>
  );
}
