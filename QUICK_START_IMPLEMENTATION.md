# ⚡ Quick Start – Implement Tag AI Integration (30 min)

## 5-Minute Overview

This guide gets you from zero to full Tag AI integration:

```
Chat + Tag AI + Event Broadcast + Smart Categories Dashboard
```

**What you'll have:**
- ✅ Users can categorize transactions via chat (`/categorize`)
- ✅ Toast notifications on all tabs (same-tab + cross-tab)
- ✅ One-click deep-link to Smart Categories dashboard
- ✅ Auto-refresh dashboard when corrections happen
- ✅ Full highlight + focus on specific transactions

---

## Step 1: Add ToastCenter (2 min)

### File: `src/App.tsx`

```tsx
import ToastCenter from "@/ui/feedback/ToastCenter";

export default function App() {
  return (
    <>
      <ToastCenter />  // ← Add this line
      <Router>
        <Routes>
          {/* ... routes ... */}
        </Routes>
      </Router>
    </>
  );
}
```

**Why:** Global toast notifications for all events (same-tab + cross-tab).

---

## Step 2: Wire Chat to Tag API (5 min)

### File: `netlify/functions/chat-v3-production.ts`

```typescript
import { createTagClient } from "@/ai/sdk/tagClient";

// Add this handler
if (intent === "categorize" || text?.startsWith("/categorize")) {
  // 1. Validate
  if (!context.selectedTxns?.length) {
    return replyErr("❌ No transactions selected. Choose items first.");
  }

  try {
    // 2. Categorize
    const tagClient = createTagClient(userId);
    const resp = await tagClient.categorize(
      context.selectedTxns.map(t => t.id)
    );

    if (!resp.ok) return replyErr(`Categorization failed: ${resp.error}`);

    // 3. Analyze & generate deep-link
    const lowConf = (resp.results || []).filter(r => r.confidence < 0.6);
    const firstLowTx = lowConf[0]?.transaction_id;
    const lowCount = lowConf.length;

    const deepLink = `/dashboard/smart-categories?filter=low${
      firstLowTx ? `&focusTx=${firstLowTx}` : ""
    }`;

    // 4. Emit events
    window.dispatchEvent(new CustomEvent("tag-categorize-done", {
      detail: { resultCount: resp.results?.length ?? 0, lowCount }
    }));
    localStorage.setItem("tag-categorize-done", JSON.stringify({
      t: Date.now(),
      resultCount: resp.results?.length ?? 0,
      lowCount
    }));

    // 5. Return response with button
    return replyOk({
      text: `✅ Categorized ${resp.results?.length} transactions. ${lowCount} need review.`,
      buttons: lowCount > 0
        ? [{ label: "📊 Review in Dashboard", url: deepLink }]
        : undefined
    });
  } catch (err) {
    return replyErr("Categorization failed. Try again.");
  }
}
```

**Why:** Chat is the user entry point; this handles `/categorize` command.

---

## Step 3: Update SmartCategories with Deep-Links (8 min)

### File: `src/pages/dashboard/SmartCategories.tsx`

```tsx
import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

export function SmartCategories() {
  const location = useLocation();
  const [rows, setRows] = useState<any[]>([]);
  const [historyTx, setHistoryTx] = useState<any>(null);

  // 1️⃣ Parse deep-link parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get("filter");     // "low" or null
    const focusTx = params.get("focusTx");   // transaction id

    if (filter === "low") {
      // Show low-confidence queue (your existing UI)
      setFilters(f => ({ ...f, showLowConfOnly: true }));
    }

    if (focusTx && rows.length > 0) {
      // Find and focus transaction
      const target = rows.find(r => r.id === focusTx);
      if (target) {
        setHistoryTx({ open: true, txId: target.id, merchant: target.merchant_name });

        // Scroll + highlight
        setTimeout(() => {
          const el = document.getElementById(`tx-${focusTx}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-2", "ring-blue-500");
            setTimeout(() => el.classList.remove("ring-2", "ring-blue-500"), 3000);
          }
        }, 100);
      }
    }
  }, [location.search, rows]);

  // 2️⃣ Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      console.log("[SmartCategories] Refreshing...");
      reload();         // Re-fetch table
      reloadMetrics();  // Re-fetch KPIs
    };

    window.addEventListener("smart-categories-refresh", handleRefresh);
    return () => window.removeEventListener("smart-categories-refresh", handleRefresh);
  }, [reload, reloadMetrics]);

  // ... rest of your existing component code ...
}
```

**Why:** Deep-links enable one-click navigation from chat to pre-filtered dashboard with focus on specific transaction.

---

## Step 4: Add Refresh Trigger to ToastCenter (3 min)

### File: `src/ui/feedback/ToastCenter.tsx` (Edit existing)

```tsx
// In the onCategorizeDone handler, add:
const onCategorizeDone = (e: Event) => {
  const { resultCount, lowCount } = (e as CustomEvent).detail;
  
  // Show toast
  add(`✅ Categorized ${resultCount} txns • ${lowCount} need review`);

  // ← ADD THIS:
  // Trigger refresh in any open SmartCategories tab
  window.dispatchEvent(new Event("smart-categories-refresh"));
};
```

**Why:** When categorization completes, notify all listeners (same-tab + cross-tab) to refresh data.

---

## Step 5: Optional – Add Correction Handler (5 min)

### File: `netlify/functions/chat-v3-production.ts`

```typescript
if (intent === "correct" || text?.startsWith("/correct")) {
  const [, txId, catId] = text.match(/\/correct\s+(\S+)\s+(\S+)/) || [];
  if (!txId || !catId) return replyErr("Usage: /correct <txId> <categoryId>");

  try {
    const tagClient = createTagClient(userId);
    const result = await tagClient.correct(txId, catId);
    
    if (!result.ok) return replyErr("Correction failed");

    // ← Emit correction event
    window.dispatchEvent(new CustomEvent("tag-correction-done", {
      detail: { transactionId: txId, merchantName: "..." }
    }));
    
    // ← Trigger refresh
    window.dispatchEvent(new Event("smart-categories-refresh"));

    return replyOk(`✅ Corrected! AI is learning...`);
  } catch (err) {
    return replyErr("Correction failed");
  }
}
```

**Why:** Users can now correct categorizations via chat, and dashboard auto-refreshes.

---

## Testing Checklist (5 min)

```bash
✅ Step 1: ToastCenter in App.tsx
   → Open DevTools Console
   → Look for no errors

✅ Step 2: Chat categorize handler
   → Open Transactions page
   → Select 3 transactions
   → Type "/categorize"
   → See response with results + button

✅ Step 3: Deep-link navigation
   → Click "Review in Dashboard" button
   → Should navigate to /dashboard/smart-categories?filter=low&focusTx=tx-XXX
   → Verify URL shows both params

✅ Step 4: Auto-scroll & highlight
   → After navigation, transaction should:
     - Auto-scroll into view
     - Show blue ring highlight (3 seconds)
     - History drawer opens

✅ Step 5: Auto-refresh
   → Open SmartCategories in Tab A
   → Go to Transactions in Tab B
   → Select 3 + "/categorize"
   → Watch Tab A auto-refresh without page reload

✅ Step 6: Cross-tab toast
   → Open app in Tab A
   → Open app in Tab B
   → Categorize in Tab A
   → See toast in Tab B
```

---

## Common Issues & Fixes

### Issue: Toast doesn't appear

**Fix:** Verify `ToastCenter` is in `App.tsx` root:
```tsx
<>
  <ToastCenter />  {/* Must be here */}
  <Router>...</Router>
</>
```

### Issue: Deep-link button doesn't appear

**Fix:** Check chat handler returns correct structure:
```typescript
return replyOk({
  text: "...",
  buttons: [{ label: "📊 Review", url: deepLink }]  // ← Must include buttons
});
```

### Issue: Dashboard doesn't scroll to transaction

**Fix:** Verify transaction has `id` attribute:
```tsx
<tr id={`tx-${tx.id}`}>  {/* ← Must have this */}
  {/* ... */}
</tr>
```

### Issue: Cross-tab toast doesn't appear

**Fix:** `ToastCenter` listens to `storage` event:
```typescript
const onStorageChange = (ev: StorageEvent) => {
  if (ev.key === "tag-categorize-done" && ev.newValue) {
    // Must parse JSON
    const { resultCount, lowCount } = JSON.parse(ev.newValue);
    add(`✅ Categorized ${resultCount}...`);
  }
};
window.addEventListener("storage", onStorageChange);
```

---

## File Checklist

Before you're done, verify these files exist:

- [ ] `src/ui/feedback/ToastCenter.tsx` (provided)
- [ ] `src/ai/sdk/tagClient.ts` (provided)
- [ ] `netlify/functions/tag-categorize.ts` (provided)
- [ ] `netlify/functions/tag-correction.ts` (provided)
- [ ] `src/pages/dashboard/SmartCategories.tsx` (updated)
- [ ] `netlify/functions/chat-v3-production.ts` (updated)
- [ ] `src/App.tsx` (updated)

---

## Optional Enhancements (10 min each)

### Add Error Toast
```typescript
// In chat handler catch block:
window.dispatchEvent(new CustomEvent("tag-error", {
  detail: { message: "Categorization failed" }
}));
```

### Add Correction Toast
```typescript
// In correction handler success:
window.dispatchEvent(new CustomEvent("tag-correction-done", {
  detail: { merchantName: "Starbucks", categoryName: "Coffee" }
}));
```

### Add Rule Creation
```typescript
// In rule handler:
window.dispatchEvent(new CustomEvent("tag-rule-created", {
  detail: { merchantName: "Starbucks", categoryName: "Coffee" }
}));
```

---

## URL Query Params Reference

| Param | Type | Example | Purpose |
|-------|------|---------|---------|
| `filter` | string | `low`, `manual`, `ai` | Filter by confidence/source |
| `focusTx` | string | `tx-123` | Highlight & scroll to tx |
| `category` | string | `cat-coffee` | Filter by category |
| `tab` | string | `queue`, `rules` | Active tab |

**Full URL Examples:**
```
/dashboard/smart-categories?filter=low
/dashboard/smart-categories?filter=low&focusTx=tx-456
/dashboard/smart-categories?category=cat-coffee&tab=analytics
```

---

## Event Reference

| Event | Payload | Handler |
|-------|---------|---------|
| `tag-categorize-done` | `{ resultCount, lowCount }` | ToastCenter |
| `tag-correction-done` | `{ transactionId, merchantName }` | ToastCenter |
| `tag-rule-created` | `{ merchantName, categoryName }` | ToastCenter |
| `smart-categories-refresh` | `(none)` | SmartCategories |

---

## 30-Minute Timeline

```
0:00-2:00   Step 1: Add ToastCenter
2:00-7:00   Step 2: Wire Chat handler
7:00-15:00  Step 3: Update SmartCategories
15:00-18:00 Step 4: Add refresh trigger
18:00-23:00 Step 5: Add correction handler
23:00-28:00 Testing checklist
28:00-30:00 Buffer / Optional enhancements
```

---

## Need Help?

**Stuck?** Check the comprehensive guides:

1. `COMPLETE_INTEGRATION_FLOW.md` – Full system diagram
2. `PRIME_CHAT_TAG_DEEPLINK_INTEGRATION.md` – Chat integration details
3. `EVENT_DRIVEN_FEEDBACK_SYSTEM.md` – Event system explanation
4. `SMART_CATEGORIES_DEEPLINKS.md` – Deep-linking reference

---

**You're done!** 🎉

Your app now has:
- ✅ Chat-based categorization
- ✅ Toast notifications (cross-tab!)
- ✅ One-click dashboard navigation
- ✅ Auto-refresh on corrections
- ✅ Full transaction focus & highlight

Next: Deploy to production and watch users love the seamless workflow!

---

**Status:** Ready to implement  
**Time Required:** 30 minutes  
**Complexity:** Low (copy-paste + wire 3 files)  
**User Impact:** High (complete workflow integration)





