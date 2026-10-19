"use client";

import { useEffect, useState } from "react";
import { SPLASH_KEY as KEY } from "@/lib/splash";

const BRAND = "AutoMarket-Pak";
/** Letters type at this pace; the screen fades out after the last one plus a short pause. */
const LETTER_MS = 75;
const TOTAL_MS = 450 + BRAND.length * LETTER_MS + 900;

/**
 * The installed app's opening screen: the same white background and logo as the phone's own launch screen,
 * then "AutoMarket-Pak" types out letter by letter with a blinking cursor, and the screen fades into the app.
 * Only shown when splashInitScript marked the page; ordinary browser visits never see it.
 */
export default function SplashScreen() {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("am-splash")) return;
    try { sessionStorage.setItem(KEY, "1"); } catch {}
    const t = setTimeout(() => { root.classList.remove("am-splash"); setGone(true); }, TOTAL_MS + 400);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;

  return (
    <div id="am-splash" aria-hidden className="theme-static">
      <style>{`
        #am-splash { display: none; }
        html.am-splash #am-splash {
          display: flex; position: fixed; inset: 0; z-index: 2147483000; flex-direction: column; align-items: center; justify-content: center;
          background: #ffffff; animation: am-splash-out 380ms ease ${TOTAL_MS}ms forwards;
        }
        html.am-splash body { overflow: hidden; }
        #am-splash img { width: 112px; height: 112px; animation: am-splash-logo 600ms cubic-bezier(.2,.8,.2,1) both; }
        #am-splash .am-word { margin-top: 18px; display: flex; align-items: center; font: 800 26px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; letter-spacing: -0.02em; color: #0f172a; }
        #am-splash .am-word span { opacity: 0; animation: am-splash-type 1ms linear forwards; }
        #am-splash .am-word .am-pak { color: #e11d48; }
        #am-splash .am-caret { width: 3px; height: 28px; margin-left: 3px; border-radius: 2px; background: #e11d48; animation: am-splash-caret 700ms steps(1) infinite; }
        #am-splash .am-tag { margin-top: 10px; font: 500 12px system-ui, sans-serif; letter-spacing: 0.18em; text-transform: uppercase; color: #94a3b8; opacity: 0; animation: am-splash-fade 400ms ease ${450 + BRAND.length * LETTER_MS}ms forwards; }
        @keyframes am-splash-logo { from { opacity: 0; transform: scale(.86); } to { opacity: 1; transform: none; } }
        @keyframes am-splash-type { to { opacity: 1; } }
        @keyframes am-splash-caret { 50% { opacity: 0; } }
        @keyframes am-splash-fade { to { opacity: 1; } }
        @keyframes am-splash-out { to { opacity: 0; visibility: hidden; } }
        @media (prefers-reduced-motion: reduce) {
          #am-splash img, #am-splash .am-word span, #am-splash .am-tag { animation-duration: 1ms !important; animation-delay: 0ms !important; }
        }
      `}</style>
      {/* eslint-disable-next-line @next/next/no-img-element -- precached icon, same as the phone's launch screen */}
      <img src="/icons/icon-192.png" alt="" />
      <div className="am-word">
        {BRAND.split("").map((ch, i) => (
          <span key={i} className={i >= BRAND.indexOf("-") ? "am-pak" : undefined} style={{ animationDelay: `${450 + i * LETTER_MS}ms` }}>{ch}</span>
        ))}
        <i className="am-caret" />
      </div>
      <p className="am-tag">Buy · Sell · Rent</p>
    </div>
  );
}
