import type { MetadataRoute } from "next";

/**
 * Web app manifest (served at /manifest.webmanifest): lets phones install AutoGO to the home screen and
 * open it full screen. Icons are in public/icons (the logo's three slashes over its car, in the hero gradient).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "AutoGO: Buy, Sell & Rent Vehicles",
    short_name: "AutoGO",
    description: "Pakistan's marketplace to buy, sell and rent cars and bikes.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press shortcuts on the home screen icon
    shortcuts: [
      { name: "Browse vehicles", url: "/listings", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Sell a vehicle", url: "/sell", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Messages", url: "/messages", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
