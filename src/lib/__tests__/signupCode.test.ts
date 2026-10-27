import { describe, expect, it } from "vitest";
import { cleanCode, maskDestination, parseLoginIdentifier } from "@/lib/signupCode";

describe("cleanCode", () => {
  it("keeps a whole 6-digit code, however it was typed", () => {
    expect(cleanCode("123456")).toBe("123456");
    expect(cleanCode(" 123 456 ")).toBe("123456");
    expect(cleanCode(123456)).toBe("123456");
  });
  it("refuses partial or non-numeric codes", () => {
    expect(cleanCode("12345")).toBeNull();
    expect(cleanCode("1234567")).toBeNull();
    expect(cleanCode({ $gt: "" })).toBeNull();
  });
});

describe("parseLoginIdentifier", () => {
  it("reads emails in lower case", () => {
    expect(parseLoginIdentifier(" Ali@Gmail.com ")).toEqual({ kind: "email", email: "ali@gmail.com" });
  });
  it("reads Pakistani mobile numbers in their usual forms", () => {
    expect(parseLoginIdentifier("0300 1234567")).toEqual({ kind: "phone", phone: "+923001234567" });
    expect(parseLoginIdentifier("+92 300-1234567")).toEqual({ kind: "phone", phone: "+923001234567" });
    expect(parseLoginIdentifier("923001234567")).toEqual({ kind: "phone", phone: "+923001234567" });
  });
  it("treats anything else as neither (the admin key field)", () => {
    expect(parseLoginIdentifier("my-secret-admin-key-123")).toBeNull();
    expect(parseLoginIdentifier("12345")).toBeNull();
    expect(parseLoginIdentifier("not@an")).toBeNull();
  });
});

describe("maskDestination", () => {
  it("hides most of the email or number", () => {
    expect(maskDestination("email", "amir@gmail.com")).toBe("a**r@gmail.com");
    expect(maskDestination("phone", "+923001234567")).toBe("+92 30* *** 4567");
  });
});
