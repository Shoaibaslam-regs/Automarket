import { describe, expect, it } from "vitest";
import { LATER_WAIT_DAYS, SECOND_WAIT_DAYS, nextPictureChangeAt, pictureHint, pictureWaitDays, pictureWaitText } from "@/lib/profilePicture";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-27T10:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

describe("profile picture changes", () => {
  it("lets the first picture and one change straight after it through", () => {
    expect(nextPictureChangeAt(0, null, NOW)).toBeNull();
    expect(nextPictureChangeAt(1, ago(0), NOW)).toBeNull();
  });
  it("makes the third change wait 30 days after the second", () => {
    expect(pictureWaitDays(2)).toBe(SECOND_WAIT_DAYS);
    expect(nextPictureChangeAt(2, ago(1), NOW)?.getTime()).toBe(ago(1).getTime() + 30 * DAY);
    expect(nextPictureChangeAt(2, ago(30), NOW)).toBeNull();
  });
  it("makes every later change wait about 6 months", () => {
    expect(pictureWaitDays(3)).toBe(LATER_WAIT_DAYS);
    expect(pictureWaitDays(9)).toBe(LATER_WAIT_DAYS);
    expect(nextPictureChangeAt(3, ago(100), NOW)).not.toBeNull();
    expect(nextPictureChangeAt(3, ago(LATER_WAIT_DAYS), NOW)).toBeNull();
  });
  it("words the date in Pakistan time", () => {
    expect(pictureWaitText("2026-11-26T10:00:00Z")).toBe("You can change your picture again on 26 Nov 2026.");
  });
});

describe("pictureHint", () => {
  it("tells people what the next change costs", () => {
    expect(pictureHint(0)).toMatch("change it once more straight away");
    expect(pictureHint(1)).toMatch("once more now");
    expect(pictureHint(2)).toMatch("after 6 months");
    expect(pictureHint(5)).toMatch("after 6 months");
  });
});
