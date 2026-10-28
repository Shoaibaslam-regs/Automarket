import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content security policy: which servers the browser may load from or talk to.
 * Inline scripts are allowed because Next.js and the theme script in <head> use them; 'unsafe-eval' is only
 * needed for hot reload in development. Add a host here when the browser starts using a new service.
 */
const csp = [
  "default-src 'self'",
  // Cloudflare Turnstile (the human check on sign-up, sign-in and public forms)
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Photos (UploadThing), Google profile pictures, and data/blob previews of photos being uploaded
  "img-src 'self' data: blob: https://utfs.io https://*.ufs.sh https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  // UploadThing uploads, Pusher realtime (websocket and fallback), and hot reload in development
  `connect-src 'self' https://*.uploadthing.com https://utfs.io https://*.ufs.sh wss://*.pusher.com https://*.pusher.com https://challenges.cloudflare.com${isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // No other site may show AutoGO inside a frame (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Browsers only use HTTPS for the site from now on (ignored on http://localhost)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  // Each Vercel deployment gets its own id, so a phone still running the previous version does a full reload
  // on its next tap instead of asking for code files that no longer exist (which showed "Something went wrong")
  deploymentId: process.env.NEXT_DEPLOYMENT_ID || process.env.VERCEL_DEPLOYMENT_ID || undefined,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The service worker must always be re-checked so a new version reaches installed apps
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
    ];
  },
  async redirects() {
    return [
      // Business settings used to show /biz/<slug> as the public page address; the page lives at /dealers/<slug>
      { source: "/biz/:slug", destination: "/dealers/:slug", permanent: true },
      // The separate landing page was removed; "/" is the one home page now
      { source: "/home", destination: "/", permanent: true },
    ];
  },
  // Pages visited in the last 30 seconds come back instantly on back/forward and repeat taps
  experimental: {
    staleTimes: { dynamic: 30 },
  },
  images: {
    // AVIF is noticeably smaller than WebP on slow mobile data; browsers without it get WebP
    formats: ["image/avif", "image/webp"],
    // UploadThing gives every upload a new URL, so an optimised image never changes and can be cached for a month
    minimumCacheTTL: 2678400,
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
