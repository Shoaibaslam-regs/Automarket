import { Lightbulb } from "lucide-react";
import { blogBlocks, inlineParts } from "@/lib/blog";

function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineParts(text).map((p, i) => (p.bold ? <strong key={i} className="font-semibold text-slate-900">{p.text}</strong> : <span key={i}>{p.text}</span>))}
    </>
  );
}

/**
 * A blog post's text laid out from its simple marks (src/lib/blog.ts): headings, paragraphs, lists and notes.
 * Everything is drawn as text, never as HTML. Server-safe; also the admin editor's preview.
 */
export default function BlogBody({ body }: { body: string }) {
  return (
    <div className="space-y-5 text-[15px] leading-7 text-slate-700 sm:text-base sm:leading-8">
      {blogBlocks(body).map((b, i) => {
        if (b.type === "heading") return <h2 key={i} className="pt-3 text-lg font-bold leading-snug text-slate-900 sm:text-xl">{b.text}</h2>;
        if (b.type === "note") {
          return (
            <p key={i} className="relative flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-[15px] leading-7 text-slate-800">
              <Lightbulb size={18} className="mt-1 flex-shrink-0 text-amber-600" aria-hidden />
              <span><Inline text={b.text} /></span>
            </p>
          );
        }
        if (b.type === "list") {
          const List = b.ordered ? "ol" : "ul";
          return (
            <List key={i} className={`space-y-2 pl-6 ${b.ordered ? "list-decimal" : "list-disc"} marker:text-slate-400`}>
              {b.items.map((item, j) => <li key={j} className="pl-1"><Inline text={item} /></li>)}
            </List>
          );
        }
        return <p key={i}><Inline text={b.text} /></p>;
      })}
    </div>
  );
}
