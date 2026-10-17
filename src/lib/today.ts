// Client-safe shape of the business console's "Today" list (GET /api/business/today).

export type TodayKind = "bookingRequest" | "pickup" | "return" | "deposit" | "saleRequest" | "installment" | "followUp";

export type TodayItem = {
  kind: TodayKind;
  id: string;
  title: string;
  subtitle: string;
  /** When it's due (ISO) */
  at: string;
  overdue: boolean;
  /** The page that handles it, with the booking or sale number pre-searched */
  href: string;
  /** Label for the button, e.g. "Hand over" */
  action: string;
};
