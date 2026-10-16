"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Lightbulb, User, Users, type LucideIcon } from "lucide-react";

type Lang = "en" | "ur";
const LANG_KEY = "business-guide-lang";

type Term = { name: string; text: string; tone: string };
type Section = {
  id: "customers" | "staff";
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
    title: "Guide: customers and staff",
    subtitle: "Simple steps for the two parts of the console that new users find hardest",
    jump: "Jump to",
    help: "Still stuck? Send us a message and we'll help you.",
    helpLink: "Help & support",
    sections: [
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
          "Choose the type. “Outside customer” is a person who came to your shop or called you and has no AutoMarket account. “AutoMarket user” is a person with an account: type their email or account ID and tap Find, and their details fill in by themselves.",
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
        id: "staff",
        icon: User,
        title: "Staff",
        intro:
          "Staff are the people who work in your shop. When you add them, they can use this console from their own phone with their own login. You never need to share your password.",
        stepsTitle: "How to add a staff member",
        steps: [
          "First, the person must make their own AutoMarket account (Sign up, using their email). Ask them to do this on their phone.",
          "Ask them which email they used to sign up.",
          "Open “Staff” from the menu and tap “+ Add staff member”.",
          "Type that email exactly.",
          "Choose a role (see the list below). If you are not sure, choose “Staff”, the safest one.",
          "Tap Add. Now they sign in to AutoMarket and tap “Business console” in their account menu.",
        ],
        termsTitle: "What each role can do",
        terms: [
          { name: "Owner", text: "You. Can do everything: settings, plan, deleting customers and the business.", tone: "amber" },
          { name: "Manager", text: "Runs the shop for you: adds staff, makes deals, handles bookings and customers, replies to reviews.", tone: "purple" },
          { name: "Sales", text: "Works with customers: adds and updates customers, handles bookings.", tone: "blue" },
          { name: "Staff", text: "Can only look. Cannot change anything.", tone: "slate" },
        ],
        tipsTitle: "Good to know",
        tips: [
          "Give each person the smallest role they need. You can change the role later from the list.",
          "When someone leaves your shop, tap “Remove” next to their name so they lose access straight away.",
          "One person can only belong to one business at a time.",
          "Your plan decides how many people your team can have, and you (the owner) count as one.",
          "If you see “No AutoMarket account found”, the person hasn't signed up yet or the email is spelt differently.",
          "The Performance tab (owner and managers) shows this month's bookings, handovers, sales and money collected by each person.",
          "The Activity tab (owner only) lists everything your team did: bookings, payments, sales, expenses and customer changes, with who did it and when.",
        ],
        open: { href: "/business/staff", label: "Open Staff" },
      },
    ],
  },
  ur: {
    title: "رہنمائی: کسٹمرز اور اسٹاف",
    subtitle: "کنسول کے دو مشکل حصوں کے لیے آسان طریقہ، قدم بہ قدم",
    jump: "سیدھا جائیں",
    help: "پھر بھی سمجھ نہ آئے؟ ہمیں پیغام بھیجیں، ہم آپ کی مدد کریں گے۔",
    helpLink: "مدد اور سپورٹ",
    sections: [
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
          "قسم چنیں۔ “Outside customer” وہ ہے جو دکان پر آیا یا فون کیا اور اس کا AutoMarket اکاؤنٹ نہیں۔ “AutoMarket user” وہ ہے جس کا اکاؤنٹ ہے: اس کا ای میل یا اکاؤنٹ آئی ڈی لکھ کر Find دبائیں، اس کی تفصیل خود بھر جائے گی۔",
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
        id: "staff",
        icon: User,
        title: "اسٹاف (عملہ)",
        intro:
          "اسٹاف وہ لوگ ہیں جو آپ کی دکان پر کام کرتے ہیں۔ شامل کرنے کے بعد وہ اپنے موبائل سے اپنے لاگ اِن کے ساتھ یہ کنسول استعمال کر سکتے ہیں۔ آپ کو اپنا پاس ورڈ کبھی کسی کو دینے کی ضرورت نہیں۔",
        stepsTitle: "نیا اسٹاف ممبر کیسے شامل کریں",
        steps: [
          "پہلے اس شخص کو اپنا AutoMarket اکاؤنٹ بنانا ہوگا (Sign up، اپنے ای میل سے)۔ اسے کہیں کہ اپنے موبائل پر یہ کر لے۔",
          "اس سے پوچھیں کہ سائن اپ کس ای میل سے کیا۔",
          "مینو سے “Staff” کھولیں اور “+ Add staff member” دبائیں۔",
          "وہی ای میل بالکل ویسے ہی لکھیں۔",
          "رول (Role) چنیں (نیچے فہرست دیکھیں)۔ اگر یقین نہ ہو تو “Staff” چنیں، یہ سب سے محفوظ ہے۔",
          "Add دبائیں۔ اب وہ AutoMarket میں سائن اِن کرے اور اپنے اکاؤنٹ مینو میں “Business console” دبائے۔",
        ],
        termsTitle: "ہر رول کیا کر سکتا ہے",
        terms: [
          { name: "Owner", text: "آپ خود۔ سب کچھ کر سکتے ہیں: سیٹنگز، پلان، کسٹمر اور بزنس ڈیلیٹ کرنا۔", tone: "amber" },
          { name: "Manager", text: "آپ کی جگہ دکان چلاتا ہے: اسٹاف شامل کرنا، ڈیلز بنانا، بکنگ اور کسٹمرز سنبھالنا، ریویوز کا جواب دینا۔", tone: "purple" },
          { name: "Sales", text: "گاہکوں کے ساتھ کام: کسٹمر شامل اور اپ ڈیٹ کرنا، بکنگ سنبھالنا۔", tone: "blue" },
          { name: "Staff", text: "صرف دیکھ سکتا ہے۔ کچھ بدل نہیں سکتا۔", tone: "slate" },
        ],
        tipsTitle: "یاد رکھنے کی باتیں",
        tips: [
          "ہر شخص کو اتنا ہی رول دیں جتنی ضرورت ہو۔ بعد میں فہرست سے رول بدل سکتے ہیں۔",
          "جب کوئی دکان چھوڑ دے تو اس کے نام کے ساتھ “Remove” دبائیں، اس کی رسائی فوراً ختم ہو جائے گی۔",
          "ایک شخص ایک وقت میں صرف ایک بزنس کا حصہ ہو سکتا ہے۔",
          "ٹیم میں کتنے لوگ ہو سکتے ہیں، یہ پلان پر ہے، اور آپ (مالک) بھی ان میں گنے جاتے ہیں۔",
          "اگر “No AutoMarket account found” آئے تو اس شخص نے ابھی سائن اپ نہیں کیا یا ای میل کی اسپیلنگ مختلف ہے۔",
          "Performance ٹیب (مالک اور مینیجر) ہر شخص کی اس مہینے کی بکنگز، گاڑی حوالگی، سیلز اور وصول کی گئی رقم دکھاتا ہے۔",
          "Activity ٹیب (صرف مالک) ٹیم کا ہر کام دکھاتا ہے: بکنگز، ادائیگیاں، سیلز، اخراجات اور کسٹمر کی تبدیلیاں، کس نے اور کب کیں۔",
        ],
        open: { href: "/business/staff", label: "Staff کھولیں" },
      },
    ],
  },
};

/** Bilingual (English / Urdu) how-to for the Customers and Staff pages. */
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
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--gh-0d1117)] text-white"><BookOpen size={17} /></span>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-[var(--gh-0d1117)]">Guide · رہنمائی</h1>
              <p className="text-xs text-[var(--gh-57606a)]">Customers &amp; staff, in English and Urdu</p>
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
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--gh-ddf4ff)] text-[var(--gh-0550ae)]"><s.icon size={17} /></span>
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
