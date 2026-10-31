import { DarkBar, DarkHero, PhotoSkeleton, SkeletonPage } from "@/components/ui/PageSkeleton";
import Skeleton from "@/components/ui/Skeleton";

/** /blog while it loads: the dark header, the category row, a large first post and a grid of cards. */
export default function BlogLoading() {
  return (
    <SkeletonPage>
      <DarkHero className="px-4 pb-12 pt-12 sm:pt-16">
        <div className="mx-auto max-w-[1180px]">
          <DarkBar className="h-6 w-28 rounded-full" />
          <DarkBar className="mt-4 h-9 w-72 max-w-full" />
          <DarkBar className="mt-3 h-4 w-96 max-w-full" />
        </div>
      </DarkHero>
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:py-10">
        <div className="mb-6 flex gap-1.5">{["w-20", "w-28", "w-24", "w-24"].map((w, i) => <Skeleton key={i} className={`h-8 rounded-full ${w}`} />)}</div>
        <div className="mb-6 flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80 md:flex-row">
          <PhotoSkeleton className="aspect-[16/9] md:aspect-auto md:min-h-[300px] md:w-[55%]" size="lg" />
          <div className="flex-1 space-y-3 p-6"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-4/5" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
              <PhotoSkeleton className="aspect-[16/9]" />
              <div className="space-y-2 p-4"><Skeleton className="h-2.5 w-20" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-3 w-full" /></div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
