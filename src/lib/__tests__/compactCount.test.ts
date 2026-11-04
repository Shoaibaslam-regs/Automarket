import { describe, expect, it } from "vitest";
import { compactCount } from "@/lib/format";

describe("compactCount", () => {
  it("keeps small numbers as they are", () => {
    expect(compactCount(0)).toBe("0");
    expect(compactCount(999)).toBe("999");
  });

  it("uses K and M, with one decimal only when it isn't zero", () => {
    expect(compactCount(1000)).toBe("1K");
    expect(compactCount(1250)).toBe("1.2K");
    expect(compactCount(125_400)).toBe("125.4K");
    expect(compactCount(2_500_000)).toBe("2.5M");
    expect(compactCount(1_000_000)).toBe("1M");
    expect(compactCount(3_200_000_000)).toBe("3.2B");
  });

  it("rounds down, so a total is never shown bigger than it is", () => {
    expect(compactCount(1999)).toBe("1.9K");
    expect(compactCount(999_999)).toBe("999.9K");
    expect(compactCount(1_049_999)).toBe("1M");
  });
});
