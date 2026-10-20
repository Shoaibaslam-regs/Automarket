import Skeleton from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="rounded-[28px] bg-white p-5 ring-1 ring-slate-200/80 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-4">
              <Skeleton className="h-14 w-14 flex-shrink-0 rounded-full sm:h-16 sm:w-16" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-5 w-40" />
              </div>
            </div>
            {/* Post a listing and Browse vehicles: full width on phones, beside the name on wider screens */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Skeleton className="h-11 w-full rounded-xl sm:w-36" />
              <Skeleton className="h-11 w-full rounded-xl sm:w-40" />
            </div>
          </div>
          <Skeleton className="mt-6 h-16 w-full rounded-2xl" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-3xl bg-white p-4 ring-1 ring-slate-200/70 sm:p-5">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200/70">
                <Skeleton className="aspect-[16/9] w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full rounded-3xl" />
            <Skeleton className="h-40 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
