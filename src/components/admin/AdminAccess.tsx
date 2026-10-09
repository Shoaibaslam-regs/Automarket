"use client";

import { createContext, useContext, useEffect, useState } from "react";

type AdminAccessState = { access: "FULL" | "READ_ONLY" | null; canWrite: boolean };

const AdminAccessContext = createContext<AdminAccessState>({ access: null, canWrite: false });

/**
 * Loads the signed-in admin's access level once for the whole admin panel.
 * The API enforces it either way; this only hides actions a view-only admin can't take.
 */
export function AdminAccessProvider({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<AdminAccessState["access"]>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled) setAccess(d?.access ?? "READ_ONLY"); })
      .catch(() => { if (!cancelled) setAccess("READ_ONLY"); });
    return () => { cancelled = true; };
  }, []);

  return <AdminAccessContext.Provider value={{ access, canWrite: access === "FULL" }}>{children}</AdminAccessContext.Provider>;
}

export function useAdminAccess() {
  return useContext(AdminAccessContext);
}
