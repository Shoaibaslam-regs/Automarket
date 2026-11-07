// Subscription plans. Safe to import from client components: no server-only imports here.

export const PLAN_IDS = ["FREE", "STARTER", "PRO", "UNLIMITED"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** `null` means unlimited. Staff counts every team member, the owner included. */
export type PlanLimits = { listings: number | null; staff: number | null; customers: number | null };

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  /** Monthly price in PKR */
  price: number;
  limits: PlanLimits;
  features: string[];
  /** Accent colour (a theme variable, so it adapts to dark mode) for plan names and badges; CSS only, not SVG */
  accent: string;
  highlight?: boolean;
};

export const PLANS: Record<PlanId, Plan> = {
  FREE: {
    id: "FREE",
    accent: "var(--gh-57606a)",
    name: "Free",
    tagline: "Get started with a few vehicles and a small team",
    price: 0,
    limits: { listings: 3, staff: 1, customers: 5 },
    features: ["3 listings or deals a month", "Just you (no staff accounts)", "AI-verified photos", "Buyer messaging", "Rental management", "Up to 5 customer leads"],
  },
  STARTER: {
    id: "STARTER",
    accent: "var(--gh-0550ae)",
    name: "Premium",
    tagline: "For regular sellers and small showrooms",
    price: 499,
    limits: { listings: 10, staff: 3, customers: 50 },
    features: ["10 listings or deals a month", "Team of 3 (owner + 2 staff)", "Up to 50 customer leads", "Rental management", "Sales reports"],
  },
  PRO: {
    id: "PRO",
    accent: "var(--gh-4f46e5)",
    name: "Premium Plus",
    tagline: "For growing dealerships",
    price: 1199,
    limits: { listings: 35, staff: 6, customers: 199 },
    features: ["35 listings or deals a month", "Team of 6 (owner + 5 staff)", "Up to 199 customer leads", "Sales reports", "Money & profit tracking", "12 boosts a month, 7 days each", "Pinned vehicles on your shop", "10% off sponsored ads", "Priority support"],
    highlight: true,
  },
  UNLIMITED: {
    id: "UNLIMITED",
    accent: "var(--gh-9a6700)",
    name: "Ultimate",
    tagline: "Run your whole business on AutoGO",
    price: 3999,
    limits: { listings: 200, staff: 30, customers: 1000 },
    features: ["200 listings or deals a month", "Team of 30", "Up to 1,000 customer leads", "Verified badge included", "50 boosts a month, 30 days each", "25% off sponsored ads", "Advanced reports", "Dedicated support"],
  },
};

export const PLAN_LIST: Plan[] = PLAN_IDS.map(id => PLANS[id]);

/**
 * What each plan includes besides its limits: the single source for the pricing page's comparison and for any
 * feature check (`planHas`, and `subscriptionHas` in src/lib/subscription.ts). A higher plan includes everything a
 * lower one does. Labels match the plans' `features` text.
 */
export const PLAN_FEATURES = {
  aiPhotos: { label: "AI-verified photos", from: "FREE" },
  messaging: { label: "Buyer messaging", from: "FREE" },
  // Renting out vehicles and managing bookings is on every plan, private sellers included
  rentals: { label: "Rental management", from: "FREE" },
  salesReports: { label: "Sales reports", from: "STARTER" },
  prioritySupport: { label: "Priority support", from: "PRO" },
  money: { label: "Money & profit tracking", from: "PRO" },
  boost: { label: "Boost listings", from: "PRO" },
  pinnedVehicles: { label: "Pinned vehicles on your shop", from: "PRO" },
  adDiscount: { label: "Sponsored ad discount", from: "PRO" },
  verifiedIncluded: { label: "Verified badge included", from: "UNLIMITED" },
  advancedReports: { label: "Advanced reports", from: "UNLIMITED" },
  dedicatedSupport: { label: "Dedicated support", from: "UNLIMITED" },
} as const satisfies Record<string, { label: string; from: PlanId }>;

/**
 * Boosts (PLAN_FEATURES.boost): how many a plan gives each calendar month (Pakistan time, like the listing quota) and
 * how long each one keeps a vehicle or deal at the top. A used boost stays used, even if the item is then deleted.
 */
export const PLAN_BOOSTS: Partial<Record<PlanId, { perMonth: number; days: number }>> = {
  PRO: { perMonth: 12, days: 7 },
  UNLIMITED: { perMonth: 50, days: 30 },
};

/** Percent off sponsored ads (PLAN_FEATURES.adDiscount). */
export const AD_DISCOUNT_PCT: Partial<Record<PlanId, number>> = { PRO: 10, UNLIMITED: 25 };

export type PlanFeature = keyof typeof PLAN_FEATURES;
export const PLAN_FEATURE_LIST = Object.keys(PLAN_FEATURES) as PlanFeature[];

/** Whether a plan includes a feature (plans are ordered FREE < STARTER < PRO < UNLIMITED). */
export function planHas(planId: PlanId, feature: PlanFeature): boolean {
  return PLAN_IDS.indexOf(planId) >= PLAN_IDS.indexOf(PLAN_FEATURES[feature].from);
}

/** The cheapest plan that includes a feature, for "Available on Premium Plus" prompts. */
export function planFor(feature: PlanFeature): Plan {
  return PLANS[PLAN_FEATURES[feature].from];
}

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

/** The plan actually in force: unknown plans and expired paid plans fall back to Free. */
export function effectivePlanId(plan: unknown, expiresAt?: Date | string | null): PlanId {
  if (!isPlanId(plan) || plan === "FREE") return "FREE";
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return "FREE";
  return plan;
}

/**
 * The listing limit is a monthly quota shared by listings and deals: every one created in the calendar month
 * counts, even if it is deleted later. Months follow Pakistan time (UTC+5, no daylight saving).
 */
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Start of the current quota month (midnight on the 1st, Pakistan time). */
export function quotaMonthStart(now = new Date()): Date {
  const pk = new Date(now.getTime() + PKT_OFFSET_MS);
  return new Date(Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), 1) - PKT_OFFSET_MS);
}

/** When the listing quota next resets (the 1st of next month, Pakistan time). */
export function quotaResetsAt(now = new Date()): Date {
  const pk = new Date(now.getTime() + PKT_OFFSET_MS);
  return new Date(Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth() + 1, 1) - PKT_OFFSET_MS);
}

export function formatLimit(limit: number | null): string {
  return limit === null ? "Unlimited" : limit.toLocaleString();
}

export function formatPlanPrice(price: number): string {
  return price === 0 ? "PKR 0" : `PKR ${price.toLocaleString()}`;
}

/** Display info for any stored plan string, falling back to Free for legacy or unknown values. */
export function planInfo(plan: unknown): Plan {
  return PLANS[isPlanId(plan) ? plan : "FREE"];
}

/** How a paid plan was obtained. Gifts and trials cost the user nothing and can be revoked by an admin. */
export type PlanSource = "PAID" | "ADMIN_GRANT" | "TRIAL";

export const TRIAL_MONTHS = 1;

/**
 * Every paid plan runs for whole 30-day periods and then ends: the account falls back to Free
 * (effectivePlanId) until the plan is bought again. Nothing runs without an end date.
 */
export const PLAN_PERIOD_DAYS = 30;

/** `from` plus `periods` plan periods of PLAN_PERIOD_DAYS each. */
export function addPlanPeriods(from: Date, periods: number): Date {
  return new Date(from.getTime() + periods * PLAN_PERIOD_DAYS * 86_400_000);
}

export function isFreeGrant(source: unknown): boolean {
  return source === "ADMIN_GRANT" || source === "TRIAL";
}

export function planSourceLabel(source: unknown): string | null {
  return source === "TRIAL" ? "Free trial" : source === "ADMIN_GRANT" ? "Complimentary" : source === "PAID" ? "Paid" : null;
}

/**
 * Verified badge: a separate add-on for businesses, not a plan tier. Like a paid plan it is
 * requested from the team, approved by an admin for a number of months, and can be gifted.
 */
export const VERIFIED_BADGE = {
  name: "Verified badge",
  /** Monthly price in PKR */
  price: 499,
  features: [
    "Blue Verified tick on your business page",
    "Verified label on every listing your team posts",
    "Checked by the AutoGO team, so buyers trust you faster",
    "More turns for your Standard sponsored ads",
    "Works with any plan, Free included, and comes free with Ultimate",
  ],
};

/**
 * Sponsored ads: a business pays to show its business page, a deal or a vehicle in the "Sponsored" row on
 * the home page. Requested from Business → Promote, paid manually and switched on by an admin (Admin → Ad requests).
 */
/**
 * Sponsored ads (Business → Promote). Ads are shown to visitors in the business's city first. A row shows
 * `slotsShown` ads; Top ads take the first places in their city (at most `topPerCity` running there at once), and
 * Standard ads share the rest by rotation, so any number can run and each gets a fair share of views.
 */
export type AdTier = "STANDARD" | "TOP";
export const SPONSORED_AD = {
  name: "Sponsored ad",
  /** PKR per week, by tier */
  pricePerWeek: { STANDARD: 999, TOP: 2499 } as Record<AdTier, number>,
  /** The lengths a business can pick, in weeks */
  weeks: [1, 2, 4] as const,
  /** Ads in the home page row at one time (and so per visit) */
  slotsShown: 8,
  /** Top ads running in one city at the same time */
  topPerCity: 2,
  /** In Browse results, one sponsored card after this many vehicles */
  browseEvery: 12,
};

export const AD_TIER_LABEL: Record<AdTier, string> = { STANDARD: "Standard", TOP: "Top" };

export function adPrice(weeks: number, tier: AdTier = "STANDARD", planId?: PlanId): number {
  const full = SPONSORED_AD.pricePerWeek[tier] * weeks;
  const pct = (planId && AD_DISCOUNT_PCT[planId]) || 0;
  return Math.round(full * (1 - pct / 100));
}

/**
 * About how many visits in a city show one Standard ad, when `standardAds` Standard ads (including it) share the
 * places left after `topAds` Top ads: "1 in 3" means it appears in roughly every third visit. 1 means every visit.
 */
export function standardShare(standardAds: number, topAds: number): number {
  const places = Math.max(1, SPONSORED_AD.slotsShown - Math.min(topAds, SPONSORED_AD.topPerCity));
  return Math.max(1, Math.ceil(Math.max(1, standardAds) / places));
}

/** The badge fields stored on an Organization. Dates may be strings once sent to the client. */
export type BadgeVerification = {
  verifiedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  /** PLAN: included with the owner's plan (PLAN_FEATURES.verifiedIncluded, src/lib/planBadge.ts) */
  source?: "PAID" | "ADMIN_GRANT" | "PLAN" | null;
  requestedAt?: Date | string | null;
  rejectedAt?: Date | string | null;
  rejectionReason?: string | null;
};

/** Whether the badge is in force right now: approved and not past its end date. */
export function isVerified(v: BadgeVerification | null | undefined, now = new Date()): boolean {
  if (!v?.verifiedAt) return false;
  return !v.expiresAt || new Date(v.expiresAt).getTime() > now.getTime();
}

export type BadgeState = "NONE" | "VERIFIED" | "EXPIRED";

export function badgeState(v: BadgeVerification | null | undefined): BadgeState {
  if (isVerified(v)) return "VERIFIED";
  return v?.verifiedAt ? "EXPIRED" : "NONE";
}
