"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Car, CalendarDays, CircleCheck, Clock, Wallet } from "lucide-react";
import { DataTable, PageHeader, SearchField, SelectField, StatCard, StatusBadge, UserCell } from "@/components/admin/ui";

type Booking = {
  _id: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  deposit: number;
  status: string;
  createdAt: string;
  renterId: { name: string; email: string };
  rentalId: { listingId: { title: string; make: string; model: string } };
};

const STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

function nights(start: string, end: string) {
  return Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000));
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetch("/api/bookings?role=owner&admin=true")
      .then(r => r.json())
      .then(d => { setBookings(d.bookings || []); setLoading(false); });
  }, []);

  const q = search.toLowerCase();
  const filtered = bookings.filter(b => {
    const matchSearch = b.renterId?.name?.toLowerCase().includes(q) || b.renterId?.email?.toLowerCase().includes(q);
    const matchStatus = statusFilter ? b.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const totalRevenue = bookings.filter(b => b.status === "COMPLETED").reduce((s, b) => s + b.totalAmount, 0);

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Every rental booking across the platform"
        actions={
          <>
            <SearchField value={search} onChange={setSearch} placeholder="Search by renter…" />
            <SelectField value={statusFilter} onChange={setStatusFilter} options={STATUSES} allLabel="All statuses" ariaLabel="Filter by status" />
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total bookings" value={bookings.length.toLocaleString()} icon={CalendarDays} tone="blue" />
        <StatCard label="Pending" value={bookings.filter(b => b.status === "PENDING").length} icon={Clock} tone="amber" />
        <StatCard label="Completed" value={bookings.filter(b => b.status === "COMPLETED").length} icon={CircleCheck} tone="green" />
        <StatCard label="Rental revenue" value={`PKR ${totalRevenue.toLocaleString()}`} icon={Wallet} tone="violet" hint="From completed bookings" />
      </div>

      <DataTable
        rows={filtered}
        rowKey={b => b._id}
        loading={loading}
        empty="No bookings found"
        cols="md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.8fr)_minmax(0,1.3fr)_minmax(0,1fr)_112px]"
        columns={[
          {
            header: "Renter",
            cell: b => <UserCell name={b.renterId?.name || "Unknown"} email={b.renterId?.email} />,
          },
          {
            header: "Vehicle",
            full: true,
            cell: b => (
              <div className="flex min-w-0 items-center gap-2">
                <span className="hidden h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 md:flex">
                  <Car size={14} />
                </span>
                <p className="truncate text-sm font-medium text-slate-700">{b.rentalId?.listingId?.title || "Unknown vehicle"}</p>
              </div>
            ),
          },
          {
            header: "Dates",
            cell: b => (
              <div className="leading-tight">
                <p className="flex items-center gap-1 text-sm font-medium tabular-nums text-slate-800">
                  {fmt(b.startDate)} <ArrowRight size={12} className="text-slate-300" /> {fmt(b.endDate)}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {nights(b.startDate, b.endDate)} day{nights(b.startDate, b.endDate) !== 1 ? "s" : ""} · {new Date(b.startDate).getFullYear()}
                </p>
              </div>
            ),
          },
          {
            header: "Amount",
            align: "right",
            cell: b => (
              <div className="leading-tight">
                <p className="text-sm font-semibold tabular-nums text-slate-900">PKR {b.totalAmount.toLocaleString()}</p>
                {b.deposit > 0 && <p className="mt-0.5 text-xs tabular-nums text-slate-400">+{b.deposit.toLocaleString()} deposit</p>}
              </div>
            ),
          },
          { header: "Status", align: "right", cell: b => <StatusBadge status={b.status} /> },
        ]}
      />

      {!loading && (
        <p className="mt-3 text-xs text-slate-400">
          Showing {filtered.length} of {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
        </p>
      )}
    </>
  );
}
