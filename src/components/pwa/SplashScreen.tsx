"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { SPLASH_KEY as KEY } from "@/lib/splash";

// Framer Motion is only downloaded when the splash actually shows (installed-app launches), not on normal visits
const loadAnimation = () => import("./SplashAnimation");
const SplashAnimation = dynamic(loadAnimation, { ssr: false });
// On a splash launch, start downloading it as soon as this file runs instead of after hydration,
// so the large logo isn't left waiting before it shrinks
if (typeof document !== "undefined" && document.documentElement.classList.contains("am-splash")) void loadAnimation();

/** If the animation can't load (offline, slow chunk), the splash still leaves after this long */
const FAILSAFE_MS = 6000;
const FADE_MS = 380;

/**
 * The logo's size at first paint and once settled, and the height of the car-and-name area under it.
 * Android shows its own launch screen first, with the icon at 192dp (= CSS px), so there the cover starts at
 * that size and takes over without a jump; a smaller start looked like a shrink before the animation's shrink.
 */
const LOGO_START = 160;
const LOGO_START_ANDROID = 192;
const LOGO_END = 104;
const STAGE_H = 138;
/** How far the logo's centre rises: half of the settled logo + stage, so the finished group is centred */
const LOGO_LIFT = (LOGO_END + STAGE_H) / 2 - LOGO_END / 2;

/**
 * The installed app's opening screen. The server-rendered cover (white, a large logo in the middle, like the
 * phone's own launch screen) is shown by CSS before anything paints, once splashInitScript has marked <html>.
 * Then SplashAnimation shrinks the logo up into place while the car-and-name animation plays below it, all at
 * once, and the cover fades into the app.
 * Ordinary browser visits never see it.
 */
export default function SplashScreen() {
  const [phase, setPhase] = useState<"idle" | "playing" | "leaving" | "gone">("idle");
  // The same <img> from the first paint is animated, never replaced, so the logo can't blink or jump
  const logoRef = useRef<HTMLImageElement>(null);

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
          display: block; position: fixed; inset: 0; z-index: 2147483000;
          background: #ffffff; transition: opacity ${FADE_MS}ms ease;
        }
        html.am-splash #am-splash.am-leaving { opacity: 0; }
        html.am-splash body { overflow: hidden; }
        /* The logo starts large in the exact centre (placed with top/left, since Framer Motion owns transform);
           SplashAnimation scales it (from whichever start size) to ${LOGO_END}px and lifts it ${LOGO_LIFT}px, onto the top of the final layout */
        #am-splash .am-logo {
          position: absolute; width: ${LOGO_START}px; height: ${LOGO_START}px;
          left: calc(50% - ${LOGO_START / 2}px); top: calc(50% - ${LOGO_START / 2}px);
          will-change: transform; z-index: 1;
        }
        html.am-android #am-splash .am-logo {
          width: ${LOGO_START_ANDROID}px; height: ${LOGO_START_ANDROID}px;
          left: calc(50% - ${LOGO_START_ANDROID / 2}px); top: calc(50% - ${LOGO_START_ANDROID / 2}px);
        }
        /* The car and name sit just under where the logo ends up */
        #am-splash .am-stage {
          position: absolute; left: 0; right: 0; top: calc(50% - ${LOGO_LIFT - LOGO_END / 2}px);
          height: ${STAGE_H}px; display: flex; justify-content: center;
        }
      `}</style>
      {/* eslint-disable-next-line @next/next/no-img-element -- precached icon, the same as the phone's launch screen */}
      <img ref={logoRef} className="am-logo" src="/icons/icon-192.png" alt="" />
      <div className="am-stage">{phase !== "idle" && <SplashAnimation logo={logoRef} logoEnd={LOGO_END} logoLift={LOGO_LIFT} onDone={finish} />}</div>
    </div>
  );
}
