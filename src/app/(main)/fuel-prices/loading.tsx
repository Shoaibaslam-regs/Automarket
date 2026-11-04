import Skeleton from "@/components/ui/Skeleton";
import { DarkBar, DarkHero, SkeletonPage } from "@/components/ui/PageSkeleton";

/** /fuel-prices while it loads: the dark header, the petrol and diesel cards and the chart. */
export default function FuelPricesLoading() {
  const card = (i: number) => (
    <div key={i} className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
  return (
    <SkeletonPage>
      <DarkHero className="px-4 pb-12 pt-12 sm:pt-16">
        <div className="mx-auto max-w-[1180px]">
          <DarkBar className="h-6 w-28 rounded-full" />
          <DarkBar className="mt-4 h-9 w-56" />
          <DarkBar className="mt-3 h-4 w-96 max-w-full" />
        </div>
      </DarkHero>
      <div className="mx-auto max-w-[1180px] space-y-8 px-4 py-8 sm:py-10">
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map(card)}</div>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    </SkeletonPage>
  );
}
