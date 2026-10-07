import Skeleton from "@/components/ui/Skeleton";

function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-1.5 ring-1 ring-slate-200/80 sm:rounded-[22px] sm:p-2">
      <Skeleton className="aspect-[4/3] rounded-xl sm:rounded-2xl" />
      <div className="space-y-2.5 px-1.5 pb-1.5 pt-3 sm:px-2 sm:pb-2 sm:pt-4">
        <Skeleton className="h-2.5 w-1/3 rounded" />
        <Skeleton className="h-3.5 w-4/5 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
      </div>
    </div>
  );
}

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-slate-950">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center px-4 pb-12 pt-12 sm:pb-16 sm:pt-20">
          <div className="h-7 w-48 animate-pulse rounded-full bg-white/10" />
          <div className="mt-5 h-10 w-full max-w-2xl animate-pulse rounded-xl bg-white/10 sm:h-14" />
          <div className="mt-4 h-5 w-full max-w-md animate-pulse rounded-lg bg-white/10" />
          <div className="mt-9 h-16 w-full max-w-2xl animate-pulse rounded-2xl bg-white/10" />
        </div>
      </section>
      <div className="mx-auto max-w-[1180px] px-4 py-10">
        <Skeleton className="mb-5 h-7 w-48" />
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
