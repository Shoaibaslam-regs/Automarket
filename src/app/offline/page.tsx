import type { Metadata } from "next";

export const metadata: Metadata = { title: "You're offline", robots: { index: false } };

/**
 * Shown by the service worker (public/sw.js) when a page can't load because the phone has no connection.
 * Phones keep this page across deploys, so it uses only inline styles, a plain <img> of a precached icon and a
 * normal link: nothing that depends on the current build's CSS or JavaScript files.
 */
export default function OfflinePage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center", background: "#f8fafc", color: "#0f172a", fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- must work offline without the image optimiser */}
      <img src="/icons/icon-192.png" alt="AutoMarket" width={72} height={72} style={{ borderRadius: 18, boxShadow: "0 1px 3px rgba(15,23,42,0.15)" }} />
      <svg aria-hidden width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 24, padding: 10, borderRadius: 14, background: "#e2e8f0", boxSizing: "content-box" }}>
        <path d="M12 20h.01" /><path d="M8.5 16.43a5 5 0 0 1 7 0" /><path d="M5 12.86a10 10 0 0 1 5.17-2.69" /><path d="M19 12.86a10 10 0 0 0-2.01-1.48" /><path d="M2 8.82a15 15 0 0 1 4.18-2.65" /><path d="M22 8.82a15 15 0 0 0-11.29-3.76" /><path d="m2 2 20 20" />
      </svg>
      <h1 style={{ marginTop: 16, fontSize: 20, fontWeight: 700 }}>You&apos;re offline</h1>
      <p style={{ marginTop: 8, maxWidth: 300, fontSize: 14, lineHeight: 1.5, color: "#64748b" }}>Check your mobile data or Wi-Fi, then try again. Pages you opened recently may still work.</p>
      {/* An empty href reloads the page the visitor was trying to open */}
      <a href="" style={{ marginTop: 24, padding: "10px 20px", borderRadius: 12, background: "#0f172a", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Try again</a>
    </div>
  );
}
