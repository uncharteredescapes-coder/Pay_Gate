# Implementation Plan: Move Reusable Gate UI Components into `@paygate/ui`

## 1. Objective
Relocate all design system primitives, composite components, and shared layout elements into `packages/ui` so that `apps/checkout`, `apps/merchant`, and `apps/admin` can consume them directly as a shared package, while maintaining backward-compatible re-exports in `src/components/gate-ui` and `src/components/layout` to prevent breaking existing application code.

---

## 2. Component Migration Architecture

### A. Primitives (`packages/ui/src/primitives/`)
1. **`GateButton.tsx`**: Standard button supporting `primary`, `secondary`, `ghost`, `danger`, loading spinner state, and icon prefixes.
2. **`GateInput.tsx`**: 44px touch-target form input with label, prefix/suffix, clear button, and error state.
3. **`StatusChip.tsx`**: State status badge (`paid`, `awaiting_payment`, `confirming`, `needs_review`, `expired`, `cancelled`, `active`, `draining`, `disabled`).
4. **`ReferenceChip.tsx`**: 8-character mono reference code badge with one-tap clipboard copy and tooltip feedback.
5. **`ProviderBadge.tsx`**: Official brand color badges and provider icons for `bkash`, `nagad`, `rocket`, `upay`, and `cellfin`.
6. **`StatCard.tsx`**: Tabular KPI metric display card with title, value, change indicator, and tooltip.
7. **`GateSkeletonLoader.tsx`**: Loading skeleton placeholders (`GateTableSkeleton`, `GateStatCardSkeleton`, `GateCardSkeleton`).
8. **`GateEmptyState.tsx`**: Zero-data illustration container with action CTA.
9. **`GateLoadingScreen.tsx`**: Full-screen and card loading overlays with pulse animations.

### B. Composite Components (`packages/ui/src/composite/`)
1. **`CommandPalette.tsx`**: Global fuzzy search overlay (`⌘K`) for payments, orders, wallets, and quick actions.
2. **`PaymentDrawer.tsx`**: Slide-over payment transaction inspector with lifecycle timeline and raw SMS audit evidence.

### C. Layout Elements (`packages/ui/src/layout/`)
1. **`TopNavbar.tsx`**: Universal portal header with role switcher, breadcrumb context, search trigger, and language toggle.
2. **`CollapsibleSidebar.tsx`**: Responsive navigation sidebar with expanded (240px) and collapsed (64px) desktop states.
3. **`MobileBottomNav.tsx`**: 56px touch-optimized mobile navigation bar.

---

## 3. Package Structure & Barrel Exports (`packages/ui`)

```
packages/ui/
├── package.json
└── src/
    ├── tokens.json
    ├── primitives/
    │   ├── GateButton.tsx
    │   ├── GateInput.tsx
    │   ├── StatusChip.tsx
    │   ├── ReferenceChip.tsx
    │   ├── ProviderBadge.tsx
    │   ├── StatCard.tsx
    │   ├── GateSkeletonLoader.tsx
    │   ├── GateEmptyState.tsx
    │   └── GateLoadingScreen.tsx
    ├── composite/
    │   ├── CommandPalette.tsx
    │   └── PaymentDrawer.tsx
    ├── layout/
    │   ├── TopNavbar.tsx
    │   ├── CollapsibleSidebar.tsx
    │   └── MobileBottomNav.tsx
    └── index.ts
```

---

## 4. Backward Compatibility Strategy

To ensure zero regressions across existing merchant and admin views:
1. `src/components/gate-ui/*` files will re-export their counterparts from `@paygate/ui`.
2. `src/components/layout/*` files will re-export their counterparts from `@paygate/ui`.
3. Path alias `@paygate/ui` is already active in `tsconfig.json` and `vite.config.ts`.

---

## 5. Verification & Testing

1. **Type Checking**: Run `npm run lint` (`tsc --noEmit`) to verify zero type mismatches or broken module paths.
2. **Domain Tests**: Run `npm test` (`tsx scripts/run-tests.ts`) to ensure domain logic remains unaffected.
3. **Production Builds**:
   - `npm run build:checkout`
   - `npm run build:merchant`
   - `npm run build:admin`
   - `compile_applet` to confirm overall workspace compilation.
