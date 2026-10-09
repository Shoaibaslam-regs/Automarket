"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Trash2 } from "lucide-react";

/**
 * Destructive-action confirmation for the business console, styled like the
 * delete-business dialog in settings. Stays open and locked while `loading`.
 */
export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  loadingLabel = "Deleting...",
  loading = false,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  loadingLabel?: string;
  loading?: boolean;
  error?: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={o => !loading && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000 }} />
        <Dialog.Content
          style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "calc(100% - 32px)", maxWidth: "420px", background: "white", borderRadius: "12px", boxShadow: "0 20px 50px rgba(0,0,0,0.2)", zIndex: 1001, overflow: "hidden", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e1e4e8", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
            <Dialog.Title style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0d1117", display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "8px", background: "#fff0f0", color: "#cf222e", flexShrink: 0 }}>
                <Trash2 size={15} />
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close" disabled={loading} style={{ background: "none", border: "none", cursor: "pointer", color: "#8c959f", fontSize: "20px", lineHeight: 1 }}>×</button>
            </Dialog.Close>
          </div>

          <div style={{ padding: "20px" }}>
            <Dialog.Description asChild>
              <div style={{ fontSize: "13px", color: "#57606a", lineHeight: 1.6 }}>{description}</div>
            </Dialog.Description>

            {error && (
              <div role="alert" style={{ background: "#fff0f0", border: "1px solid #ffcdd2", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: "#cf222e", marginTop: "14px" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "20px" }}>
              <Dialog.Close asChild>
                <button type="button" disabled={loading}
                  style={{ padding: "9px 18px", background: "#f6f8fa", border: "1px solid #e1e4e8", borderRadius: "8px", fontSize: "13px", fontWeight: 600, color: "#0d1117", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
              </Dialog.Close>
              <button type="button" onClick={onConfirm} disabled={loading}
                style={{ padding: "9px 18px", background: "#cf222e", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "inherit" }}>
                {loading ? loadingLabel : confirmLabel}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
