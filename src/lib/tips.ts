// Client-safe one-line explanations for words that new users may not know, shown by <Tip id="..."/>.
// Keep them short, plain and in everyday words.

export const TIPS = {
  deposit: "Money the renter leaves with you as a guarantee. You give it back when the car returns safely, or keep some for damage.",
  settleDeposit: "After the car comes back, record how much of the deposit you returned. If you keep some, write why.",
  handover: "The moment you give the car to the customer. You record the number plate, their CNIC and the exact return time.",
  returnTime: "The exact time the customer must bring the car back. Up to 1 hour late is free; after that each started day is charged.",
  lateFee: "Charged when the car comes back more than 1 hour after the return time: one day's rent for each extra day.",
  extraCharges: "Anything else the customer owes at return, such as fuel, damage or extra kilometres.",
  condition: "Odometer, fuel and photos when the car leaves and returns. They settle any argument about damage or fuel later.",
  walkIn: "A customer who came to your shop or called you, rather than booking online on AutoGO.",
  offList: "A car you rent out but haven't listed on AutoGO. You type in its name, daily rate and deposit yourself.",
  paymentTag: "Shows what the customer has paid so far: pending, partly paid or fully paid.",
  calendar: "Each row is a car; each bar is a booking. Gaps are free days you can still rent out.",
  installments: "Qist: the buyer pays a down payment now and the rest in equal monthly payments.",
  agreedPrice: "The final price you and the buyer settled on. It can differ from the asking price.",
  cashBook: "A daily record of all money in and out of the business. Payments you record on bookings and sales are added by themselves.",
  openingBalance: "Money in the business at the start of the day, carried over from all earlier days.",
  profitPerVehicle: "What each car earned (sale price and rent) minus what you spent on it (purchase, repairs, fuel and so on).",
  autoEntry: "Added by AutoGO from a payment you recorded, so it can't be deleted here. Change the payment instead.",
  customerStatus: "Where this customer is in buying: Lead (new), Interested, Test drive, Negotiating, then Sold or Lost.",
  starCustomer: "Mark your most important customers with a star so you can find them quickly.",
  followUp: "A reminder to call or message a customer on a certain day. It shows on Customers and the dashboard when it's due.",
  roles: "Owner: everything. Manager: everything except billing. Sales: customers, bookings and sales. Staff: view only.",
  performance: "What each team member did this month, counted from their actions in the console.",
  activity: "A record of every action your team takes: who did it and when. Only the owner sees it.",
  listingQuota: "How many listings and deals you can post this month. It resets on the 1st, and deleted posts still count.",
  verifiedBadge: "A blue tick on your business page after the AutoGO team checks your business. Buyers trust it more.",
  rentDeal: "A package customers can book, for example 6 cars for a wedding, at one price per day.",
  listingTypeBoth: "Your car shows up for buyers and for renters. You can mark it Sold or Rented later.",
  official: "News, new features and offers from the AutoGO team, posted only for businesses.",
} as const;

export type TipId = keyof typeof TIPS;
