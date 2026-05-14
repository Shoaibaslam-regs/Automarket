# AutoMarket — Complete Project Documentation

> Pakistan's trusted automobile marketplace for buying, selling, and renting vehicles — built with Next.js 16, MongoDB, and AI-powered inspection.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Features & Use Cases](#4-features--use-cases)
5. [Database Models](#5-database-models)
6. [API Reference](#6-api-reference)
7. [Authentication](#7-authentication)
8. [File Structure](#8-file-structure)
9. [Environment Variables](#9-environment-variables)
10. [Installation & Setup](#10-installation--setup)
11. [Key Learnings](#11-key-learnings)
12. [Phase-by-Phase Build Log](#12-phase-by-phase-build-log)
13. [Known Limitations](#13-known-limitations)
14. [Future Improvements](#14-future-improvements)
15. [Credits & Tools](#15-credits--tools)

---

## 1. Project Overview

**AutoMarket** is a full-stack web application that serves as Pakistan's automobile marketplace. It allows users to:

- **Buy** cars and bikes by browsing verified listings
- **Sell** vehicles by posting detailed listings with photos
- **Rent** vehicles with a complete booking management system
- **Inspect** vehicles using AI-powered image analysis
- **Chat** directly with sellers in real time
- **Manage** everything from a personal dashboard

The platform is designed for the Pakistani market with PKR pricing, local city filters, and WhatsApp integration for direct communication.

### Target Users

| User Type | Primary Use |
|---|---|
| **Buyer** | Browse listings, contact sellers, book rentals |
| **Seller** | Post listings, manage inquiries, accept bookings |
| **Rental Owner** | List vehicles for rent, confirm/decline booking requests |
| **Admin** | Manage platform, view analytics, moderate content |

---

## 2. Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.4 | Full-stack React framework |
| React | 19 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3.4 | Utility-first styling |
| Recharts | Latest | Analytics charts |
| Pusher JS | Latest | Real-time chat (client) |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Next.js API Routes | 16.2.4 | REST API endpoints |
| Mongoose | Latest | MongoDB ODM |
| NextAuth.js | Beta (v5) | Authentication |
| bcryptjs | Latest | Password hashing |
| Nodemailer | Latest | Email notifications |
| Pusher | Latest | Real-time WebSocket events |

### Database & Storage
| Service | Purpose |
|---|---|
| MongoDB Atlas | Primary database (cloud) |
| UploadThing | Image uploads & CDN |

### External APIs
| Service | Purpose |
|---|---|
| Google Gemini Vision | AI vehicle inspection | 
| Google OAuth | Social login |
| Pusher Channels | Real-time messaging |

### DevOps & Deployment
| Tool | Purpose |
|---|---|
| Vercel | Hosting & CI/CD |
| GitHub | Source control |
| MongoDB Atlas | Managed database |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                   │
│         Next.js App Router · React · Tailwind CSS       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / WebSocket
┌────────────────────────▼────────────────────────────────┐
│                   NEXT.JS SERVER                        │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  App Router │  │  API Routes │  │  NextAuth.js    │  │
│  │  (Pages/    │  │  (/api/*)   │  │  (JWT Sessions) │  │
│  │   Layouts)  │  │             │  │                 │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────┘  │
└─────────────────────────┼───────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼──────┐  ┌───────▼──────┐   ┌──────▼───────┐
│   MongoDB    │  │  UploadThing │   │   Pusher     │
│   Atlas      │  │  (Images)    │   │  (Real-time) │
└──────────────┘  └──────────────┘   └──────────────┘
        │
┌───────▼──────────────┐
│   Google Gemini API  │
│   (AI Inspection)    │
└──────────────────────┘
```

### Request Flow
1. User visits page → Next.js App Router renders server component
2. Server component fetches data directly from MongoDB
3. Client components use `fetch()` to call API routes
4. API routes validate session via NextAuth, then query MongoDB
5. Real-time events pushed via Pusher channels
6. Images uploaded directly to UploadThing CDN

---

## 4. Features & Use Cases

### 4.1 Authentication System
- **Email/password registration** with bcrypt hashing
- **Google OAuth** social login
- **JWT sessions** managed by NextAuth.js
- **Role-based access** — USER, SELLER, ADMIN
- **Protected routes** via Next.js proxy middleware

**Use case:** A new user registers with email and phone number. They are automatically logged in after registration and redirected to the dashboard.

---

### 4.2 Vehicle Listings
- **Create listings** with 3-step form (vehicle info → details → pricing)
- **Upload up to 8 images** via UploadThing with drag-and-drop
- **Listing types** — For Sale, For Rent, or Both
- **Search & filter** by make, model, condition, price range, location
- **AI inspection badge** shown on detail page when inspection exists
- **Featured listings** set by admin

**Use case:** A seller fills in their Toyota Corolla details, uploads 6 photos, sets the price at PKR 3,500,000, and publishes. The listing appears instantly on the homepage and search results.

---

### 4.3 Rental Booking System
- **Date picker** with availability checking (conflict detection)
- **Price calculator** — daily rate × number of days + security deposit
- **Booking statuses** — PENDING → CONFIRMED → ACTIVE → COMPLETED / CANCELLED
- **Owner actions** — confirm, decline, mark as completed
- **Renter actions** — cancel booking
- **Email notifications** sent to both parties on status changes
- **Booking slip generator** — printable PDF receipt
- **Notification badges** on navbar for pending requests

**Use case:** A renter selects dates for a Honda Civic rental (PKR 2,000/day). The request goes to the owner who confirms it. The renter gets an email with the owner's contact details and a booking confirmation badge in their navbar.

---

### 4.4 AI Vehicle Inspection
- **Upload photos** of a vehicle
- **Gemini Vision API** analyzes images and returns:
  - Detected make, model, estimated year
  - Condition rating (EXCELLENT / GOOD / FAIR / POOR)
  - Damage score (0–10)
  - Estimated market value in PKR
  - List of detected damages
  - List of positive features
  - Overall assessment summary
- **Demo fallback** when AI quota is exceeded — generates smart report from listing data
- **Report saved** to database and shown on listing detail page

**Use case:** An owner uploads 4 photos of their car. AI returns a damage score of 3/10, condition GOOD, estimated value PKR 4,200,000, identifies minor scratches on the bumper, and notes clean interior as a positive.

---

### 4.5 Real-time Chat
- **Direct messaging** between buyers and sellers
- **Pusher Channels** for real-time delivery
- **Polling fallback** every 3 seconds when Pusher unavailable
- **Conversation list** with unread indicators
- **Message read receipts** (✓ sent, ✓✓ read)
- **Listing context** — chat opened from a listing shows the vehicle
- **Mobile responsive** — slide animation between list and chat views
- **Unread badge** on navbar updates in real time

**Use case:** A buyer sees a Suzuki Swift listing and clicks "Message seller". They ask about the service history. The seller receives a real-time notification and replies. Both see the conversation linked to the specific listing.

---

### 4.6 User Profile & Settings
- **Edit profile** — name, phone number
- **Upload profile photo** via UploadThing
- **Change password** with current password verification
- **OAuth accounts** show appropriate message (no password to change)
- **Member since** date displayed

---

### 4.7 Admin Dashboard
- **Platform stats** — total users, listings, bookings, revenue
- **Analytics charts** (Recharts):
  - Area chart — user & listing growth (daily/weekly/monthly)
  - Bar charts — booking activity, messages, revenue
  - Line chart — all metrics combined
  - Period toggle — switch between daily/weekly/monthly
- **User management** — view all users, promote to admin, delete
- **Listing management** — change status, feature/unfeature, delete
- **Booking overview** — all bookings with renter details and revenue totals
- **Make admin script** — `npm run make-admin`

---

### 4.8 Notifications
- **Booking badge** on navbar — red number showing pending requests
- **Message badge** on navbar — blue number for unread messages
- **Email notifications** via Nodemailer:
  - New booking request → owner receives full booking details
  - Booking confirmed/declined → renter receives status update
- **In-app banners** — colored status banners in booking page
- **Timestamps** — requested at, confirmed at, cancelled at

---

## 5. Database Models

### User
```typescript
{
  name: String,
  email: String (unique),
  emailVerified: Date,
  image: String,
  password: String (hashed),
  phone: String,
  role: "USER" | "SELLER" | "ADMIN",
  createdAt: Date,
  updatedAt: Date
}
```

### Listing
```typescript
{
  title: String,
  description: String,
  price: Number,
  type: "SALE" | "RENT" | "BOTH",
  condition: "NEW" | "EXCELLENT" | "GOOD" | "FAIR" | "POOR",
  make: String,
  model: String,
  year: Number,
  mileage: Number,
  color: String,
  fuelType: String,
  transmission: String,
  location: String,
  images: [String],
  status: "ACTIVE" | "SOLD" | "RENTED" | "PENDING" | "INACTIVE",
  featured: Boolean,
  sellerId: ObjectId → User
}
```

### Rental
```typescript
{
  listingId: ObjectId → Listing,
  dailyRate: Number,
  weeklyRate: Number,
  monthlyRate: Number,
  deposit: Number,
  availableFrom: Date,
  availableTo: Date,
  ownerId: ObjectId → User
}
```

### Booking
```typescript
{
  rentalId: ObjectId → Rental,
  renterId: ObjectId → User,
  startDate: Date,
  endDate: Date,
  totalAmount: Number,
  deposit: Number,
  status: "PENDING" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED",
  seenByRenter: Boolean,
  deletedByOwner: Boolean,
  deletedByRenter: Boolean,
  confirmedAt: Date,
  cancelledAt: Date
}
```

### Inspection
```typescript
{
  listingId: ObjectId → Listing,
  images: [String],
  make: String,
  model: String,
  year: Number,
  condition: String,
  damageScore: Number,
  estimate: Number,
  reportUrl: String,
  rawResponse: Object
}
```

### Message
```typescript
{
  senderId: ObjectId → User,
  receiverId: ObjectId → User,
  listingId: ObjectId → Listing,
  content: String,
  read: Boolean
}
```

---

## 6. API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| GET/POST | `/api/auth/[...nextauth]` | NextAuth handlers |

### Listings
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/listings` | Get all listings (with filters) |
| POST | `/api/listings` | Create new listing |
| GET | `/api/listings/[id]` | Get single listing |
| PATCH | `/api/listings/[id]` | Update listing |
| DELETE | `/api/listings/[id]` | Delete listing |

### Bookings
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/bookings` | Get user bookings |
| POST | `/api/bookings` | Create booking |
| PATCH | `/api/bookings/[id]` | Update booking status |
| DELETE | `/api/bookings/[id]` | Remove booking |
| GET | `/api/bookings/count` | Get unread counts |
| POST | `/api/bookings/seen` | Mark bookings as seen |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/messages` | Get conversations or messages |
| POST | `/api/messages` | Send message |
| GET | `/api/messages/unread` | Get unread count |

### AI Inspection
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai-inspection` | Run AI inspection on images |

### Profile
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/profile` | Get current user profile |
| PATCH | `/api/profile` | Update profile / change password |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats` | Platform overview stats |
| GET | `/api/admin/analytics` | Daily/weekly/monthly analytics |
| GET | `/api/admin/users` | All users |
| PATCH | `/api/admin/users/[id]` | Update user role |
| DELETE | `/api/admin/users/[id]` | Delete user |
| GET | `/api/admin/listings` | All listings |
| PATCH | `/api/admin/listings/[id]` | Update listing |
| DELETE | `/api/admin/listings/[id]` | Delete listing |
| POST | `/api/admin/make-admin` | Promote user to admin |

---

## 7. Authentication

### Flow
```
Register → Hash password → Save to MongoDB → Auto sign-in → JWT session

Google OAuth → NextAuth callback → Check if user exists → Create if not → JWT session
```

### Session Structure
```typescript
session.user = {
  id: string,        // MongoDB ObjectId
  name: string,
  email: string,
  image: string,
  role: "USER" | "ADMIN"
}
```

### Protected Routes
Defined in `src/proxy.ts` (Next.js middleware):
- `/dashboard` — requires login
- `/sell` — requires login
- `/bookings` — requires login
- `/messages` — requires login
- `/profile` — requires login
- `/admin/*` — requires ADMIN role

---

## 8. File Structure

```
automarket/
├── public/
│   └── logo-1771205663069.png
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (main)/
│   │   │   ├── page.tsx                  # Homepage
│   │   │   ├── landing/page.tsx          # Animated landing page
│   │   │   ├── listings/
│   │   │   │   ├── page.tsx              # Browse listings
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx          # Listing detail
│   │   │   │       └── inspect/page.tsx  # AI inspection
│   │   │   ├── sell/page.tsx             # Create listing
│   │   │   ├── dashboard/page.tsx        # User dashboard
│   │   │   ├── bookings/page.tsx         # Booking management
│   │   │   ├── rentals/[id]/book/page.tsx
│   │   │   ├── messages/page.tsx         # Chat
│   │   │   ├── profile/page.tsx          # User profile
│   │   │   └── admin/
│   │   │       ├── page.tsx              # Admin overview
│   │   │       ├── users/page.tsx
│   │   │       ├── listings/page.tsx
│   │   │       ├── bookings/page.tsx
│   │   │       └── analytics/page.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts
│   │   │   │   └── register/route.ts
│   │   │   ├── listings/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── bookings/
│   │   │   │   ├── route.ts
│   │   │   │   ├── [id]/route.ts
│   │   │   │   ├── count/route.ts
│   │   │   │   └── seen/route.ts
│   │   │   ├── rentals/[id]/availability/route.ts
│   │   │   ├── messages/
│   │   │   │   ├── route.ts
│   │   │   │   └── unread/route.ts
│   │   │   ├── ai-inspection/route.ts
│   │   │   ├── profile/route.ts
│   │   │   ├── uploadthing/route.ts
│   │   │   ├── users/[id]/route.ts
│   │   │   ├── admin/
│   │   │   │   ├── stats/route.ts
│   │   │   │   ├── analytics/route.ts
│   │   │   │   ├── users/route.ts
│   │   │   │   ├── users/[id]/route.ts
│   │   │   │   ├── listings/route.ts
│   │   │   │   ├── listings/[id]/route.ts
│   │   │   │   └── make-admin/route.ts
│   │   │   └── health/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── BookingBadge.tsx
│   │   ├── MessageBadge.tsx
│   │   ├── BrandLogos.tsx
│   │   ├── providers.tsx
│   │   ├── listings/
│   │   │   ├── ListingCard.tsx
│   │   │   └── DeleteListing.tsx
│   │   ├── rentals/
│   │   │   └── BookingForm.tsx
│   │   ├── inspection/
│   │   │   └── AIInspectionForm.tsx
│   │   └── ui/
│   │       ├── ImageUpload.tsx
│   │       ├── ImageGallery.tsx
│   │       └── ImageGallery.tsx
│   ├── models/
│   │   ├── User.ts
│   │   ├── Listing.ts
│   │   ├── Rental.ts
│   │   ├── Booking.ts
│   │   ├── Payment.ts
│   │   ├── Inspection.ts
│   │   ├── Message.ts
│   │   └── index.ts
│   ├── lib/
│   │   ├── mongodb.ts
│   │   ├── auth.ts
│   │   ├── session.ts
│   │   ├── email.ts
│   │   ├── pusher.ts
│   │   ├── pusher-client.ts
│   │   ├── uploadthing.ts
│   │   └── uploadthing-client.ts
│   ├── types/
│   │   └── next-auth.d.ts
│   ├── scripts/
│   │   └── make-admin.ts
│   └── proxy.ts                          # Middleware
├── .env
├── next.config.ts
├── tailwind.config.js
├── package.json
└── tsconfig.json
```

---

## 9. Environment Variables

```env
# Database
DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/automarket"

# NextAuth
NEXTAUTH_SECRET="random-secret-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# UploadThing (image uploads)
UPLOADTHING_TOKEN="your-uploadthing-token"

# AI Inspection
GEMINI_API_KEY="your-gemini-api-key"
# OR
OPENAI_API_KEY="your-openai-api-key"

# Real-time chat
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-key"
PUSHER_SECRET="your-secret"
PUSHER_CLUSTER="ap1"
NEXT_PUBLIC_PUSHER_KEY="your-key"
NEXT_PUBLIC_PUSHER_CLUSTER="ap1"

# Email notifications
EMAIL_USER="your-gmail@gmail.com"
EMAIL_PASS="your-gmail-app-password"
EMAIL_FROM="AutoMarket <your-gmail@gmail.com>"

# Admin
ADMIN_SECRET="your-admin-secret"
ADMIN_EMAIL="admin@example.com"
```

---

## 10. Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- MongoDB Atlas account (free tier works)
- Git

### Step-by-step Setup

```bash
# 1. Clone the project
git clone https://github.com/your-username/automarket.git
cd automarket

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# 4. Start development server
npm run dev

# 5. Make yourself an admin (after registering)
npm run make-admin
```

### External Service Setup

**MongoDB Atlas**
1. Create account at mongodb.com/atlas
2. Create a free M0 cluster
3. Add database user with read/write access
4. Whitelist IP `0.0.0.0/0`
5. Copy connection string to `DATABASE_URL`

**UploadThing**
1. Create account at uploadthing.com
2. Create a new app
3. Copy the Token to `UPLOADTHING_TOKEN`

**Google OAuth**
1. Go to console.cloud.google.com
2. Create a project → Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add `http://localhost:3000/api/auth/callback/google` as redirect URI
5. Copy Client ID and Secret

**Gemini AI**
1. Go to aistudio.google.com
2. Create API key
3. Add to `GEMINI_API_KEY`

**Pusher**
1. Create account at pusher.com
2. Create a Channels app
3. Copy all 4 credentials to `.env`

---

## 11. Key Learnings

### Technical Learnings

**1. Next.js App Router vs Pages Router**
The App Router (introduced in Next.js 13) uses React Server Components by default. Server components can directly fetch from databases without API calls, which significantly reduces client-side JavaScript. Client components need `"use client"` directive and cannot access server-side resources directly.

**2. MongoDB with Mongoose in Next.js**
MongoDB connections must be cached globally to avoid creating new connections on every API call in serverless environments. The standard pattern:
```typescript
const globalForMongoose = globalThis as { mongoose?: ... };
if (!globalForMongoose.mongoose) { /* create connection */ }
```

**3. NextAuth.js v5 (Beta) Breaking Changes**
- `getServerSession()` replaced by `auth()`
- Middleware file renamed from `middleware.ts` to `proxy.ts`
- Prisma adapter replaced by direct MongoDB integration
- JWT callbacks work differently — must explicitly pass custom fields

**4. Mongoose Model Conflicts**
The `model` field name conflicts with Mongoose's internal `Document.model` property. Solution: use `Omit<Document, "model">` in TypeScript interfaces for models that have a `model` field (like Vehicle make/model).

**5. Turbopack Stability**
Next.js 16's Turbopack bundler causes random FATAL crashes during development with complex projects. Switching to webpack (`next dev` without `--turbo`) provides stability at the cost of slightly slower builds.

**6. Tailwind v4 vs v3**
Tailwind v4 uses a completely different setup — no `tailwind.config.js`, CSS-based configuration with `@import "tailwindcss"`. However, it has compatibility issues with some Next.js versions. Downgrading to v3 with traditional config resolves all styling issues.

**7. Edge Runtime Limitations**
Next.js middleware runs on the Edge Runtime which doesn't support Node.js APIs (including Mongoose). Authentication checks in middleware must use JWT token inspection only, not database queries.

**8. Real-time with Polling Fallback**
Pusher provides true WebSocket real-time, but API quota limits and configuration issues make a polling fallback essential for reliability. Polling every 3 seconds provides acceptable UX while true real-time remains the primary path.

**9. UploadThing v7 Changes**
UploadThing v7 introduced a new `token`-based auth system (replacing `UPLOADTHING_SECRET` + `UPLOADTHING_APP_ID`). The file URL field changed from `file.url` to `file.ufsUrl`. The `@prisma/adapter-mongodb` package doesn't exist in v7.

**10. AI Vision API Costs**
Both OpenAI GPT-4V and Google Gemini Vision have free tier limitations. A smart fallback system that generates reports from listing metadata ensures the feature works even without API credits, while clearly labeling demo reports.

### Architecture Learnings

**Separation of Concerns**
Keeping API routes thin (validation + auth check → call service → return response) makes code more maintainable. Business logic belongs in service functions, not route handlers.

**Optimistic UI Updates**
For actions like sending messages or updating booking status, updating the UI immediately (before API confirmation) provides a much better user experience than waiting for the server response.

**Soft Delete Pattern**
For bookings, using `deletedByOwner` and `deletedByRenter` flags instead of hard deletion allows both parties to independently remove records from their view while preserving the data until both sides delete. This is cleaner than tracking deletion state elsewhere.

**Type Safety with Mongoose Lean Queries**
`.lean()` in Mongoose returns plain JavaScript objects instead of Mongoose Documents, which is faster but loses TypeScript types. Explicit casting (`as unknown as MyType[]`) or creating lean-specific types solves this.

---

## 12. Phase-by-Phase Build Log

| Phase | Feature | Status |
|---|---|---|
| 1 | Project setup, MongoDB, Mongoose models | Complete |
| 2 | Authentication (email/password + Google OAuth) | Complete |
| 3 | Listings (CRUD, search, filters, image upload) | Complete |
| 4 | Rental booking system | Complete |
| 5 | AI vehicle inspection (Gemini Vision) | Complete |
| 6 | Stripe payments |  Skipped |
| 7 | Admin dashboard | Complete |
| 8 | Advanced search | Included in Phase 3 |
| 9 | User profile & settings | Complete |
| 10 | Reviews & ratings | Planned |
| 11 | Real-time chat (Pusher + polling) | Complete |
| 12 | Analytics dashboard | Complete |
| 13 | Responsive design overhaul | Complete |
| 14 | Animated landing page | Complete |

---

## 13. Known Limitations

| Issue | Description | Workaround |
|---|---|---|
| AI Inspection quota | Gemini free tier has 0 quota in some regions | Demo report fallback |
| Pusher free tier | 200k messages/day limit | Polling fallback every 3s |
| No payment processing | Phase 6 was skipped | Cash on delivery / in-person |
| No reviews system | Phase 10 not yet built | Planned |
| Email delivery | Gmail SMTP may be blocked | Use SendGrid SMTP |
| Slow filesystem | Project on network drive causes slow builds | Move to local SSD |
| Image optimization | `<img>` tags used in some places instead of Next.js `<Image>` | Minor performance impact |

---

## 14. Future Improvements

### Short Term
- [ ] **Phase 10** — Reviews & ratings for sellers and rentals
- [ ] **Favourites/Wishlist** — save listings to view later
- [ ] **Price history** — track how listing prices change over time
- [ ] **Verified seller badge** — admin can verify trusted sellers
- [ ] **Push notifications** — browser push for booking updates

### Medium Term
- [ ] **Stripe integration** — online payments with escrow for purchases
- [ ] **Vehicle history report** — integrate with external APIs for service records
- [ ] **Advanced filters** — year range slider, engine size, body type
- [ ] **Listing boost** — sellers pay to feature their listing
- [ ] **Bulk listing** — dealers can import multiple listings via CSV

### Long Term
- [ ] **Mobile app** — React Native version
- [ ] **Video inspection** — AI analysis of video walkthroughs
- [ ] **Dealer accounts** — special account type for car dealerships
- [ ] **Insurance integration** — get insurance quotes from listing page
- [ ] **Financing calculator** — EMI calculator for purchases

---

## 15. Credits & Tools

### Built with
- [Next.js](https://nextjs.org) — React framework
- [MongoDB Atlas](https://www.mongodb.com/atlas) — Database
- [NextAuth.js](https://authjs.dev) — Authentication
- [UploadThing](https://uploadthing.com) — File uploads
- [Pusher](https://pusher.com) — Real-time messaging
- [Google Gemini](https://ai.google.dev) — AI vision inspection
- [Recharts](https://recharts.org) — Analytics charts
- [Nodemailer](https://nodemailer.com) — Email notifications
- [Tailwind CSS](https://tailwindcss.com) — Styling
- [Mongoose](https://mongoosejs.com) — MongoDB ODM

### Development Tools
- VS Code — Editor
- MongoDB Compass — Database GUI
- Postman — API testing
- Vercel — Deployment

---

## Appendix — Common Commands

```bash
# Development
npm run dev              # Start dev server on :3000
npm run build            # Production build
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run make-admin       # Promote ADMIN_EMAIL to admin role

# Make admin via API (one-time)
curl -X POST http://localhost:3000/api/admin/make-admin \
  -H "Content-Type: application/json" \
  -d '{"secret":"YOUR_ADMIN_SECRET","email":"your@email.com"}'
```
 

*Documentation last updated: May 2026* 