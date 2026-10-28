"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { adminCan, normalizeAdminAccess, type AdminAccess, type AdminPermission } from "@/lib/adminRoles";

type AdminAccessState = {
  access: AdminAccess | null;
  /** The platform owner (ADMIN_EMAIL) */
  owner: boolean;
  /** Whether this admin's role allows the action (src/lib/adminRoles.ts) */
  can: (permission: AdminPermission) => boolean;
};

const AdminAccessContext = createContext<AdminAccessState>({ access: null, owner: false, can: () => false });

/**
 * Loads the signed-in admin's role once for the whole admin panel.
 * The API enforces it either way; this only hides actions the admin's role can't take.
 */
export function AdminAccessProvider({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [owner, setOwner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled) { setAccess(d?.access ? normalizeAdminAccess(d.access) : "MANAGER"); setOwner(d?.owner === true); } })
      .catch(() => { if (!cancelled) setAccess("MANAGER"); });
    return () => { cancelled = true; };
  }, []);

  const can = useCallback((permission: AdminPermission) => adminCan(access, permission), [access]);
  return <AdminAccessContext.Provider value={{ access, owner, can }}>{children}</AdminAccessContext.Provider>;
}

export function useAdminAccess() {
  return useContext(AdminAccessContext);
}
