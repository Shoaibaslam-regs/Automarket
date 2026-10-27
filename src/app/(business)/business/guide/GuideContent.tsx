"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeDollarSign, BookOpen, CalendarCheck, LayoutDashboard, Lightbulb, Tag, User, Users, Wallet, type LucideIcon } from "lucide-react";

type Lang = "en" | "ur";
const LANG_KEY = "business-guide-lang";

type Term = { name: string; text: string; tone: string };
type Section = {
  id: "today" | "bookings" | "sales" | "customers" | "money" | "deals" | "staff";
  icon: LucideIcon;
  title: string;
  intro: string;
  stepsTitle: string;
  steps: string[];
  termsTitle: string;
  terms: Term[];
  tipsTitle: string;
  tips: string[];
  open: { href: string; label: string };
};

const TONE = {
  slate: "bg-[var(--gh-f6f8fa)] text-[var(--gh-57606a)] ring-[var(--gh-e1e4e8)]",
  blue: "bg-[var(--gh-ddf4ff)] text-[var(--gh-0550ae)] ring-[var(--gh-d0d7de)]",
  purple: "bg-[var(--gh-fbefff)] text-[var(--gh-6e40c9)] ring-[var(--gh-d0d7de)]",
  amber: "bg-[var(--gh-fff8c5)] text-[var(--gh-7d4e00)] ring-[var(--gh-f0d97a)]",
  green: "bg-[var(--gh-dafbe1)] text-[var(--gh-1a7f37)] ring-[var(--gh-d0d7de)]",
  red: "bg-[var(--gh-fff0f0)] text-[var(--gh-cf222e)] ring-[var(--gh-ffcdd2)]",
};

const CONTENT: Record<Lang, { title: string; subtitle: string; jump: string; sections: Section[]; help: string; helpLink: string }> = {
  en: {
    title: "Guide: running your business on AutoGO",
    subtitle: "Simple steps for every page of the console, in the order you'll use them",
    jump: "Jump to",
    help: "Still stuck? Send us a message and we'll help you.",
    helpLink: "Help & support",
    sections: [
      {
        id: "today",
        icon: LayoutDashboard,
        title: "Today and “+ New”",
        intro:
          "The dashboard starts with “Today”: everything that needs doing now, with the late ones first in red. Each line has its own button, so you can work down the list each morning without opening every page.",
        stepsTitle: "How to use it every day",
        steps: [
          "Open the dashboard (on a phone, tap “Today” in the bar at the bottom).",
          "Look at the “Today” list. Red lines are late, so do those first.",
          "Tap the button on a line (for example “Hand over” or “Confirm”). It opens the right page with that booking or sale already found.",
          "To add something new from any page, tap the round “+” button at the bottom right and choose: booking, sale, customer, vehicle, deal, expense or money in.",
          "A new business also sees “Get your business ready” at the bottom of the dashboard. Do each step; it ticks itself when it's done.",
        ],
        termsTitle: "What you'll see in Today",
        terms: [
          { name: "Booking request", text: "Someone asked to book. Confirm it or decline it.", tone: "amber" },
          { name: "Pickup / Return", text: "A car goes out today, or must come back. Red means late.", tone: "blue" },
          { name: "Deposit to settle", text: "The car is back; record how much deposit you returned.", tone: "purple" },
          { name: "Purchase request", text: "Someone wants to buy one of your cars.", tone: "green" },
          { name: "Installment / Follow-up", text: "A qist is due, or you planned to call a customer.", tone: "slate" },
        ],
        tipsTitle: "Good to know",
        tips: [
          "When the list says “All caught up”, nothing needs doing right now.",
          "The “+” button only shows the things your role is allowed to do.",
          "Tap the small ⓘ next to any unusual word on a page to see what it means.",
        ],
        open: { href: "/business/dashboard", label: "Open Dashboard" },
      },
      {
        id: "bookings",
        icon: CalendarCheck,
        title: "Bookings (rentals)",
        intro:
          "Bookings are your rental cars going out and coming back. Online requests from AutoGO land here, and you can add walk-in customers yourself, even for a car you haven't listed.",
        stepsTitle: "From request to return",
        steps: [
          "A new online request shows as “Pending”. Tap “Confirm” (or Decline in More).",
          "For a customer at your shop, tap “+ New booking”, choose the car (or “Other vehicle” if it isn't listed), the dates and the customer, then Create booking.",
          "When the customer collects the car, tap “Hand over”. Write the number plate, check their CNIC card, and set the exact return time. You can also note the odometer, fuel and photos.",
          "When the car comes back, tap “Mark returned”. If it is more than 1 hour late, the late fee is added by itself. Add extra charges (fuel, damage) if needed.",
          "Record money with the payment tag (Pending, Partly paid, Paid), then settle the deposit from More.",
          "Tap “Slip” to print or share the booking slip with the AutoGO-Pak stamp.",
        ],
        termsTitle: "What each status means",
        terms: [
          { name: "Pending", text: "A new request. Nothing is confirmed yet.", tone: "amber" },
          { name: "Confirmed", text: "You accepted. The car is reserved for those dates.", tone: "blue" },
          { name: "Out now", text: "Handed over. The customer has the car.", tone: "green" },
          { name: "Completed", text: "The car is back. Settle the deposit if there was one.", tone: "slate" },
          { name: "Cancelled", text: "Cancelled before handover. The dates are free again.", tone: "red" },
        ],
        tipsTitle: "Good to know",
        tips: [
          "Switch to “Calendar” at the top to see every car by month. Gaps are free days you can still rent out.",
          "The return day is free for the next customer, so 23 → 24 and 24 → 25 Oct don't clash.",
          "Up to 1 hour late is free. After that, each started day costs one more day of rent.",
        ],
        open: { href: "/business/bookings", label: "Open Bookings" },
      },
      {
        id: "sales",
        icon: BadgeDollarSign,
        title: "Sales",
        intro:
          "Sales are the cars you sell. Buyers can ask to buy your listed cars online, and you can record shop sales yourself, including cars sold on installments (qist).",
        stepsTitle: "How a sale works",
        steps: [
          "An online request shows as “Requested”. Tap “Accept” and write the price you agreed, or Decline with a reason.",
          "For a buyer at your shop, tap “+ New sale”, choose the car (or type it in), the price and the buyer.",
          "When the deal is done, tap “Mark as sold”. Add the number plate and how much they paid. The car is tagged Sold on AutoGO by itself.",
          "For qist, open More → “Set up installments”: down payment, number of months and the first due date. Tap “Received” each month when they pay.",
          "Tap “Slip” for the sale slip, or “Print schedule” for the installment plan to give the buyer.",
        ],
        termsTitle: "What each status means",
        terms: [
          { name: "Requested", text: "A buyer asked. Accept or decline it.", tone: "amber" },
          { name: "Accepted", text: "You agreed a price. Waiting to complete the sale.", tone: "blue" },
          { name: "Sold", text: "The sale is done and the car is handed over.", tone: "green" },
          { name: "Declined / Cancelled", text: "No sale. You declined, or the buyer cancelled.", tone: "red" },
        ],
        tipsTitle: "Good to know",
        tips: [
          "Every payment and installment you record goes into Money → Cash book by itself.",
          "Overdue installments show in red here and in the dashboard's Today list.",
          "Export CSV gives you all your sales in a spreadsheet.",
          "To clean up the list, use Remove in More on a declined, cancelled or sold record. A sold car can only be removed by the owner or a manager once it is fully paid, and its money stays in the cash book.",
        ],
        open: { href: "/business/sales", label: "Open Sales" },
      },
      {
        id: "customers",
        icon: Users,
        title: "Customers",
        intro:
          "A customer is any person who buys or rents a vehicle from you, or may do so later. Write them down here so you never forget a buyer. Think of it as your shop's phone diary, but it also remembers what stage each person is at.",
        stepsTitle: "How to add a customer",
        steps: [
          "Open “Customers” from the menu on the left (on a phone, tap the menu button at the top).",
          "Tap the “+ Add customer” button.",
          "Choose the type. “Outside customer” is a person who came to your shop or called you and has no AutoGO account. “AutoGO user” is a person with an account: type their email or account ID and tap Find, and their details fill in by themselves.",
          "Write the name and phone number. These two are required. Email and city are optional.",
          "Choose the Source: how this person found you (walk in, online, referral, phone or other).",
          "Choose the Status (see the list below). A new person is usually “Lead”.",
          "Write any notes, for example “wants a white Corolla, budget 45 lakh”, then tap “Add customer”.",
        ],
        termsTitle: "What each status means",
        terms: [
          { name: "Lead", text: "A new person. You have their number but haven't really talked yet.", tone: "slate" },
          { name: "Interested", text: "They liked a vehicle and want to know more.", tone: "blue" },
          { name: "Test drive", text: "They came to see or drive the vehicle.", tone: "purple" },
          { name: "Negotiating", text: "You are talking about the price or payment.", tone: "amber" },
          { name: "Sold", text: "The deal is done. They bought or rented.", tone: "green" },
          { name: "Lost", text: "They didn't buy. Keep them in case they come back.", tone: "red" },
        ],
        tipsTitle: "Good to know",
        tips: [
          "Change the status from the list whenever things move forward. This takes one tap and keeps your reports correct.",
          "Tap the star on important customers, then use “Star customers” to see only them.",
          "Use the search box to find someone by name or phone number.",
          "To remember to call someone back, open ⋯ next to them and tap “Add follow-up”. Follow-ups due today or overdue show at the top of Customers and on the dashboard. Tick the circle when it's done.",
          "When someone books one of your vehicles, they are added to Customers by themselves. You don't need to type them in.",
          "Only the owner can delete a customer, and only when their status is Sold or Lost.",
          "How many customers you can keep depends on your plan. When it is full you'll see a message to upgrade.",
        ],
        open: { href: "/business/customers", label: "Open Customers" },
      },
      {
        id: "money",
        icon: Wallet,
        title: "Money (owner and managers)",
        intro:
          "Money is your shop's account book: what came in, what went out, and the real profit on each car after repairs and other costs.",
        stepsTitle: "How to keep your accounts",
        steps: [
          "Payments on bookings and sales are added by themselves. You don't type them again.",
          "For a cost, tap “Expense”: choose what it was for (repair, fuel, token tax…), the amount and the date. For costs on one car, pick that car.",
          "When you buy a car for stock, add an expense “Vehicle purchase” linked to it, so its profit is correct.",
          "Use “Money in” for any other income.",
          "Open “Cash book” to see one day: opening balance, money in, money out and closing balance. Use the arrows to go to other days.",
          "Open “Profit per vehicle” to see what each car earned minus what you spent on it.",
        ],
        termsTitle: "The three tabs",
        terms: [
          { name: "Cash book", text: "Every rupee in and out, day by day.", tone: "blue" },
          { name: "Expenses", text: "What you spent this month, by type and by car.", tone: "red" },
          { name: "Profit per vehicle", text: "Sale price and rent earned, minus costs, for each car.", tone: "green" },
        ],
        tipsTitle: "Good to know",
        tips: [
          "Entries marked “automatic” come from payments and can only be changed by changing the payment.",
          "A car still in stock shows a loss until it is sold or rented. That's normal.",
        ],
        open: { href: "/business/money", label: "Open Money" },
      },
      {
        id: "deals",
        icon: Tag,
        title: "Deals",
        intro:
          "A deal is a special offer with its own photos, price, discount and end date. It shows on the Deals page, your business page and the home page. A rent deal can be a package, for example 6 cars for a wedding.",
        stepsTitle: "How to make a deal",
        steps: [
          "Open “Deals” and tap “Create deal” (owner or manager).",
          "Choose Sale or Rent, add photos and the vehicle details.",
          "Set the normal price and the discount (percent or PKR), then the start and end dates.",
          "For a rent package, write how many cars it includes and the deposit.",
          "Save. You can pause, edit or delete it at any time.",
        ],
        termsTitle: "Deal types",
        terms: [
          { name: "Sale deal", text: "A car for sale at a discount. Buyers can send a purchase request.", tone: "green" },
          { name: "Rent deal", text: "A bookable package at one price per day.", tone: "blue" },
        ],
        tipsTitle: "Good to know",
        tips: [
          "Every deal counts toward your monthly listing limit, like a listing.",
          "When the end date passes, the deal disappears from the public pages by itself.",
        ],
        open: { href: "/business/deals", label: "Open Deals" },
      },
      {
        id: "staff",
        icon: User,
        title: "Staff",
        intro:
          "Staff are the people who work in your shop. When you add them, they can use this console from their own phone with their own login. You never need to share your password.",
        stepsTitle: "How to add a staff member",
        steps: [
          "First, the person must make their own AutoGO account (Sign up, using their email). Ask them to do this on their phone.",
          "Ask them which email they used to sign up.",
          "Open “Staff” from the menu and tap “+ Add staff member”.",
          "Type that email exactly.",
          "Choose a role (see the list below). If you are not sure, choose “Staff”, the safest one.",
          "Tap “Send invitation”. They get a message, and an invitation shows on their dashboard. Once they tap Accept, they can open “Business console” from their account menu. Until then they show under “Waiting to accept”, where you can cancel it. An invitation lasts 14 days.",
        ],
        termsTitle: "What each role can do",
        terms: [
          { name: "Owner", text: "You. Can do everything: settings, plan, deleting customers and the business.", tone: "amber" },
          { name: "Manager", text: "Runs the shop for you: adds sales and staff members, makes deals, handles bookings and customers, replies to reviews. Only you can add or change managers.", tone: "purple" },
          { name: "Sales", text: "Works with customers: adds and updates customers, handles bookings.", tone: "blue" },
          { name: "Staff", text: "Can only look. Cannot change anything.", tone: "slate" },
        ],
        tipsTitle: "Good to know",
        tips: [
          "Give each person the smallest role they need. You can change the role later from the list.",
          "When someone leaves your shop, tap “Remove” next to their name so they lose access straight away.",
          "One person can only belong to one business at a time.",
          "Your plan decides how many people your team can have, and you (the owner) count as one.",
          "If you see “No AutoGO account found”, the person hasn't signed up yet or the email is spelt differently.",
          "The Performance tab (owner and managers) shows this month's bookings, handovers, sales and money collected by each person.",
          "The Activity tab (owner only) lists everything your team did: bookings, payments, sales, expenses and customer changes, with who did it and when.",
          "Your business has its own “Business ID”, and every person has their own “My ID”. Find the Business ID on the Dashboard, in Business settings, or by tapping your business name in the menu. Tap an ID to copy it, and give the Business ID when you contact AutoGO about the shop.",
        ],
        open: { href: "/business/staff", label: "Open Staff" },
      },
    ],
  },
  ur: {
    title: "رہنمائی: AutoGO پر اپنا بزنس چلائیں",
    subtitle: "کنسول کے ہر صفحے کا آسان طریقہ، قدم بہ قدم، اسی ترتیب میں جیسے آپ استعمال کریں گے",
    jump: "سیدھا جائیں",
    help: "پھر بھی سمجھ نہ آئے؟ ہمیں پیغام بھیجیں، ہم آپ کی مدد کریں گے۔",
    helpLink: "مدد اور سپورٹ",
    sections: [
      {
        id: "today",
        icon: LayoutDashboard,
        title: "آج کے کام اور “+ New”",
        intro:
          "ڈیش بورڈ “Today” سے شروع ہوتا ہے: ابھی کرنے والے سارے کام، اور جو دیر سے ہیں وہ سرخ رنگ میں سب سے اوپر۔ ہر لائن کا اپنا بٹن ہے، اس لیے ہر صبح ہر صفحہ کھولے بغیر یہ فہرست مکمل کر سکتے ہیں۔",
        stepsTitle: "روزانہ کیسے استعمال کریں",
        steps: [
          "ڈیش بورڈ کھولیں (موبائل پر نیچے والی پٹی میں “Today” دبائیں)۔",
          "“Today” کی فہرست دیکھیں۔ سرخ لائنیں دیر سے ہیں، پہلے وہ کریں۔",
          "لائن کا بٹن دبائیں (مثلاً “Hand over” یا “Confirm”)۔ صحیح صفحہ کھل جائے گا اور وہ بکنگ یا سیل پہلے سے ڈھونڈی ہوئی ہوگی۔",
          "کسی بھی صفحے سے نئی چیز شامل کرنے کے لیے نیچے دائیں گول “+” بٹن دبائیں اور چنیں: بکنگ، سیل، کسٹمر، گاڑی، ڈیل، خرچہ یا آمدنی۔",
          "نئے بزنس کو ڈیش بورڈ کے نیچے “Get your business ready” بھی نظر آتا ہے۔ ہر قدم پورا کریں، کام ہوتے ہی خود ٹک ہو جاتا ہے۔",
        ],
        termsTitle: "Today میں کیا نظر آتا ہے",
        terms: [
          { name: "Booking request", text: "کسی نے بکنگ مانگی ہے۔ قبول کریں یا انکار۔", tone: "amber" },
          { name: "Pickup / Return", text: "آج گاڑی جانی ہے یا واپس آنی ہے۔ سرخ کا مطلب دیر۔", tone: "blue" },
          { name: "Deposit to settle", text: "گاڑی واپس آ گئی ہے؛ لکھیں کہ کتنی ڈپازٹ واپس کی۔", tone: "purple" },
          { name: "Purchase request", text: "کوئی آپ کی گاڑی خریدنا چاہتا ہے۔", tone: "green" },
          { name: "Installment / Follow-up", text: "کوئی قسط واجب ہے، یا آپ نے کسی گاہک کو کال کرنی تھی۔", tone: "slate" },
        ],
        tipsTitle: "یاد رکھنے کی باتیں",
        tips: [
          "جب فہرست میں “All caught up” لکھا ہو تو ابھی کوئی کام باقی نہیں۔",
          "“+” بٹن صرف وہی چیزیں دکھاتا ہے جن کی آپ کے رول کو اجازت ہے۔",
          "کسی صفحے پر کسی مشکل لفظ کے ساتھ چھوٹا ⓘ دبائیں تو اس کا مطلب نظر آئے گا۔",
        ],
        open: { href: "/business/dashboard", label: "ڈیش بورڈ کھولیں" },
      },
      {
        id: "bookings",
        icon: CalendarCheck,
        title: "بکنگز (کرائے کی گاڑیاں)",
        intro:
          "بکنگز آپ کی کرائے کی گاڑیوں کا جانا اور واپس آنا ہیں۔ AutoGO سے آن لائن درخواستیں یہاں آتی ہیں، اور دکان پر آنے والے گاہکوں کی بکنگ آپ خود بنا سکتے ہیں، چاہے گاڑی لسٹ نہ کی ہو۔",
        stepsTitle: "درخواست سے واپسی تک",
        steps: [
          "نئی آن لائن درخواست “Pending” دکھاتی ہے۔ “Confirm” دبائیں (یا More میں Decline)۔",
          "دکان پر آئے گاہک کے لیے “+ New booking” دبائیں، گاڑی چنیں (لسٹ نہ ہو تو “Other vehicle”)، تاریخیں اور گاہک لکھیں، پھر Create booking۔",
          "جب گاہک گاڑی لے جائے تو “Hand over” دبائیں۔ نمبر پلیٹ لکھیں، اس کا اصل شناختی کارڈ (CNIC) چیک کریں، اور واپسی کا بالکل صحیح وقت لکھیں۔ میٹر ریڈنگ، فیول اور تصاویر بھی لکھ سکتے ہیں۔",
          "گاڑی واپس آئے تو “Mark returned” دبائیں۔ 1 گھنٹے سے زیادہ دیر ہو تو لیٹ فیس خود لگ جاتی ہے۔ ضرورت ہو تو اضافی چارجز (فیول، نقصان) لکھیں۔",
          "پیمنٹ ٹیگ سے رقم لکھیں (Pending، Partly paid، Paid)، پھر More سے ڈپازٹ کا حساب کریں۔",
          "“Slip” دبا کر AutoGO-Pak مہر والی بکنگ سلپ پرنٹ کریں یا بھیجیں۔",
        ],
        termsTitle: "ہر اسٹیٹس کا مطلب",
        terms: [
          { name: "Pending", text: "نئی درخواست۔ ابھی کچھ پکا نہیں ہوا۔", tone: "amber" },
          { name: "Confirmed", text: "آپ نے قبول کر لی۔ ان تاریخوں کے لیے گاڑی محفوظ ہے۔", tone: "blue" },
          { name: "Out now", text: "گاڑی حوالے کر دی۔ گاڑی گاہک کے پاس ہے۔", tone: "green" },
          { name: "Completed", text: "گاڑی واپس آ گئی۔ ڈپازٹ ہو تو اس کا حساب کریں۔", tone: "slate" },
          { name: "Cancelled", text: "حوالگی سے پہلے منسوخ۔ تاریخیں پھر خالی ہیں۔", tone: "red" },
        ],
        tipsTitle: "یاد رکھنے کی باتیں",
        tips: [
          "اوپر “Calendar” دبا کر ہر گاڑی کو مہینے کے حساب سے دیکھیں۔ خالی دن وہ ہیں جن میں ابھی کرائے پر دے سکتے ہیں۔",
          "واپسی کا دن اگلے گاہک کے لیے خالی ہوتا ہے، اس لیے 23 سے 24 اور 24 سے 25 اکتوبر آپس میں نہیں ٹکراتے۔",
          "1 گھنٹے تک کی دیر مفت ہے۔ اس کے بعد ہر شروع ہونے والا دن ایک دن کے کرائے کے برابر ہے۔",
        ],
        open: { href: "/business/bookings", label: "بکنگز کھولیں" },
      },
      {
        id: "sales",
        icon: BadgeDollarSign,
        title: "سیلز (فروخت)",
        intro:
          "سیلز وہ گاڑیاں ہیں جو آپ بیچتے ہیں۔ خریدار آن لائن آپ کی لسٹ کی ہوئی گاڑی خریدنے کی درخواست بھیج سکتے ہیں، اور دکان کی فروخت آپ خود لکھ سکتے ہیں، قسطوں پر بیچی گئی گاڑیاں بھی۔",
        stepsTitle: "فروخت کیسے ہوتی ہے",
        steps: [
          "آن لائن درخواست “Requested” دکھاتی ہے۔ “Accept” دبا کر طے شدہ قیمت لکھیں، یا وجہ لکھ کر Decline کریں۔",
          "دکان پر آئے خریدار کے لیے “+ New sale” دبائیں، گاڑی چنیں (یا نام لکھیں)، قیمت اور خریدار لکھیں۔",
          "سودا مکمل ہو تو “Mark as sold” دبائیں۔ نمبر پلیٹ اور ادا شدہ رقم لکھیں۔ AutoGO پر گاڑی خود Sold ہو جائے گی۔",
          "قسطوں کے لیے More → “Set up installments”: ایڈوانس، مہینوں کی تعداد اور پہلی قسط کی تاریخ۔ ہر مہینے رقم ملنے پر “Received” دبائیں۔",
          "“Slip” سے سیل سلپ، یا “Print schedule” سے خریدار کو دینے کے لیے قسطوں کا شیڈول نکالیں۔",
        ],
        termsTitle: "ہر اسٹیٹس کا مطلب",
        terms: [
          { name: "Requested", text: "خریدار نے پوچھا ہے۔ قبول کریں یا انکار۔", tone: "amber" },
          { name: "Accepted", text: "قیمت طے ہو گئی۔ فروخت مکمل ہونا باقی ہے۔", tone: "blue" },
          { name: "Sold", text: "فروخت مکمل اور گاڑی حوالے۔", tone: "green" },
          { name: "Declined / Cancelled", text: "فروخت نہیں ہوئی۔ آپ نے انکار کیا یا خریدار نے منسوخ کی۔", tone: "red" },
        ],
        tipsTitle: "یاد رکھنے کی باتیں",
        tips: [
          "آپ کی لکھی ہر ادائیگی اور قسط خود بخود Money → Cash book میں چلی جاتی ہے۔",
          "دیر سے آنے والی قسطیں یہاں اور ڈیش بورڈ کی Today فہرست میں سرخ دکھتی ہیں۔",
          "Export CSV سے ساری سیلز ایک اسپریڈ شیٹ میں مل جاتی ہیں۔",
          "فہرست صاف کرنے کے لیے انکار شدہ، منسوخ یا فروخت شدہ ریکارڈ پر More میں Remove دبائیں۔ فروخت شدہ گاڑی کا ریکارڈ صرف مالک یا مینیجر ہٹا سکتا ہے، وہ بھی پوری ادائیگی کے بعد، اور اس کی رقم Cash book میں رہتی ہے۔",
        ],
        open: { href: "/business/sales", label: "سیلز کھولیں" },
      },
      {
        id: "customers",
        icon: Users,
        title: "کسٹمرز (گاہک)",
        intro:
          "کسٹمر وہ شخص ہے جو آپ سے گاڑی خریدے یا کرائے پر لے، یا آگے چل کر لے سکتا ہو۔ ان کا نام یہاں لکھ لیں تاکہ کوئی گاہک بھول نہ جائے۔ یہ آپ کی دکان کی فون ڈائری جیسا ہے، مگر یہ یہ بھی یاد رکھتا ہے کہ ہر گاہک کس مرحلے پر ہے۔",
        stepsTitle: "نیا کسٹمر کیسے شامل کریں",
        steps: [
          "بائیں طرف کے مینو سے “Customers” کھولیں (موبائل پر اوپر مینو کا بٹن دبائیں)۔",
          "“+ Add customer” کا بٹن دبائیں۔",
          "قسم چنیں۔ “Outside customer” وہ ہے جو دکان پر آیا یا فون کیا اور اس کا AutoGO اکاؤنٹ نہیں۔ “AutoGO user” وہ ہے جس کا اکاؤنٹ ہے: اس کا ای میل یا اکاؤنٹ آئی ڈی لکھ کر Find دبائیں، اس کی تفصیل خود بھر جائے گی۔",
          "نام اور فون نمبر لکھیں۔ یہ دونوں ضروری ہیں۔ ای میل اور شہر اختیاری ہیں۔",
          "Source چنیں: یہ شخص آپ تک کیسے پہنچا (خود آیا، آن لائن، کسی کے کہنے پر، فون، یا کچھ اور)۔",
          "Status چنیں (نیچے فہرست دیکھیں)۔ نیا شخص عام طور پر “Lead” ہوتا ہے۔",
          "کوئی نوٹ لکھیں، مثلاً “سفید کرولا چاہیے، بجٹ 45 لاکھ”، پھر “Add customer” دبائیں۔",
        ],
        termsTitle: "ہر اسٹیٹس کا مطلب",
        terms: [
          { name: "Lead", text: "نیا شخص۔ نمبر مل گیا ہے مگر ابھی صحیح بات نہیں ہوئی۔", tone: "slate" },
          { name: "Interested", text: "اسے کوئی گاڑی پسند آئی ہے اور مزید جاننا چاہتا ہے۔", tone: "blue" },
          { name: "Test drive", text: "گاڑی دیکھنے یا چلا کر دیکھنے آیا۔", tone: "purple" },
          { name: "Negotiating", text: "قیمت یا ادائیگی پر بات چل رہی ہے۔", tone: "amber" },
          { name: "Sold", text: "سودا ہو گیا۔ اس نے خرید لی یا کرائے پر لے لی۔", tone: "green" },
          { name: "Lost", text: "اس نے نہیں خریدی۔ ریکارڈ رکھیں، شاید دوبارہ آئے۔", tone: "red" },
        ],
        tipsTitle: "یاد رکھنے کی باتیں",
        tips: [
          "جب بات آگے بڑھے تو فہرست سے اسٹیٹس بدل دیں۔ یہ ایک ٹیپ کا کام ہے اور آپ کی رپورٹس درست رہتی ہیں۔",
          "اہم گاہکوں پر اسٹار دبائیں، پھر “Star customers” سے صرف انہیں دیکھیں۔",
          "سرچ باکس میں نام یا فون نمبر لکھ کر کسی کو بھی ڈھونڈیں۔",
          "کسی کو بعد میں کال کرنا یاد رکھنے کے لیے اس کے ساتھ ⋯ کھولیں اور “Add follow-up” دبائیں۔ آج کے اور رہ جانے والے فالو اپ Customers کے اوپر اور ڈیش بورڈ پر نظر آتے ہیں۔ کام ہو جائے تو دائرے پر ٹک کریں۔",
          "جب کوئی آپ کی گاڑی بک کرتا ہے تو وہ خود بخود Customers میں آ جاتا ہے۔ اسے لکھنے کی ضرورت نہیں۔",
          "کسٹمر کو صرف مالک (Owner) ڈیلیٹ کر سکتا ہے، اور صرف تب جب اسٹیٹس Sold یا Lost ہو۔",
          "کتنے کسٹمر رکھ سکتے ہیں، یہ آپ کے پلان پر ہے۔ حد پوری ہونے پر اپ گریڈ کا پیغام آئے گا۔",
        ],
        open: { href: "/business/customers", label: "Customers کھولیں" },
      },
      {
        id: "money",
        icon: Wallet,
        title: "حساب کتاب (مالک اور مینیجر)",
        intro:
          "Money آپ کی دکان کا کھاتہ ہے: کیا آیا، کیا گیا، اور مرمت و دوسرے خرچوں کے بعد ہر گاڑی پر اصل منافع۔",
        stepsTitle: "حساب کیسے رکھیں",
        steps: [
          "بکنگ اور سیل کی ادائیگیاں خود شامل ہو جاتی ہیں۔ انہیں دوبارہ نہیں لکھنا۔",
          "خرچے کے لیے “Expense” دبائیں: کس چیز کا تھا (مرمت، فیول، ٹوکن ٹیکس…)، رقم اور تاریخ۔ کسی ایک گاڑی کا خرچ ہو تو وہ گاڑی چنیں۔",
          "اسٹاک کے لیے گاڑی خریدیں تو اس کے ساتھ “Vehicle purchase” کا خرچہ لکھیں تاکہ اس کا منافع صحیح آئے۔",
          "کسی اور آمدنی کے لیے “Money in” استعمال کریں۔",
          "“Cash book” کھول کر ایک دن کا حساب دیکھیں: شروع کا بیلنس، آمدنی، خرچ اور آخر کا بیلنس۔ تیر کے بٹنوں سے دوسرے دن دیکھیں۔",
          "“Profit per vehicle” میں دیکھیں کہ ہر گاڑی نے کیا کمایا اور اس پر کیا خرچ ہوا۔",
        ],
        termsTitle: "تین ٹیب",
        terms: [
          { name: "Cash book", text: "ہر روپے کی آمد و رفت، دن بہ دن۔", tone: "blue" },
          { name: "Expenses", text: "اس مہینے کا خرچ، قسم اور گاڑی کے حساب سے۔", tone: "red" },
          { name: "Profit per vehicle", text: "ہر گاڑی کی فروخت اور کرایہ، خرچ نکال کر۔", tone: "green" },
        ],
        tipsTitle: "یاد رکھنے کی باتیں",
        tips: [
          "“automatic” والی اندراجات ادائیگیوں سے آتی ہیں؛ انہیں بدلنے کے لیے ادائیگی بدلیں۔",
          "اسٹاک میں کھڑی گاڑی بکنے یا کرائے پر جانے تک نقصان دکھاتی ہے۔ یہ عام بات ہے۔",
        ],
        open: { href: "/business/money", label: "حساب کتاب کھولیں" },
      },
      {
        id: "deals",
        icon: Tag,
        title: "ڈیلز (خاص آفرز)",
        intro:
          "ڈیل ایک خاص آفر ہے جس کی اپنی تصاویر، قیمت، رعایت اور آخری تاریخ ہوتی ہے۔ یہ Deals صفحے، آپ کے بزنس صفحے اور ہوم پیج پر دکھتی ہے۔ کرائے کی ڈیل ایک پیکج ہو سکتی ہے، مثلاً شادی کے لیے 6 گاڑیاں۔",
        stepsTitle: "ڈیل کیسے بنائیں",
        steps: [
          "“Deals” کھولیں اور “Create deal” دبائیں (مالک یا مینیجر)۔",
          "Sale یا Rent چنیں، تصاویر اور گاڑی کی تفصیل لکھیں۔",
          "عام قیمت اور رعایت (فیصد یا روپے) لکھیں، پھر شروع اور آخری تاریخ۔",
          "کرائے کے پیکج میں لکھیں کہ کتنی گاڑیاں شامل ہیں اور ڈپازٹ کتنا ہے۔",
          "Save کریں۔ کبھی بھی روک سکتے، بدل سکتے یا ڈیلیٹ کر سکتے ہیں۔",
        ],
        termsTitle: "ڈیل کی قسمیں",
        terms: [
          { name: "Sale deal", text: "رعایت پر فروخت کے لیے گاڑی۔ خریدار خریداری کی درخواست بھیج سکتے ہیں۔", tone: "green" },
          { name: "Rent deal", text: "بک ہونے والا پیکج، ایک دن کی ایک قیمت پر۔", tone: "blue" },
        ],
        tipsTitle: "یاد رکھنے کی باتیں",
        tips: [
          "ہر ڈیل لسٹنگ کی طرح آپ کی ماہانہ لسٹنگ حد میں گنی جاتی ہے۔",
          "آخری تاریخ گزرتے ہی ڈیل عوامی صفحات سے خود ہٹ جاتی ہے۔",
        ],
        open: { href: "/business/deals", label: "ڈیلز کھولیں" },
      },
      {
        id: "staff",
        icon: User,
        title: "اسٹاف (عملہ)",
        intro:
          "اسٹاف وہ لوگ ہیں جو آپ کی دکان پر کام کرتے ہیں۔ شامل کرنے کے بعد وہ اپنے موبائل سے اپنے لاگ اِن کے ساتھ یہ کنسول استعمال کر سکتے ہیں۔ آپ کو اپنا پاس ورڈ کبھی کسی کو دینے کی ضرورت نہیں۔",
        stepsTitle: "نیا اسٹاف ممبر کیسے شامل کریں",
        steps: [
          "پہلے اس شخص کو اپنا AutoGO اکاؤنٹ بنانا ہوگا (Sign up، اپنے ای میل سے)۔ اسے کہیں کہ اپنے موبائل پر یہ کر لے۔",
          "اس سے پوچھیں کہ سائن اپ کس ای میل سے کیا۔",
          "مینو سے “Staff” کھولیں اور “+ Add staff member” دبائیں۔",
          "وہی ای میل بالکل ویسے ہی لکھیں۔",
          "رول (Role) چنیں (نیچے فہرست دیکھیں)۔ اگر یقین نہ ہو تو “Staff” چنیں، یہ سب سے محفوظ ہے۔",
          "“Send invitation” دبائیں۔ اسے ایک میسج ملے گا اور اس کے ڈیش بورڈ پر دعوت نظر آئے گی۔ جب وہ Accept دبائے گا تو اپنے اکاؤنٹ مینو سے “Business console” کھول سکے گا۔ تب تک وہ “Waiting to accept” میں نظر آئے گا، جہاں سے آپ دعوت منسوخ کر سکتے ہیں۔ دعوت 14 دن تک رہتی ہے۔",
        ],
        termsTitle: "ہر رول کیا کر سکتا ہے",
        terms: [
          { name: "Owner", text: "آپ خود۔ سب کچھ کر سکتے ہیں: سیٹنگز، پلان، کسٹمر اور بزنس ڈیلیٹ کرنا۔", tone: "amber" },
          { name: "Manager", text: "آپ کی جگہ دکان چلاتا ہے: سیلز اور اسٹاف ممبر شامل کرنا، ڈیلز بنانا، بکنگ اور کسٹمرز سنبھالنا، ریویوز کا جواب دینا۔ مینیجر صرف آپ شامل کر یا بدل سکتے ہیں۔", tone: "purple" },
          { name: "Sales", text: "گاہکوں کے ساتھ کام: کسٹمر شامل اور اپ ڈیٹ کرنا، بکنگ سنبھالنا۔", tone: "blue" },
          { name: "Staff", text: "صرف دیکھ سکتا ہے۔ کچھ بدل نہیں سکتا۔", tone: "slate" },
        ],
        tipsTitle: "یاد رکھنے کی باتیں",
        tips: [
          "ہر شخص کو اتنا ہی رول دیں جتنی ضرورت ہو۔ بعد میں فہرست سے رول بدل سکتے ہیں۔",
          "جب کوئی دکان چھوڑ دے تو اس کے نام کے ساتھ “Remove” دبائیں، اس کی رسائی فوراً ختم ہو جائے گی۔",
          "ایک شخص ایک وقت میں صرف ایک بزنس کا حصہ ہو سکتا ہے۔",
          "ٹیم میں کتنے لوگ ہو سکتے ہیں، یہ پلان پر ہے، اور آپ (مالک) بھی ان میں گنے جاتے ہیں۔",
          "اگر “No AutoGO account found” آئے تو اس شخص نے ابھی سائن اپ نہیں کیا یا ای میل کی اسپیلنگ مختلف ہے۔",
          "Performance ٹیب (مالک اور مینیجر) ہر شخص کی اس مہینے کی بکنگز، گاڑی حوالگی، سیلز اور وصول کی گئی رقم دکھاتا ہے۔",
          "Activity ٹیب (صرف مالک) ٹیم کا ہر کام دکھاتا ہے: بکنگز، ادائیگیاں، سیلز، اخراجات اور کسٹمر کی تبدیلیاں، کس نے اور کب کیں۔",
          "آپ کے بزنس کی اپنی “Business ID” ہے، اور ہر شخص کی اپنی “My ID”۔ Business ID ڈیش بورڈ پر، Business settings میں، یا مینو میں اپنے بزنس کے نام کو دبا کر ملے گی۔ ID کو دبائیں تو کاپی ہو جاتی ہے۔ دکان کے بارے میں AutoGO سے رابطہ کریں تو Business ID بتائیں۔",
        ],
        open: { href: "/business/staff", label: "Staff کھولیں" },
      },
    ],
  },
};

/** Bilingual (English / Urdu) how-to for every console page: Today, Bookings, Sales, Customers, Money, Deals and Staff. */
export default function GuideContent({ urduClassName }: { urduClassName: string }) {
  const [lang, setLang] = useState<Lang>("en");

  // Remember the reader's language in this browser; applied after mount so server HTML stays English
  useEffect(() => {
    queueMicrotask(() => {
      try {
        if (localStorage.getItem(LANG_KEY) === "ur") setLang("ur");
      } catch {}
    });
  }, []);

  function choose(l: Lang) {
    setLang(l);
    try { localStorage.setItem(LANG_KEY, l); } catch {}
  }

  const c = CONTENT[lang];
  const ur = lang === "ur";

  return (
    <div className="min-h-screen bg-[var(--gh-f6f8fa)]">
      <div className="border-b border-[var(--gh-e1e4e8)] bg-white px-4 py-5 sm:px-6">
        <Link href="/business/dashboard" className="text-xs text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]">← Dashboard</Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex flex-shrink-0 items-center justify-center text-[var(--gh-0d1117)]"><BookOpen size={17} /></span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-[var(--gh-0d1117)]">Guide · رہنمائی</h1>
              <p className="text-xs text-[var(--gh-57606a)]">Every page of the console, in English and Urdu</p>
            </div>
          </div>
          <div role="radiogroup" aria-label="Language" className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--gh-e1e4e8)] bg-[var(--gh-f6f8fa)] p-1">
            {([["en", "English"], ["ur", "اردو"]] as const).map(([l, label]) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={lang === l}
                onClick={() => choose(l)}
                className={`rounded-lg px-4 py-1.5 text-[13px] font-semibold transition ${l === "ur" ? urduClassName : ""} ${
                  lang === l ? "bg-[var(--gh-0d1117)] text-white" : "text-[var(--gh-57606a)] hover:text-[var(--gh-0d1117)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div dir={ur ? "rtl" : "ltr"} lang={ur ? "ur" : "en"} className={`mx-auto max-w-3xl px-4 py-5 sm:px-6 ${ur ? urduClassName : ""}`}>
        <div className="mb-5">
          <h2 className={`font-bold text-[var(--gh-0d1117)] ${ur ? "text-xl leading-[2.2]" : "text-base"}`}>{c.title}</h2>
          <p className={`text-[var(--gh-57606a)] ${ur ? "text-sm leading-[2.2]" : "text-[13px]"}`}>{c.subtitle}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--gh-8c959f)]">{c.jump}:</span>
            {c.sections.map(s => (
              <a key={s.id} href={`#${s.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gh-e1e4e8)] bg-white px-3 py-1 text-xs font-semibold text-[var(--gh-0d1117)] hover:bg-[var(--gh-f6f8fa)]">
                <s.icon size={13} /> {s.title}
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          {c.sections.map(s => (
            <section key={s.id} id={s.id} className="scroll-mt-20 rounded-2xl border border-[var(--gh-e1e4e8)] bg-white p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex flex-shrink-0 items-center justify-center text-[var(--gh-0550ae)]"><s.icon size={17} /></span>
                <h3 className={`font-bold text-[var(--gh-0d1117)] ${ur ? "text-lg" : "text-base"}`}>{s.title}</h3>
              </div>
              <p className={`text-[var(--gh-24292f)] ${ur ? "text-[15px] leading-[2.3]" : "text-sm leading-relaxed"}`}>{s.intro}</p>

              <h4 className={`mb-3 mt-5 font-bold text-[var(--gh-0d1117)] ${ur ? "text-base" : "text-sm"}`}>{s.stepsTitle}</h4>
              <ol className="space-y-3">
                {s.steps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gh-0d1117)] font-sans text-xs font-bold text-white">{i + 1}</span>
                    <p className={`min-w-0 text-[var(--gh-24292f)] ${ur ? "text-[15px] leading-[2.3]" : "text-sm leading-relaxed"}`}>{step}</p>
                  </li>
                ))}
              </ol>

              <h4 className={`mb-3 mt-6 font-bold text-[var(--gh-0d1117)] ${ur ? "text-base" : "text-sm"}`}>{s.termsTitle}</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {s.terms.map(t => (
                  <div key={t.name} className="rounded-xl border border-[var(--gh-e1e4e8)] p-3">
                    <span dir="ltr" className={`inline-block rounded-full px-2 py-0.5 font-sans text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${TONE[t.tone as keyof typeof TONE]}`}>
                      {t.name}
                    </span>
                    <p className={`mt-1.5 text-[var(--gh-57606a)] ${ur ? "text-sm leading-[2.2]" : "text-[13px] leading-relaxed"}`}>{t.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-[var(--gh-f0d97a)] bg-[var(--gh-fff8c5)] p-4">
                <p className={`mb-2 flex items-center gap-1.5 font-bold text-[var(--gh-7d4e00)] ${ur ? "text-base" : "text-sm"}`}>
                  <Lightbulb size={15} /> {s.tipsTitle}
                </p>
                <ul className="space-y-1.5">
                  {s.tips.map((tip, i) => (
                    <li key={i} className={`flex gap-2 text-[var(--gh-24292f)] ${ur ? "text-sm leading-[2.2]" : "text-[13px] leading-relaxed"}`}>
                      <span aria-hidden className="text-[var(--gh-7d4e00)]">•</span>
                      <span className="min-w-0">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={s.open.href}
                className="mt-5 inline-flex h-9 items-center rounded-lg bg-[var(--gh-0d1117)] px-4 text-[13px] font-semibold text-white transition hover:bg-[var(--gh-24292f)]"
              >
                {s.open.label} {ur ? "←" : "→"}
              </Link>
            </section>
          ))}
        </div>

        <p className={`mt-6 text-center text-[var(--gh-57606a)] ${ur ? "text-sm leading-[2.2]" : "text-xs"}`}>
          {c.help}{" "}
          <Link href="/business/support" className="font-semibold text-[var(--gh-0550ae)] underline">{c.helpLink}</Link>
        </p>
      </div>
    </div>
  );
}
