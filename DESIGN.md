# Gate UI Design System Specification (DESIGN.md)

**Product**: PayGate Platform — Bangladeshi Merchant MFS Payment Gateway SaaS  
**Version**: 3.1  
**Design System**: Gate UI Design System  
**Date**: 13 October 2026  
**Status**: Production Design Constitution & Component Specifications  

---

## 1. Design Philosophy & Constitution

Gate UI is the unified, calm, precise design system engineered for the PayGate Merchant SaaS and its mobile client endpoints.

### Core Principles
1. **Calm, Precise, Fast**: A quiet neutral canvas (`#FAFAF9` light / `#0B0B0E` dark), hairlines instead of heavy drop shadows, and high-density tabular numerals.
2. **Domain-Native Authenticity**: Specifically crafted for Bangladeshi commerce—incorporating native **bKash**, **Nagad**, and **Rocket** branding with subtle brand dots rather than garish full-fill pills.
3. **Typography-First Clarity**: Pairing crisp geometric sans (`Inter`) with tabular monospace (`JetBrains Mono`) and native bilingual typography (`Noto Sans Bengali` with +10% line-height compensation).
4. **Zero-Pill Discipline & Anti-Slop Rules**: No static pill badges on metadata, no decorative pulsing dots on static text, no fake scorecards, and zero dead clicks.
5. **Purposeful Motion**: Motion is applied strictly where states change (payment verified checkmark, live pulse during verification, drawer slide-overs).

---

## 2. Complete Token Architecture

Gate UI tokens are centralized in `src/tokens.json` and generated into CSS variables and Tailwind utilities.

### 2.1 Theme Palette (Light & Dark Parity)

| Token | Light Value | Dark Value | Purpose / Usage | Contrast Ratio |
| :--- | :--- | :--- | :--- | :--- |
| `--bg` | `#FAFAF9` | `#0B0B0E` | Master application background | Canvas base |
| `--surface` | `#FFFFFF` | `#141418` | Primary cards, modals, table surfaces | Elevated canvas |
| `--surface-2` | `#F4F4F2` | `#1C1C22` | Inputs, table headers, hover highlights | Interactive surface |
| `--border` | `#E7E7E3` | `#2A2A31` | 1px hairline structural dividers | Hairline division |
| `--ink` | `#0E0E11` | `#F5F5F7` | Primary text, primary CTA button fill | $\ge 14:1$ (AAA) |
| `--ink-2` | `#55555E` | `#A4A4AE` | Secondary labels, descriptions | $\ge 5.8:1$ (AA) |
| `--ink-3` | `#8A8A94` | `#6F6F7A` | Placeholder text, captions, timestamps | $\ge 4.5:1$ (AA) |
| `--accent` | `#5B5BF0` | `#8B8BFF` | Links, active tab bars, focus rings | $\ge 4.6:1$ (AA) |
| `--accent-soft`| `#EEEEFF` | `#23234A` | Reference chip background, active tab pill | Subtle highlight |
| `--success` | `#12B76A` | `#32D583` | Verified payment, online status, KYB badge | Semantic green |
| `--warning` | `#F79009` | `#FDB022` | Needs review, limit warnings, pending payouts | Semantic amber |
| `--danger` | `#F04438` | `#F97066` | Rejected, expired, error alerts | Semantic red |

### 2.2 Provider Brand Accents
Provider brand colors are restricted strictly to indicator dots and subtle highlights (never full background button fills):
- **bKash**: `#E2136E` (dot indicator on white or neutral surface)
- **Nagad**: `#F6921E` (dot indicator on white or neutral surface)
- **Rocket**: `#8C3494` (dot indicator on white or neutral surface)

### 2.3 60-30-10 Color Discipline
- **60% Neutral Canvas**: `#FAFAF9` (light) / `#0B0B0E` (dark) background fields.
- **30% Structural Surfaces**: White/dark slate cards, 1px hairline dividers, and muted neutral typography.
- **10% Accent Budget**: High-intent `#5B5BF0` concentrated exclusively at primary action points (CTAs, the 8-character reference chip, and focused inputs).

---

## 3. Typographic System & Bilingual Rules

Gate UI strictly enforces the **2+1 Font Rule**:

### 3.1 Font Families
1. **Primary UI Sans**: `Inter`
   - Geometric, neutral sans-serif used across all navigation, buttons, titles, and body prose.
2. **Bengali Native Typography**: `Noto Sans Bengali`
   - Automatically loaded when the language toggle is set to `বাংলা` (`.lang-bn` / `[lang="bn"]`).
   - Line-height increased by **+10%** (`line-height: 1.65`) to ensure complex glyph conjuncts, vowel matras, and diacritics are never clipped.
3. **Data & Telemetry Monospace**: `JetBrains Mono` with `tabular-nums`
   - Strictly enforced on all:
     - Transaction IDs (`TrxID`)
     - 8-Character payment references (`K7M4X2QH`)
     - Monetary amounts in Taka (`Tk 1,200.00`)
     - API Keys & HMAC signatures
     - Timestamps and order IDs

### 3.2 Type Scale

| Level | Size / Line Height | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | $32\text{px} / 40\text{px}$ | Bold (700) | `-0.02em` | Hero amounts, high-impact totals |
| **H1** | $24\text{px} / 32\text{px}$ | SemiBold (600) | `-0.015em` | Page titles, major modal headers |
| **H2** | $20\text{px} / 28\text{px}$ | SemiBold (600) | `-0.01em` | Section headers |
| **H3** | $16\text{px} / 24\text{px}$ | Medium (500) | `0` | Card titles, group dividers |
| **Body** | $14\text{px} / 22\text{px}$ | Regular (400) | `0` | Standard UI prose ($15\text{px}$–$16\text{px}$ on mobile) |
| **Caption** | $12\text{px} / 16\text{px}$ | Medium (500) | `+0.01em` | Metadata, helper labels, table headers |
| **Mono** | $13\text{px} / 20\text{px}$ | Medium (500) | `+0.02em` | Code, TrxID, references, tabular figures |

---

## 4. Spatial Math, Grid, Radii, and Depth

### 4.1 4-Point Spatial Grid
- Base spacing units: $4\text{px}, 8\text{px}, 12\text{px}, 16\text{px}, 24\text{px}, 32\text{px}, 48\text{px}, 64\text{px}$.
- Container outer padding is always $\ge$ inner child gap (minimum container padding $16\text{px}$).

### 4.2 Radii Hierarchy
- **Inputs & Chips**: $8\text{px}$ (`rounded-lg`)
- **Buttons**: $10\text{px}$–$12\text{px}$ (`rounded-xl`)
- **Card Containers**: $16\text{px}$ (`rounded-2xl`)
- **Sheets & Large Drawers**: $24\text{px}$ (`rounded-3xl`)
- **Status Pills**: $9999\text{px}$ (`rounded-full`)

### 4.3 Nested Radius Formula
To prevent visual corner distortion, inner nested elements strictly satisfy:
$$r_{\text{inner}} = r_{\text{outer}} - \text{padding}$$

*Example: A card with $r_{\text{outer}} = 16\text{px}$ and $8\text{px}$ padding contains inner child boxes with $r_{\text{inner}} = 8\text{px}$.*

### 4.4 Elevation & Depth
- **Single-Elevation Depth**: Surfaces remain flat with subtle $1\text{px}$ hairline borders (`#E7E7E3` / `#2A2A31`).
- Heavy, muddy drop shadows are prohibited; subtle ambient diffusion (`shadow-xs` / `shadow-sm`) is allowed only on floating modals and dropdowns.

---

## 5. Component Specifications

### 5.1 GateButton
- **Variants**:
  - `primary`: `--ink` background with `--bg` text (dark ink fill).
  - `secondary`: `--surface` background with $1\text{px}$ `--border` and `--ink` text.
  - `ghost`: Transparent background, subtle hover highlight.
  - `danger`: `--danger` fill with white text.
- **Heights**: $40\text{px}$ (desktop baseline), $48\text{px}$ (mobile primary touch targets).
- **Loading State**: Displays spinner while preserving exact button width to prevent layout jitter.

### 5.2 GateInput
- **Height**: $44\text{px}$ baseline ($48\text{px}$ on mobile touch).
- **Surface**: `--surface-2` fill with $1\text{px}$ `--border`.
- **Focus Ring**: $2\text{px}$ `--accent` ring with $20\%$ alpha spread.
- **Monospace Mode**: Engages `JetBrains Mono` and tracking for TrxID, routing numbers, and references.
- **Validation**: Inline error text rendered directly below the input.

### 5.3 StatusChip
- **Shape**: Rounded pill (`rounded-full`) with a $6\text{px}$ solid dot and label.
- **States**: `Paid` (green), `Confirming` (accent pulse), `Awaiting Payment` (warning), `Needs Review` (warning), `Expired` (muted), `Cancelled` (danger), `Draining` (warning).
- **Accessibility Invariant**: Status is never communicated by color alone; always combines icon/dot with a legible text label.

### 5.4 ReferenceChip
- **Structure**: Mono text styled with `--accent-soft` background, $1\text{px}$ `--accent/30` border, and high-contrast `--accent` text.
- **Interactivity**: Equipped with a one-tap copy button with instant checkmark feedback.
- **Truncation Policy**: References are never truncated; they remain fully visible as an 8-character token.

### 5.5 StatCard
- **Layout**: Bento-grid card featuring a quiet caption, display value in `JetBrains Mono` tabular figures, and delta chip with directional arrow.
- **Separation**: Defined by clean $1\text{px}$ hairline borders rather than stacked card shadows.

### 5.6 DataTable & PaymentDrawer
- **DataTable**: Sticky header, $48\text{px}$ row height, monospace identifiers, and subtle row hover highlights.
- **Drawer**: Clicking any row slides a $480\text{px}$ right-hand drawer containing payment overview, vertical lifecycle timeline, fleet SMS evidence, and signed webhook delivery logs.

### 5.7 CommandPalette (⌘K)
- **Shortcut**: `⌘K` (Mac) / `Ctrl+K` (Windows/Linux) or top nav search click.
- **Fuzzy Search**: Instantly indexes payments, plans, wallets, devices, and orders with keyboard navigation (`↑`, `↓`, `Enter`, `Esc`).

### 5.8 PWA Components
- **PWAInstallButton**: Suppresses itself in standalone mode. Triggers native `beforeinstallprompt` on Android/Chrome and presents an iOS Safari guide modal on Apple devices.
- **OfflineIndicator**: Fixed amber banner alerting users when network connectivity drops.

---

## 6. Motion Guidelines & Latency Budgets

Motion is functional and state-driven, never ornamental.

### 6.1 Duration & Easing Budgets
- **Micro-interactions (Hover, Press)**: $100\text{ms}$–$150\text{ms}$.
- **State Changes (Tabs, Toggles)**: $200\text{ms}$.
- **Drawers & Modal Sheets**: $300\text{ms}$–$320\text{ms}$.
- **Standard Curve**: `cubic-bezier(0.2, 0.8, 0.2, 1)`.

### 6.2 State Animations
1. **Verifying State**: Concentric live pulse animation on the accent circle during the 90-second SMS matching window.
2. **Paid State**: Animated scale-in with checkmark drawing effect upon match confirmation.
3. **Compositor-Only Enforcement**: Animates exclusively `transform` and `opacity` to maintain 60 FPS / 120 FPS ProMotion performance. Never animates layout geometry (`width`, `height`, `margin`).
4. **Reduced Motion**: Strictly respects `@media (prefers-reduced-motion: reduce)` by disabling transitions and rendering target states immediately.

---

## 7. Accessibility Standards (WCAG 2.2 AA)

1. **Contrast Compliance**:
   - Primary text (`--ink`) achieves $>14:1$ on canvas.
   - Secondary text (`--ink-2`) achieves $>5.8:1$.
   - Interactive accent (`--accent`) achieves $>4.6:1$.
2. **Touch Target Dimensions**:
   - All interactive controls on mobile measure $\ge 44\text{px} \times 44\text{px}$.
3. **Visible Focus**:
   - All clickable elements feature high-visibility `:focus-visible` rings with $2\text{px}$ accent borders.
4. **Text Scaling**:
   - Flexible layouts scale up to $200\%$ zoom without clipping or overlapping adjacent controls.
5. **Screen Reader Labels**:
   - Copy buttons include explicit `aria-label="Copy payment reference"` attributes.
   - Live loading states announce progress via `aria-live="polite"`.

---

## 8. Viewport Governance & Mobile Responsiveness

### 8.1 15% Mobile Sticky Cap
The cumulative height of all fixed/sticky elements (top bar + mobile bottom navigation) never exceeds **15%** of the mobile viewport height ($<100\text{px}$ on standard devices).

### 8.2 Collapsible Sidebar vs. Mobile Bottom Navigation
- **Desktop ($\ge 768\text{px}$)**: Collapsible sidebar ($240\text{px} \leftrightarrow 64\text{px}$) with persistent iconography and live badges.
- **Mobile ($< 768\text{px}$)**: Navigation transitions to a fixed bottom navigation bar ($56\text{px}$ height) respecting iOS safe area insets (`env(safe-area-inset-bottom)`), while top navigation displays a compact searchbar and profile dropdown.

### 8.3 Mobile-First Hosted Checkout (360px Baseline)
- The checkout page is fully optimized for single-hand mobile use:
  - Wallet number and reference positioned with prominent one-tap copy buttons.
  - Large $48\text{px}$ "Confirm Payment" button.
  - Total asset bundle maintained under **150KB** for fast loading on 3G/4G networks in Bangladesh.
