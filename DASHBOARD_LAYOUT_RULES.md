# Dashboard Layout Rules

## ✅ ENFORCED RULE

**All `/dashboard/*` pages MUST use `DashboardPageShell` as the single source of truth for layout.**

## The Rule

1. **Single Wrapper**: All dashboard pages must use `DashboardPageShell` component
2. **No Top Spacing**: Pages may NOT add `mt-*`, `pt-*`, `py-*`, or `space-y-*` classes above the grid
3. **No Spacer Divs**: Pages may NOT add empty spacer divs like `<div className="h-10" />`
4. **Consistent Alignment**: The only place allowed to control the grid's top position is inside `DashboardPageShell` (which uses `pt-6`)

## Why This Rule Exists

Without this rule, pages drift vertically:
- Some pages add `mt-16 md:mt-20` (from old `DashboardSection`)
- Some pages add `mt-6` wrappers
- Some pages add empty spacer divs
- Result: Inconsistent vertical alignment across dashboard pages

## Implementation

### ✅ Correct Usage

```tsx
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';

export function MyDashboardPage() {
  return (
    <DashboardPageShell
      left={<MyLeftPanel />}
      center={<MyMainContent />}
      right={<MyActivityFeed />}
    />
  );
}
```

### ❌ Incorrect Usage

```tsx
// ❌ DON'T: Adding top spacing
<div className="mt-6">
  <DashboardPageShell ... />
</div>

// ❌ DON'T: Using DashboardSection wrapper
<DashboardSection>
  <DashboardPageShell ... />
</DashboardSection>

// ❌ DON'T: Adding spacer divs
<div className="h-10" />
<DashboardPageShell ... />

// ❌ DON'T: Using DashboardThreeColumnLayout directly
<DashboardThreeColumnLayout ... />
```

## Guardrails

`DashboardPageShell` includes a dev-only check that warns if it detects spacing drift:
- Checks parent elements for `mt-*` or `pt-*` classes
- Logs a console warning in development mode
- Does not block rendering (graceful degradation)

## Migration Checklist

When migrating a page to `DashboardPageShell`:

- [ ] Replace `DashboardSection` wrapper with `DashboardPageShell`
- [ ] Replace `DashboardThreeColumnLayout` with `DashboardPageShell` props
- [ ] Remove any `mt-*`, `pt-*`, `py-*`, `space-y-*` classes above the grid
- [ ] Remove empty spacer divs (`<div className="h-*" />`)
- [ ] Remove `section` wrappers with `mt-6` or `min-h-[520px]`
- [ ] Update imports to use `DashboardPageShell` only
- [ ] Verify the page aligns with Prime Chat's vertical position

## Files Using DashboardPageShell

All `/dashboard/*` pages should be migrated. See `src/pages/dashboard/*` for examples.

## Questions?

If you need to add spacing, ask:
1. Why does this page need different spacing than others?
2. Can the spacing be handled inside the content (not above the grid)?
3. Should this be a global change to `DashboardPageShell` instead?

