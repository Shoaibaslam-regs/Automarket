import { twMerge } from "tailwind-merge";

/**
 * Small unread-count pill used on nav items. Renders nothing at 0. Counts above `max` show as "9+" / "99+".
 * Pass `hidden` when the surrounding link already says the count (aria-label), so it isn't read twice.
 */
export function CountBadge({ count, className = "", max = 99, hidden = false }: { count: number; className?: string; max?: number; hidden?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={hidden ? undefined : `${count} new`}
      aria-hidden={hidden || undefined}
      className={twMerge("inline-flex h-[18px] min-w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-[var(--gh-cf222e)] px-[5px] text-[10.5px] font-bold leading-none text-white tabular-nums", className)}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}

/** Dot for compact triggers (avatar, hamburger) that hide the individual counts. */
export function NotificationDot({ show, className = "" }: { show: boolean; className?: string }) {
  if (!show) return null;
  return (
    <span
      aria-hidden
      className={twMerge("pointer-events-none absolute h-2.5 w-2.5 rounded-full bg-[var(--gh-cf222e)] ring-2 ring-white", className)}
    />
  );
}
