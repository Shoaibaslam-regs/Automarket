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
  /** Hex accent used for plan badges in the inline-styled business console */
  accent: string;
  highlight?: boolean;
};

export const PLANS: Record<PlanId, Plan> = {
  FREE: {
    id: "FREE",
    accent: "#57606a",
    name: "Free",
    tagline: "Get started with a few vehicles and a small team",
    price: 0,
    limits: { listings: 5, staff: 3, customers: 10 },
    features: ["5 active listings", "Team of 3 (owner + 2 staff)", "AI-verified photos", "Buyer messaging", "Up to 10 customer leads"],
  },
  STARTER: {
    id: "STARTER",
    accent: "#0550ae",
    name: "Premium",
    tagline: "For regular sellers and small showrooms",
    price: 500,
    limits: { listings: 20, staff: 5, customers: 100 },
    features: ["20 active listings", "Team of 5 (owner + 4 staff)", "Up to 100 customer leads", "Rental management", "Sales reports"],
  },
  PRO: {
    id: "PRO",
    accent: "#8250df",
    name: "Premium Plus",
    tagline: "For growing dealerships",
    price: 1200,
    limits: { listings: 50, staff: 10, customers: 500 },
    features: ["50 active listings", "Team of 10", "Up to 500 customer leads", "Rental management", "Sales reports", "Priority support"],
    highlight: true,
  },
  UNLIMITED: {
    id: "UNLIMITED",
    accent: "#9a6700",
    name: "Unlimited",
    tagline: "Run your whole business on AutoMarket",
    price: 5000,
    limits: { listings: null, staff: null, customers: null },
    features: ["Unlimited listings", "Unlimited staff", "Unlimited customers", "Full business management", "Advanced reports", "Dedicated support"],
  },
};

export const PLAN_LIST: Plan[] = PLAN_IDS.map(id => PLANS[id]);

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

/** The plan actually in force: unknown plans and expired paid plans fall back to Free. */
export function effectivePlanId(plan: unknown, expiresAt?: Date | string | null): PlanId {
  if (!isPlanId(plan) || plan === "FREE") return "FREE";
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return "FREE";
  return plan;
}

/** Listings in these statuses take up a plan slot; sold and inactive ones free it again. */
export const SLOT_STATUSES = ["ACTIVE", "PENDING", "RENTED"] as const;

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
