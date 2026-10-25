export default function AutoGOStamp({ business, date, className, caption = "BOOKING CONFIRMED" }: { business?: string; date?: string; className?: string; /** Bottom line, e.g. "SALE COMPLETED" */ caption?: string }) {
  const ink = "#056aef6c";
  const name = (business || "").trim().toUpperCase();
  const shortName = name.length > 28 ? `${name.slice(0, 27)}…` : name;

  return (
    <svg
      viewBox="0 0 240 96"
      role="img"
      aria-label={`AutoGO-Pak stamp${business ? `, ${business}` : ""}${date ? `, ${date}` : ""}`}
      className={className}
      style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      {/* Double frame */}
      <g fill="none" stroke={ink}>
        <rect x="2" y="2" width="236" height="92" rx="9" strokeWidth="3" />
        <rect x="8" y="8" width="224" height="80" rx="5" strokeWidth="1" />
      </g>

      <g fill={ink} fontFamily="Arial, Helvetica, sans-serif" textAnchor="middle">
        {/* Top line between rules */}
        <line x1="22" y1="22" x2="80" y2="22" stroke={ink} strokeWidth="0.8" />
        <line x1="160" y1="22" x2="218" y2="22" stroke={ink} strokeWidth="0.8" />
        <text x="120" y="25" fontSize="8" fontWeight="700" letterSpacing="2.2">★ VERIFIED ★</text>

        {/* Main mark */}
        <text x="120" y="52" fontSize="25" fontWeight="900" textLength="200" lengthAdjust="spacingAndGlyphs">
          AUTOGO-PAK
        </text>

        {/* Business band */}
        <rect x="18" y="59" width="204" height="15" rx="2" fill={ink} />
        <text x="120" y="70" fontSize="8.5" fontWeight="800" letterSpacing="1.4" fill="#ffffff">
          {shortName || "AUTHORISED BUSINESS"}
        </text>

        <text x="120" y="84" fontSize="7" fontWeight="700" letterSpacing="1.6">
          {date ? `${caption} · ${date.toUpperCase()}` : caption}
        </text>
      </g>
    </svg>
  );
}
