"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import type { ThemeChoice } from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Light / Dark / System switch. `tone="dark"` styles it for always-dark surfaces
 * (business sidebar, menu headers); `compact` shows icons only.
 */
export default function ThemeToggle({ tone = "light", compact = false, className = "" }: {
  tone?: "light" | "dark";
  compact?: boolean;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const dark = tone === "dark";
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={`inline-flex rounded-lg p-0.5 ${dark ? "bg-white/[0.06] ring-1 ring-inset ring-white/10" : "bg-slate-100 ring-1 ring-inset ring-slate-200/80"} ${className}`}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
              active
                ? dark ? "bg-white text-slate-950" : "bg-white text-slate-900 shadow-sm"
                : dark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon size={13} strokeWidth={2} />
            {!compact && label}
          </button>
        );
      })}
    </div>
  );
}

/** One-button version for tight spots: cycles Light → Dark → System. */
export function ThemeCycleButton({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const i = OPTIONS.findIndex(o => o.value === theme);
  const current = OPTIONS[i] ?? OPTIONS[2];
  const next = OPTIONS[(i + 1) % OPTIONS.length];
  const Icon = current.icon;
  return (
    <button
      type="button"
      onClick={() => setTheme(next.value)}
      aria-label={`Theme: ${current.label}. Switch to ${next.label}`}
      title={`Theme: ${current.label}`}
      className={`flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:text-slate-900 ${className}`}
    >
      <Icon size={16} />
    </button>
  );
}
