import { describe, expect, it } from "vitest";
import { asString, findUnsafeKey, isDangerousKey, MAX_BODY_DEPTH } from "@/lib/nosql";

describe("isDangerousKey", () => {
  it("flags MongoDB operators and prototype keys", () => {
    expect(isDangerousKey("$ne")).toBe(true);
    expect(isDangerousKey("$where")).toBe(true);
    expect(isDangerousKey("__proto__")).toBe(true);
    expect(isDangerousKey("constructor")).toBe(true);
  });
  it("leaves ordinary field names alone", () => {
    expect(isDangerousKey("email")).toBe(false);
    expect(isDangerousKey("price$")).toBe(false);
    expect(isDangerousKey("dueBackAt")).toBe(false);
  });
});

describe("findUnsafeKey", () => {
  it("passes normal form bodies", () => {
    expect(findUnsafeKey({ email: "a@b.pk", password: "secret123", cf: "" })).toBeNull();
    expect(findUnsafeKey({ images: ["https://utfs.io/f/a"], checkOut: { odometer: 1200, notes: "$500 paid" } })).toBeNull();
    expect(findUnsafeKey(null)).toBeNull();
    expect(findUnsafeKey("text")).toBeNull();
    expect(findUnsafeKey([1, "two", { three: 3 }])).toBeNull();
  });
  it("catches operators at any depth, in objects and arrays", () => {
    expect(findUnsafeKey({ email: "x", password: { $ne: null } })).toBe("$ne");
    expect(findUnsafeKey({ filter: { status: { $gt: "" } } })).toBe("$gt");
    expect(findUnsafeKey({ ids: ["a", { $where: "sleep(1000)" }] })).toBe("$where");
    expect(findUnsafeKey([{ $or: [] }])).toBe("$or");
  });
  it("catches prototype pollution keys parsed from JSON", () => {
    expect(findUnsafeKey(JSON.parse('{"a":{"__proto__":{"isAdmin":true}}}'))).toBe("__proto__");
  });
  it("refuses bodies nested past the limit", () => {
    let deep: unknown = "x";
    for (let i = 0; i <= MAX_BODY_DEPTH + 1; i++) deep = { a: deep };
    expect(findUnsafeKey(deep)).toBe("(too deep)");
  });
});

describe("asString", () => {
  it("keeps strings and drops everything else", () => {
    expect(asString("a@b.pk")).toBe("a@b.pk");
    expect(asString({ $ne: null })).toBeUndefined();
    expect(asString(["a"])).toBeUndefined();
    expect(asString(5)).toBeUndefined();
  });
});
