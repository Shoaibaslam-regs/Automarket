// Client-side: short confirmations ("Saved", "Removed from saved") shown by components/ui/Toaster.tsx,
// which Providers mounts once. Call toast() from any client component.

export type ToastTone = "saved" | "removed" | "info";
export type ToastItem = { id: number; message: string; tone: ToastTone; action?: { label: string; href: string } };

const EVENT = "am:toast";
let next = 1;

export function toast(message: string, opts: { tone?: ToastTone; action?: ToastItem["action"] } = {}) {
  if (typeof window === "undefined") return;
  const item: ToastItem = { id: next++, message, tone: opts.tone ?? "info", action: opts.action };
  window.dispatchEvent(new CustomEvent<ToastItem>(EVENT, { detail: item }));
}

export const TOAST_EVENT = EVENT;
