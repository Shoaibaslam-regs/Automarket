import Skeleton from "@/components/ui/Skeleton";

/** Messages: the conversation list (full width on phones) beside the chat area. */
export default function MessagesLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)] bg-[var(--gh-f6f8fa)]" aria-busy="true" aria-label="Loading">
      <div className="w-full flex-shrink-0 border-r border-[var(--gh-e1e4e8)] bg-white md:w-[300px]">
        <div className="flex items-center justify-between border-b border-[var(--gh-e1e4e8)] px-4 py-3.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-[var(--gh-f6f8fa)] px-4 py-3">
            <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden flex-1 flex-col items-center justify-center gap-3 md:flex">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
    </div>
  );
}
