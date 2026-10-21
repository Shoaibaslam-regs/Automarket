"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { SPLASH_KEY as KEY } from "@/lib/splash";

// Framer Motion is only downloaded when the splash actually shows (installed-app launches), not on normal visits
const SplashAnimation = dynamic(() => import("./SplashAnimation"), { ssr: false });

/** If the animation can't load (offline, slow chunk), the splash still leaves after this long */
const FAILSAFE_MS = 6000;
const FADE_MS = 380;

/**
 * The installed app's opening screen. The server-rendered cover (white, logo in the middle, the same as the
 * phone's own launch screen) is shown by CSS before anything paints, once splashInitScript has marked <html>.
 * Then SplashAnimation plays the car-and-name animation below the logo, and the cover fades into the app.
 * Ordinary browser visits never see it.
 */
export default function SplashScreen() {
  const [phase, setPhase] = useState<"idle" | "playing" | "leaving" | "gone">("idle");

  const finish = useCallback(() => {
    setPhase(p => (p === "playing" ? "leaving" : p));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("am-splash")) {
      queueMicrotask(() => setPhase("gone"));
      return;
    }
    try { sessionStorage.setItem(KEY, "1"); } catch {}
    queueMicrotask(() => setPhase("playing"));
    const failsafe = setTimeout(finish, FAILSAFE_MS);
    return () => clearTimeout(failsafe);
  }, [finish]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const t = setTimeout(() => {
      document.documentElement.classList.remove("am-splash");
      setPhase("gone");
    }, FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div id="am-splash" aria-hidden className={`theme-static${phase === "leaving" ? " am-leaving" : ""}`}>
      <style>{`
        #am-splash { display: none; }
        html.am-splash #am-splash {
          display: flex; position: fixed; inset: 0; z-index: 2147483000; flex-direction: column; align-items: center; justify-content: center;
          background: #ffffff; transition: opacity ${FADE_MS}ms ease;
        }
        html.am-splash #am-splash.am-leaving { opacity: 0; }
        html.am-splash body { overflow: hidden; }
        #am-splash .am-logo { width: 104px; height: 104px; }
        /* Room for the animation from the first paint, so the logo doesn't jump up when it starts */
        #am-splash .am-stage { height: 138px; display: flex; justify-content: center; }
      `}</style>
      {/* eslint-disable-next-line @next/next/no-img-element -- precached icon, the same as the phone's launch screen */}
      <img className="am-logo" src="/icons/icon-192.png" alt="" />
      <div className="am-stage">{phase !== "idle" && <SplashAnimation onDone={finish} />}</div>
    </div>
  );
}
