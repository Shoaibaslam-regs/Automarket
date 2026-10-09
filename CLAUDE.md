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

`npm run lint` currently reports 5 known errors (in `business/onboarding`, `business/rentals`, `BookingsContent` and `MessagesContent`). Compare against that baseline instead of expecting a clean run. The React compiler lint rules are strict:
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
  - Check permissions with `can(role, "manageTeam" | "editCustomers" | "deleteCustomers")`, defined in `src/lib/business.ts`.
  - Business routes must scope every query to `member.organizationId`. Customers can only be deleted by the owner, and only when their status is `SOLD` or `LOST` (`src/lib/customers.ts`).

**Data.** Call `connectDB()` from `src/lib/mongodb.ts` before any query. It caches the connection on `global` for hot reload and serverless. Models in `src/models/` use the `mongoose.models.X || mongoose.model(...)` pattern.
- Business inventory is not owned by the organization directly. It is the listings whose `sellerId` is any organization member; see `getInventorySellerIds` in `src/lib/business.ts`.

**Plans and limits.** `src/lib/plans.ts` is the single source for plan names, prices and limits: `FREE`, `STARTER` ("Premium"), `PRO` ("Premium Plus") and `UNLIMITED`. A `null` limit means unlimited. The file is client-safe, and all UI text reads its numbers from it.
- The plan lives on the **user** (`User.plan`, `planExpiresAt`, `planSource`). Business members inherit the owner's plan, and `Organization.plan` is a legacy field that is no longer read.
- `src/lib/subscription.ts` provides `getSubscription`, `getUsage` and `checkPlanLimit(userId, "listings" | "staff" | "customers")`.
  - It is enforced server-side in `POST /api/listings`, in listing re-activation in `PATCH /api/listings/[id]`, and in the staff and customer POST routes.
  - When the limit is reached, those routes return 403 with `code: "PLAN_LIMIT_REACHED"`.
  - Listings count against the limit only while their status is `ACTIVE`, `PENDING` or `RENTED`. Staff counts include the owner.
- Clients read `/api/subscription` through `useSubscription()` (`components/subscription/`).
- There is no payment integration. Admins grant plans through `PATCH /api/admin/users/[id]/plan`, and users ask for one through `POST /api/support/upgrade-request`.
  - That request posts a chat `Message` to the support admin (`getSupportAdmin` in `src/lib/support.ts`).

**Listing filters.** `src/lib/listingFilters.ts` is the single source for browse filters. `parseFilters` turns URL or object input into `buildListingQuery`, the Mongo query that always includes `status: "ACTIVE"`. `listingMatches` is an in-memory twin of that query. The listings API, the browse page URL state and saved-search alerts all use this module, so a new filter must be added to it and to both the query builder and the matcher.
- When a listing is created, `POST /api/listings` uses `after()` to run `notifySavedSearches` (`src/lib/savedSearchAlerts.ts`), which emails users whose saved searches match.

**Image uploads.** `src/lib/uploadthing.ts` defines two endpoints:
- `vehicleImages` checks every file with Gemini vision (`src/lib/vehicleImageCheck.ts`; the model can be overridden with `GEMINI_VISION_MODEL`). It fails closed: rejected or unverifiable files are deleted from UploadThing, and approved ones are recorded in `VehicleImage`. The client splits the per-file results with `splitVehicleUploads` (`src/lib/vehicleUploads.ts`).
- `profileImage` has no check.

Remote image hosts must be allowed in `next.config.ts` `images.remotePatterns`.

**AI inspection.** `api/ai-inspection` and `components/inspection/AIInspectionForm.tsx` use `@google/generative-ai` and save results to the `Inspection` model.

**Realtime and notifications.** The server triggers Pusher events through `src/lib/pusher.ts`. Server code should call `triggerPusher` from `src/lib/support.ts`, which no-ops when the Pusher env vars are absent. Clients subscribe to the per-user channel `user-${userId}`. Badge counts come from `src/hooks/useNotificationCounts.ts`, which runs one shared poller per page that also refreshes on window focus and on the Pusher `new-notification` event.

**Client state.** Zustand stores live in `src/hooks/`. `useCompare` persists to localStorage with `skipHydration: true`, and `CompareBar` rehydrates it after mount to avoid hydration mismatches. Shared compare constants live in `src/lib/compare.ts`.

**Conventions.** Use the `@/*` path alias for `src/*`, except in `src/models/`, where `User.ts` imports `../lib/plans` relatively so the `tsx` admin script can load it.
- Styling is Tailwind 3 (`tailwind.config.js`), with no dark mode. Many business and older pages use inline `style={{}}` objects with a GitHub-like palette (`#0d1117`, `#57606a`, `#e1e4e8`).
- Newer UI uses Tailwind `slate` with dark "glow" header cards. The marketplace (light) and business console (dark) are mirror themes. The shared pieces are `RingAvatar` (`components/UserMenuDropdown.tsx`), `UserIdBadge`, `MobileNavDrawer` and `business/BusinessSidebar`.
- Destructive actions use dialogs (Radix `@radix-ui/react-dialog`), never `window.confirm`. Use `components/admin/ui.tsx` `ConfirmDialog` in admin pages and `components/business/ConfirmDialog.tsx` in the business console.
- Shared UI primitives are in `src/components/ui`. react-hook-form and zod are installed but nothing in `src` imports them yet.
