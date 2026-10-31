import Link from "next/link";
import { ArrowRight, CalendarDays, CircleAlert, Clock3, Newspaper, Pin, Tag } from "lucide-react";
import ReadMore from "@/components/ui/ReadMore";
import { SHOP_NOTICE_KIND, eventText, shortDate, type ShopNotice, type ShopNoticeKind } from "@/lib/shopNotices";

const ICON: Record<ShopNoticeKind, typeof Newspaper> = { NEWS: Newspaper, EVENT: CalendarDays, OFFER: Tag, NOTICE: CircleAlert };

/**
 * One shop announcement as it appears on the shop page, and as the console's form previews it: a white card with
 * a thin bar in the type's colour on the left, the type and date, a bold title, the event's date and time, the
 * details (cut to three lines) and an optional button link. Server-safe.
 */
export function ShopNoticeCard({ notice, now = new Date() }: {
  notice: Pick<ShopNotice, "kind" | "title" | "body" | "eventAt" | "endsAt" | "link" | "linkLabel" | "pinned" | "createdAt">;
  now?: Date;
}) {
  const kind = SHOP_NOTICE_KIND[notice.kind];
  const Icon = ICON[notice.kind];
  const outside = !!notice.link && !notice.link.startsWith("/");
  const button = notice.link && (
    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 group-hover:underline">
      {notice.linkLabel || "Learn more"} <ArrowRight size={14} />
    </span>
  );
  return (
    <article className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${kind.bar}`} />
      <div className="flex gap-3.5 py-4 pl-5 pr-4 sm:gap-4 sm:py-5 sm:pl-6 sm:pr-5">
        <Icon size={20} strokeWidth={1.9} className={`mt-0.5 flex-shrink-0 ${kind.text}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold">
            <span className={`uppercase tracking-wider ${kind.text}`}>{kind.label}</span>
            {notice.pinned && <span className="inline-flex items-center gap-1 text-slate-500"><Pin size={11} /> Pinned</span>}
            <span className="font-medium text-slate-400">· {shortDate(notice.createdAt, now)}</span>
          </p>
          <h3 className="mt-1 text-[15px] font-bold leading-snug text-slate-900 sm:text-base">{notice.title}</h3>
          {notice.kind === "EVENT" && notice.eventAt && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <CalendarDays size={14} className="text-slate-400" aria-hidden /> {eventText(notice.eventAt)}
            </p>
          )}
          {notice.body && <ReadMore text={notice.body} lines={3} className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600" />}
          {(notice.link || notice.kind === "OFFER") && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              {notice.link && (outside ? (
                <a href={notice.link} target="_blank" rel="noopener noreferrer nofollow" className="group">{button}</a>
              ) : (
                <Link href={notice.link} className="group">{button}</Link>
              ))}
              {notice.kind === "OFFER" && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock3 size={12} aria-hidden /> Until {shortDate(notice.endsAt, now)}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/** The shop page's announcements, under its header: the live ones (already chosen by noticesToShow). */
export function ShopNoticeList({ notices, businessName, now }: { notices: ShopNotice[]; businessName: string; now: Date }) {
  if (!notices.length) return null;
  return (
    <section aria-label={`Announcements from ${businessName}`} className="space-y-3">
      {notices.map(n => <ShopNoticeCard key={n._id} notice={n} now={now} />)}
    </section>
  );
}
