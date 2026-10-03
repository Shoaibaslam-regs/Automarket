"use client";

import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export default function ModeToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const isBusiness = pathname.startsWith("/business");

  function toggle() {
    if (isBusiness) {
      router.push("/");
    } else {
      if (!session?.user) {
        router.push("/login?redirect=/business/onboarding");
        return;
      }
      router.push("/business");
    }
  }

  return (
    <button
      onClick={toggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 14px",
        borderRadius: "20px",
        border: "1px solid",
        borderColor: isBusiness ? "#0d1117" : "#e1e4e8",
        background: isBusiness ? "#0d1117" : "white",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.2s",
        flexShrink: 0,
      }}
    >
      {/* Toggle pill */}
      <div style={{
        width: "32px", height: "18px",
        background: isBusiness ? "#22c55e" : "#d0d7de",
        borderRadius: "9px", position: "relative",
        transition: "background 0.2s", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: "2px",
          left: isBusiness ? "16px" : "2px",
          width: "14px", height: "14px",
          background: "white", borderRadius: "50%",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }} />
      </div>
      <span style={{
        fontSize: "12px", fontWeight: 600,
        color: isBusiness ? "white" : "#57606a",
        whiteSpace: "nowrap",
      }}>
        {isBusiness ? "Business mode" : "Switch to selling"}
      </span>
    </button>
  );
}
