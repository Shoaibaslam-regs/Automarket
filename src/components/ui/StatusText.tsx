import type { ReactNode } from "react";

/**
 * A status (Pending, Sold, Confirmed…) as coloured text with a small dot, without a filled pill.
 * Pass `color` as a CSS colour (`var(--gh-…)`), or a Tailwind `text-*` class in `className`.
 */
export default function StatusText({ children, color, className = "" }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span className={`inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold ${className}`} style={color ? { color } : undefined}>
      <span aria-hidden className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current" />
      {children}
    </span>
  );
}

/** The text colour classes of a "bg-… text-… ring-…" pill style, for showing the same status as StatusText. */
export const textTone = (cls: string) => cls.split(" ").filter(c => c.startsWith("text-")).join(" ");
