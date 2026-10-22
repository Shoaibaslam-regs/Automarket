/**
 * After a new deployment, a page still running the previous version can ask for code files or Server
 * Actions that no longer exist. Those errors are cured by loading the new version, so the error screens
 * reload once instead of showing "Something went wrong". Client-safe.
 */
const STALE_BUILD = /ChunkLoadError|Loading (CSS )?chunk|Failed to load chunk|dynamically imported module|Importing a module script failed|older or newer deployment|Failed to find Server Action/i;
const RELOADED_KEY = "am-stale-reload";
// Don't reload again within this time, so a real fault can't cause a reload loop
const RELOAD_GAP_MS = 30_000;

export function isStaleBuildError(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | null;
  return STALE_BUILD.test(`${e?.name ?? ""} ${e?.message ?? ""}`);
}

/** Reloads the page for a stale-build error, at most once per RELOAD_GAP_MS. Returns true when it reloads. */
export function reloadForStaleBuild(error: unknown): boolean {
  if (typeof window === "undefined" || !isStaleBuildError(error)) return false;
  try {
    const last = Number(sessionStorage.getItem(RELOADED_KEY) || 0);
    if (Date.now() - last < RELOAD_GAP_MS) return false;
    sessionStorage.setItem(RELOADED_KEY, String(Date.now()));
  } catch {
    // Storage blocked: still reload once; the browser keeps no record, but the new version loads
  }
  window.location.reload();
  return true;
}
