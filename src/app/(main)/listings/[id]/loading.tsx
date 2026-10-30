import Skeleton from "@/components/ui/Skeleton";

export default function ListingDetailLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-5 sm:pt-6">
        {/* Breadcrumb: Marketplace › Make › Model */}
        <Skeleton className="mb-4 h-3.5 w-48" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <Skeleton className="aspect-[16/10] rounded-none" />
              <div className="flex gap-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-20" />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6">
              <div className="flex justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  {/* City · listed date · ad ID */}
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-7 w-32" />
              </div>
              {/* Save · Compare · Share icons */}
              <div className="mt-4 flex gap-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-8 rounded-full" />)}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 sm:grid-cols-3">
                {/* Specs: an icon beside each value */}
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Skeleton className="h-[18px] w-[18px] rounded-md" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2.5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6">
              <Skeleton className="mb-4 h-4 w-28" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-11/12" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
              <Skeleton className="mb-4 h-4 w-16" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
              {/* Call, then WhatsApp | Message, then the safety line */}
              <Skeleton className="mt-4 h-10 w-full rounded-xl" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Skeleton className="h-10 rounded-xl" />
                <Skeleton className="h-10 rounded-xl" />
              </div>
              <Skeleton className="mt-4 h-3 w-5/6" />
            </div>
            {/* The buy box and the financing calculator */}
            <div className="space-y-2.5 rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="mt-1 h-10 w-full" />
            </div>
            <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
