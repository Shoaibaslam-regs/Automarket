// How often someone may change their profile picture. Client-safe and unit-tested.
//
// The first picture and one change straight after it are free (people often pick again at once); the next change
// waits 30 days, and every change after that waits 6 months. Removing the picture is always allowed and doesn't
// reset the wait. Business logos have their own upload (`businessLogo`) and aren't limited this way.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Changes that need no wait: the first picture, and one change right after it. */
export const FREE_PICTURE_CHANGES = 2;
export const SECOND_WAIT_DAYS = 30;
export const LATER_WAIT_DAYS = 182; // about 6 months

/** Days to wait after the last change, given how many changes were already made. */
export function pictureWaitDays(changes: number): number {
  if (changes < FREE_PICTURE_CHANGES) return 0;
  return changes === FREE_PICTURE_CHANGES ? SECOND_WAIT_DAYS : LATER_WAIT_DAYS;
}

/** When the next change is allowed, or null when it is allowed now. */
export function nextPictureChangeAt(changes = 0, lastChangedAt?: Date | string | null, now = new Date()): Date | null {
  const wait = pictureWaitDays(changes);
  if (!wait || !lastChangedAt) return null;
  const at = new Date(new Date(lastChangedAt).getTime() + wait * DAY_MS);
  return at > now ? at : null;
}

/** "You can change your picture again on 26 Nov 2026." */
export function pictureWaitText(at: Date | string): string {
  const d = new Date(at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
  return `You can change your picture again on ${d}.`;
}

/** The line under the upload button while a change is allowed, saying what the next one costs. */
export function pictureHint(changes: number): string {
  if (changes === 0) return `You can add a picture and change it once more straight away. After that, the next change is allowed after ${SECOND_WAIT_DAYS} days, then once every 6 months.`;
  if (changes === 1) return `You can change your picture once more now. After that, the next change is allowed after ${SECOND_WAIT_DAYS} days, then once every 6 months.`;
  return "If you change your picture now, you can change it again after 6 months.";
}
