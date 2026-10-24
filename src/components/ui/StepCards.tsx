/**
 * Numbered step cards joined by arrows pointing to the next card: down between stacked cards on phones, across
 * from `sm` up. Plain markup (works in server components). Used by the home page's "How it works" and the pricing
 * page's "How payment works".
 */
export default function StepCards({ steps, className = "" }: { steps: { title: string; desc: string }[]; className?: string }) {
  return (
    <ol className={`flex flex-col items-stretch sm:flex-row ${className}`}>
      {steps.map((step, i) => (
        <li key={step.title} className="contents">
          <div className="flex flex-1 gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-col sm:items-center sm:p-6 sm:text-center">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white ring-4 ring-slate-50">
              {i + 1}
            </span>
            <div>
              <p className="text-[15px] font-semibold text-slate-900">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{step.desc}</p>
            </div>
          </div>
          {i < steps.length - 1 && <Arrow />}
        </li>
      ))}
    </ol>
  );
}

/** A still arrow from one card to the next. */
function Arrow() {
  return (
    <div aria-hidden className="flex h-9 items-center justify-center sm:h-auto sm:w-12 sm:flex-shrink-0">
      {/* One horizontal arrow, turned to point down on phones */}
      <div className="flex w-9 rotate-90 items-center sm:w-10 sm:rotate-0">
        <span className="h-[2px] flex-1 rounded-full bg-gradient-to-r from-slate-200 to-sky-300" />
        <svg viewBox="0 0 10 12" className="-ml-px h-3.5 w-3 flex-shrink-0 text-sky-400">
          <path d="M1.5 1.5l6.5 4.5-6.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
