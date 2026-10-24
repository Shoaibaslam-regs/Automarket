/**
 * The AutoMarket car: a small side view facing right (slate body, the logo's red stripe, a yellow headlight) with
 * wheels that spin around their own centres. Shared by the app splash, the launch animation and the 404 page.
 * Fixed colours by default, for the splash's always-white screen; `themed` reads the theme's slate shades instead
 * (through `style`, since SVG fill attributes can't read CSS variables), so the car stays visible on a dark-mode
 * card; `light` is a pale car for always-dark backgrounds (the 404 page). `wheelTurns` stops the wheels after that
 * many turns (the 404 car stops when it crashes); by default they spin for as long as the car shows.
 */
export default function CarIllustration({ spin = true, width = 64, themed = false, light = false, wheelTurns }: {
  spin?: boolean; width?: number; themed?: boolean; light?: boolean; wheelTurns?: number;
}) {
  const tone = (fixed: string, shade: number) => (themed ? `rgb(var(--tw-c-slate-${shade}))` : fixed);
  const body = light ? "#e2e8f0" : tone("#0f172a", 900);
  const glass = light ? "#475569" : tone("#cbd5e1", 300);
  const hub = light ? "#94a3b8" : tone("#e2e8f0", 200);
  const tyre = light ? "#020617" : body;
  // transform-box: fill-box makes each wheel turn in place instead of around the SVG's corner
  const wheel = (cx: number) => (
    <g style={{ transformBox: "fill-box", transformOrigin: "center", animation: spin ? `am-wheel-spin 0.35s linear ${wheelTurns ?? "infinite"}` : undefined }}>
      <circle cx={cx} cy={20} r={5} style={{ fill: tyre }} />
      <circle cx={cx} cy={20} r={2.2} style={{ fill: hub }} />
      <path d={`M${cx - 3.6} 20h7.2M${cx} 16.4v7.2`} strokeWidth={1} style={{ stroke: tyre }} />
    </g>
  );
  return (
    <svg width={width} height={(width * 28) / 64} viewBox="0 0 64 28" aria-hidden>
      <style>{`@keyframes am-wheel-spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M4 19v-4c0-1.3.8-2.2 2-2.5l10-1.5 8-5.5c1.2-.9 2.6-1.5 5-1.5h12c2 0 3.6.7 5 2l6 5 6 1.5c1.8.5 3 1.9 3 3.5v3c0 .6-.4 1-1 1H5c-.6 0-1-.4-1-1z" style={{ fill: body }} />
      <path d="M25 7.2 30 5.6h10c1.2 0 2.3.5 3.2 1.2l4.6 4.2H21.3z" style={{ fill: glass }} />
      <path d="M36 5.6V11" strokeWidth={1.4} style={{ stroke: body }} />
      <path d="M8 15.2h48" stroke="#e11d48" strokeWidth={1.6} strokeLinecap="round" />
      <rect x={58.5} y={13} width={2.5} height={1.6} rx={0.6} fill="#fbbf24" />
      {wheel(16)}
      {wheel(48)}
    </svg>
  );
}
