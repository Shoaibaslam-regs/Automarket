"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Headset, ShieldAlert } from "lucide-react";

/**
 * Locks the business console while the business is suspended, leaving only Help & support
 * open so the owner can appeal. The APIs enforce the suspension independently.
 */
export default function SuspensionGate({
  suspension,
  children,
}: {
  suspension: { name: string; reason: string; at: string } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (!suspension || pathname.startsWith("/business/support")) return <>{children}</>;

  return (
    <div className="flex min-h-[calc(100vh-48px)] items-center justify-center bg-[#f6f8fa] p-4 md:min-h-screen">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#ffcdd2] bg-white text-center shadow-[0_20px_50px_-30px_rgba(207,34,46,0.45)]">
        <div className="bg-[#fff0f0] px-6 py-6">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#cf222e] text-white"><ShieldAlert size={22} /></span>
          <h1 className="mt-3 text-lg font-bold text-[#0d1117]">{suspension.name} is suspended</h1>
          <p className="mt-1 text-xs text-[#57606a]">
            Since {new Date(suspension.at).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="px-6 py-5 text-[13px] text-[#57606a]">
          <p className="rounded-lg bg-[#f6f8fa] px-3 py-2.5 text-left text-[#24292f]"><span className="font-semibold">Reason:</span> {suspension.reason}</p>
          <p className="mt-3">Your listings are hidden from the marketplace and your public page is offline. The console is locked until an admin reinstates the business.</p>
          <Link href="/business/support" className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#0d1117] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#24292f]">
            <Headset size={15} /> Contact support to appeal
          </Link>
          <Link href="/home" className="mt-3 block text-xs font-semibold text-[#57606a] hover:text-[#0d1117]">Back to the marketplace</Link>
        </div>
      </div>
    </div>
  );
}
