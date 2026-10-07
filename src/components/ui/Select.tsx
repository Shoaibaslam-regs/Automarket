"use client";

import * as RSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { twMerge } from "tailwind-merge";

export type SelectOption = { value: string; label: React.ReactNode };

// Radix reserves "" for "no selection", so options whose value is "" (e.g. "All makes")
// are mapped to this sentinel internally and back to "" in onChange.
const EMPTY = "__am_empty__";
const toInternal = (v: string) => (v === "" ? EMPTY : v);
const toExternal = (v: string) => (v === EMPTY ? "" : v);

const TRIGGER_SIZES = {
  sm: "h-8 gap-1.5 rounded-lg px-2.5 text-xs",
  md: "h-10 gap-2 rounded-xl px-3 text-sm",
  lg: "h-11 gap-2 rounded-xl px-3.5 text-sm",
} as const;

/**
 * Styled, accessible replacement for the native <select>.
 * Keeps the same value/onChange contract (strings in, strings out) so swapping it in
 * doesn't change any form or filter behaviour. Keyboard, typeahead and touch are handled by Radix.
 */
export default function Select({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  name,
  required,
  disabled,
  size = "md",
  className,
  style,
  contentClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  size?: keyof typeof TRIGGER_SIZES;
  /** Extra classes for the trigger (merged, so they can override defaults). */
  className?: string;
  /** Inline styles for the trigger, for callers that colour it per value. */
  style?: React.CSSProperties;
  contentClassName?: string;
}) {
  const hasMatch = options.some(o => o.value === value);

  return (
    <RSelect.Root
      value={hasMatch ? toInternal(value) : ""}
      onValueChange={v => onChange(toExternal(v))}
      name={name}
      required={required}
      disabled={disabled}
    >
      <RSelect.Trigger
        aria-label={ariaLabel}
        style={style}
        className={twMerge(
          "inline-flex w-full min-w-0 items-center justify-between border border-slate-200 bg-white font-medium text-slate-800 outline-none transition",
          "hover:border-slate-300 focus-visible:border-slate-900 focus-visible:ring-2 focus-visible:ring-slate-900/10",
          "data-[state=open]:border-slate-900 data-[state=open]:ring-2 data-[state=open]:ring-slate-900/10",
          "data-[placeholder]:font-normal data-[placeholder]:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50",
          TRIGGER_SIZES[size],
          className
        )}
      >
        <span className="min-w-0 truncate text-left">
          <RSelect.Value placeholder={placeholder} />
        </span>
        <RSelect.Icon className="flex-shrink-0 opacity-60">
          <ChevronDown size={size === "sm" ? 13 : 15} strokeWidth={2} />
        </RSelect.Icon>
      </RSelect.Trigger>

      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className={twMerge(
            "z-[1000] max-h-[min(320px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-24px)] overflow-hidden",
            "rounded-xl border border-slate-200 bg-white shadow-[0_10px_32px_-8px_rgba(15,23,42,0.22)] animate-[fadeDown_0.14s_ease]",
            contentClassName
          )}
        >
          <RSelect.Viewport className="p-1">
            {options.map(o => (
              <RSelect.Item
                key={o.value}
                value={toInternal(o.value)}
                className={twMerge(
                  "relative flex min-h-10 cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-9 text-sm text-slate-700 outline-none sm:min-h-9",
                  "data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900",
                  "data-[state=checked]:font-semibold data-[state=checked]:text-slate-900",
                  "data-[disabled]:pointer-events-none data-[disabled]:opacity-40"
                )}
              >
                <RSelect.ItemText>{o.label}</RSelect.ItemText>
                <RSelect.ItemIndicator className="absolute right-3 inline-flex items-center text-slate-900">
                  <Check size={14} strokeWidth={2.5} />
                </RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}

/** Builds options from a plain string list, e.g. ["NEW","GOOD"] with an optional label formatter. */
export function toOptions(values: readonly string[], label: (v: string) => React.ReactNode = v => v): SelectOption[] {
  return values.map(v => ({ value: v, label: label(v) }));
}
