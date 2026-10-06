"use client";

import { useState } from "react";
import { Check, Copy, Search, type LucideIcon } from "lucide-react";

export type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "violet" | "orange";

const BADGE_TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
};

const ICON_TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-600",
  blue: "bg-sky-100 text-sky-700",
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-rose-100 text-rose-700",
  violet: "bg-violet-100 text-violet-700",
  orange: "bg-orange-100 text-orange-700",
};

export const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "green",
  CONFIRMED: "green",
  COMPLETED: "neutral",
  INACTIVE: "neutral",
  PENDING: "amber",
  SOLD: "blue",
  RENTED: "orange",
  CANCELLED: "red",
  ADMIN: "violet",
  USER: "neutral",
  FREE: "neutral",
  PRO: "blue",
  BUSINESS: "green",
};

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        {Icon && (
          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${ICON_TONES[tone]}`}>
            <Icon size={16} strokeWidth={2} />
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900 tabular-nums sm:text-[28px]">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">{children}</div>;
}

export function Panel({
  title,
  description,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${BADGE_TONES[tone]}`}
    >
      {typeof children === "string" ? children.toLowerCase() : children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{status}</Badge>;
}

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-500",
  "from-sky-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-slate-600 to-slate-800",
];

export function Avatar({ name, size = 36 }: { name?: string; size?: number }) {
  const label = name?.trim() || "?";
  const hash = [...label].reduce((h, c) => h + c.charCodeAt(0), 0);
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-white shadow-sm ${AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]}`}
    >
      {initials}
    </span>
  );
}

/** Avatar + name over email, the one way user identity is shown across the admin panel. */
export function UserCell({
  name,
  email,
  meta,
  size = 36,
}: {
  name?: string;
  email?: string;
  meta?: React.ReactNode;
  size?: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={name || email} size={size} />
      <div className="min-w-0 leading-tight">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{name || "No name"}</p>
          {meta}
        </div>
        {email && <p className="mt-0.5 truncate text-[13px] text-slate-500">{email}</p>}
      </div>
    </div>
  );
}

export function CopyId({ id }: { id?: string }) {
  const [copied, setCopied] = useState(false);
  if (!id) return null;
  return (
    <button
      type="button"
      title="Copy ID"
      onClick={e => {
        e.preventDefault();
        navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-inset transition ${
        copied ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-50 text-slate-400 ring-slate-200 hover:text-slate-700"
      }`}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {id.slice(-6)}
    </button>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
      />
    </div>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  allLabel,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  allLabel: string;
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
    >
      <option value="">{allLabel}</option>
      {options.map(o => (
        <option key={o} value={o}>
          {o.charAt(0) + o.slice(1).toLowerCase()}
        </option>
      ))}
    </select>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: React.ReactNode }[];
}) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-xl bg-slate-100 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition ${
            value === o.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Responsive data table. From `md` up it's a column grid; `cols` must use fixed or `minmax(0,…fr)`
 * tracks so every row resolves to identical widths and stays aligned with the header.
 * Below `md` the first column becomes the card title and the rest a labelled two-column grid.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  cols,
  loading,
  empty,
}: {
  columns: { header: string; cell: (row: T) => React.ReactNode; full?: boolean; hideLabel?: boolean; align?: "right" }[];
  rows: T[];
  rowKey: (row: T) => string;
  cols: string;
  loading?: boolean;
  empty: string;
}) {
  const [primary, ...rest] = columns;
  const alignClass = (c: { align?: "right" }) => (c.align === "right" ? "md:justify-self-end md:text-right" : "");

  return (
    <Panel>
      <div className={`hidden items-center gap-x-6 border-b border-slate-100 bg-slate-50/80 px-6 py-3 md:grid ${cols}`}>
        {columns.map(c => (
          <p key={c.header} className={`text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 ${alignClass(c)}`}>
            {c.header}
          </p>
        ))}
      </div>

      {loading ? (
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-6 py-4">
              <div className="h-9 w-9 animate-pulse rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/4 animate-pulse rounded bg-slate-100" />
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm text-slate-500">{empty}</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {rows.map(row => (
            <div
              key={rowKey(row)}
              className={`group px-4 py-4 transition-colors hover:bg-slate-50/70 md:grid md:items-center md:gap-x-6 md:px-6 md:py-3.5 ${cols}`}
            >
              <div className="min-w-0">{primary.cell(row)}</div>

              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-100 md:contents">
                {rest.map(c => (
                  <div key={c.header} className={`min-w-0 ${c.full ? "col-span-2 md:col-span-1" : ""} ${alignClass(c)}`}>
                    {!c.hideLabel && (
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400 md:hidden">{c.header}</p>
                    )}
                    {c.cell(row)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export const btn = {
  base: "inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
  secondary: "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:ring-slate-300",
  danger: "bg-white text-rose-600 ring-1 ring-inset ring-rose-200 hover:bg-rose-50",
  warn: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 hover:bg-amber-100",
};
