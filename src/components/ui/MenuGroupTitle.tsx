/**
 * A menu or sidebar group heading ("Manage", "Grow & help"…): small uppercase text with a thin
 * brand-gradient line after it. `dark` is for the slate-950 sidebars, `light` for white menus.
 */
export default function MenuGroupTitle({
  children,
  tone = "light",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <p
      className={`flex items-center gap-2 font-bold uppercase tracking-[0.16em] ${
        dark ? "pb-2 text-[10.5px] text-slate-300" : "pb-1.5 text-[10px] text-slate-600"
      } ${className}`}
    >
      {children}
      <span
        aria-hidden
        className={`h-px flex-1 bg-gradient-to-r ${dark ? "from-indigo-400/50 via-fuchsia-400/25" : "from-indigo-500/40 via-fuchsia-500/20"} to-transparent`}
      />
    </p>
  );
}
