import Image from "next/image";

/** Transparent logo files in /public, 1200×118 (about 10:1; keep the ratio below in step), coloured in the home hero's indigo → sky → emerald.
 * The dark one has white ink for dark surfaces. */
const LIGHT = "/autogo-logo-v2.png";
const DARK = "/autogo-logo-v2-dark.png";

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
  // The attributes are the size it is shown at (the logo's 1200×118 shape at `height`), so the browser fetches
  // about a 640px copy instead of the 3840px one it chose from the full 1200px width; CSS sets the shown size
  // (width auto keeps the shape at phoneHeight too)
  const size = { "--logo-h": `${height}px`, "--logo-hp": `${phoneHeight ?? height}px`, width: "auto" } as React.CSSProperties;
  const props = { width: Math.round((height * 1200) / 118), height, priority, style: { ...size, ...style } };
  const cls = `h-[var(--logo-hp)] sm:h-[var(--logo-h)] ${className}`;
  if (tone === "dark") return <Image src={DARK} alt="AutoGO" {...props} className={cls} />;
  return (
    <>
      <Image src={LIGHT} alt="AutoGO" {...props} className={`dark:hidden ${cls}`} />
      <Image src={DARK} alt="AutoGO" {...props} className={`hidden dark:block ${cls}`} />
    </>
  );
}
