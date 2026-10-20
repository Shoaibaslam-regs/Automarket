import Skeleton from "@/components/ui/Skeleton";

export default function BookRentalLoading() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-[1000px]">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-7 w-52" />
        <Skeleton className="mb-6 mt-2 h-4 w-72 sm:mb-8" />
        <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <aside className="min-w-0 lg:order-2">
            {/* The vehicle summary: a small row on phones, a card with a photo on wide screens */}
            <div className="flex gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3 lg:block lg:p-0">
              <Skeleton className="h-20 w-24 flex-shrink-0 rounded-xl lg:aspect-[16/10] lg:h-auto lg:w-full lg:rounded-none" />
              <div className="flex-1 space-y-2.5 lg:p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-5 w-1/3" />
              </div>
            </div>
          </aside>
          <div className="min-w-0 space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 lg:order-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-72 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
