import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * A section's heading: the title, then a thin indigo→fuchsia line across (like the menu group headings, so the
 * sections read as clearly divided), and a quiet "View all" when the section has a page of its own.
 */
export default function SectionHeader({ title, href, line = true }: { title: string; href?: string; line?: boolean }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 className="min-w-0 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</h2>
      {line ? (
        <span aria-hidden className="h-px min-w-6 flex-1 bg-gradient-to-r from-indigo-500/40 via-fuchsia-500/20 to-transparent" />
      ) : (
        <span className="flex-1" />
      )}
      {href && (
        <Link
          href={href}
          className="group inline-flex flex-shrink-0 items-center gap-1 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          View all
          <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
