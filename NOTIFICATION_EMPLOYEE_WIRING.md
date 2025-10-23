# Employee Notification Wiring Guide
**Date**: October 18, 2025  
**Status**: Production Ready

---

## 📋 QUICK REFERENCE

### **Updated notify() API**

```typescript
import { notify } from './_shared/notify';

// Simple case
const result = await notify({
  userId,
  employee: 'byte-docs',
  priority: 'success',
  title: '42 transactions imported',
});

// Full case with all options
const result = await notify({
  userId,
  employee: 'byte-docs',
  priority: 'success',
  title: '42 transactions imported',
  description: 'Your statement has been processed and categorized',
  href: '/transactions?importId=xyz',
  payload: { importId, transactionCount: 42 }
});

// Handle result
if (!result.success) {
  console.error('Notification failed:', result.error);
} else {
  console.log('Notification created:', result.id);
}
```

---

## 🔗 WIRING EXAMPLES

### **1. Byte (commit-import.ts)**

```typescript
// File: netlify/functions/commit-import.ts

import { notify } from './_shared/notify';

export const handler: Handler = async (event) => {
  try {
    const body = Body.parse(JSON.parse(event.body || '{}'));
    const { supabase } = serverSupabase();

    // 1) Read staged rows
    const { data: staged, error: e1 } = await supabase
      .from('transactions_staging')
      .select('*')
      .eq('import_id', body.importId);
    if (e1) throw new Error(e1.message);

    // 2) Upsert into final table
    const finalRows = staged.map(r => ({
      import_id: r.import_id,
      occurred_at: r.occurred_at,
      description: r.description,
      amount: r.amount,
      currency: r.currency,
      memo: r.memo,
      vendor_raw: r.vendor_raw,
      vendor_normalized: null,
      category: r.category_suggested,
      hash: r.hash,
      source_line: r.source_line,
    }));

    const { error: e2 } = await supabase
      .from('transactions')
      .upsert(finalRows, { onConflict: 'hash' });
    if (e2) throw new Error(e2.message);

    // 3) Mark import committed
    await supabase
      .from('imports')
      .update({ status: 'committed' })
      .eq('id', body.importId);

    // 4) Get user_id for notification
    const { data: imp, error: e3 } = await supabase
      .from('imports')
      .select('user_id')
      .eq('id', body.importId)
      .single();
    if (e3) throw new Error(e3.message);

    // 5) NOTIFY USER: Byte succeeded ✨
    const notifyResult = await notify({
      userId: imp.user_id,
      employee: 'byte-docs',
      priority: 'success',
      title: `${finalRows.length} transactions imported`,
      description: 'Your statement has been processed and saved',
      href: `/transactions?importId=${body.importId}`,
      payload: {
        importId: body.importId,
        transactionCount: finalRows.length,
        status: 'completed'
      }
    });

    console.log('[commit-import] notification:', {
      notifyId: notifyResult.id,
      success: notifyResult.success
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        transactionCount: finalRows.length,
        notificationId: notifyResult.id
      })
    };
  } catch (err: any) {
    console.error('[commit-import] error', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message })
    };
  }
};
```

---

### **2. Tag (categorize-transactions.ts)**

```typescript
// File: netlify/functions/categorize-transactions.ts

import { notify } from './_shared/notify';

export const handler: Handler = async (event) => {
  try {
    const body = Body.parse(JSON.parse(event.body || '{}'));
    const { supabase } = serverSupabase();

    // 1) Pull transactions for this import
    const { data: txns, error: e1 } = await supabase
      .from('transactions')
      .select('id, import_id, description, vendor_raw, category, merchant_norm')
      .eq('import_id', body.importId);
    if (e1) throw new Error(e1.message);
    if (!txns?.length) {
      return {
        statusCode: 200,
        body: JSON.stringify({ updated: 0 })
      };
    }

    // 2) Get user_id from import record
    const { data: imp, error: eImp } = await supabase
      .from('imports')
      .select('user_id')
      .eq('id', body.importId)
      .single();
    if (eImp || !imp) throw new Error(eImp?.message ?? 'import not found');
    const userId = imp.user_id;

    // 3) Load rules + norms (categorization logic)
    const [{ data: rules }, { data: norms }] = await Promise.all([
      supabase
        .from('category_rules')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: true }),
      supabase
        .from('normalized_merchants')
        .select('*')
        .eq('user_id', userId),
    ]);

    // ... categorization logic ...

    // 4) Apply categorizations
    const updates = [/* ... */];
    const historyRows = [/* ... */];

    if (updates.length) {
      const { error: eU } = await supabase
        .from('transactions')
        .upsert(updates, { onConflict: 'id' });
      if (eU) throw new Error(eU.message);
    }

    if (historyRows.length) {
      const { error: eH } = await supabase
        .from('category_history')
        .insert(historyRows);
      if (eH) throw new Error(eH.message);
    }

    // 5) NOTIFY USER: Tag succeeded ✨
    const notifyResult = await notify({
      userId,
      employee: 'tag-ai',
      priority: 'success',
      title: `Categorized ${updates.length} transactions`,
      description: updates.length > 0 
        ? 'Auto-categorization complete' 
        : 'No changes needed',
      href: `/transactions?importId=${body.importId}`,
      payload: {
        importId: body.importId,
        categorized: updates.length,
        status: 'completed'
      }
    });

    console.log('[categorize-transactions] notification:', {
      notifyId: notifyResult.id,
      success: notifyResult.success
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        updated: updates.length,
        notificationId: notifyResult.id
      })
    };
  } catch (err: any) {
    console.error('[categorize-transactions] error', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message })
    };
  }
};
```

---

### **3. Crystal (crystal-analyze-import.ts)**

```typescript
// File: netlify/functions/crystal-analyze-import.ts

import { notify } from './_shared/notify';

export const handler: Handler = async (event) => {
  try {
    const body = Body.parse(JSON.parse(event.body || '{}'));
    const { supabase } = serverSupabase();

    // 1) Fetch import + user
    const { data: imp, error: e1 } = await supabase
      .from('imports')
      .select('id, user_id')
      .eq('id', body.importId)
      .single();
    if (e1 || !imp) throw new Error(e1?.message ?? 'import not found');

    // 2) Pull transactions for analysis
    const { data: txns, error: e2 } = await supabase
      .from('transactions')
      .select('amount, occurred_at, description, category, vendor_raw')
      .eq('import_id', body.importId);
    if (e2) throw new Error(e2.message);

    if (!txns?.length) {
      return {
        statusCode: 200,
        body: JSON.stringify({ summary: 'No transactions to analyze' })
      };
    }

    // 3) Generate insights (placeholder → replace with real analysis)
    const total = txns.reduce((s, t) => s + Number(t.amount || 0), 0);
    const categories = [...new Set(txns.map(t => t.category).filter(Boolean))];

    const summary = `
Crystal's Insights:
• ${txns.length} transactions imported
• Total spending: $${Math.abs(total).toFixed(2)}
• ${categories.length} categories identified
• Recommend reviewing high-spend categories for budget planning
    `.trim();

    // 4) Store advice
    const adviceId = crypto.randomUUID();
    const { error: e3 } = await supabase
      .from('advice_messages')
      .insert({
        id: adviceId,
        import_id: body.importId,
        role: 'crystal-analytics',
        message: summary,
        meta: { kind: 'import_analysis', categories, total }
      });
    if (e3) throw new Error(e3.message);

    // 5) NOTIFY USER: Crystal succeeded ✨
    const notifyResult = await notify({
      userId: imp.user_id,
      employee: 'crystal-analytics',
      priority: 'action', // action = needs attention (actionable insights)
      title: 'Crystal's Spending Insights',
      description: `${txns.length} transactions analyzed • $${Math.abs(total).toFixed(2)} total spend`,
      href: `/dashboard/smart-import-ai?importId=${body.importId}&view=insights`,
      payload: {
        importId: body.importId,
        adviceId,
        transactionCount: txns.length,
        totalSpend: total,
        categories: categories.length
      }
    });

    console.log('[crystal-analyze-import] notification:', {
      notifyId: notifyResult.id,
      success: notifyResult.success
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        adviceId,
        summary,
        notificationId: notifyResult.id
      })
    };
  } catch (err: any) {
    console.error('[crystal-analyze-import] error', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err?.message })
    };
  }
};
```

---

## ✅ CHECKLIST

After wiring all three employees, verify:

- [ ] `commit-import.ts` calls `notify()` with `employee: 'byte-docs'`
- [ ] `categorize-transactions.ts` calls `notify()` with `employee: 'tag-ai'`
- [ ] `crystal-analyze-import.ts` calls `notify()` with `employee: 'crystal-analytics'`
- [ ] All calls include `userId` from the import record
- [ ] All calls include appropriate `priority` (success for Byte/Tag, action for Crystal)
- [ ] All calls include `href` for deep-linking
- [ ] All calls include `payload` with relevant metadata
- [ ] All results are logged for debugging

---

## 🧪 TEST: END-TO-END FLOW

1. Upload a bank statement on `/dashboard/smart-import-ai`
2. **Byte processes**: "42 transactions imported" notification appears ✨
3. **Tag categorizes**: "Categorized 42 transactions" notification appears ✨
4. **Crystal analyzes**: "Crystal's Spending Insights" notification appears ✨
5. Click bell → see all 3 notifications grouped by priority
6. Click notification → navigates to correct page
7. Click "Have Prime handle it" → sends to Prime chat
8. Mark all read → all disappear

---

## 📝 API SUMMARY

### **notify() Input**
```typescript
{
  userId: string;              // required
  employee: EmployeeSlug;      // required (byte-docs|crystal-analytics|tag-ai|prime-boss|...)
  priority?: Priority;         // optional, default 'info'
  title: string;               // required
  description?: string;        // optional
  href?: string;               // optional deep-link
  payload?: Record<string,any>; // optional context
}
```

### **notify() Output**
```typescript
{
  id: string;          // notification id (empty if failed)
  success: boolean;    // true if created
  error?: string;      // error message if failed
}
```

### **Best Practices**
- ✅ Always await the result and log it
- ✅ Include `payload` with metadata for Prime orchestration
- ✅ Use appropriate `priority` (success for happy path, action for insights, critical for errors)
- ✅ Include `href` for user navigation
- ✅ Catch and log any errors
- ✅ Don't throw on notify failure (non-fatal)

---

Done! All three employees are now wired to send notifications. 🎉





