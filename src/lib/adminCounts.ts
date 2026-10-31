// Client-only: keeps the admin sidebar's badge counts (Support inbox, Requests, Reports, Ad requests) in step with
// what the pages do. A page that replies, closes or decides something calls refreshAdminCounts(); when its own
// list answer already carries the number, it passes it so the sidebar needn't ask again.

export const ADMIN_COUNTS_EVENT = "am:admin-counts";

export type KnownAdminCounts = Partial<{ support: number; requests: number; reports: number; ads: number }>;

/** Tells the sidebar to update its badges: to these numbers, or (with none) by reading them all again. */
export function refreshAdminCounts(known?: KnownAdminCounts) {
  window.dispatchEvent(new CustomEvent<KnownAdminCounts | null>(ADMIN_COUNTS_EVENT, { detail: known ?? null }));
}
