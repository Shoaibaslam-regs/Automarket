"use client";

import { useEffect, useState } from "react";

export type MyBusiness = { name: string; logo?: string; type?: string; role?: string | null };

export const BUSINESS_ROLE_NAME: Record<string, string> = { OWNER: "Owner", MANAGER: "Manager", SALES: "Sales", STAFF: "Staff" };

/**
 * The signed-in user's business (name, logo, their role), for the account menus.
 * Only fetched when `enabled` (the menu is open and the user has a business).
 */
export function useMyBusiness(enabled: boolean): MyBusiness | null {
  const [biz, setBiz] = useState<MyBusiness | null>(null);
  useEffect(() => {
    if (!enabled) return;
    fetch("/api/business/organizations")
      .then(r => (r.ok ? r.json() : null))
      .then(d => d?.organization && setBiz({ name: d.organization.name, logo: d.organization.logo, type: d.organization.type, role: d.myRole }))
      .catch(() => {});
  }, [enabled]);
  return biz;
}
