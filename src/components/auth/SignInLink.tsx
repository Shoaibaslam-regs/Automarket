"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { currentPath, loginFor } from "@/lib/callbackPath";

/**
 * A "Sign in" link that brings the visitor back here afterwards (/login?callbackUrl=<this page>), including the
 * page's query (Browse filters). `to` sends them somewhere else instead, e.g. straight to the booking page.
 * Every sign-in link uses it; only Register (navbar, menus, footer, pricing) goes on to the dashboard.
 */
export default function SignInLink({ to, children, className, style, onClick }: {
  to?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // The address without the query works before the code loads; a click adds the query too
  const href = loginFor(to ?? pathname);
  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={e => {
        onClick?.();
        if (to || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        router.push(loginFor(currentPath()));
      }}
    >
      {children}
    </Link>
  );
}
