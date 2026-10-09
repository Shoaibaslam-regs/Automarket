import { redirect } from "next/navigation";

// Rental bookings now live on the Bookings page; keep old links working
export default function BusinessRentalsPage() {
  redirect("/business/bookings");
}
