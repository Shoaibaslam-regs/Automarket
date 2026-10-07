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
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
              <Skeleton className="aspect-[16/10] rounded-none" />
              <div className="space-y-2.5 p-4">
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
