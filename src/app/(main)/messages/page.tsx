import { Suspense } from "react";
import MessagesContent from "@/components/messages/MessagesContent";

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#f6f8fa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <p style={{ color: "#57606a", fontSize: "14px" }}>Loading messages...</p>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}
