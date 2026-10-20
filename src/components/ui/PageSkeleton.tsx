import Skeleton from "@/components/ui/Skeleton";

/**
 * Building blocks for the loading.tsx placeholders. Each loading file copies its page's real layout (container
 * width, dark hero, header, grid columns) so nothing jumps when the page arrives; keep them in step when a page's
 * layout changes.
 */

/** A placeholder bar on a dark (bg-slate-950) section. */
export function DarkBar({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden style={style} className={`animate-pulse rounded-lg bg-white/10 ${className}`} />;
}

/** Full-page wrapper with the marketplace background. */
export function SkeletonPage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`min-h-screen bg-slate-50 ${className}`} aria-busy="true" aria-label="Loading">
      {children}
    </div>
  );
}

/** The dark glow header used by Browse, Deals and dealer pages. */
export function DarkHero({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`theme-static relative overflow-hidden bg-slate-950 ${className}`}>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.3),transparent_55%)]" />
      <div className="relative">{children}</div>
    </section>
  );
}

/** A page title block: optional eyebrow, title, description lines and a button (below on phones, right on wider screens). */
export function TitleBlock({ eyebrow, lines = 1, action, className = "" }: { eyebrow?: boolean; lines?: number; action?: boolean; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="min-w-0 flex-1">
        {eyebrow && <Skeleton className="mb-2 h-3 w-24" />}
        <Skeleton className="h-7 w-44 sm:w-56" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`mt-2 h-3.5 ${i === lines - 1 ? "w-2/3 sm:w-1/2" : "w-full sm:w-3/4"}`} />
        ))}
      </div>
      {action && <Skeleton className="h-10 w-36 flex-shrink-0 rounded-xl" />}
    </div>
  );
}

/** A grid ListingCard (or DealCard): photo, then make, title, price and a spec line. */
export function VehicleCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-2.5 w-1/3" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-2.5 w-2/3" />
      </div>
    </div>
  );
}

/** A list-layout ListingCard: photo on the left, details beside it (Browse on phones). */
export function VehicleRow() {
  return (
    <div className="flex gap-3 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200/80">
      <Skeleton className="aspect-[4/3] w-[42%] flex-shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2.5 py-2 pr-2">
        <Skeleton className="h-2.5 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-2.5 w-2/3" />
      </div>
    </div>
  );
}

/** A compact record card (booking, purchase): thumbnail, three lines, the price, then a footer of buttons. */
export function RecordCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
      <div className="p-3.5 sm:p-4">
        <div className="flex gap-3">
          <Skeleton className="h-14 w-16 flex-shrink-0 rounded-xl sm:h-16 sm:w-20" />
          <div className="flex-1 space-y-2 pt-0.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
        <Skeleton className="mt-4 h-5 w-28" />
        <Skeleton className="mt-1.5 h-3 w-20" />
      </div>
      <div className="flex items-center gap-1.5 border-t border-slate-200/80 px-3.5 py-2.5 sm:px-4">
        <Skeleton className="h-9 w-16" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="ml-auto h-9 w-9" />
      </div>
    </div>
  );
}

/** The business console's page header: back link, title and description, with the buttons below on phones. */
export function ConsoleHeader({ buttons = 2 }: { buttons?: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-5 sm:px-6">
      <div className="w-full min-w-0 sm:w-auto sm:flex-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-5 w-32" />
        <Skeleton className="mt-2 h-3 w-full max-w-[340px]" />
        <Skeleton className="mt-1.5 h-3 w-1/3 sm:hidden" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: buttons }).map((_, i) => <Skeleton key={i} className="h-10 w-28 rounded-lg" />)}
      </div>
    </div>
  );
}

/** Stat cards: a label with an icon, then a number. */
export function StatCards({ count = 4, className = "grid-cols-2 lg:grid-cols-4" }: { count?: number; className?: string }) {
  return (
    <div className={`grid gap-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[var(--gh-e1e4e8)] bg-white p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <Skeleton className="mt-3 h-6 w-14" />
        </div>
      ))}
    </div>
  );
}

/** A row of filter chips. */
export function Chips({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => <Skeleton key={i} className={`h-8 rounded-full ${i === 0 ? "w-14" : "w-20"}`} />)}
    </div>
  );
}

/**
 * Generic fallback: a title, then a grid of vehicle cards or a list of record cards. Prefer the page-shaped
 * placeholders above; the business console uses `tone="business"` (the console page header and stats).
 */
export default function PageSkeleton({ variant = "grid", tone = "main" }: { variant?: "grid" | "list"; tone?: "main" | "business" }) {
  if (tone === "business") {
    return (
      <div className="min-h-screen bg-[var(--gh-f6f8fa)]" aria-busy="true" aria-label="Loading">
        <ConsoleHeader />
        <div className="space-y-4 px-4 py-5 sm:px-6">
          <StatCards />
          <Chips />
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="grid gap-3 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <RecordCard key={i} />)}
          </div>
        </div>
      </div>
    );
  }
  return (
    <SkeletonPage>
      <div className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-10">
        <TitleBlock eyebrow className="mb-6" />
        {variant === "grid" ? (
          <div className="grid grid-cols-2 gap-2.5 min-[400px]:gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <VehicleCard key={i} />)}
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <RecordCard key={i} />)}
          </div>
        )}
      </div>
    </SkeletonPage>
  );
}
