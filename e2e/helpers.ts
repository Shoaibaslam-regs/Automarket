import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Browser, type Locator, type Page } from "@playwright/test";
import type { Seed } from "./seed";

/** The ids and accounts e2e/seed.ts created for this run. */
export function seedData(): Seed {
  return JSON.parse(readFileSync(path.join(__dirname, ".data", "seed.json"), "utf8"));
}

/** A fresh browser (its own cookies) signed in as `email`. */
export async function signedIn(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByPlaceholder("AutoGO@email.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(seedData().password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/dashboard");
  return page;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "YYYY-MM-DD" `n` days from today, in UTC like the availability calendar. */
export function dayFromToday(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
}

/** Pages the availability calendar inside `scope` forward to the month of `day`. */
export async function showMonth(scope: Page | Locator, day: string) {
  const want = `${MONTHS[Number(day.slice(5, 7)) - 1]} ${day.slice(0, 4)}`;
  const heading = scope.locator('p[aria-live="polite"]').first();
  await expect(heading).toBeVisible();
  for (let i = 0; i < 6 && (await heading.textContent())?.trim() !== want; i++) {
    await scope.getByRole("button", { name: "Next month" }).click();
  }
  await expect(heading).toHaveText(want);
}

/** The calendar cell for `day` (its label reads "5 November, free" or "5 November, booked"). */
export function calendarDay(scope: Page | Locator, day: string): Locator {
  const label = `${Number(day.slice(8))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;
  return scope.locator(`[aria-label^="${label},"], [aria-label="${label}"]`).first();
}

/** Taps a day on the booking form's calendar. */
export async function tapDay(page: Page, day: string) {
  await showMonth(page, day);
  await calendarDay(page, day).click();
}
