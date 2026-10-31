// Test data for the browser tests, written into the throwaway in-memory database that e2e/server.ts starts.
// Never point this at a real database: it creates accounts with a known password.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../src/models/User";
import { Listing } from "../src/models/Listing";
import { Rental } from "../src/models/Rental";
import { Organization } from "../src/models/Organization";
import { Employee } from "../src/models/Employee";
import { Deal } from "../src/models/Deal";
import { BlogPost } from "../src/models/BlogPost";
import { STARTER_POSTS } from "../src/lib/blogStarter";

export const SEED_FILE = path.join(__dirname, ".data", "seed.json");
export const PASSWORD = "Drive-Safe-2026!";
const DAY = 86_400_000;

export type Seed = {
  password: string;
  users: { owner: string; renterA: string; renterB: string; dealer: string; lapsed: string };
  names: { renterA: string; renterB: string };
  rentalListingId: string;
  civicId: string;
  dealId: string;
};

export async function seed(uri: string): Promise<Seed> {
  if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)/.test(uri)) throw new Error("Seeding only runs against a local test database");
  await mongoose.connect(uri);
  const hash = await bcrypt.hash(PASSWORD, 10);
  const person = (name: string, email: string, phone: string) =>
    ({ name, email, phone, password: hash, termsAcceptedAt: new Date() });
  const [owner, renterA, renterB, dealer, lapsed] = await User.create([
    person("Asad Owner", "owner@e2e.test", "03001110001"),
    person("Bilal Renter", "bilal@e2e.test", "03001110002"),
    person("Sara Renter", "sara@e2e.test", "03001110003"),
    // On Premium, ending in 3 days: the console's plan reminders
    { ...person("Zain Dealer", "dealer@e2e.test", "03001110004"), plan: "STARTER", planSource: "PAID", planExpiresAt: new Date(Date.now() + 3 * DAY - 3_600_000) },
    // Premium ended yesterday: a lapsed business can't add anything new
    { ...person("Laila Lapsed", "lapsed@e2e.test", "03001110005"), plan: "STARTER", planSource: "PAID", planExpiresAt: new Date(Date.now() - DAY) },
  ]);

  const photos = ["/car/body.png", "/icons/icon-512.png"];
  const base = { condition: "GOOD", status: "ACTIVE", images: photos, sellerId: owner._id, fuelType: "Petrol" };

  // A private rental with a booking page and a calendar
  const rentalListing = await Listing.create({
    ...base, type: "RENT", title: "Toyota Corolla GLi 2019 for rent", make: "Toyota", model: "Corolla", year: 2019,
    price: 6000, location: "Karachi", transmission: "Automatic", mileage: 64000, color: "White",
    description: "Clean Corolla for daily or weekly rent in Karachi. Driver available on request.",
  });
  await Rental.create({ listingId: rentalListing._id, ownerId: owner._id, dailyRate: 6000, deposit: 20000, availableFrom: new Date(Date.now() - DAY) });

  // Four Civics for sale in Karachi (enough for the market price check), plus a few others for search pages
  const civics = await Listing.create([65, 60, 62, 70].map((lakh, i) => ({
    ...base, type: "SALE", title: `Honda Civic Oriel ${2020 + (i % 2)}`, make: "Honda", model: "Civic", year: 2020 + (i % 2),
    price: lakh * 100_000, location: "Karachi", transmission: "Automatic", mileage: 40000 + i * 5000,
    description: "Well kept Civic, first owner, all documents complete.",
  })));
  await Listing.create([
    { ...base, type: "SALE", title: "Honda City 1.5 2018", make: "Honda", model: "City", year: 2018, price: 3_800_000, location: "Lahore", transmission: "Manual", description: "Honda City in Lahore, genuine condition." },
    { ...base, type: "SALE", title: "Suzuki Alto VXR 2022", make: "Suzuki", model: "Alto", year: 2022, price: 2_500_000, location: "Karachi", transmission: "Manual", description: "Alto VXR, low mileage, Karachi number." },
  ]);

  // A rental business with a live rent deal (the deal page's phone bar and calendar)
  const org = await Organization.create({
    name: "E2E Motors", slug: "e2e-motors", type: "RENTAL", ownerId: dealer._id, isActive: true,
    city: "Karachi", phone: "03001110004", address: "Shahrah-e-Faisal",
  });
  await Employee.create({ organizationId: org._id, userId: dealer._id, role: "OWNER" });
  const lapsedOrg = await Organization.create({ name: "Lapsed Motors", slug: "lapsed-motors", type: "DEALER", ownerId: lapsed._id, isActive: true, city: "Lahore" });
  await Employee.create({ organizationId: lapsedOrg._id, userId: lapsed._id, role: "OWNER" });
  await User.updateOne({ _id: lapsed._id }, { organizationId: lapsedOrg._id, organizationRole: "OWNER" });
  await User.updateOne({ _id: dealer._id }, { organizationId: org._id, organizationRole: "OWNER" });
  const deal = await Deal.create({
    organizationId: org._id, createdBy: dealer._id, title: "Wedding convoy package", dealType: "RENT",
    make: "Toyota", model: "Fortuner", year: 2023, condition: "EXCELLENT", location: "Karachi", address: "Shahrah-e-Faisal",
    price: 30000, discountType: "PERCENT", discountValue: 20, vehicleCount: 3, deposit: 10000,
    startsAt: new Date(Date.now() - DAY), endsAt: new Date(Date.now() + 14 * DAY), images: photos,
    description: "Three Fortuners with drivers for your wedding day.",
  });

  // The blog's starter guides, as `npm run seed-blog` adds them
  await BlogPost.create(STARTER_POSTS.map((p, i) => ({ ...p, status: "PUBLISHED", publishedAt: new Date(Date.now() - (STARTER_POSTS.length - i) * DAY) })));

  const data: Seed = {
    password: PASSWORD,
    users: { owner: owner.email, renterA: renterA.email, renterB: renterB.email, dealer: dealer.email, lapsed: lapsed.email },
    names: { renterA: renterA.name, renterB: renterB.name },
    rentalListingId: String(rentalListing._id),
    civicId: String(civics[0]._id),
    dealId: String(deal._id),
  };
  mkdirSync(path.dirname(SEED_FILE), { recursive: true });
  writeFileSync(SEED_FILE, JSON.stringify(data, null, 2));
  await mongoose.disconnect();
  return data;
}
