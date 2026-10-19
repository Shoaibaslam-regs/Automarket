// Client-safe shape of an item on the Notifications page (GET /api/notifications).

export type NotificationKind = "message" | "bookingRequest" | "bookingUpdate" | "purchaseUpdate" | "saleRequest" | "official";

export type NotificationItem = {
  kind: NotificationKind;
  id: string;
  title: string;
  body: string;
  /** ISO time of the event */
  at: string;
  /** Where to handle it */
  href: string;
};
