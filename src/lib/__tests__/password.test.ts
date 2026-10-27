import { describe, expect, it } from "vitest";
import { PASSWORD_MIN, passwordProblem } from "@/lib/password";

describe("passwordProblem", () => {
  it("accepts a reasonable password", () => {
    expect(passwordProblem("Lahore-Corolla-2020")).toBeNull();
    expect(passwordProblem("tea at 4 please")).toBeNull();
  });
  it("needs at least 8 characters and at most 128", () => {
    expect(passwordProblem("abc123")).toMatch(String(PASSWORD_MIN));
    expect(passwordProblem("x".repeat(129) + "1")).toMatch("128");
    expect(passwordProblem(undefined)).toBe("Choose a password");
  });
  it("refuses the passwords attackers try first", () => {
    expect(passwordProblem("12345678")).not.toBeNull();
    expect(passwordProblem("Password1")).not.toBeNull();
    expect(passwordProblem("PAKISTAN786")).not.toBeNull();
    expect(passwordProblem("aaaaaaaaaa")).not.toBeNull();
  });
  it("refuses the email or name as the password", () => {
    expect(passwordProblem("shoaibaslam99", { email: "shoaibaslam@gmail.com" })).not.toBeNull();
    expect(passwordProblem("shoaib2024", { name: "Shoaib Aslam" })).not.toBeNull();
    expect(passwordProblem("shoaib-likes-cars", { name: "Shoaib Aslam" })).toBeNull();
  });
});
