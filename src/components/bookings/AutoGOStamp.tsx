export default function AutoGOStamp({ business, date, className, caption = "BOOKING CONFIRMED" }: { business?: string; date?: string; className?: string; /** Bottom line, e.g. "SALE COMPLETED" */ caption?: string }) {
  const ink = "#056aef6c";
  const name = (business || "").trim().toUpperCase();
  const shortName = name.length > 24 ? `${name.slice(0, 23)}…` : name;
  const bottom = date ? `${caption} · ${date.toUpperCase()}` : caption;

  return (
    <svg
      viewBox="0 0 190 84"
      role="img"
      aria-label={`AutoGO-Pak stamp${business ? `, ${business}` : ""}${date ? `, ${date}` : ""}`}
      className={className}
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      {/* Double frame */}
      <g fill="none" stroke={ink}>
        <rect x="2" y="2" width="186" height="80" rx="8" strokeWidth="3" />
        <rect x="7" y="7" width="176" height="70" rx="5" strokeWidth="1" />
      </g>

      <g fill={ink} fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle">
        {/* Top line between rules */}
        <line x1="18" y1="18.5" x2="60" y2="18.5" stroke={ink} strokeWidth="0.8" />
        <line x1="130" y1="18.5" x2="172" y2="18.5" stroke={ink} strokeWidth="0.8" />
        <text x="95" y="21" fontSize="7" fontWeight="700" letterSpacing="1.8">★ VERIFIED ★</text>

        {/* Main mark, at its own width (no longer stretched to fill a wider frame) */}
        <text x="95" y="44" fontSize="22" fontWeight="900" textLength="150" lengthAdjust="spacingAndGlyphs">
          AUTOGO-PAK
        </text>

        {/* Business band */}
        <rect x="15" y="50" width="160" height="13" rx="2" fill={ink} />
        <text x="95" y="59.5" fontSize="7.5" fontWeight="800" letterSpacing="1.1" fill="#ffffff">
          {shortName || "AUTHORISED BUSINESS"}
        </text>

        {/* Squeezed only when a long date line wouldn't fit inside the frame */}
        <text x="95" y="72" fontSize="6" fontWeight="700" letterSpacing="1" {...(bottom.length > 30 ? { textLength: 160, lengthAdjust: "spacingAndGlyphs" } : {})}>
          {bottom}
        </text>
      </g>
    </svg>
  );
}
