import { RecordCard, TitleBlock } from "@/components/ui/PageSkeleton";

/** My purchases: title with Browse vehicles, then purchase cards (two columns on wide screens). */
export default function PurchasesLoading() {
  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)] px-4 py-8 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="mx-auto max-w-[900px]">
        <TitleBlock action className="mb-6" />
        <div className="grid items-start gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <RecordCard key={i} />)}
        </div>
      </div>
    </div>
  );
}
