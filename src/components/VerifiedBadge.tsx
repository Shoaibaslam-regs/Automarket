import { BadgeCheck } from "lucide-react";

const TITLE = "Verified business: checked by the AutoMarket team";

/**
 * The blue Verified tick for businesses with the Verified badge add-on.
 * `icon` is the bare tick for tight spots (cards); `pill` adds the word. `tone="dark"` is for dark headers.
 */
export default function VerifiedBadge({
  variant = "pill",
  tone = "light",
  size,
  className = "",
}: {
  variant?: "icon" | "pill";
  tone?: "light" | "dark";
  size?: number;
  className?: string;
}) {
  // theme-static keeps the white tick white in dark mode
  const tick = (s: number) => <BadgeCheck size={s} className="theme-static flex-shrink-0 fill-sky-500 text-white" aria-hidden />;

  if (variant === "icon") {
    return (
      <span title={TITLE} aria-label="Verified business" role="img" className={`inline-flex flex-shrink-0 ${className}`}>
        {tick(size ?? 15)}
      </span>
    );
  }
  return (
    <span
      title={TITLE}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${
        tone === "dark" ? "bg-sky-400/15 text-sky-200 ring-sky-300/30" : "bg-sky-50 text-sky-700 ring-sky-200"
      } ${className}`}
    >
      {tick(size ?? 14)} Verified
    </span>
  );
}
