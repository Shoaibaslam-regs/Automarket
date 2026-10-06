"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { signOut } from "next-auth/react";

export default function SignOutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await signOut({ callbackUrl: "/" });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000 }} />
        <Dialog.Content
          style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "calc(100% - 32px)", maxWidth: "380px", background: "white", borderRadius: "14px", padding: "24px", boxShadow: "0 20px 50px rgba(0,0,0,0.2)", zIndex: 1001, fontFamily: "inherit" }}>
          <Dialog.Title style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0d1117" }}>
            Sign out?
          </Dialog.Title>
          <Dialog.Description style={{ margin: "8px 0 20px", fontSize: "14px", color: "#57606a", lineHeight: 1.5 }}>
            Are you sure you want to sign out of your account?
          </Dialog.Description>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <Dialog.Close asChild>
              <button disabled={loading}
                style={{ padding: "9px 16px", fontSize: "13px", fontWeight: 600, color: "#0d1117", background: "white", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "8px", cursor: "pointer", fontFamily: "inherit" }}>
                Cancel
              </button>
            </Dialog.Close>
            <button onClick={handleConfirm} disabled={loading}
              style={{ padding: "9px 16px", fontSize: "13px", fontWeight: 600, color: "white", background: "#dc2626", border: "none", borderRadius: "8px", cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "inherit" }}>
              {loading ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
