import { describe, expect, it } from "vitest";
import { boostAllowance, boostEnds, boostedFirst, isBoosted, pickBoosted } from "@/lib/boosts";

const now = new Date("2026-11-04T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);

describe("boosts", () => {
  it("gives Premium Plus 12 of 7 days and Ultimate 50 of 30 days, nothing below", () => {
    expect(boostAllowance("PRO")).toEqual({ perMonth: 12, days: 7 });
    expect(boostAllowance("UNLIMITED")).toEqual({ perMonth: 50, days: 30 });
    expect(boostAllowance("STARTER")).toBeNull();
    expect(boostAllowance("FREE")).toBeNull();
  });

  it("runs its full length, but never past the plan's end", () => {
    expect(boostEnds("PRO", days(20), now)).toEqual({ until: days(7), full: days(7) });
    expect(boostEnds("UNLIMITED", days(10), now)).toEqual({ until: days(10), full: days(30) });
    expect(boostEnds("STARTER", days(10), now)).toBeNull();
  });

  it("knows when a boost is running", () => {
    expect(isBoosted(days(1), now)).toBe(true);
    expect(isBoosted(days(-1), now)).toBe(false);
    expect(isBoosted(null, now)).toBe(false);
  });

  it("picks a few boosted items in turn and puts boosted deals first", () => {
    const picked = pickBoosted([1, 2, 3, 4, 5, 6], 4, () => 0.5);
    expect(picked).toHaveLength(4);
    expect(new Set(picked).size).toBe(4);
    const deals = [{ id: "a" }, { id: "b", boostedUntil: days(2) }, { id: "c", boostedUntil: days(-2) }, { id: "d", boostedUntil: days(1) }];
    expect(boostedFirst(deals, now).map(d => d.id)).toEqual(["b", "d", "a", "c"]);
  });
});
