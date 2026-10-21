// Link-preview images (WhatsApp, Facebook, X): the shared pieces for the opengraph-image routes.
// ImageResponse (Satori) only lays out flex boxes and only draws PNG and JPEG images, so photos in other
// formats are skipped and the card falls back to text.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/** The red slash mark from the app icon, as a data URL. */
export async function brandMark(): Promise<string> {
  const png = await readFile(join(process.cwd(), "public/icons/icon-192.png"));
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** A listing or deal photo as a data URL, or null when it can't be fetched quickly or isn't PNG/JPEG. */
export async function photoDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!res.ok || !["image/jpeg", "image/png"].includes(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 4_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function Brand({ mark }: { mark: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse needs plain img */}
      <img src={mark} width={44} height={44} style={{ borderRadius: 10 }} alt="" />
      <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#ffffff" }}>AutoMarket</div>
    </div>
  );
}

/**
 * The shared card: the photo on the left (when there is one), then a dark panel with the brand, a small
 * label (For sale, Hot deal…), the title, the price and a detail line.
 */
export function ShareCard({ mark, photo, eyebrow, title, price, detail, badge }: {
  mark: string; photo: string | null; eyebrow: string; title: string; price?: string; detail?: string; badge?: string;
}) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#020617", fontFamily: "sans-serif" }}>
      {photo && (
        <div style={{ display: "flex", position: "relative", width: 640, height: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse needs plain img */}
          <img src={photo} width={640} height={630} style={{ objectFit: "cover", width: 640, height: 630 }} alt="" />
          {badge && (
            <div style={{ display: "flex", position: "absolute", top: 28, left: 28, padding: "8px 18px", borderRadius: 999, background: "#e11d48", color: "#ffffff", fontSize: 26, fontWeight: 800 }}>
              {badge}
            </div>
          )}
        </div>
      )}
      <div
        style={{
          display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "52px 56px",
          backgroundImage: "radial-gradient(circle at 85% 0%, rgba(99,102,241,0.45), transparent 55%), radial-gradient(circle at 0% 100%, rgba(217,70,239,0.18), transparent 50%)",
        }}
      >
        <Brand mark={mark} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: 3, color: "#a5b4fc", textTransform: "uppercase" }}>{eyebrow}</div>
          <div style={{ display: "flex", marginTop: 14, fontSize: photo ? 46 : 64, fontWeight: 800, lineHeight: 1.1, color: "#ffffff" }}>{title}</div>
          {price && <div style={{ display: "flex", marginTop: 22, fontSize: photo ? 50 : 60, fontWeight: 800, color: "#fbbf24" }}>{price}</div>}
          {detail && <div style={{ display: "flex", marginTop: 12, fontSize: 26, color: "#94a3b8" }}>{detail}</div>}
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#64748b" }}>Buy · Sell · Rent cars and bikes in Pakistan</div>
      </div>
    </div>
  );
}
