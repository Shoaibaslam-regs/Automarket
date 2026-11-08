// Generates src/app/theme.css: light and dark values for every colour the UI uses.
// Run with `node scripts/generate-theme.mjs` after changing the palettes below.
//
// How the dark theme works:
// - Tailwind's neutral colours (white, slate, gray) and the accent hues point at CSS variables
//   (see tailwind.config.js), so existing classes switch with the theme without per-component edits.
// - Neutrals invert: page and card backgrounds go dark, text goes light. Pale accent tints (50–200)
//   become dark tints; strong shades (500–950) get lighter so they stay readable on dark surfaces.
// - Inline styles use the GitHub-like palette through --gh-<hex> variables, mapped the same way.
// - Anything that must look the same in both themes (dark-by-design sections, gold buttons,
//   photo overlays, printable pages) keeps the light values via STATIC_SELECTORS.
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const colors = require("tailwindcss/colors");

export const NEUTRALS = ["slate", "gray"];
export const HUES = ["red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"];

const hex = h => {
  const v = h.replace("#", "");
  const f = v.length === 3 ? v.split("").map(c => c + c).join("") : v;
  return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16));
};
const trip = h => hex(h).join(" ");
const mix = (a, b, t) => { const x = hex(a), y = hex(b); return x.map((v, i) => Math.round(v * (1 - t) + y[i] * t)).join(" "); };

// Dark neutral ramp: light slate index -> dark colour (cards = "white", page = slate-50). Plain greys with no blue
// in them, like Facebook's and YouTube's dark modes (page #18191a, cards #242526, borders #3a3b3c, text #e4e6eb):
// the earlier navy slate (#0b1120, #131c2e) with a lavender accent read as "AI-made" (Nov 2026).
const DARK_NEUTRAL = {
  white: "#242526", 50: "#18191a", 100: "#2d2e2f", 200: "#3a3b3c", 300: "#4e4f50", 400: "#8a8d91",
  500: "#a8abaf", 600: "#b0b3b8", 700: "#d0d2d6", 800: "#e4e6eb", 900: "#f0f2f5", 950: "#ffffff",
};
const DARK_BASE = DARK_NEUTRAL.white;

// Inline palette (hex used in style={{}} and arbitrary classes) -> dark value
export const GH = {
  "#ffffff": "#242526", "#0d1117": "#e4e6eb", "#24292f": "#d0d2d6", "#57606a": "#b0b3b8", "#8c959f": "#8a8d91",
  "#d0d7de": "#3e4042", "#e1e4e8": "#3a3b3c", "#f6f8fa": "#18191a", "#fafbfc": "#1c1d1e",
  "#eef1f4": "#2d2e2f", "#f0f2f4": "#2d2e2f", "#f0f0f0": "#2d2e2f", "#eef2f6": "#2d2e2f", "#edf0f2": "#2d2e2f",
  "#e9edf0": "#2d2e2f", "#f1f5f9": "#2d2e2f", "#f8fafc": "#1c1d1e",
  "#c4c9d0": "#4e4f50", "#cbd5e1": "#4e4f50", "#d1d5db": "#4e4f50", "#94a3b8": "#8a8d91", "#9ca3af": "#8a8d91",
  "#cf222e": "#ff7b72", "#dc2626": "#f87171", "#fff0f0": "#2a1518", "#ffcdd2": "#5c2b2f", "#ffe3e3": "#3a1b1f", "#82071e": "#ffaba8",
  "#1a7f37": "#3fb950", "#dafbe1": "#12261e", "#56d364": "#2f6f40", "#2da44e": "#3fb950", "#2c974b": "#46c35a",
  "#0550ae": "#6cb6ff", "#ddf4ff": "#10233d",
  "#7d4e00": "#e3b341", "#fff8c5": "#2b2610", "#e3b341": "#9e7a1a", "#f0d97a": "#5c4b16", "#9a6700": "#d29922",
  "#bf8700": "#d29922", "#d4a72c": "#8a6d1c", "#fffbeb": "#2b2410", "#fffbe6": "#2b2410", "#fff1b8": "#3d3214",
  "#ffe7a3": "#4a3b14", "#ffd666": "#6b5414",
  "#953800": "#f0883e", "#ffdfb6": "#3d2412",
  "#8250df": "#e4e6eb", "#fbefff": "#2d2e2f", "#6e40c9": "#e4e6eb",
  "#4f46e5": "#e4e6eb", "#eef2ff": "#2d2e2f",
};

export const STATIC_SELECTORS = [
  ".theme-static",
  '[class~="bg-slate-950"]',
  '[class*="bg-slate-950/"]',
  '[class*="bg-black"]',
  '[class*="from-amber-300"]',
];

const light = [], dark = [];
light.push(`--tw-c-white: 255 255 255;`, `--tw-c-black: 0 0 0;`);
dark.push(`--tw-c-white: ${trip(DARK_NEUTRAL.white)};`, `--tw-c-black: 0 0 0;`);
for (const fam of NEUTRALS) {
  for (const [shade, value] of Object.entries(colors[fam])) {
    light.push(`--tw-c-${fam}-${shade}: ${trip(value)};`);
    dark.push(`--tw-c-${fam}-${shade}: ${trip(DARK_NEUTRAL[shade])};`);
  }
}
// Indigo is the one accent. In dark mode it is plain white, like YouTube's and Facebook's dark themes: any coloured
// accent (Tailwind's #818cf8, then a bluer #7b9cff) read as purple on dark surfaces. So indigo icons, links, dots,
// bars and the fuel chart's line are white-grey there, and an indigo button is a light button with dark text.
// DARK_ACCENT is also what charts use in dark mode (PriceChart, Reports).
export const DARK_ACCENT = "#e4e6eb";
const DARK_INDIGO = { 300: "#8a8d91", 400: "#d0d2d6", 700: "#f0f2f5", 800: "#f0f2f5", 900: "#ffffff", 950: "#ffffff" };

for (const fam of HUES) {
  const c = colors[fam];
  const darkOf = fam === "indigo" ? {
    50: mix(DARK_BASE, "#ffffff", 0.06), 100: mix(DARK_BASE, "#ffffff", 0.1), 200: mix(DARK_BASE, "#ffffff", 0.18),
    300: trip(DARK_INDIGO[300]), 400: trip(DARK_INDIGO[400]), 500: trip(DARK_ACCENT), 600: trip(DARK_ACCENT),
    700: trip(DARK_INDIGO[700]), 800: trip(DARK_INDIGO[800]), 900: trip(DARK_INDIGO[900]), 950: trip(DARK_INDIGO[950]),
  } : {
    50: mix(DARK_BASE, c[500], 0.12), 100: mix(DARK_BASE, c[500], 0.18), 200: mix(DARK_BASE, c[500], 0.3),
    300: trip(c[300]), 400: trip(c[400]), 500: trip(c[400]), 600: trip(c[400]),
    700: trip(c[300]), 800: trip(c[200]), 900: trip(c[100]), 950: trip(c[50]),
  };
  for (const [shade, value] of Object.entries(c)) {
    light.push(`--tw-c-${fam}-${shade}: ${trip(value)};`);
    dark.push(`--tw-c-${fam}-${shade}: ${darkOf[shade]};`);
  }
}
for (const [h, d] of Object.entries(GH)) {
  light.push(`--gh-${h.slice(1)}: ${h};`);
  dark.push(`--gh-${h.slice(1)}: ${d};`);
}

const ind = a => a.map(l => `  ${l}`).join("\n");
const css = `/* Generated by scripts/generate-theme.mjs. Do not edit by hand. */

:root {
  color-scheme: light;
${ind(light)}
}

.dark {
  color-scheme: dark;
${ind(dark)}
}

/* Same in both themes: dark-by-design sections, gold buttons, photo overlays, printable pages */
${STATIC_SELECTORS.map(s => `.dark ${s}`).join(",\n")} {
${ind(light)}
}

/* Dark-by-design sections (bg-slate-950 heroes) are a plain near-black in dark mode, not slate's navy #020617 */
.dark [class~="bg-slate-950"],
.dark [class*="bg-slate-950/"] {
  --tw-c-slate-950: 15 15 16;
}
`;
writeFileSync(new URL("../src/app/theme.css", import.meta.url), css);
console.log(`theme.css: ${light.length} variables`);
