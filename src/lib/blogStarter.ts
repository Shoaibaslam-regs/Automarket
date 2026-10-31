// The blog's first posts, written for launch so /blog isn't empty. `npm run seed-blog` (src/scripts/seed-blog.ts)
// adds any that are missing as published posts; after that admins edit or delete them like any other post at
// Admin → Blog. Written in the marks described in src/lib/blog.ts. Client-safe (no imports).

export type StarterPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: "BUYING" | "SELLING" | "RENTING" | "SAFETY" | "MONEY" | "NEWS";
  body: string;
};

export const STARTER_POSTS: StarterPost[] = [
  {
    slug: "used-car-buying-checklist-pakistan",
    title: "Buying a used car in Pakistan: the complete checklist",
    category: "BUYING",
    excerpt: "Documents, Excise checks, the test drive and the handover: everything to check before you pay for a used car.",
    body: `A used car can be a great buy, but only if the papers are right and the car is what the seller says it is. Use this checklist from the first call to the day you drive it home.

## Before you visit
- Compare prices first. On AutoGO, every car for sale shows a Market price check against similar cars, so you know whether the asking price is fair.
- Ask the seller for the registration number, model year and mileage on the phone. A seller who won't share them is a warning sign.
- Check the car's registration online with your province's Excise & Taxation department, where available. The owner's details and tax status should match what the seller told you.

## The documents
- The original registration book or smart card, in the seller's name, or a clear chain of transfer papers.
- The original file with the purchase invoice, earlier transfer letters and receipts.
- Token tax paid up to date. Unpaid tax becomes your problem after the sale.
- The seller's original CNIC. The name and number must match the registration.

> Never buy a car on photocopies or with "the original file will come later".

## Check the car itself
- Match the chassis number and the engine number on the car with the ones on the registration.
- Look for repainted panels, uneven gaps and fresh paint smell: they can mean an accident.
- Check under the car for leaks and rust, and look at the tyres for uneven wear.
- Start the engine cold. Listen for knocking and watch the exhaust smoke.

## Take a proper test drive
1. Drive for at least 15 minutes, on a busy road and at higher speed if you can.
2. Test the brakes, the AC, the power steering and every gear.
3. Watch the temperature gauge, and make sure no warning lights stay on.
4. If you're unsure, take it to a mechanic you trust. A small inspection fee can save you lakhs.

## Paying and transfer
- Pay only once you have seen the car and the original documents, and preferably by bank transfer so there is a record.
- Write a simple sale agreement with both CNICs, the price, the date and time of handover, and both signatures.
- Complete the transfer at the Excise office as soon as you can. Many provinces now ask for biometric verification of both the buyer and the seller, so plan to go together.

Found a car you like? Browse cars for sale on AutoGO, and use Message or WhatsApp to ask the seller your questions first.`,
  },
  {
    slug: "renting-a-car-what-to-check",
    title: "Renting a car: what to check before you drive away",
    category: "RENTING",
    excerpt: "Deposit, the car's condition, the return time and late fees: a short guide to a stress-free car rental.",
    body: `Renting a car for a wedding, a trip up north or a week in another city is easy, as long as you and the owner agree on the details before the keys change hands.

## Before you book
- Check the daily rate, the security deposit and whether a driver or fuel is included.
- Open the vehicle's availability calendar on AutoGO to see which days are free, then send a request for your dates.
- The owner confirms your request. Until then the dates aren't held, so book early for busy seasons like Eid and wedding months.

## At pickup
- Carry your original CNIC. The owner records it with the car's number plate at handover.
- Walk around the car with the owner. Take photos of every scratch and dent, the odometer and the fuel gauge.
- Agree on the exact return date and time. On AutoGO the owner records this return time at handover.

> Up to one hour late is free. After that, each started day costs one more day of rent at the normal rate.

## During the rental
- Keep the car's papers in the glovebox and follow the agreed fuel policy.
- If something breaks, call the owner before getting it repaired.

## At return
- Check the car again together and compare it with your pickup photos.
- Settle any extra charges (fuel, damage, extra kilometres) on the spot, with a note of what each is for.
- Ask for your deposit back. If part of it is kept, the reason should be written down.

Ready to go? Browse cars for rent on AutoGO and tap a free day on the calendar to start your booking.`,
  },
  {
    slug: "sell-your-car-faster",
    title: "7 ways to sell your car faster on AutoGO",
    category: "SELLING",
    excerpt: "Better photos, a fair price and quick replies: simple steps that help buyers choose your car.",
    body: `Most buyers decide within seconds whether to open a listing. These steps help yours stand out and sell sooner.

## 1. Take clear photos
You can add up to 12 photos. Shoot in daylight, after a wash, from the front, back, both sides, the interior, the dashboard with the odometer, and the engine. The first photo is the one buyers see in search, so make it your best.

## 2. Set a fair price
Look at similar cars before you post. Once your listing is live, its Market price check shows buyers whether it is a good, fair or above-market price. A fair price gets more calls.

## 3. Write an honest description
Mention the model year, mileage, city of registration, service history, and anything that needs fixing. Honest listings get serious buyers and fewer wasted visits.

## 4. Fill in every detail
Fuel type, transmission, colour and condition help your car appear when buyers use filters. Add the address where the car can be seen.

## 5. Reply quickly
Buyers usually contact a few sellers at once. Reply to messages and calls the same day.

## 6. Keep your documents ready
Have the registration book, the original file, tax receipts and your CNIC ready, so a buyer who likes the car can finish the deal without delay.

## 7. Mark it sold
When the car is sold, mark it Sold from your dashboard. Buyers stop calling, and your profile stays trustworthy.

Ready? Tap Sell to post your car in a few minutes.`,
  },
  {
    slug: "avoid-car-scams-pakistan",
    title: "How to avoid scams when buying or renting a vehicle",
    category: "SAFETY",
    excerpt: "Advance payments, prices that are too good and fake documents: the warning signs, and how to stay safe.",
    body: `Most people on AutoGO are honest buyers, sellers and businesses. A few are not. Knowing the common tricks keeps your money safe.

## The warning signs
- The seller asks for an advance payment, a "token" or a booking fee before you have seen the vehicle.
- The price is far below every similar car.
- The seller is "out of the city" and wants to send the car through a courier or an agent.
- The seller pushes you to decide today, or refuses a test drive or an inspection.
- The documents are photocopies, or the name on them doesn't match the seller's CNIC.

> AutoGO never asks you to pay a seller, and never collects payments for vehicles.

## How to stay safe
1. See the vehicle and its original documents in person before paying anything.
2. Meet in a busy public place or at the seller's shop, in daylight, and take someone with you.
3. Verify the vehicle with your province's Excise & Taxation records where available.
4. Pay by bank transfer and keep the receipt and a signed sale agreement.

## Signs you can trust
- The Verified tick means the AutoGO team checked the business.
- The Phone verified tick means the seller confirmed their mobile number.
- Reviews on a business page come only from people the business really dealt with.

## Something feels wrong?
Use Report on the listing, deal or business page. Our team looks at every report, and listings reported by several people are hidden until we check them.`,
  },
  {
    slug: "car-financing-basics",
    title: "Car on installments: how car financing works",
    category: "MONEY",
    excerpt: "Down payment, tenure, the profit rate and the real total cost: what to understand before you finance a car.",
    body: `Buying a car on installments (qist) lets you drive now and pay over time. Before you sign, make sure you understand what you will really pay.

## The parts of a car loan
- **Down payment:** the amount you pay at the start. A bigger down payment means smaller monthly installments and less profit paid overall.
- **Tenure:** how many months you pay for, often 1 to 5 years. Longer tenure means smaller installments, but more paid in total.
- **Profit or markup rate:** what the bank or financier charges each year. It is usually linked to the market rate, so ask whether yours is fixed or can change.
- **Other costs:** insurance, processing fees, registration and tracker charges are often added on top.

## Work out the real cost
1. Multiply the monthly installment by the number of months.
2. Add the down payment and every fee.
3. Compare that total with the car's cash price. The difference is the real cost of financing.

> Every car for sale on AutoGO has a financing calculator: try different down payments and tenures to see the monthly amount.

## Before you sign
- Compare offers from more than one bank or dealer.
- Ask what happens if you pay early, and whether there is a penalty.
- Read the whole agreement, and keep a copy of every receipt.
- Choose an installment you can comfortably pay every month, even in a bad month.

Many AutoGO businesses also sell on their own installment plans. Ask the business for its schedule before you agree on a price.`,
  },
];
