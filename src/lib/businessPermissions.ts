// Client-safe business roles and what each may do (re-exported by src/lib/business.ts for server code).

export type BusinessRole = "OWNER" | "MANAGER" | "SALES" | "STAFF";

/** What each business role may do; mirrors the role guide on the staff page. */
export const BUSINESS_PERMISSIONS = {
  /** Add, re-role and remove team members */
  manageTeam: ["OWNER", "MANAGER"],
  /** Add customers and update their details or deal status */
  editCustomers: ["OWNER", "MANAGER", "SALES"],
  /** Delete a customer record, and only once its deal is closed */
  deleteCustomers: ["OWNER"],
  /** Create walk-in bookings and move bookings through their statuses */
  manageBookings: ["OWNER", "MANAGER", "SALES"],
  /** Handle purchase requests and record sales (accept, decline, mark sold, payments) */
  manageSales: ["OWNER", "MANAGER", "SALES"],
  /** See every team member's actions (Staff → Activity) */
  viewActivity: ["OWNER"],
  /** See per-member numbers (Staff → Performance) */
  viewPerformance: ["OWNER", "MANAGER"],
  /** Expenses, profit per vehicle and the cash book (Money) */
  manageMoney: ["OWNER", "MANAGER"],
  /** Create, edit, pause and delete deals */
  manageDeals: ["OWNER", "MANAGER"],
  /** Publicly reply to customer reviews */
  replyReviews: ["OWNER", "MANAGER"],
} as const satisfies Record<string, readonly BusinessRole[]>;

export type BusinessPermission = keyof typeof BUSINESS_PERMISSIONS;

export function can(role: BusinessRole | null | undefined, permission: BusinessPermission): boolean {
  return !!role && (BUSINESS_PERMISSIONS[permission] as readonly BusinessRole[]).includes(role);
}

