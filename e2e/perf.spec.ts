import { test, type Page } from "@playwright/test";
import { seedData } from "./helpers";

// Page-speed check, not a pass/fail test: `npm run perf` loads key pages on an emulated mid-range phone
// (4× slower CPU, slow 4G) with an empty cache and prints what a visitor waits for. Skipped in normal runs.
test.skip(!process.env.PERF, "Set PERF=1 (npm run perf) to measure page speed");

const SLOW_4G = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };

type Result = { page: string; fcp: number; lcp: number; cls: number; tbt: number; jsKB: number; totalKB: number; requests: number };
const results: Result[] = [];

async function measure(page: Page, name: string, url: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", SLOW_4G);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  const types = new Map<string, string>();
  const urls = new Map<string, string>();
  const files: { url: string; type: string; kb: number }[] = [];
  let js = 0, total = 0, requests = 0;
  cdp.on("Network.responseReceived", e => { types.set(e.requestId, e.type); urls.set(e.requestId, e.response.url); });
  cdp.on("Network.loadingFinished", e => {
    requests++;
    total += e.encodedDataLength;
    if (types.get(e.requestId) === "Script") js += e.encodedDataLength;
    files.push({ url: (urls.get(e.requestId) ?? "").replace(/^https?:\/\/[^/]+/, "").slice(0, 90), type: types.get(e.requestId) ?? "", kb: Math.round(e.encodedDataLength / 1024) });
  });

  await page.addInitScript(() => {
    const w = window as unknown as { __perf: { lcp: number; cls: number; tbt: number } };
    w.__perf = { lcp: 0, cls: 0, tbt: 0 };
    new PerformanceObserver(l => { for (const e of l.getEntries()) w.__perf.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver(l => {
      type Shift = PerformanceEntry & { value: number; hadRecentInput: boolean; sources?: { node?: Node }[] };
      for (const e of l.getEntries() as Shift[]) {
        if (e.hadRecentInput) continue;
        w.__perf.cls += e.value;
        // Which elements moved (PERF_DETAIL), as tag.class
        const what = (e.sources ?? []).map(s => {
          const el = s.node as HTMLElement | undefined;
          const r = s as unknown as { previousRect?: DOMRectReadOnly; currentRect?: DOMRectReadOnly };
          const dy = r.previousRect && r.currentRect ? ` moved ${Math.round(r.currentRect.y - r.previousRect.y)}px` : "";
          return el?.tagName ? `${el.tagName.toLowerCase()}.${String(el.className).split(" ").slice(0, 4).join(".")}${dy}` : "?";
        });
        (w as unknown as { __shifts: string[] }).__shifts = [...((w as unknown as { __shifts?: string[] }).__shifts ?? []), `${e.value.toFixed(3)} @${Math.round(e.startTime)}ms: ${what.join(" | ")}`];
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver(l => { for (const e of l.getEntries()) w.__perf.tbt += Math.max(0, e.duration - 50); }).observe({ type: "longtask", buffered: true });
  });

  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(3000);
  const m = await page.evaluate(() => {
    const w = window as unknown as { __perf: { lcp: number; cls: number; tbt: number } };
    const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? 0;
    return { fcp, ...w.__perf };
  });
  // PERF_DETAIL=1 lists the biggest downloads and what shifted, to see what to fix
  if (process.env.PERF_DETAIL) {
    const shifts = await page.evaluate(() => (window as unknown as { __shifts?: string[] }).__shifts ?? []);
    if (shifts.length) console.log(`\n${name}: layout shifts\n  ${shifts.join("\n  ")}`);
    const fonts = await page.evaluate(() => performance.getEntriesByType("resource")
      .filter(r => r.name.endsWith(".woff2")).map(r => `font ready @${Math.round((r as PerformanceResourceTiming).responseEnd)}ms`));
    if (fonts.length) console.log(`  ${fonts.join(", ")}`);
    console.log(`\n${name}: biggest downloads`);
    console.table(files.sort((a, b) => b.kb - a.kb).slice(0, 18));
  }
  results.push({ page: name, fcp: Math.round(m.fcp), lcp: Math.round(m.lcp), cls: Number(m.cls.toFixed(3)), tbt: Math.round(m.tbt), jsKB: Math.round(js / 1024), totalKB: Math.round(total / 1024), requests });
}

test.describe("page speed on a phone", () => {
  test.use({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 });

  const pages = () => {
    const s = seedData();
    return [
      ["Home", "/"],
      ["Browse", "/listings"],
      ["Listing", `/listings/${s.civicId}`],
      ["Rental listing", `/listings/${s.rentalListingId}`],
      ["Deal", `/deals/${s.dealId}`],
      ["City page", "/cars-for-sale/karachi"],
    ] as const;
  };

  test("measure", async ({ browser, request }) => {
    test.setTimeout(300_000);
    // Each page is built on its first visit; warm them so the numbers are what visitors get from the cache
    for (const [, url] of pages()) await request.get(url);
    for (const [name, url] of pages()) {
      const context = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 });
      await measure(await context.newPage(), name, url);
      await context.close();
    }
    console.log("\nPage speed (emulated phone: 4× slower CPU, slow 4G, empty cache)");
    console.table(results.map(r => ({
      page: r.page, "first paint": `${r.fcp} ms`, "main content (LCP)": `${r.lcp} ms`, "layout shift": r.cls,
      "blocked (TBT)": `${r.tbt} ms`, "JS": `${r.jsKB} KB`, "total": `${r.totalKB} KB`, requests: r.requests,
    })));
  });
});
