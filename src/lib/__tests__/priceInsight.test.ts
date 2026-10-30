import { describe, expect, it } from "vitest";
import { MIN_COMPARABLES, priceInsight } from "@/lib/priceInsight";

const lakh = (n: number) => n * 100_000;
const civics = [lakh(60), lakh(62), lakh(65), lakh(66), lakh(70)];

describe("priceInsight", () => {
  it("needs enough comparable listings", () => {
    expect(priceInsight(lakh(60), civics.slice(0, MIN_COMPARABLES - 1))).toBeNull();
    expect(priceInsight(0, civics)).toBeNull();
    expect(priceInsight(lakh(60), civics.slice(0, MIN_COMPARABLES))).not.toBeNull();
  });

  it("compares with the median", () => {
    const r = priceInsight(lakh(65), civics)!;
    expect(r).toMatchObject({ median: lakh(65), diff: 0, count: 5, verdict: "fair" });
  });

  it("calls a clearly cheaper price good and a dearer one above market", () => {
    expect(priceInsight(lakh(58), civics)!.verdict).toBe("good");
    expect(priceInsight(lakh(72), civics)!.verdict).toBe("high");
    // Within 7% of the median is fair either way
    expect(priceInsight(lakh(61), civics)!.verdict).toBe("fair");
    expect(priceInsight(lakh(69), civics)!.verdict).toBe("fair");
  });

  it("isn't moved by one silly price", () => {
    const r = priceInsight(lakh(65), [...civics, lakh(500)])!;
    expect(r.median).toBe(lakh(65.5));
    expect(r.verdict).toBe("fair");
  });

  it("places the price on the usual range, clamped to the ends", () => {
    const r = priceInsight(lakh(65), civics)!;
    expect(r.low).toBeLessThan(r.high);
    expect(r.position).toBeGreaterThan(0);
    expect(r.position).toBeLessThan(1);
    expect(priceInsight(lakh(10), civics)!.position).toBe(0);
    expect(priceInsight(lakh(900), civics)!.position).toBe(1);
    expect(priceInsight(lakh(50), [lakh(50), lakh(50), lakh(50)])!.position).toBe(0.5);
  });
});
