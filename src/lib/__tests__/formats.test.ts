import { describe, expect, it } from "vitest";
import { normalizeCnic, normalizePlate, samePlatePattern } from "@/lib/plates";
import { normalizePkMobile, whatsappUrl } from "@/lib/phone";
import { digestText } from "@/lib/today";

describe("number plates", () => {
  it("tidies spacing, dashes and case", () => {
    expect(normalizePlate("lea  1234")).toBe("LEA 1234");
    expect(normalizePlate("lea - 1234")).toBe("LEA-1234");
  });
  it("refuses things that aren't plates", () => {
    expect(normalizePlate("ABC")).toBeNull();
    expect(normalizePlate(42)).toBeNull();
  });
  it("matches the same plate however it was written", () => {
    const rx = samePlatePattern("ABC-777");
    expect(rx.test("abc777")).toBe(true);
    expect(rx.test("ABC 777")).toBe(true);
    expect(rx.test("ABC-7778")).toBe(false);
  });
});

describe("CNIC", () => {
  it("formats 13 digits and refuses anything else", () => {
    expect(normalizeCnic("35202 1234567 1")).toBe("35202-1234567-1");
    expect(normalizeCnic("3520212345671")).toBe("35202-1234567-1");
    expect(normalizeCnic("352021234567")).toBeNull();
  });
});

describe("Pakistani mobiles", () => {
  it("accepts every common way of writing one", () => {
    for (const n of ["0300 1234567", "+92 300-1234567", "923001234567", "00923001234567"]) expect(normalizePkMobile(n)).toBe("+923001234567");
  });
  it("refuses landlines and short numbers", () => {
    expect(normalizePkMobile("042 1234567")).toBeNull();
    expect(normalizePkMobile("0300 12345")).toBeNull();
  });
  it("builds WhatsApp links with the 92 country code", () => {
    expect(whatsappUrl("0300 1234567", "hi there")).toBe("https://wa.me/923001234567?text=hi%20there");
    expect(whatsappUrl("")).toBeNull();
  });
});

describe("digestText", () => {
  it("lists only what is due, returns first", () => {
    expect(digestText({ returns: 2, pickups: 1, installments: 0, followUps: 1 })).toBe("2 returns due · 1 pickup · 1 follow-up");
    expect(digestText({ returns: 0, pickups: 0, installments: 1, followUps: 0 })).toBe("1 installment due");
    expect(digestText({ returns: 0, pickups: 0, installments: 0, followUps: 0 })).toBe("");
  });
});
