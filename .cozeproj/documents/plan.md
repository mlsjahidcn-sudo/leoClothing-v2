# UI/UX Enhancement Plan — Chengfeng International B2B Platform

## Overview

Enhance the existing B2B menswear wholesale platform with focused UI/UX improvements: visual polish (spacing, typography hierarchy, micro-interactions), navigation clarity, product browsing experience, and inquiry workflow. Platform: web. No new integrations needed.

## Technical Approach

| Dimension | Choice | Reason |
|-----------|--------|--------|
| Framework | Next.js 16 (App Router) | Existing codebase |
| Styling | Tailwind CSS 4 + custom CSS | Existing setup |
| Animation | CSS transitions + intersection observer | Lightweight, no extra deps |
| Components | shadcn/ui + custom | Existing setup |

## Current Pain Points & Enhancements

### 1. Navigation & Wayfinding
**Problem**: Navbar is minimal with no active state indication; no breadcrumbs on detail/inquiry pages; mobile menu lacks visual hierarchy.
**Enhancement**:
- Active link underline indicator in navbar (ochre accent)
- Breadcrumb component on product detail & inquiry pages
- Mobile menu: smoother slide animation + active state
- Sticky navbar with subtle backdrop-blur + shadow on scroll

### 2. Homepage Impact
**Problem**: Hero section feels static; trust bar data is plain text; "Why Choose Us" section is generic grid; no scroll-based reveal animations.
**Enhancement**:
- Hero: add subtle parallax or fade-in animation on load; refine typography scale (hero title larger, subtitle more spaced)
- Trust bar: each stat gets an icon (lucide: calendar, users, palette, building) + animated counter on scroll
- Why Choose Us: replace plain grid with icon-led cards (lucide icons: factory, shield, layers, zap) with hover lift effect
- Featured products: add staggered fade-in on scroll (intersection observer)
- Section headings: add thin ocher underline accent for visual rhythm

### 3. Product Card & Grid
**Problem**: Cards are uniform with no visual hierarchy; no hover preview; MOQ badge is small.
**Enhancement**:
- Product image: smooth scale + slight brightness shift on hover (transition 300ms)
- MOQ badge: move to top-left corner, slightly larger with ocher background
- "From $X.XX/unit" price: make bolder, larger font
- Card: add subtle border on hover (ocher tint)
- Grid: stagger animation on filter change (fade + slide-up)

### 4. Product Detail Page
**Problem**: Long single-column layout; image gallery thumbnails are small; bulk pricing table is plain; inquiry form at bottom is easy to miss.
**Enhancement**:
- Sticky CTA bar at bottom of viewport on mobile ("Request Quote" fixed button)
- Image gallery: larger thumbnails with active state ring; click-to-zoom modal for main image
- Bulk pricing table: highlight best-value tier with ocher background row
- Inquiry form: add a floating "Quick Inquiry" button that scrolls to form
- Material/spec cards: add subtle icons (scissors for fabric, shirt for lining, sparkles for craft)
- Size selector: active size button gets ocher ring animation
- Breadcrumb navigation at top

### 5. Inquiry Page
**Problem**: Long form with no visual breaks; no progress indication; product selector is a basic dropdown.
**Enhancement**:
- Multi-step form with progress bar (Step 1: Company Info → Step 2: Product Selection → Step 3: Requirements → Step 4: Confirmation)
- Product selector: change to searchable grid with mini product cards (image + name + price) with checkmarks
- Form fields: floating labels + focus ring in ocher color
- Summary card at final step showing selected products and quantities
- Success state: animated checkmark + "We'll respond within 24 hours" message

### 6. About Page
**Problem**: Dense text blocks; certifications are plain text; no visual storytelling.
**Enhancement**:
- Factory stats: animated counter on scroll (same component as homepage trust bar)
- Certifications: styled badge cards with logo-style icons instead of plain text
- Trade terms: clean comparison table instead of paragraph format
- Timeline: sampling process shown as visual timeline (horizontal steps with icons) instead of text list
- Quality control: step-by-step visual process with numbered circles

### 7. Global Micro-interactions & Polish
**Enhancement**:
- Page load: subtle fade-in for main content (already partially exists, ensure consistency)
- Buttons: all CTA buttons get hover scale (1.02) + shadow transition
- Links: ocher underline animation on hover (expand from center)
- Scroll: smooth section reveal animations via intersection observer (fade-in-up)
- Form inputs: consistent focus ring (ocher/30) across all pages
- Loading states: skeleton shimmer for product cards on filter change
- Toast notification component for form submissions

### 8. Footer
**Problem**: Dense multi-column layout; certifications not visually distinct.
**Enhancement**:
- Add certification badge row above footer (BSCI, OEKO-TEX, ISO 9001 as styled pills)
- Simplify to 3 columns max: Quick Links / Contact / Trade Info
- Add newsletter/email subscription field for B2B updates

## Feature Modules

### Breadcrumb Component
- Path: `src/components/Breadcrumb.tsx`
- Props: `items: {label: string, href?: string}[]`
- Last item is current page (no link), ocher color

### ScrollReveal Wrapper
- Path: `src/components/ScrollReveal.tsx`
- Client component using IntersectionObserver
- Fade-in-up animation, configurable delay for stagger effects

### AnimatedCounter Component
- Path: `src/components/AnimatedCounter.tsx`
- Props: `target: number, suffix?: string, prefix?: string`
- Counts up when element enters viewport

### MultiStepInquiryForm
- Refactor `src/app/inquiry/page.tsx` to 4-step wizard
- Step indicator bar at top
- Product selection grid with search

### ImageZoomModal
- Path: `src/components/ImageZoomModal.tsx`
- Full-screen overlay for product detail image zoom

## Has Prototype Design
Yes (design-canvas tool is enabled)

## Implementation Steps

1. **Prototype design** — Load design-canvas skill, design updated UI for all enhanced pages (homepage, product list, product detail, inquiry, about). Key files: `.cozeproj/prototype/web/`

2. **Global components: Breadcrumb, ScrollReveal, AnimatedCounter, ImageZoomModal** — Build reusable components shared across pages. Key files: `src/components/Breadcrumb.tsx`, `src/components/ScrollReveal.tsx`, `src/components/AnimatedCounter.tsx`, `src/components/ImageZoomModal.tsx`

3. **Navbar + Footer enhancement** — Active link indicator, backdrop-blur on scroll, mobile menu animation, certification badges in footer, simplified footer columns. Key files: `src/components/Navbar.tsx`, `src/components/Footer.tsx`

4. **Homepage visual upgrade** — Hero animation, trust bar with icons + animated counters, Why Choose Us icon cards, staggered product reveal, section heading underlines. Key files: `src/app/page.tsx`

5. **Product card & list page** — Hover effects, larger MOQ badge, stagger animation on filter, search bar on products page. Key files: `src/components/ProductCard.tsx`, `src/app/products/page.tsx`

6. **Product detail page overhaul** — Breadcrumb, image zoom modal, bulk pricing highlight, sticky mobile CTA, floating inquiry button, material icons, enhanced size selector. Key files: `src/app/products/[id]/page.tsx`, `src/components/SizeSelector.tsx`

7. **Inquiry page multi-step form** — 4-step wizard with progress bar, searchable product grid, floating labels, summary card, success animation. Key files: `src/app/inquiry/page.tsx`

8. **About page visual storytelling** — Animated counters, certification badge cards, visual timeline for sampling process, trade terms comparison table, QC process steps. Key files: `src/app/about/page.tsx`

## Page Specifications

##### @nav(web-topbar)
> type: topbar
> platform: web

- @page(/) Home
- @page(/products) Collections
- @page(/about) About
- @page(/inquiry) Inquiry (CTA button, ocher background)

##### @page(/) Home

**Core purpose**: Establish manufacturer credibility and drive wholesale inquiries
**Access path**: Navbar logo / direct
**Layout**: Navbar → Hero (full-bleed image + overlay text) → Trust Bar (4 stats with icons) → Product Lines (4 image-overlay cards) → Featured Products (staggered grid) → Why Choose Us (4 icon cards) → CTA Banner → Footer

**Interaction table**

| Element | Action | Response | Param | Note |
|---------|--------|----------|-------|------|
| Logo | Click | Navigate @page(/) | — | Navbar |
| Collections nav | Click | Navigate @page(/products) | — | Navbar, active state |
| About nav | Click | Navigate @page(/about) | — | Navbar |
| Get Quote CTA | Click | Navigate @page(/inquiry) | — | Navbar, ocher button |
| Product Line card | Click | Navigate @page(/products)?category=slug | category slug | — |
| Featured product card | Click | Navigate @page(/product-detail)?id=sku | product id | — |
| CTA Banner button | Click | Navigate @page(/inquiry) | — | Bottom section |

##### @page(/products) Collections

**Core purpose**: Browse and filter wholesale product catalog
**Access path**: Navbar / homepage category cards
**Layout**: Navbar → Filter bar (category tabs + search + sort) → Product grid (staggered cards) → Footer

**List item fields**: Product image / Product name / Category / MOQ badge / Starting price / Request Quote button

**Interaction table**

| Element | Action | Response | Param | Note |
|---------|--------|----------|-------|------|
| Category tab | Click | Filter grid, update URL param | category slug | Active state with ocher |
| Search input | Type | Filter by product name | — | Debounced 300ms |
| Sort dropdown | Select | Reorder grid | sort key | MOQ/price/name |
| Product card | Click | Navigate @page(/product-detail)?id=sku | product id | — |
| Request Quote | Click | Navigate @page(/inquiry) | — | Card-level CTA |

##### @page(/product-detail) Product Detail

**Core purpose**: View full product specs and initiate bulk inquiry
**Access path**: From product card click
**Layout**: Navbar → Breadcrumb → Two-column (images left, info right) → Bulk Pricing Table → Inquiry section → Related Products → Footer

**Interaction table**

| Element | Action | Response | Param | Note |
|---------|--------|----------|-------|------|
| Breadcrumb link | Click | Navigate to parent page | — | — |
| Main image | Click | Open @modal(image-zoom) | — | — |
| Thumbnail | Click | Swap main image | image index | Active ring state |
| Size button | Hover | Show measurement tooltip | — | — |
| Size button | Click | Select size, show @modal(size-chart) if first click | size label | Ocher ring on selected |
| Color swatch | Click | Select color variant | color hex | Ring indicator |
| Bulk pricing row | — | Best-value tier highlighted | — | Ocher background |
| Request Quote button | Click | Scroll to inquiry section or navigate @page(/inquiry) | product id | Sticky on mobile |
| Related product | Click | Navigate @page(/product-detail)?id=sku | product id | — |

**Modal image-zoom**:
- Full-screen overlay with dark backdrop
- Zoomed product image centered
- Pinch-to-zoom on touch devices
- Close button (X) top-right

**Modal size-chart**:
- Size chart table overlay
- Close button top-right
- Click outside to dismiss

##### @page(/inquiry) Bulk Inquiry

**Core purpose**: Submit wholesale order inquiry with product and quantity details
**Access path**: Navbar CTA / product detail page / homepage CTA
**Layout**: Navbar → Progress bar (4 steps) → Step content → Footer

**Interaction table**

| Element | Action | Response | Param | Note |
|---------|--------|----------|-------|------|
| Step 1 Next | Click | Validate, advance to Step 2 | — | Company info required |
| Step 2 product card | Click | Toggle product selection | product id | Checkmark overlay |
| Step 2 search | Type | Filter product grid | — | — |
| Step 2 Next | Click | Advance to Step 3 | — | At least 1 product required |
| Step 3 quantity input | Type | Update quantity for product | — | Min = MOQ |
| Step 3 Next | Click | Advance to Step 4 | — | — |
| Step 4 Submit | Click | Submit inquiry, show success | — | Animated checkmark |
| Step Back | Click | Return to previous step | — | Preserve data |

##### @page(/about) About Us

**Core purpose**: Showcase manufacturer capabilities, certifications, and trade credentials
**Access path**: Navbar
**Layout**: Navbar → Hero image → Brand Story → Key Figures (4 animated counters) → Certifications (badge cards) → Sampling Timeline → Trade Terms table → Quality Control steps → Contact → Footer

**Interaction table**

| Element | Action | Response | Param | Note |
|---------|--------|----------|-------|------|
| CTA button | Click | Navigate @page(/inquiry) | — | Multiple CTAs on page |
| Certification card | Hover | Slight lift + shadow | — | — |
