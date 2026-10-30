import CarIllustration from "@/components/launch/CarIllustration";

/**
 * The 404 page's little story: the logo's car drives in along the road (lane dashes rushing past), runs into a
 * rock, jolts back and tips up, the rock shakes and an impact flash pops, then smoke keeps rising from the bonnet.
 * It plays once (about 2.6 s) and stays crashed; the page's "404" can shudder at the impact with `crash-shudder`.
 * Plain CSS, so the page stays a server component. It follows the theme (the car and road use the theme's slate
 * shades, so they are dark on white and pale in dark mode). With reduced motion the car rests against the rock.
 *
 * Positions are in % of the road's width, so it fits any screen: the rock stands at 64%, and the car (72px wide)
 * stops with its nose just touching it.
 */
export default function CrashScene() {
  return (
    <div aria-hidden className="crash relative mx-auto h-16 w-full max-w-md">
      {/* The road: a soft line with lane dashes, which move only while the car is driving */}
      <div className="absolute inset-x-0 bottom-3 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      <div className="crash-road absolute inset-x-8 bottom-[11px] h-[2px] bg-[repeating-linear-gradient(90deg,rgb(var(--tw-c-slate-400))_0_14px,transparent_14px_28px)] [mask-image:linear-gradient(90deg,transparent,black_20%,black_80%,transparent)]" />

      {/* The rock */}
      <svg viewBox="0 0 44 30" className="crash-rock absolute bottom-3 left-[64%] h-[30px] w-11">
        <path d="M3 30 L7 15 L15 7 L26 5 L35 11 L41 21 L43 30 Z" fill="#475569" />
        <path d="M15 7 L26 5 L35 11 L27 14 L18 13 Z" fill="#64748b" />
        <path d="M7 15 L15 7 L18 13 L12 21 Z" fill="#94a3b8" opacity="0.55" />
        <path d="M27 14 L35 11 L41 21 L31 22 Z" fill="#334155" />
      </svg>

      {/* The car: drives to the rock, then jolts back and tips up a little */}
      <div className="crash-car absolute bottom-[13px]">
        <div className="crash-tilt relative origin-bottom-right">
          <CarIllustration themed width={72} wheelTurns={6} />
          {/* Impact flash where the nose meets the rock */}
          <svg viewBox="0 0 24 24" className="crash-flash absolute -right-5 -bottom-0.5 h-9 w-9">
            <path d="M12 1 L14 9 L22 6 L16 12 L23 17 L14 15 L12 23 L10 15 L1 17 L8 12 L2 6 L10 9 Z" fill="#fbbf24" />
            <path d="M12 6 L13 10 L17 9 L14 12 L17 15 L13 14 L12 18 L11 14 L7 15 L10 12 L7 9 L11 10 Z" fill="#fef3c7" />
          </svg>
          {/* Smoke from the bonnet, rising for as long as the page is open */}
          {[0, 1, 2].map(i => (
            <span key={i} className="crash-smoke absolute right-3 top-0 block h-3 w-3 rounded-full bg-slate-400/50 blur-[1px]" style={{ animationDelay: `${2.3 + i * 0.6}s` }} />
          ))}
        </div>
      </div>

      <style>{`
        .crash { --hit: calc(64% - 66px); --back: calc(64% - 84px); }
        .crash-car { left: -90px; animation: crash-drive 2.6s cubic-bezier(0.3, 0, 0.75, 1) forwards; }
        .crash-tilt { animation: crash-tilt 2.6s ease-out forwards; }
        .crash-road { animation: crash-road 0.35s linear 6; }
        .crash-rock { animation: crash-rock 0.4s ease-in-out 2s; }
        .crash-flash { opacity: 0; animation: crash-flash 0.7s ease-out 1.98s forwards; }
        .crash-smoke { opacity: 0; animation: crash-smoke 1.8s ease-out infinite both; }
        .crash-shudder { animation: crash-shudder 0.45s ease-in-out 2s; }
        @keyframes crash-drive { 0% { left: -90px; } 77% { left: var(--hit); } 86% { left: var(--back); } 100% { left: calc(var(--hit) - 5px); } }
        @keyframes crash-tilt { 0%, 76% { transform: none; } 84% { transform: translateY(-4px) rotate(-9deg); } 100% { transform: rotate(-3deg); } }
        @keyframes crash-road { to { background-position: -28px 0; } }
        @keyframes crash-rock { 0%, 100% { transform: none; } 25% { transform: translateX(2px) rotate(2deg); } 60% { transform: translateX(-1px) rotate(-1deg); } }
        @keyframes crash-flash { 0% { opacity: 1; transform: scale(0.2); } 35% { opacity: 1; transform: scale(1.25); } 100% { opacity: 0; transform: scale(1); } }
        @keyframes crash-smoke { 0% { opacity: 0; transform: translate(0, 0) scale(0.4); } 15% { opacity: 0.7; } 100% { opacity: 0; transform: translate(-8px, -28px) scale(1.6); } }
        @keyframes crash-shudder { 0%, 100% { transform: none; } 20% { transform: translateX(-4px); } 45% { transform: translateX(3px); } 70% { transform: translateX(-2px); } }
        @media (prefers-reduced-motion: reduce) {
          .crash-car { animation: none; left: calc(var(--hit) - 5px); }
          .crash-tilt, .crash-road, .crash-rock, .crash-shudder { animation: none; }
          .crash-tilt { transform: rotate(-3deg); }
          .crash-flash, .crash-smoke { display: none; }
          .crash svg g { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
