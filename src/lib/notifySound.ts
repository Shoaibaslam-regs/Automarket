// Client-only: the AutoMarket chime played when a notification arrives while the app is open.
// (When the app is closed the phone plays its own notification sound; websites can't change that.)

const KEY = "notify-sound";
const SRC = "/sounds/notify.wav";
let audio: HTMLAudioElement | null = null;
let lastPlayed = 0;

/** Whether the chime is on for this browser (on unless the user turned it off). */
export function chimeEnabled(): boolean {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
}

export function setChimeEnabled(on: boolean) {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {}
}

/**
 * Plays the chime once. The same notification can arrive twice (live update and push message), so plays within
 * 2 seconds are merged. Browsers only allow sound after the person has tapped the page once; until then it's silent.
 */
export function playChime(force = false) {
  if (typeof window === "undefined" || (!force && !chimeEnabled())) return;
  const now = Date.now();
  if (!force && now - lastPlayed < 2000) return;
  lastPlayed = now;
  try {
    audio ??= new Audio(SRC);
    audio.volume = 0.8;
    audio.currentTime = 0;
    void audio.play().catch(() => {});
  } catch {}
}
