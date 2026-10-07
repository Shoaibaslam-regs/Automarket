import { twMerge } from "tailwind-merge";

/** Small unread-count pill used on nav items. Renders nothing at 0. */
export function CountBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} new`}
      className={twMerge("inline-flex h-[18px] min-w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-[#cf222e] px-[5px] text-[10.5px] font-bold leading-none text-white tabular-nums", className)}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/** Dot for compact triggers (avatar, hamburger) that hide the individual counts. */
export function NotificationDot({ show, className = "" }: { show: boolean; className?: string }) {
  if (!show) return null;
  return (
    <span
      aria-hidden
      className={twMerge("pointer-events-none absolute h-2.5 w-2.5 rounded-full bg-[#cf222e] ring-2 ring-white", className)}
    />
  );
}
