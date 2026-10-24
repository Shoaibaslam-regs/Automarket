import type { RequestSteps } from "@/lib/requestSteps";

/**
 * A request's progress (see src/lib/requestSteps.ts): one segment per step, filled in the home hero's
 * indigo → sky → emerald up to the step reached, with the current step's name in bold. `animate` fills the
 * current segment in (RequestSent uses it right after sending).
 */
export default function StepTrack({ steps, reached, animate = false, className = "" }: RequestSteps & { animate?: boolean; className?: string }) {
  return (
    <ol
      aria-label={`Progress: ${steps[reached]} (step ${reached + 1} of ${steps.length})`}
      className={`grid gap-1.5 text-[10.5px] leading-tight sm:text-[11px] ${className}`}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, i) => (
        <li key={step} className="flex min-w-0 flex-col gap-1.5" aria-current={i === reached ? "step" : undefined}>
          <span className="relative h-1 overflow-hidden rounded-full bg-slate-200">
            {i <= reached && (
              <span
                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 ${animate && i === reached ? "st-fill" : "w-full"}`}
              />
            )}
          </span>
          <span className={`truncate ${i === reached ? "font-semibold text-slate-900" : i < reached ? "text-slate-500" : "text-slate-400"}`}>{step}</span>
        </li>
      ))}
      {animate && (
        <style>{`
          .st-fill { width: 0; animation: st-fill 0.6s ease-out 1s forwards; }
          @keyframes st-fill { to { width: 100%; } }
          @media (prefers-reduced-motion: reduce) { .st-fill { animation: none; width: 100%; } }
        `}</style>
      )}
    </ol>
  );
}
