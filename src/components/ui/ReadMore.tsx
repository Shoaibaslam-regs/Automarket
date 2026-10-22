"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Long text cut to `lines` lines with a "Read more" link, so the details below stay close on phones.
 * The link only appears when the text is actually cut off.
 */
export default function ReadMore({ text, lines = 5, className = "" }: { text: string; lines?: number; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => { if (!open) setCut(el.scrollHeight > el.clientHeight + 2); };
    queueMicrotask(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, text]);

  return (
    <div>
      <p
        ref={ref}
        className={`whitespace-pre-line ${className}`}
        style={open ? undefined : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}
      >
        {text}
      </p>
      {(cut || open) && (
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          {open ? "Show less" : "Read more"}
          <ChevronDown size={15} className={`transition ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}
