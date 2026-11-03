"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Headset } from "lucide-react";
import { btn } from "@/components/admin/ui";
import Select from "@/components/ui/Select";
import { planFor, planHas, type PlanId } from "@/lib/plans";

export type AdminOption = { _id: string; name?: string; email: string };

/**
 * Admin → Businesses ⋯ "Account manager": the admin who looks after a business (Dedicated support, src/lib/
 * accountManager.ts). While its plan includes Dedicated support, its messages to AutoGO Support go straight to them.
 */
export default function AccountManagerDialog({ business, admins, onClose, onSaved }: {
  business: { _id: string; name: string; plan: PlanId; accountManager?: AdminOption | null } | null;
  admins: AdminOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  // Starts from the business's current manager each time the dialog opens (keyed by the business below)
  return (
    <Dialog.Root open={business !== null} onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl">
          {business && <Form key={business._id} business={business} admins={admins} onClose={onClose} onSaved={onSaved} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Form({ business, admins, onClose, onSaved }: {
  business: { _id: string; name: string; plan: PlanId; accountManager?: AdminOption | null };
  admins: AdminOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [adminId, setAdminId] = useState(business.accountManager?._id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dedicated = planHas(business.plan, "dedicatedSupport");

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/admin/organizations/${business._id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accountManager", adminId: adminId || null }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSaving(false);
    if (!res?.ok) { setError(data?.error ?? "Couldn't save"); return; }
    onSaved();
    onClose();
  }

  return (
    <>
      <Dialog.Title className="flex items-center gap-2 text-base font-semibold text-slate-900"><Headset size={18} className="text-indigo-600" /> Account manager</Dialog.Title>
      <Dialog.Description className="mt-1 text-sm text-slate-500">
        Who looks after <strong className="font-semibold text-slate-900">{business.name}</strong>. Their messages to AutoGO Support go straight to this admin, and the business sees their name.
      </Dialog.Description>
      {!dedicated && (
        <p className="mt-3 text-xs font-medium text-amber-700">
          This business isn&apos;t on {planFor("dedicatedSupport").name}, so the account manager only takes over once it is.
        </p>
      )}
      <label className="mt-4 block text-xs font-medium text-slate-600">
        Admin
        <Select value={adminId} onChange={setAdminId} ariaLabel="Account manager" className="mt-1 h-10"
          options={[{ value: "", label: "No account manager" }, ...admins.map(a => ({ value: a._id, label: a.name ? `${a.name} (${a.email})` : a.email }))]} />
      </label>
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={`${btn.base} ${btn.secondary} px-3 py-2`}>Cancel</button>
        <button type="button" onClick={save} disabled={saving} className={`${btn.base} bg-slate-900 px-3.5 py-2 text-white hover:bg-slate-800`}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </>
  );
}
