import Skeleton from "@/components/ui/Skeleton";
import { RecordCard } from "@/components/ui/PageSkeleton";

/** Bookings: title with Browse rentals, the My bookings / Received requests tabs, then booking cards. */
export default function BookingsLoading() {
  return (
    <div className="adm-page" aria-busy="true" aria-label="Loading">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <Skeleton className="mb-5 h-10 w-64 rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <RecordCard key={i} />)}
        </div>
      </div>
    </div>
  );
}
