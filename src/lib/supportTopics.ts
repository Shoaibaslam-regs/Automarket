// Client-safe: topics a user can pick when contacting the AutoMarket team.

export const SUPPORT_TOPICS = [
  { id: "PLAN", label: "Plans & billing" },
  { id: "ACCOUNT", label: "Account or business details" },
  { id: "LISTING", label: "Listings & photo checks" },
  { id: "BOOKING", label: "Bookings or a customer issue" },
  { id: "REPORT", label: "Report a problem or abuse" },
  { id: "APPEAL", label: "Suspension appeal" },
  { id: "OTHER", label: "Something else" },
] as const;

export type SupportTopicId = (typeof SUPPORT_TOPICS)[number]["id"];

export function supportTopicLabel(id: unknown): string | null {
  return SUPPORT_TOPICS.find(t => t.id === id)?.label ?? null;
}
