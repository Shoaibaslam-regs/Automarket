import { Suspense } from "react";
import BookingsContent from "@/components/bookings/BookingsContent";

export default function BookingsPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#f6f8fa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <p style={{ color: "#57606a", fontSize: "14px" }}>Loading bookings...</p>
      </div>
    }>
      <BookingsContent />
    </Suspense>
  );
}
