import Skeleton from "@/components/ui/Skeleton";
import { SkeletonPage, VehicleCard, VehicleRow } from "@/components/ui/PageSkeleton";

/** Browse: the plain header with search and type tabs, the filter sidebar (desktop), the toolbar and the results. */
export default function ListingsLoading() {
  return (
    <SkeletonPage>
      <div className="mx-auto max-w-[1280px] px-4 pt-5 sm:px-6 sm:pt-9">
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Skeleton className="h-7 w-40 sm:h-8 sm:w-44" />
              <Skeleton className="mt-2 h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="mt-1 h-5 w-24 flex-shrink-0 lg:hidden" />
          </div>
          <Skeleton className="mt-4 h-[46px] w-full rounded-xl lg:mt-0 lg:max-w-md" />
        </div>
        <div className="mt-4 flex gap-6 border-b border-slate-200 pb-2.5">
          {["w-6", "w-14", "w-14", "w-[84px]"].map(w => <Skeleton key={w} className={`h-4 ${w}`} />)}
          <Skeleton className="ml-auto hidden h-4 w-24 lg:block" />
        </div>
      </div>
      <div className="mx-auto max-w-[1280px] px-4 pb-6 pt-4 sm:px-6 sm:py-8">
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
            {/* Toolbar: on phones [count … Hide sold] then [Filters | sort | view] with no card; one row in a card on wider screens */}
            <div className="mb-4 space-y-2.5 sm:mb-5 sm:flex sm:items-center sm:gap-2 sm:space-y-0 sm:rounded-2xl sm:border sm:border-slate-200/80 sm:bg-white sm:px-4 sm:py-2.5 [&>*:first-child]:sm:mr-auto">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3.5 w-16 sm:hidden" />
              </div>
              <div className="grid grid-cols-[90px_minmax(0,1fr)_80px] gap-2 sm:flex">
                <Skeleton className="hidden h-10 rounded-xl sm:block sm:w-40" />
                <Skeleton className="h-10 rounded-xl sm:w-28 lg:hidden" />
                <Skeleton className="h-10 rounded-xl sm:w-[190px]" />
                <Skeleton className="h-10 rounded-xl sm:w-20" />
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
