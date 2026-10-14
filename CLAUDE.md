# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

AutoMarket is a Pakistani vehicle marketplace (buy, sell, rent cars and bikes; prices in PKR). It is a single Next.js 16 App Router app with MongoDB (Mongoose), NextAuth v5 (beta), UploadThing, Pusher, Gemini and Nodemailer. `documentation.md` is a long feature, model and API write-up. It is partly out of date (for example, it says the dev port is 3000), so check the code before relying on it.

## Commands

```bash
npm run dev          # dev server on http://localhost:3001
npm run build
npm run lint         # ESLint 9 flat config (eslint.config.mjs)
npx tsc --noEmit     # type check; CI runs this before lint and build
npm run make-admin   # tsx src/scripts/make-admin.ts: promotes ADMIN_EMAIL to role ADMIN
```

There is no test framework or test suite. CI (`.github/workflows/ci.yml`) runs `tsc --noEmit`, lint and build, then deploys to Vercel: previews for PRs and production on pushes to `main`. All env vars are required at build time. See the CI file for the full list (`DATABASE_URL`, `NEXTAUTH_SECRET`, Google OAuth, `UPLOADTHING_TOKEN`, `GEMINI_API_KEY`, the Pusher server and `NEXT_PUBLIC_` keys, the email credentials, `ADMIN_SECRET` and `ADMIN_EMAIL`). `src/lib/mongodb.ts` throws at import time if `DATABASE_URL` is missing. `NEXT_PUBLIC_SUPPORT_WHATSAPP` is optional. When it is unset, the WhatsApp contact buttons are hidden.

`npm run lint` currently reports 4 known errors (in `business/onboarding`, `BookingsContent` and `MessagesContent`). Compare against that baseline instead of expecting a clean run. The React compiler lint rules are strict:
- `react-hooks/set-state-in-effect` flags `useEffect(() => { load(); })` when `load` sets state, even after an `await`. The workaround used in this repo is to write the loader as a `fetch().then(...)` chain or to call it via `queueMicrotask`.
- `react-hooks/immutability` flags functions used in an effect before they are declared.

## Architecture

**Routing (`src/app`)** uses three route groups, each with its own layout and `error.tsx`:
- `(main)`: the public site and user area (listings, sell, bookings, messages, saved, compare, dashboard, profile) plus `admin/*`.
- `(business)/business/*`: a dealer or organization console with its own sidebar layout and inline styles, separate from the main Navbar shell.
- `(auth)`: login and register.

`src/app/api/**/route.ts` holds the REST handlers that client components call with `fetch`. Vercel caps them at 30s (`vercel.json`).

**Auth.** `src/lib/auth.ts` exports `{ handlers, auth, signIn, signOut }` and uses Credentials (bcrypt) and Google providers with JWT sessions. `session.user.id` and `session.user.role` are added in the callbacks and typed in `src/types/next-auth.d.ts`. Google sign-in creates the `User` document on first login.
- Route protection lives in **`src/proxy.ts`**, which replaces `middleware.ts` in this Next version. It wraps `auth()`, guards the protected prefixes and `/admin` (role `ADMIN`), and skips `/api`. API routes must therefore call `await auth()` and return 401 themselves.
- Server pages can use `requireAuth()` and `requireAdmin()` from `src/lib/session.ts`.
- User roles are `USER`, `SELLER` and `ADMIN`. The JWT role is only set at sign-in, so `proxy.ts` sees a role change only after the user signs in again.
- **Admin access levels.** `User.adminAccess` is `FULL` or `READ_ONLY`. A missing value means `FULL`.
  - Admin API routes must use `requireAdminApi("read" | "write")` from `src/lib/adminAuth.ts`, not a session role check. It re-reads the role from the database, and `"write"` rejects view-only admins.
  - The `ADMIN_EMAIL` account (`isPlatformOwner`) can't be demoted, limited or deleted.
  - Admin pages hide actions through `useAdminAccess()` (`components/admin/AdminAccess.tsx`, which reads `/api/admin/me`).
- **Business roles** are separate: `Employee.role` is one of `OWNER`, `MANAGER`, `SALES` or `STAFF`, linked to an `Organization`.
  - The `Employee` record is the source of truth. Read it with `getMembership(userId)`.
  - Check permissions with `can(role, permission)`, defined in `src/lib/business.ts`. The permissions are `manageTeam`, `editCustomers`, `deleteCustomers`, `manageBookings`, `manageDeals` and `replyReviews`.
  - **Suspension.** Admins suspend a business with `PATCH /api/admin/organizations/[id]` (`suspend` with a reason, or `reinstate`).
    - Suspending sets `Organization.isActive = false` and stores `suspension.listingIds`, the live listings it switched to `INACTIVE`, so reinstating restores exactly those. The owner is messaged in Messages.
    - Warnings are an optional earlier step: `action: "warn"` appends to `Organization.warnings` and messages the owner. `SuspensionGate` shows open warnings as a banner, and the owner or a manager acknowledges them with `PATCH /api/business/warnings`. Businesses created before warnings existed have no `warnings` array, so guard array-filter updates with `$elemMatch`.
    - While suspended, `getMembership` returns null, so business APIs refuse. The `(business)` layout's `SuspensionGate` locks every page except `/business/support`, and posting or reactivating listings is refused (`isUserBusinessSuspended`).
  - Business users contact the team from `/business/support`, which calls `POST /api/support/message` with a topic from `src/lib/supportTopics.ts`. The message lands in the support admin's Messages inbox and works while suspended, so the business can appeal.
  - Business routes must scope every query to `member.organizationId`. Customers can only be deleted by the owner, and only when their status is `SOLD` or `LOST` (`src/lib/customers.ts`).

**Data.** Call `connectDB()` from `src/lib/mongodb.ts` before any query. It caches the connection on `global` for hot reload and serverless. Models in `src/models/` are registered with `defineModel(name, schema)` (`src/models/defineModel.ts`). In production it reuses the cached model. In development it replaces the cached model only when the schema's fields changed (it compares a fingerprint), so schema edits apply on hot reload. Replacing a model on every reload made routes that still held the old model hang with "buffering timed out". Use it for new models instead of `mongoose.models.X || mongoose.model(...)`.
- Business inventory is not owned by the organization directly. It is the listings whose `sellerId` is any organization member; see `getInventorySellerIds` in `src/lib/business.ts`.

**Plans and limits.** `src/lib/plans.ts` is the single source for plan names, prices and limits: `FREE`, `STARTER` ("Premium"), `PRO` ("Premium Plus") and `UNLIMITED`. A `null` limit means unlimited. The file is client-safe, and all UI text reads its numbers from it.
- The plan lives on the **user** (`User.plan`, `planExpiresAt`, `planSource`). Business members inherit the owner's plan, and `Organization.plan` is a legacy field that is no longer read.
- `src/lib/subscription.ts` provides `getSubscription`, `getUsage` and `checkPlanLimit(userId, "listings" | "staff" | "customers")`.
  - It is enforced server-side in `POST /api/listings`, `POST /api/business/deals` and the staff and customer POST routes.
  - When the limit is reached, those routes return 403 with `code: "PLAN_LIMIT_REACHED"`.
  - **The listing limit is a monthly quota shared by listings and deals** (there is no separate deal limit). Every listing or deal created in the calendar month (Pakistan time, see `quotaMonthStart`/`quotaResetsAt` in `plans.ts`) counts, even after it is deleted.
    - `POST /api/listings` and `POST /api/business/deals` check `checkPlanLimit(userId, "listings")` and write a `ListingLog` entry (`listingId` or `dealId`) that is never removed.
    - `getUsage` counts this month's log entries for the whole team, plus any listings or deals from this month that have no log entry yet.
    - Re-activating or re-tagging an existing listing doesn't use quota. `/api/subscription` returns `listingsResetAt`.
  - Staff counts include the owner.
- Clients read `/api/subscription` through `useSubscription()` (`components/subscription/`).
- There is no payment integration. Admins activate plans through `PATCH /api/admin/users/[id]/plan` (`PlanGiftDialog`), and users ask for one through `POST /api/support/upgrade-request`.
- **Every paid plan ends.** Plans run in 30-day periods (`PLAN_PERIOD_DAYS`, `addPlanPeriods` in `plans.ts`), and there is no "no end date".
  - `source: "PAID"` gives one period. If the same plan is still running (paid, gifted or a trial), the new 30 days are added to the time left.
  - Gifts (`ADMIN_GRANT`) last 1, 3, 6 or 12 periods. The trial lasts `TRIAL_MONTHS` periods.
  - Once `planExpiresAt` passes, `effectivePlanId` treats the account as Free until the plan is bought again. `/api/subscription` returns `planDaysLeft`.
- `User.planSource` is `PAID`, `ADMIN_GRANT` (a gift) or `TRIAL`. Use `isFreeGrant()` from `src/lib/plans.ts` for "an admin can revoke this".
- Each account gets one free trial (`TRIAL_MONTHS` long), started with `trial: true` on the plan route. `User.trialUsedAt` is set atomically and never cleared, so revoking a trial doesn't allow another.
- The admin dashboard's **Plan lookup** box (`components/admin/PlanLookup.tsx`, `/api/admin/plans/lookup`) searches by name, email, business name, or full or short ID.
  - That request posts a chat `Message` to the support admin (`getSupportAdmin` in `src/lib/support.ts`).

**Bookings.**
- A `Booking` belongs to a `Rental`, which belongs to a listing. It has no organization field, so business bookings are the ones on `getBusinessRentals(userId)`, meaning rentals owned by any member.
- `source: "WALK_IN"` bookings have no `renterId`. They store customer details in `walkIn` instead, so treat `renterId` as optional. The personal `/api/bookings?role=owner` list excludes them.
- The business console (`/business/bookings`, `/api/business/bookings`) creates walk-ins and enforces the status flow in `src/lib/bookings.ts`: PENDING → CONFIRMED → ACTIVE (handed over) → COMPLETED, with cancellation before handover.
- `/business/bookings/[id]/slip` is the printable slip. `/business/rentals` redirects to `/business/bookings`.
- **Walk-ins for unlisted vehicles.** The New booking dialog has an "Other vehicle (not listed on AutoMarket)" option (picker value `other`). The business types in the vehicle, daily rate, deposit and an optional plate.
  - Such a booking has no `rentalId` or `dealId`. It stores `offListVehicle` and carries the business in `Booking.organizationId`, which `businessBookingQuery`, stats, counts, `ensureBookingCustomer`, the handover route and review eligibility all check.
  - Clashes are only checked when a plate is given, using `samePlatePattern` (spaces and dashes are ignored).
  - New booking is always available, even when the business has no listed rental vehicles.
- **Booking dates** (`src/lib/bookings.ts`).
  - A return date may equal the pickup date (`validBookingDates`), and `rentalDays` charges at least one day, so 23 → 23 and 23 → 24 Oct are both one day.
  - A booking holds the vehicle or deal from pickup up to, but not including, the return day, and a same-day booking holds just that day. The return day is therefore free for the next pickup.
  - Every clash check (listing rentals, walk-ins, deal bookings) must use `bookingClashQuery(start, end)`.
- **Handover details: number plate and renter CNIC.**
  - `Booking.plateNumber` and `Booking.renterCnic` are recorded at handover. `Rental.plateNumber` remembers the last plate to prefill the next one. Walk-ins may also carry `walkIn.cnic`, so read the CNIC with `bookingCnic(b)`.
  - In the business console, "Hand over" opens `HandoverDialog` (`components/bookings/`) and sends `{ status: "ACTIVE", plateNumber, cnic }`. The business route requires both for that move.
  - Personal owners add or correct both with `PATCH /api/bookings/[id]/handover`. Business members with `manageBookings` can use that route for business vehicles too.
  - `normalizePlate`, `normalizeCnic` and `formatCnicInput` are in `src/lib/plates.ts`. Cards show both values with `HandoverDetails`, and both slips print them.
- Every booking is linked to a CRM `Customer` of the renting business through `ensureBookingCustomer` (`src/lib/customerSync.ts`). It matches by `Customer.userId`, then by phone digits, then by email. It creates the customer only within the plan's customer limit.
- The customer link is set when an online or walk-in booking is created. `GET /api/business/customers` back-fills older bookings via `syncBookingCustomers`.

**Verified badge.** A PKR 500/month add-on for businesses, separate from plans. `VERIFIED_BADGE`, `isVerified` and `badgeState` are in `src/lib/plans.ts`.
- It is stored on `Organization.verification`. `verifiedAt`/`expiresAt`/`source` (`PAID` or `ADMIN_GRANT`) record the grant. `requestedAt` marks an open request from the owner, and `rejectedAt`/`rejectionReason` record the last refusal. Always check with `isVerified()`, because an expired badge keeps its `verifiedAt`.
- The owner requests it from the pricing page (`VerifiedBadgeOffer`, which calls `POST /api/business/verification`). That records `requestedAt` and messages the support admin.
- Admins handle it from the Badge button in the Businesses tab (`VerifyBadgeDialog`), which calls `PATCH /api/admin/organizations/[id]` with `verify`, `rejectVerification` or `unverify`. Renewing adds the months to the time left.
- Public pages show `components/VerifiedBadge.tsx`. Unverified businesses use a building icon so only verified ones show a tick. Public queries select only `verification.verifiedAt verification.expiresAt`. `getSellerBusinesses` returns `verified`.

**Reviews and deals.**
- Reviews belong to **businesses**, not individual sellers or listings. `BusinessReview` allows one review per user per organization, and the business can add a public `reply`.
- Only people who dealt with the business may review it (`canReviewBusiness` in `src/lib/reviews.ts`): they booked, messaged a member, or are a CRM customer. Members can't review their own business.
- `src/lib/reviews.ts` also provides `getBusinessRatings` and `getSellerBusinesses` (seller id → business, used to label listings "Business" or "Private seller").
- The public business page is `/dealers/[slug]` (`Organization.slug`), with its reviews API at `/api/businesses/[slug]/reviews`. Old `/biz/<slug>` links redirect there (`next.config.ts`). The business console has `/business/reviews` and `/business/deals`.
- The business picture is `Organization.logo`. The owner or a manager sets it in business settings (`BusinessProfileCard`, using the `profileImage` upload endpoint). `PATCH /api/business/organizations` only changes the fields it is sent, and accepts only UploadThing URLs (`isUploadedImageUrl` in `src/lib/uploadUrls.ts`). It shows on the dealer page, the listing "Listed by" box and the console sidebar, which reloads on the `ORG_UPDATED_EVENT` window event.
- **Deals are stand-alone offers, not discounts on listings.** A `Deal` has its own photos, vehicle details (make, model, year, condition, city and so on), a normal `price`, a percent or PKR discount, and `startsAt`/`endsAt`. Nothing has to be listed first, and listing pages show no deal pricing.
  - The owner or a manager (`manageDeals`) creates and edits deals at `/business/deals/new` and `/business/deals/[id]/edit`, using `components/business/DealForm.tsx`.
  - `parseDealInput` (`src/lib/dealInput.ts`) validates the input. Photos go through the same AI-checked `vehicleImages` upload as listings: each URL must have a `VehicleImage` record from a member of the business, or already be on the deal.
  - `dealState`, `dealPrice`, `dealLabel` and `MAX_DEAL_IMAGES` are in client-safe `src/lib/deals.ts`. Shared vehicle option lists are in `src/lib/vehicleOptions.ts`.
  - The public pages are `/deals` (filters for make, city and sort in the URL) and `/deals/[id]`. The business page and the home page "Hot deals" strip show `components/deals/DealCard.tsx`. The landing page (`/`) has its own dark `HotDealCard` in `components/landing/Landing.tsx`, fed the top 3 deals by discount from `src/app/(main)/page.tsx`. All of them read through `src/lib/publicDeals.ts` (`getLiveDeals`, `getDealPage`), which hides deals of suspended businesses.
  - **Deal types.** `Deal.dealType` is `SALE` or `RENT`. Older deals have no type and count as sales (`isRentDeal`).
    - A RENT deal is a bookable package: `price` is per day for the whole package, `vehicleCount` is the number of cars (for example an event convoy), and `deposit` is optional.
    - Customers book rent deals at `/deals/[id]/book` (the shared `BookingForm` with `dealId`), which calls `POST /api/deals/[id]/book`. The pickup date must be on or before the deal's end, overlapping bookings are refused, and the business's own members can't book.
  - **Deal bookings** are ordinary `Booking`s with `dealId` set and no `rentalId`, so they go through the normal flow (confirm, handover with plate and CNIC, return, slip). They show a DEAL tag.
    - `src/lib/dealBookings.ts` (`businessBookingQuery`, `getOrgDealIds`, `DEAL_BOOKING_FIELDS`) includes them in business booking lists, booking details, stats, pending counts and review eligibility.
    - Walk-ins can be made for a rent deal: the picker value is `deal:<id>`.
    - `ensureBookingCustomer` takes the business from the deal. Never assume `booking.rentalId` exists.
- Admins see and disable deals at `/admin/deals`. `disabledByAdmin` can't be undone by the business.
- The old per-seller `Review` model and `/api/reviews` were removed. Their documents are left in the `reviews` collection but nothing reads them.

**Public caching (60 seconds).** `src/lib/pageCache.ts` sets `PUBLIC_CACHE_SECONDS` and has the tag helpers.
- The two home pages use `export const revalidate = 60`.
- The listing page and the `/dealers/[slug]` page call `auth()`, so they render per request. They cache their visitor-independent database reads with `unstable_cache`, tagged `listing:<id>` and `business:<slug>`. `"use cache"` would need Cache Components, which this app doesn't enable.
  - Cached values are plain JSON, so ids and dates are strings. After a cache hit nothing has called `connectDB()`, so connect before any extra live query.
  - Viewer-specific parts stay live: the dealer page's own review and review eligibility.
- Deals are cached the same way: `deal:<id>` for a deal page and `deals` for every deal list. Every deal mutation calls `invalidateDeal`, which also clears the business page.
- Routes that change those pages expire the tags straight away with `invalidateListingAndSeller`, `invalidateBusinessPage` or `invalidateBusinessSlug`. These are listing create/edit/delete, admin listing changes, AI inspection, business settings, deals, reviews and replies, and admin business actions. A new mutation that changes what those pages show must call one of them.
- `GET /api/listings` (the public browse feed) sends `Cache-Control: public, s-maxage=60, stale-while-revalidate=60` for the CDN.
- Don't cache anything per user: dashboards, the business console, admin and messages.

**Deleting accounts.** Users delete their own account from Profile & settings (`components/profile/DeleteAccount.tsx`, `GET`/`DELETE /api/profile/account`). They must type their email, and their password if they have one.
- `checkAccountDeletion` (`src/lib/accountDeletion.ts`) blocks the delete when:
  - the account is the platform owner or an admin
  - the user still owns a business (delete it first in Business settings)
  - the user has confirmed or ongoing bookings, as renter or owner
- `deleteAccount` removes their listings, rentals, inspections, favourites, saved searches, messages, reviews and staff membership, plus their UploadThing files. Photos a business deal still uses are kept.
  - Pending bookings are cancelled. Bookings they made as a renter keep their name and phone in `walkIn` and lose `renterId`, and business pages fall back to those details.
  - CRM customers keep their records but lose the `userId` link.
- The admin user delete (`DELETE /api/admin/users/[id]`) uses the same cleanup, with `byAdmin` relaxing the admin and booking checks.
- Deleting a business (`DELETE /api/business/organizations`) also removes its deals and reviews.

**Terms.** `/terms` is a static page. `src/lib/terms.ts` holds `TERMS_UPDATED`, which must be bumped when the text changes. Registration requires `acceptTerms: true` and stores `User.termsAcceptedAt`. Google sign-ups get it on first sign-in, because the sign-in page says continuing means agreeing.

**Sold and rented tags.** Owners mark a listing Available, Sold or Rented with `components/listings/AvailabilityControl.tsx`, which calls `PATCH /api/listings/[id]/availability`. The control appears in the dashboard's MyListings and the listing page's Manage box. Its `allow` prop narrows the choices:
  - The business inventory offers only Available/Sold.
  - The Rented tag is applied from bookings: the personal Bookings "received" tab and `/business/bookings`, which offer Available/Rented on each booking's vehicle.
- The seller can always change it. The owner, managers and sales staff of the seller's business can change their teammates' listings too.
- `src/lib/availability.ts` (client-safe) says which tags fit a listing type: SALE can be Sold, RENT can be Rented, BOTH can be either.
- Every status change sets `Listing.statusChangedAt`. Changing the tag never uses the monthly listing quota.
- The public sees sold and rented vehicles for `CLOSED_VISIBLE_DAYS` (30) after the change, through `publicStatusQuery`. They appear on browse (sorted `status: 1`, so available ones come first; `available=1` hides them) and on the dealer page.
- `ListingCard` greys them out with a "Sold out" or "Rented" stamp. The listing page shows a banner with a "see similar" link, and hides booking and the financing calculator.

**Addresses.** Listings (`Listing.address`, optional) and deals (`Deal.address`, required by `parseDealInput`) carry a shop or pickup address.
- `src/lib/address.ts` (client-safe) has `cleanAddress` and `mapsUrl` (a Google Maps search link).
- The Sell form and New deal form prefill the address and city from Business settings (`Organization.address`/`city`) for business members.
- The address shows on the listing page ("Where to see the vehicle"), the deal page and deal booking page, the renter's booking card, and both slips as "Pickup address". The business slip falls back to the business address.
- The personal print slip is raw HTML, so escape user text in it with `escapeHtml`.

**Listing filters.** `src/lib/listingFilters.ts` is the single source for browse filters. `parseFilters` turns URL or object input into `buildListingQuery`, the Mongo query for `status: "ACTIVE"` listings. The browse API passes `includeClosed` to add recently sold and rented ones. `listingMatches` is an in-memory twin of that query. The listings API, the browse page URL state and saved-search alerts all use this module, so a new filter must be added to it and to both the query builder and the matcher.
- When a listing is created, `POST /api/listings` uses `after()` to run `notifySavedSearches` (`src/lib/savedSearchAlerts.ts`), which emails users whose saved searches match.

**Image uploads.** `src/lib/uploadthing.ts` defines two endpoints:
- `vehicleImages` checks every file with Gemini vision (`src/lib/vehicleImageCheck.ts`; the model can be overridden with `GEMINI_VISION_MODEL`). It fails closed: rejected or unverifiable files are deleted from UploadThing, and approved ones are recorded in `VehicleImage`. The client splits the per-file results with `splitVehicleUploads` (`src/lib/vehicleUploads.ts`).
- `profileImage` has no check.

Remote image hosts must be allowed in `next.config.ts` `images.remotePatterns`.

**AI inspection.** `api/ai-inspection` and `components/inspection/AIInspectionForm.tsx` use `@google/generative-ai` and save results to the `Inspection` model.

**Realtime and notifications.** The server triggers Pusher events through `src/lib/pusher.ts`. Server code should call `triggerPusher` from `src/lib/support.ts`, which no-ops when the Pusher env vars are absent. Clients subscribe to the per-user channel `user-${userId}`. Badge counts come from `src/hooks/useNotificationCounts.ts`, which runs one shared poller per page that also refreshes on window focus and on the Pusher `new-notification` event.

**Client state.** Zustand stores live in `src/hooks/`. `useCompare` persists to localStorage with `skipHydration: true`, and `CompareBar` rehydrates it after mount to avoid hydration mismatches. Shared compare constants live in `src/lib/compare.ts`.

**Conventions.** Use the `@/*` path alias for `src/*`, except in `src/models/`, where `User.ts` imports `../lib/plans` relatively so the `tsx` admin script can load it.
- Styling is Tailwind 3 (`tailwind.config.js`). Many business and older pages use inline `style={{}}` objects with a GitHub-like palette, written as theme variables (`var(--gh-0d1117)`, `var(--gh-e1e4e8)` and so on).
- **Light/dark theme.** It follows the device by default, and users can choose Light, Dark or System; the choice is stored in `localStorage`.
  - `src/lib/theme.ts` has the `<head>` script that sets `.dark` on `<html>` before paint. `ThemeProvider` and `useTheme()` are in `components/theme/`, and `ThemeToggle` appears in the account menu, mobile menu and business sidebar.
  - Every Tailwind neutral (`white`, `black`, `slate`, `gray`) and accent hue reads from CSS variables in `src/app/theme.css`, generated by `node scripts/generate-theme.mjs`. Never edit that file by hand. Neutrals invert in dark mode, so `bg-white`/`text-slate-900` and `bg-slate-900`/`text-white` both work without `dark:` variants.
  - Inline colours must use `var(--gh-<hex>)`. To add a colour, add it to `GH` in the generator and re-run it.
  - Elements matching `STATIC_SELECTORS` keep their light look in both themes: `.theme-static`, `bg-slate-950` sections, `bg-black` overlays and `from-amber-300` gold buttons. Use `theme-static` for anything dark by design or printable.
  - SVG attributes (recharts `fill`/`stroke`, lucide `color`) can't read CSS variables. Pick their colours from `useTheme().resolved`, as `reports` and `admin/analytics` do.
  - Use `.theme-logo` for the AutoMarket logo on themed surfaces.
- Newer UI uses Tailwind `slate` with dark "glow" header cards. The marketplace (light) and business console (dark) are mirror themes. The shared pieces are `RingAvatar` (`components/UserMenuDropdown.tsx`), `UserIdBadge`, `MobileNavDrawer` and `business/BusinessSidebar`.
- **Palette rules.** Marketplace pages, including the personal `/dashboard`, use `slate-900` primary buttons, `indigo` accents, `amber` for plans and premium, and the indigo → fuchsia → amber gradient for avatars and premium highlights. Don't introduce new accent families such as teal; the owner rejected that as clashing with the project. Status colours (emerald, amber, rose, sky) are fine.
- **Grid/list pattern.** `ListingCard` takes `layout="grid" | "list"`. Pages with the browse page's ⊞/☰ switch (`listings/page.tsx`, `listings/DealerVehicles.tsx`, `listings/MyListings.tsx`) use a 2-column grid even on phones. A per-browser view choice lives in `localStorage` and is applied after mount via `queueMicrotask`, so server HTML still renders the grid.
- Server pages passing lean Mongo documents to client components must `JSON.parse(JSON.stringify(...))` them first, because ObjectIds and Dates don't cross the boundary.
- The mobile navbar shows only the logo and the menu button, with no Sell button; selling is a tile in `MobileNavDrawer`. Keep the bar at its original size, and make menu contents compact instead.
- Destructive actions use dialogs (Radix `@radix-ui/react-dialog`), never `window.confirm`. Use `components/admin/ui.tsx` `ConfirmDialog` in admin pages and `components/business/ConfirmDialog.tsx` in the business console.
- Shared UI primitives are in `src/components/ui`. react-hook-form and zod are installed but nothing in `src` imports them yet.
