import Skeleton from "@/components/ui/Skeleton";

export default function ListingDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <Skeleton className="aspect-[16/10] rounded-none" />
              <div className="flex gap-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-20" />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-7 w-32" />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-6 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2.5 rounded-xl border border-gray-200 bg-white p-6">
              <Skeleton className="mb-4 h-4 w-28" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-11/12" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <Skeleton className="mb-4 h-4 w-16" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
              <Skeleton className="mt-4 h-10 w-full" />
              <Skeleton className="mt-2 h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
