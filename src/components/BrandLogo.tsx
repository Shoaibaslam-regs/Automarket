import Image from "next/image";

/** Transparent logo files in /public, 1200×119 (about 10:1). The dark one has white ink for dark surfaces. */
const LIGHT = "/autogo-logo.png";
const DARK = "/autogo-logo-dark.png";

/**
 * The site logo. `tone="auto"` follows the light/dark theme (black ink in light mode, white in dark);
 * `tone="dark"` is for surfaces that are always dark (slate-950 headers, the business sidebar).
 * `height` is in px; the width follows the logo's shape. `phoneHeight` is the height below 640px, where the wide
 * logo would otherwise crowd the bar.
 */
export default function BrandLogo({
  height,
  phoneHeight,
  tone = "auto",
  priority = false,
  className = "",
  style,
}: {
  height: number;
  phoneHeight?: number;
  tone?: "auto" | "dark";
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  // The real pixel size goes in the attributes and CSS sets the shown size, so Next's "only one side modified"
  // check never trips on a rounded width (both sides differ from the attributes)
  const size = { "--logo-h": `${height}px`, "--logo-hp": `${phoneHeight ?? height}px`, width: "auto" } as React.CSSProperties;
  const props = { width: 1200, height: 119, priority, style: { ...size, ...style } };
  const cls = `h-[var(--logo-hp)] sm:h-[var(--logo-h)] ${className}`;
  if (tone === "dark") return <Image src={DARK} alt="AutoGO" {...props} className={cls} />;
  return (
    <>
      <Image src={LIGHT} alt="AutoGO" {...props} className={`dark:hidden ${cls}`} />
      <Image src={DARK} alt="AutoGO" {...props} className={`hidden dark:block ${cls}`} />
    </>
  );
}
