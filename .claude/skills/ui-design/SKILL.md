---
name: ui-design
description: AutoGO's UI/UX design rules (simple, clean, minimal, professional; Stripe/Vercel-like, never "AI-generated" looking). Use before building or changing any page, component, layout, colour, typography, spacing, animation or loading/empty/error state in this app, and when asked to review or improve the UI.
---

# AutoGO UI design

Design less, design better. Every element must earn its place by making the page clearer or easier to use. If it
only decorates, remove it. Never add decoration just to look "modern".

The palette and theme details live in CLAUDE.md (Conventions → Palette rules, Light/dark theme) and win where they
are more specific.

## Before changing anything

1. Look at the existing page and its components first (screenshot it: a throwaway `e2e/zz-*.spec.ts` against the
   browser-test build, deleted afterwards). Reuse what is there: `components/ui/*`, `components/admin/ui.tsx`,
   `StatusText`, `MenuGroupTitle`, `PageSkeleton` blocks, `ConfirmDialog`, `Tip`, `toast`.
2. Name the actual problem (inconsistency, clutter, weak hierarchy, a phone issue). Don't redesign something only to
   change it, and don't rewrite working code for looks alone.
3. UI work never changes APIs, database schemas, auth or business logic, and adds no dependency, unless asked.

## Colour

- White and light-grey surfaces, `slate-900` text and primary buttons, **one accent: solid indigo**. Amber means
  plans and premium (gold buttons `theme-static bg-amber-400`). Status colours only for status: emerald done or ok,
  amber warning, rose error or overdue, sky info.
- No gradients (buttons, badges, bars, dots, rings, text), no purple, fuchsia or violet, no glow blobs or radial
  glows, no coloured shadows, no glassmorphism. Kept on purpose: the home hero's background, the logo, photo
  overlays.
- Use the theme tokens so light and dark both work: Tailwind neutrals (they invert) or `var(--gh-…)` inline, never
  raw hex. `bg-slate-950` and `theme-static` stay dark in both themes, so use them only for things dark by design.
- Contrast: body text `slate-600` or darker on white; never put information in `slate-300`/`400` alone.

## Typography

- Three weights: `font-medium` (labels), `font-semibold` (buttons, card titles), `font-bold` (page and section
  headings, key numbers). No `font-black`; `font-extrabold` only for one hero number per screen.
- Sizes: page title `text-2xl`/`sm:text-3xl`, section `text-lg`, card title `text-[15px]`/`text-sm`, body
  `text-sm`, secondary `text-[13px]`, meta `text-xs`/`text-[11px]`. **Nothing below 10px** (and 11px for anything
  people must read).
- Uppercase letter-spaced labels only for small group headings (`MenuGroupTitle`) and table headers, not as
  decorative eyebrows above every heading.

## Shape, borders, shadows

- Radius scale: `rounded-lg` for controls (buttons, inputs, chips, small tiles), `rounded-xl` for cards and panels,
  `rounded-2xl` only for large page-level cards and dialogs, `rounded-full` for avatars, dots and pills. No
  arbitrary radii (`rounded-[22px]`); nested corners get a smaller radius than their parent.
- Borders, not shadows: cards are `border border-slate-200` (or `ring-1 ring-slate-200/80`) with at most
  `shadow-sm`; hover `hover:shadow-md` or a border colour change; `shadow-lg` only for what floats (menus, dialogs,
  toasts, sticky bars).
- Shadow colours are `shadow-black/…` only: neutrals invert in dark mode, so `shadow-slate-900/…` turned into a pale glow there.
- No tinted pills on text (statuses are coloured text with a dot), no icons in tinted tiles.

## Layout and content

- Mobile first, then `sm`/`lg`. No horizontal overflow (grids get `grid-cols-1` below their breakpoint). Touch
  targets at least 40px high; sticky bottom bars set `--am-bottom-bar`.
- Consistent spacing (4px scale: `gap-2/3/4`, sections `space-y-5`/`8`), clear alignment, one main action per card,
  the rest small icon buttons or a More tray (see CLAUDE.md "Compact cards").
- No empty hero sections, no repeated card walls without a reason, no decorative icons beside every line.
- Words: short, concrete, action first ("Book now", "Mark returned"); explain unusual terms with `Tip`.

## States

Every screen has them: loading (`loading.tsx` shaped like the page, `PageSkeleton` blocks, `PhotoSkeleton`),
empty (says what to do next, one button), error (what happened and how to retry), success (`toast` or an inline
confirmation). Forms: visible labels, inline errors in plain words, disabled submit while sending, `useRateLock` for
limited actions, `useFormDraft` for long forms.

## Motion

Only when it helps: short transitions (150–300 ms) for opening menus, dialogs and toasts, and state changes. No
looping decorative animation (pulsing, ping, wiggling icons, shimmer). The one exception, asked for by the owner, is the shimmer on the phone menu's Marketplace row. Respect `prefers-reduced-motion`.
`animate-pulse` is for loading placeholders only.

## Accessibility

Semantic elements (`button` for actions, `a`/`Link` for navigation, headings in order), `aria-label` on icon-only
buttons, visible focus rings, keyboard reachable menus and dialogs (Radix), `aria-current` for the current page.

## Quality check before finishing

1. Simple and clean? 2. Clear hierarchy? 3. Spacing and alignment consistent? 4. Colours and type from the rules
above? 5. Anything unnecessary left? 6. Checked on a 360px phone and in dark mode (screenshots)? 7. Intuitive?
8. Looks designed by a person, not generated? Then run `npx tsc --noEmit`, `npm run lint` (4-error baseline) and
the browser tests for the pages touched.
