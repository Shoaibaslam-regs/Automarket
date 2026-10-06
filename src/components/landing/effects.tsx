"use client";

import { useEffect, useRef } from "react";

/** Fades/slides children in the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.visible = "true";
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`lp-reveal ${className}`}
      style={{ "--lp-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

/** Counts from 0 to `value` (ease-out) when it scrolls into view. Writes text directly to avoid re-renders. */
export function CountUp({ value, suffix = "", duration = 1600 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    if (!reduce) el.textContent = "0" + suffix;

    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      if (reduce) return;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(value * eased).toLocaleString() + suffix;
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, suffix, duration]);

  // Server/first paint shows the final number, so it's correct without JS
  return (
    <span ref={ref} className="tabular-nums">
      {value.toLocaleString() + suffix}
    </span>
  );
}

/** Pointer handler that feeds --mx/--my to an element for `.lp-spotlight` and tilt effects. */
export function trackPointer(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
  el.style.setProperty("--px", `${((e.clientX - r.left) / r.width - 0.5).toFixed(3)}`);
  el.style.setProperty("--py", `${((e.clientY - r.top) / r.height - 0.5).toFixed(3)}`);
}
