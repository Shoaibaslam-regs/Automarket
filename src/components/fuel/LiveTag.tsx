/**
 * "Live" beside the Fuel prices headings (the fuel page and the blog strip): a green dot that pulses (still with
 * reduced motion) and the word. `dark` is for the slate-950 hero.
 */
export default function LiveTag({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${dark ? "text-emerald-300" : "text-emerald-600"}`}>
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 motion-safe:animate-ping ${dark ? "bg-emerald-400" : "bg-emerald-500"}`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dark ? "bg-emerald-400" : "bg-emerald-500"}`} />
      </span>
      Live
    </span>
  );
}
