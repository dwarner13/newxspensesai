# Phase M2 — Prime Owns Main Dashboard CTA ✅

## Goal
Main Dashboard primary CTA must come from `primeState.suggestedNextAction`. Remove dashboard's local decision logic (or bypass it), but keep fallback for safety.

---

## Files Changed

### 1. `src/components/dashboard/sections/OverviewSection.tsx`
**Change**: Integrated Prime-driven CTA rendering
- Imported `usePrimeState()` hook
- Primary CTA now uses `primeState.suggestedNextAction` if available
- Fallback to existing CTA buttons if Prime state is null
- Secondary buttons remain unchanged

### 2. `netlify/functions/prime-state.ts`
**Change**: Enhanced `buildSuggestedNextAction` with icons and improved routes
- Added `icon` field to all suggested actions
- Updated route for import action to include `?auto=upload` query param
- Updated analytics CTA text to match existing UI

---

## Code Diffs

### A) OverviewSection — Prime Integration
```diff
+ import { usePrimeState } from '../../../contexts/PrimeContext';

  export const OverviewSection: React.FC<OverviewSectionProps> = ({
    // ...
  }) => {
    const navigate = useNavigate();
    const { user, profile, firstName } = useAuth();
    const { openChat } = useUnifiedChatLauncher();
+   const primeState = usePrimeState(); // Get Prime state for suggested next action

    // ...

    {/* CTA BUTTON ROW */}
    <div className="flex flex-wrap gap-4">
-     {/* Primary: Open Prime Chat */}
-     <button
-       type="button"
-       className={getButtonClasses(true)}
-       onClick={() => openChat({ initialEmployeeSlug: 'prime-boss' })}
-     >
-       <span className={getIconCircleClasses(true)}>
-         👑
-       </span>
-       <span className="tracking-tight">Open Prime Chat</span>
-     </button>
-
-     {/* Primary: Upload Receipt/Statement */}
-     <button
-       type="button"
-       className={getButtonClasses(false)}
-       onClick={() => navigate('/dashboard/smart-import-ai?auto=upload')}
-     >
-       <span className={getIconCircleClasses(false)}>
-         📤
-       </span>
-       <span className="tracking-tight">Upload Receipt/Statement</span>
-     </button>
+     {/* Primary CTA: Prime-driven suggested next action (if available) */}
+     {primeState?.suggestedNextAction ? (
+       <button
+         type="button"
+         className={getButtonClasses(true)}
+         onClick={() => navigate(primeState.suggestedNextAction!.route)}
+       >
+         <span className={getIconCircleClasses(true)}>
+           {primeState.suggestedNextAction.icon || '🎯'}
+         </span>
+         <span className="tracking-tight">{primeState.suggestedNextAction.ctaText}</span>
+       </button>
+     ) : (
+       // Fallback: Default primary CTA (existing behavior)
+       <>
+         {/* Primary: Open Prime Chat */}
+         <button
+           type="button"
+           className={getButtonClasses(true)}
+           onClick={() => openChat({ initialEmployeeSlug: 'prime-boss' })}
+         >
+           <span className={getIconCircleClasses(true)}>
+             👑
+           </span>
+           <span className="tracking-tight">Open Prime Chat</span>
+         </button>
+
+         {/* Primary: Upload Receipt/Statement */}
+         <button
+           type="button"
+           className={getButtonClasses(false)}
+           onClick={() => navigate('/dashboard/smart-import-ai?auto=upload')}
+         >
+           <span className={getIconCircleClasses(false)}>
+             📤
+           </span>
+           <span className="tracking-tight">Upload Receipt/Statement</span>
+         </button>
+       </>
+     )}

      {/* Secondary buttons remain unchanged */}
```

### B) prime-state.ts — Enhanced Suggested Actions
```diff
  function buildSuggestedNextAction(
    financialSnapshot: any,
    currentStage: UserStage
  ): SuggestedNextAction | null {
    if (!financialSnapshot.hasTransactions) {
      return {
        id: 'import-documents',
        type: 'import',
        title: 'Upload Receipt/Statement',
        description: 'Get started by uploading your first bank statement or receipt',
-       ctaText: 'Upload Documents',
-       route: '/dashboard/smart-import-ai',
+       ctaText: 'Upload Receipt/Statement',
+       route: '/dashboard/smart-import-ai?auto=upload',
        priority: 'high',
+       icon: '📤',
      };
    }

    if (financialSnapshot.uncategorizedCount > 0) {
      return {
        id: 'categorize-transactions',
        type: 'categorize',
        title: 'Categorize Transactions',
        description: `${financialSnapshot.uncategorizedCount} transactions need categorization`,
        ctaText: 'Categorize Now',
        route: '/dashboard/smart-categories',
        priority: 'medium',
+       icon: '🏷️',
      };
    }

    return {
      id: 'view-analytics',
      type: 'analyze',
      title: 'View Analytics',
      description: 'Explore your spending patterns and insights',
-     ctaText: 'View Analytics',
+     ctaText: 'Show my top insights',
      route: '/dashboard/analytics',
      priority: 'low',
+     icon: '📊',
    };
  }
```

---

## Decision Logic Locations

### Old Dashboard Decision Logic (Now Bypassed)
**File**: `src/components/dashboard/sections/OverviewSection.tsx`
- **Lines 144-192**: Hardcoded CTA buttons with fixed routes
- **Status**: Bypassed when `primeState.suggestedNextAction` exists
- **Fallback**: Still renders if Prime state is null (fail-open)

### Prime Decision Logic (New Owner)
**File**: `netlify/functions/prime-state.ts`
- **Lines 248-286**: `buildSuggestedNextAction()` function
- **Rules**:
  1. If `!hasTransactions` → Import action (`/dashboard/smart-import-ai?auto=upload`)
  2. Else if `uncategorizedCount > 0` → Categorize action (`/dashboard/smart-categories`)
  3. Else → Analytics action (`/dashboard/analytics`)

---

## Suggested Action Shape

```typescript
interface SuggestedNextAction {
  id: string;                    // e.g., 'import-documents'
  type: 'import' | 'categorize' | 'analyze' | 'onboarding' | 'goal' | 'chat';
  title: string;                  // e.g., 'Upload Receipt/Statement'
  description: string;            // e.g., 'Get started by uploading...'
  ctaText: string;                // Button label, e.g., 'Upload Receipt/Statement'
  route: string;                  // e.g., '/dashboard/smart-import-ai?auto=upload'
  priority: 'low' | 'medium' | 'high';
  icon?: string;                  // Emoji icon, e.g., '📤'
}
```

---

## Verification Steps

### Test A: New User (No Transactions)
**Steps:**
1. Create new user account (or clear transactions)
2. Load main dashboard (`/dashboard`)
3. **Verify**: Primary CTA shows "Upload Receipt/Statement" with 📤 icon
4. **Verify**: Clicking navigates to `/dashboard/smart-import-ai?auto=upload`
5. **Verify**: Button has Prime glow styling (amber border)

**Expected**: ✅ CTA goes to Smart Import

---

### Test B: Has Uncategorized Transactions
**Steps:**
1. Ensure user has transactions but some are uncategorized
2. Load main dashboard
3. **Verify**: Primary CTA shows "Categorize Now" with 🏷️ icon
4. **Verify**: Description shows count: "X transactions need categorization"
5. **Verify**: Clicking navigates to `/dashboard/smart-categories`

**Expected**: ✅ CTA goes to Smart Categories

---

### Test C: Normal State (All Categorized)
**Steps:**
1. Ensure user has transactions and all are categorized
2. Load main dashboard
3. **Verify**: Primary CTA shows "Show my top insights" with 📊 icon
4. **Verify**: Clicking navigates to `/dashboard/analytics`

**Expected**: ✅ CTA goes to Analytics AI

---

### Test D: Prime Endpoint Down (Fail-Open)
**Steps:**
1. Simulate Prime endpoint failure (network error or 500)
2. Load main dashboard
3. **Verify**: Dashboard still renders (no crash)
4. **Verify**: Fallback CTA buttons appear (Open Prime Chat + Upload Receipt/Statement)
5. **Verify**: Secondary buttons still work

**Expected**: ✅ Dashboard shows old CTA (fail-open behavior)

---

## CTA Output Per Scenario

### Scenario 1: New User (No Transactions)
**Primary CTA:**
- **Icon**: 📤
- **Text**: "Upload Receipt/Statement"
- **Route**: `/dashboard/smart-import-ai?auto=upload`
- **Styling**: Prime glow (amber border, shadow)

**Secondary CTAs:**
- Review my latest imports → `/dashboard/smart-import-ai`
- Show my top insights → `/dashboard/analytics`

---

### Scenario 2: Has Uncategorized Transactions
**Primary CTA:**
- **Icon**: 🏷️
- **Text**: "Categorize Now"
- **Route**: `/dashboard/smart-categories`
- **Styling**: Prime glow (amber border, shadow)

**Secondary CTAs:**
- Review my latest imports → `/dashboard/smart-import-ai`
- Show my top insights → `/dashboard/analytics`

---

### Scenario 3: Normal State (All Categorized)
**Primary CTA:**
- **Icon**: 📊
- **Text**: "Show my top insights"
- **Route**: `/dashboard/analytics`
- **Styling**: Prime glow (amber border, shadow)

**Secondary CTAs:**
- Review my latest imports → `/dashboard/smart-import-ai`
- Show my top insights → `/dashboard/analytics` (duplicate, but secondary)

---

### Scenario 4: Prime Endpoint Down
**Primary CTAs (Fallback):**
- Open Prime Chat → Opens Prime chat slideout
- Upload Receipt/Statement → `/dashboard/smart-import-ai?auto=upload`

**Secondary CTAs:**
- Review my latest imports → `/dashboard/smart-import-ai`
- Show my top insights → `/dashboard/analytics`

---

## Technical Details

### Prime State Flow
1. `PrimeProvider` fetches state from `/.netlify/functions/prime-state`
2. `buildSuggestedNextAction()` determines action based on `FinancialSnapshot`
3. `OverviewSection` reads `primeState.suggestedNextAction` via `usePrimeState()`
4. Primary CTA renders using Prime's suggestion
5. Fallback renders if Prime state is null

### Fail-Open Behavior
- If `primeState` is `null`, component renders existing CTA buttons
- No errors thrown, no UI breakage
- Dashboard remains fully functional

### Route Mapping
- **Import**: `/dashboard/smart-import-ai?auto=upload`
- **Categorize**: `/dashboard/smart-categories`
- **Analytics**: `/dashboard/analytics`

---

**Status**: ✅ Prime Owns Main Dashboard CTA + Fail-Open Fallback



