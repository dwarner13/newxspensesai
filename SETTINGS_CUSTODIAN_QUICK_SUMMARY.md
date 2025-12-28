# ⚡ Settings + Custodian Audit - Quick Summary

**XspensesAI Security & Settings System**  
**Date:** October 20, 2025 | **Status:** 🟡 70% Complete

---

## 📌 Key Findings

### ✅ What Works
- **Notifications:** Full pipeline (DB → API → UI with RLS)
- **Audit Logging:** Immutable trail + compliance exports
- **Guardrails Config:** Get/save functions exist
- **Security Status:** Endpoint + dashboard component

### ❌ What's Missing
- **User Settings:** No storage table or CRUD functions
- **Custodian Brain:** No audit engine or recommendations
- **Settings Routes:** 12 planned routes unmapped
- **State Management:** No SettingsContext

---

## 📊 Gap Analysis

| Layer | Status | Impact |
|-------|--------|--------|
| Database | ⛳ Missing 2 tables | Can't persist settings |
| Backend | ⛳ Missing 3 functions | No API endpoints |
| Frontend | ⛳ Missing Context | No state management |
| UI Routes | ❌ Not wired | 9 routes broken |

---

## 🚀 Implementation (2.5 hours)

### Phase 1: Data Layer (30 min)
```
├─ user_settings table (19 fields + RLS)
└─ security_audit_results table (scan history)
```

### Phase 2: Backend (45 min)
```
├─ settings-get.ts          (fetch user prefs)
├─ settings-save.ts         (update settings)
└─ custodian-audit.ts       (4-check security scan)
```

### Phase 3: Frontend (20 min)
```
└─ SettingsContext.tsx      (centralized state + cache)
```

### Phase 4: Integration (45 min)
```
├─ Route Settings.tsx → /settings/* pages
├─ Add "Run Security Check" button
└─ Display scan results with score + recommendations
```

---

## 🎯 Critical Path

```
1. CREATE user_settings table
2. CREATE settings-get.ts + settings-save.ts
3. CREATE SettingsContext
4. UPDATE Settings.tsx with routes
5. CREATE custodian-audit.ts
6. WIRE notifications to respect user_settings.notify_*
```

**Depends On:** Nothing (can build independently)

---

## 📋 File Checklist

### New Files to Create
- [ ] `sql/migrations/20251020_user_settings.sql`
- [ ] `netlify/functions/settings-get.ts`
- [ ] `netlify/functions/settings-save.ts`
- [ ] `netlify/functions/custodian-audit.ts`
- [ ] `src/contexts/SettingsContext.tsx`
- [ ] `src/types/settings.types.ts` (optional)

### Files to Update
- [ ] `src/pages/dashboard/Settings.tsx` (add routes)
- [ ] Add SettingsProvider to root App.tsx

---

## ✅ Acceptance Tests

**Manual:**
```bash
1. Load Settings page → shows all 12 cards
2. Click "Security & Privacy" → runs custodian-audit
3. See score + checks list
4. Toggle theme → persists on reload
5. Set quiet hours → respected by notifications
```

**API:**
```bash
curl -X GET http://localhost:8888/.netlify/functions/settings-get \
  -H "x-user-id: user-123"
  # → { theme: "dark", notify_email: true, ... }

curl -X PATCH http://localhost:8888/.netlify/functions/settings-save \
  -H "x-user-id: user-123" \
  -d '{"theme":"light"}'
  # → 200 OK

curl -X POST http://localhost:8888/.netlify/functions/custodian-audit \
  -H "x-user-id: user-123"
  # → { score: 75, status: "good", checks: [...] }
```

---

## 🔗 Integration Points

| Component | Uses Settings | Status |
|-----------|---------------|--------|
| Notifications | `notify_email`, `notify_push` | ⛳ Need to wire |
| Theme Toggle | `user_settings.theme` | ⛳ Need to wire |
| Guardrails UI | `guardrail_config` | ⛳ Need page |
| Employee Prefs | `notification_rules` | ⛳ Not started |
| Quiet Hours | `quiet_hours_*` | ⛳ Not started |

---

## 📞 Questions for Lead

1. **Custodian Scope:** 4 checks (2FA, privacy, audit, backup) enough? Or add password strength, login attempts, etc.?
2. **Notification Channels:** Email/SMS or just in-app for MVP?
3. **Employee Preferences:** UI to customize per-employee notification rules?
4. **Theme Sync:** Apply to entire app or just Settings page?
5. **Quiet Hours:** Skip notifications or queue them?

---

## 🎉 Next Steps

1. **Approve Design:** Review SQL + function signatures
2. **Create PR:** All 5-6 files
3. **Test:** Manual + API tests
4. **Deploy:** Netlify auto-deploys, then update production DB
5. **Monitor:** Check audit logs for setting changes

---

**Full Audit:** See `SETTINGS_CUSTODIAN_AUDIT.md` for complete details, exact code, and RLS policies.





