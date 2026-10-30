"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

interface Props {
  images: string[];
  title: string;
}

/**
 * The photo gallery on listing and deal pages: a main photo with thumbnails, and a full-screen viewer.
 * The viewer is portalled to <body> above every fixed bar (the navbar and the phone contact bars used to cover
 * its close button, leaving phones with no way out). It closes with ×, Escape, a swipe down, a tap on the
 * backdrop, or the phone's Back button (opening it adds a history entry, so Back closes it instead of leaving
 * the page); swiping left or right changes the photo.
 */
export default function ImageGallery({ images, title }: Props) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  // Whether the open viewer added a history entry, which closing must then take back
  const pushed = useRef(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const count = images?.length ?? 0;

  const prev = useCallback(() => setActive(a => (a - 1 + count) % count), [count]);
  const next = useCallback(() => setActive(a => (a + 1) % count), [count]);

  function open() {
    setLightbox(true);
    try {
      window.history.pushState({ ...(window.history.state ?? {}), gallery: true }, "");
      pushed.current = true;
    } catch {
      pushed.current = false;
    }
  }
  const close = useCallback(() => {
    setLightbox(false);
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    }
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    // Back button: the entry is already gone, so just close
    const onPop = () => {
      pushed.current = false;
      setLightbox(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft" && count > 1) prev();
      else if (e.key === "ArrowRight" && count > 1) next();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [lightbox, close, prev, next, count]);

  function onTouchEnd(e: React.TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && count > 1) (dx < 0 ? next : prev)();
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
  }

  if (!count) {
    return (
      <div className="flex h-80 items-center justify-center bg-slate-100 text-sm text-slate-400">
        No image available
      </div>
    );
  }

  const roundBtn = "flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  return (
    <>
      {/* Main image: tap to open full screen */}
      <button type="button" onClick={open} aria-label="View photos full screen" className="group relative block h-80 w-full cursor-zoom-in">
        <Image
          src={images[active]}
          alt={title}
          fill
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover"
          priority
        />
        <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-90 transition group-hover:opacity-100">
          <Expand size={15} />
        </span>
        {count > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
            {active + 1} / {count}
          </span>
        )}
      </button>

      {/* Thumbnails */}
      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto bg-slate-50 p-3">
          {images.map((img, i) => (
            <button key={i} type="button" onClick={() => setActive(i)} aria-label={`Photo ${i + 1}`} aria-pressed={active === i}
              className={`relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                active === i ? "border-indigo-500" : "border-transparent hover:border-slate-300"
              }`}>
              <Image src={img} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Full-screen viewer, above every fixed bar */}
      {lightbox && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title}: photo ${active + 1} of ${count}`}
          className="fixed inset-0 z-[1500] flex select-none items-center justify-center bg-black/95"
          onClick={close}
          onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
          onTouchEnd={onTouchEnd}
        >
          {/* Top bar: counter and a large close button, clear of the phone's notch */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pb-3 pt-[max(env(safe-area-inset-top),12px)]">
            <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white">{active + 1} / {count}</span>
            <button type="button" onClick={e => { e.stopPropagation(); close(); }} aria-label="Close photos" autoFocus className={roundBtn}>
              <X size={22} />
            </button>
          </div>

          <div className="relative h-[calc(100%-140px)] w-full max-w-5xl" onClick={e => e.stopPropagation()}>
            <Image src={images[active]} alt={title} fill sizes="100vw" className="object-contain" />
          </div>

          {count > 1 && (
            <>
              <button type="button" onClick={e => { e.stopPropagation(); prev(); }} aria-label="Previous photo"
                className={`absolute left-3 top-1/2 hidden -translate-y-1/2 sm:flex ${roundBtn}`}>
                <ChevronLeft size={22} />
              </button>
              <button type="button" onClick={e => { e.stopPropagation(); next(); }} aria-label="Next photo"
                className={`absolute right-3 top-1/2 hidden -translate-y-1/2 sm:flex ${roundBtn}`}>
                <ChevronRight size={22} />
              </button>
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 pb-[max(env(safe-area-inset-bottom),14px)] pt-2">
                <div className="flex justify-center gap-1.5">
                  {images.map((_, i) => (
                    <button key={i} type="button" aria-label={`Photo ${i + 1}`}
                      onClick={e => { e.stopPropagation(); setActive(i); }}
                      className={`h-2 w-2 rounded-full transition ${active === i ? "bg-white" : "bg-white/40"}`} />
                  ))}
                </div>
                <p className="text-[11px] text-white/50 sm:hidden">Swipe to see more · swipe down to close</p>
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
