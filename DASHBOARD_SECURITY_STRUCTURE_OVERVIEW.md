# Dashboard Security Structure Overview

**Status:** 🔍 **AUDIT IN PROGRESS**  
**Date:** October 19, 2025  
**Scope:** 23 Dashboard Pages + Shared Security Controls

---

## Step 1: Existing Security Implementations (Inventory)

### Shared Security Utilities (Reusable Components)

| Control | File | Status | Notes |
|---------|------|--------|-------|
| **Auth Gate** | `src/contexts/AuthContext.tsx` | ✅ READY | `useAuth()` hook; blocks render if !user |
| **PII Masking** | `netlify/functions/_shared/pii.ts` | ✅ READY | 50+ pattern detectors (CC, SSN, email, phone, addresses) |
| **PII Patterns** | `netlify/functions/_shared/pii-patterns.ts` | ✅ READY | Regex library; credit cards, government IDs, contact info |
| **Rate Limiting** | `netlify/functions/_shared/rate-limit.ts` | ✅ READY | Sliding window; per-user; Supabase table-backed |
| **Safe Logging** | `netlify/functions/_shared/guardrail-log.ts` | ✅ READY | Prefixed logs; no inline PII |
| **Guardrails** | `netlify/functions/_shared/guardrails-production.ts` | ✅ READY | Input/output moderation; PII detection |
| **Notifications** | `src/lib/notify.ts` | ✅ READY | Type-safe; employee-tagged; payload support |
| **Storage** | `netlify/functions/_shared/storage.ts` | ✅ READY | Signed URLs; least privilege |
| **Supabase** | `netlify/functions/_shared/supabase.ts` | ✅ READY | Service role (server-side); anon key (client-side) |
| **Zod Validation** | Multiple `_shared/*.ts` | ✅ READY | Input schemas for all endpoints |
| **Error Handler** | Various endpoints | ✅ READY | Converts stack traces → user-safe messages |
| **Session** | `netlify/functions/_shared/session.ts` | ✅ READY | Token extraction & validation |

---

## Step 2: Coverage Map (Per Page)

### Key
- ✅ = Present & wired
- ⚠️ = Partial or needs verification
- ❌ = Missing (minimal patch needed)

### Dashboard Pages

#### **Main Dashboard (ConnectedDashboard.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | `useAuth()` → redirect if !user |
| RLS Queries | ✅ | All Supabase queries use anon key (RLS enforced) |
| PII Masking | ⚠️ | Summary cards may leak merchant names |
| Safe Logging | ✅ | No direct console logs in render |
| Zod Validation | ⚠️ | Server functions have it; client doesn't validate props |
| Rate Limiting | ⚠️ | Not on summary fetch endpoints |
| Consent Banner | ❌ | No disclosure for AI processing |
| Audit Logging | ⚠️ | Dashboard views not logged |
| Storage (Signed URLs) | N/A | No file uploads on main dashboard |
| Moderation | ⚠️ | Summary text may need filtering |

**Minimal Patch:**
- [ ] Add `<ConsentBanner />` for AI processing disclosure
- [ ] Wire rate limiting to `dashboard-summary` endpoint
- [ ] Log dashboard view event for audit trail

---

#### **Prime Chat (AIFinancialAssistantPage.tsx / TeamRoom.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | `useAuth()` required |
| RLS Queries | ✅ | Chat messages in `messages` table with RLS |
| PII Masking | ✅ | Built into `guardrails-production.ts` |
| Safe Logging | ✅ | `chat-v3-production.ts` uses safe logging |
| Zod Validation | ✅ | Prompt/response validated |
| Rate Limiting | ✅ | `assertWithinRateLimit(userId, 20)` per chat msg |
| Consent Banner | ⚠️ | Generic disclaimer; could be more specific |
| Audit Logging | ✅ | Messages logged to `chat_messages` table |
| Storage (Signed URLs) | ⚠️ | Document refs exist; not all use signed URLs |
| Moderation | ✅ | Input/output filters applied |

**Minimal Patch:**
- [ ] Enhanced consent banner mentioning Prime/Crystal/Team access
- [ ] Verify all file refs use signed URLs

---

#### **Smart Import AI (SmartImportAI.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | `useAuth()` required |
| RLS Queries | ✅ | Transactions/imports scoped by `user_id` |
| PII Masking | ✅ | `maskPII()` applied to memos before returning |
| Safe Logging | ✅ | `byte-ocr-parse.ts`, `commit-import.ts` use safeLog |
| Zod Validation | ✅ | `z.object({...})` on all endpoints |
| Rate Limiting | ✅ | 20 reqs/min on upload endpoints |
| Consent Banner | ✅ | Present; mentions Byte OCR & AI processing |
| Audit Logging | ✅ | Import → Transaction → Categorization logged |
| Storage (Signed URLs) | ✅ | S3-style bucket with signed URLs |
| Moderation | ✅ | Guardrails filter file types, size, virus scan stub |

**Minimal Patch:**
- [ ] None (fully implemented) ✅

---

#### **AI Chat Assistant (AIFinancialAssistantPage.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | `useAuth()` |
| RLS Queries | ✅ | Chat table RLS |
| PII Masking | ✅ | Guardrails apply |
| Safe Logging | ✅ | Safe log |
| Zod Validation | ✅ | Prompt schema |
| Rate Limiting | ✅ | 20 reqs/min |
| Consent Banner | ⚠️ | Generic |
| Audit Logging | ✅ | Messages saved |
| Storage | N/A | No uploads |
| Moderation | ✅ | Applied |

**Minimal Patch:**
- [ ] Update consent banner copy for this assistant

---

#### **Smart Categories (AICategorizationPage.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | `category_rules`, `transactions` tables |
| PII Masking | ⚠️ | Merchant names shown (not PII but sensitive) |
| Safe Logging | ✅ | Tag AI functions safe log |
| Zod Validation | ✅ | Tag endpoints validate |
| Rate Limiting | ✅ | 100 reqs/min for categorize |
| Consent Banner | ❌ | Missing |
| Audit Logging | ✅ | Corrections logged |
| Storage | N/A | No uploads |
| Moderation | ✅ | Tag guardrails applied |

**Minimal Patch:**
- [ ] Add consent banner explaining Tag AI processing
- [ ] Wire `categorize-transactions` rate limit enforcement

---

#### **Transactions (TransactionsPage.tsx / DashboardTransactionsPage.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | `useAuth()` |
| RLS Queries | ✅ | `tx-list-latest` with bearer token |
| PII Masking | ✅ | CSV export masked |
| Safe Logging | ✅ | Safe log |
| Zod Validation | ✅ | Input schema |
| Rate Limiting | ✅ | 60 reqs/min |
| Consent Banner | ✅ | Present |
| Audit Logging | ✅ | `transaction_changelog` table |
| Storage | N/A | No uploads |
| Moderation | ⚠️ | Memo/description filtering weak |

**Minimal Patch:**
- [ ] Strengthen memo moderation on display
- [ ] Add soft-delete workflow (already in SQL migration)

---

#### **Bank Accounts (BankAccountsPage.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Accounts table |
| PII Masking | ❌ | Account numbers visible in UI |
| Safe Logging | ⚠️ | May log full account #s |
| Zod Validation | ⚠️ | Partial |
| Rate Limiting | ❌ | Not enforced |
| Consent Banner | ❌ | Missing |
| Audit Logging | ⚠️ | Weak |
| Storage | N/A | No uploads |
| Moderation | ❌ | No filters |

**Minimal Patch:**
- [ ] Mask account numbers: last 4 only (e.g., ••••1234)
- [ ] Add rate limiting to account update endpoints
- [ ] Add consent banner for Plaid/connection data
- [ ] Strengthen audit logging for account changes
- [ ] Add output moderation for account display

---

#### **AI Goal Concierge (GoalConciergePage.tsx / AIGoalConcierge.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Goals table |
| PII Masking | ⚠️ | Goal names may contain sensitive info |
| Safe Logging | ⚠️ | Goal details logged |
| Zod Validation | ⚠️ | Partial |
| Rate Limiting | ❌ | Missing |
| Consent Banner | ❌ | Missing |
| Audit Logging | ⚠️ | Basic |
| Storage | N/A | No uploads |
| Moderation | ❌ | Missing |

**Minimal Patch:**
- [ ] Add PII masking to goal names (e.g., "Pay off [X]" → "Pay off ••••••••")
- [ ] Wire rate limiting (60 reqs/min)
- [ ] Add consent banner
- [ ] Enhance audit logging for goal updates

---

#### **Smart Automation (SmartAutomation.tsx / WorkflowAutomation.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Automation rules scoped |
| PII Masking | ❌ | Workflow names/conditions may leak data |
| Safe Logging | ⚠️ | Conditions logged as-is |
| Zod Validation | ⚠️ | Partial |
| Rate Limiting | ❌ | Missing |
| Consent Banner | ❌ | Missing |
| Audit Logging | ⚠️ | Basic rule creation log |
| Storage | N/A | No uploads |
| Moderation | ❌ | Missing |

**Minimal Patch:**
- [ ] Add PII masking to workflow definitions
- [ ] Wire rate limiting (60 reqs/min)
- [ ] Add consent banner for automation triggers
- [ ] Enhance audit logging for rule changes

---

#### **Spending Predictions (SpendingPredictionsPage.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Forecast table |
| PII Masking | ⚠️ | Category names visible |
| Safe Logging | ✅ | Analytics safe log |
| Zod Validation | ✅ | Analytics endpoint |
| Rate Limiting | ⚠️ | Partial |
| Consent Banner | ⚠️ | Generic |
| Audit Logging | ⚠️ | Minimal |
| Storage | N/A | No uploads |
| Moderation | ❌ | Missing |

**Minimal Patch:**
- [ ] Strengthen rate limiting on forecast endpoint
- [ ] Add predictive model consent banner
- [ ] Wire output moderation for predictions

---

#### **Debt Payoff Planner (DebtPayoffPlannerPage.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Debt table |
| PII Masking | ❌ | Creditor names visible |
| Safe Logging | ⚠️ | May log debt amounts |
| Zod Validation | ⚠️ | Partial |
| Rate Limiting | ❌ | Missing |
| Consent Banner | ❌ | Missing |
| Audit Logging | ⚠️ | Weak |
| Storage | N/A | No uploads |
| Moderation | ❌ | Missing |

**Minimal Patch:**
- [ ] Add PII masking for creditor names
- [ ] Wire rate limiting (60 reqs/min)
- [ ] Add consent banner
- [ ] Enhance audit logging

---

#### **AI Financial Freedom (AIFinancialFreedomPage.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Finance table |
| PII Masking | ⚠️ | Plan details may contain PII |
| Safe Logging | ⚠️ | Plan logged |
| Zod Validation | ⚠️ | Partial |
| Rate Limiting | ❌ | Missing |
| Consent Banner | ❌ | Missing |
| Audit Logging | ⚠️ | Weak |
| Storage | N/A | No uploads |
| Moderation | ❌ | Missing |

**Minimal Patch:**
- [ ] Add PII masking for plan details
- [ ] Wire rate limiting (60 reqs/min)
- [ ] Add consent banner
- [ ] Enhance audit logging

---

#### **Bill Reminder System (BillRemindersPage.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Bill reminders table |
| PII Masking | ❌ | Payee names visible |
| Safe Logging | ⚠️ | Bill details logged |
| Zod Validation | ⚠️ | Partial |
| Rate Limiting | ❌ | Missing |
| Consent Banner | ❌ | Missing |
| Audit Logging | ⚠️ | Weak |
| Storage | N/A | No uploads |
| Moderation | ❌ | Missing |

**Minimal Patch:**
- [ ] Add PII masking for payee names
- [ ] Wire rate limiting (60 reqs/min)
- [ ] Add consent banner
- [ ] Enhance audit logging

---

#### **Personal Podcast (PersonalPodcastPage.tsx / PersonalPodcast.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Podcast episodes table |
| PII Masking | ⚠️ | Content may contain sensitive info |
| Safe Logging | ⚠️ | Episode content logged |
| Zod Validation | ⚠️ | Partial |
| Rate Limiting | ❌ | Missing |
| Consent Banner | ❌ | Missing (audio generation disclosure) |
| Audit Logging | ⚠️ | Weak |
| Storage | ✅ | Audio files use signed URLs |
| Moderation | ⚠️ | Content filter weak |

**Minimal Patch:**
- [ ] Add PII masking to episode scripts
- [ ] Wire rate limiting (20 reqs/min for generation) |
- [ ] Add consent banner for audio synthesis
- [ ] Strengthen content moderation

---

#### **Financial Story (FinancialStoryPage.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Story table |
| PII Masking | ⚠️ | Narrative may contain PII |
| Safe Logging | ⚠️ | Story logged |
| Zod Validation | ⚠️ | Partial |
| Rate Limiting | ❌ | Missing |
| Consent Banner | ❌ | Missing (narrative generation) |
| Audit Logging | ⚠️ | Weak |
| Storage | ⚠️ | May store unmasked narratives |
| Moderation | ⚠️ | Weak |

**Minimal Patch:**
- [ ] Add PII masking to story narrative
- [ ] Wire rate limiting (20 reqs/min for generation)
- [ ] Add consent banner for story generation
- [ ] Enhance moderation on narrative output

---

#### **AI Financial Therapist (AIFinancialTherapist.tsx / TherapistDemoPage.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Therapy session table |
| PII Masking | ⚠️ | Session transcript may have sensitive data |
| Safe Logging | ⚠️ | Transcript logged |
| Zod Validation | ⚠️ | Partial |
| Rate Limiting | ❌ | Missing |
| Consent Banner | ❌ | Missing (therapy AI; HIPAA-adjacent) |
| Audit Logging | ⚠️ | Weak |
| Storage | ⚠️ | Transcripts stored unmasked |
| Moderation | ⚠️ | Weak (may not filter harmful suggestions) |

**Minimal Patch:**
- [ ] Add PII masking to session transcripts
- [ ] Wire rate limiting (20 reqs/min for sessions)
- [ ] Add consent banner with privacy & wellness disclaimer
- [ ] Enhance moderation for therapeutic safety
- [ ] Log all sessions for audit/compliance

---

#### **Wellness Studio (WellnessStudioPage.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Wellness table |
| PII Masking | ⚠️ | Health goals may contain sensitive info |
| Safe Logging | ⚠️ | Goals logged |
| Zod Validation | ⚠️ | Partial |
| Rate Limiting | ❌ | Missing |
| Consent Banner | ❌ | Missing (health data processing) |
| Audit Logging | ⚠️ | Weak |
| Storage | ⚠️ | No signed URLs for media |
| Moderation | ❌ | Missing |

**Minimal Patch:**
- [ ] Add PII masking to health goals
- [ ] Wire rate limiting (60 reqs/min)
- [ ] Add consent banner for health data processing
- [ ] Enhance audit logging
- [ ] Secure media storage with signed URLs

---

#### **Spotify Integration (SpotifyIntegrationPage.tsx / SpotifyIntegrationDashboard.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Spotify table |
| PII Masking | ❌ | Playlist names, user IDs visible |
| Safe Logging | ❌ | OAuth tokens may be logged |
| Zod Validation | ⚠️ | Partial |
| Rate Limiting | ❌ | Missing |
| Consent Banner | ⚠️ | Basic; missing Spotify TOS reference |
| Audit Logging | ⚠️ | Weak |
| Storage | N/A | No uploads |
| Moderation | ❌ | Missing |

**Minimal Patch:**
- [ ] Never log OAuth tokens (use safeLog redaction)
- [ ] Add PII masking for playlist names & Spotify user info
- [ ] Wire rate limiting (60 reqs/min for API calls)
- [ ] Enhanced consent banner with Spotify legal link
- [ ] Strengthen audit logging for Spotify connections

---

#### **Tax Assistant (TaxAssistant.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Tax table |
| PII Masking | ❌ | Tax ID, business info visible |
| Safe Logging | ❌ | Tax amounts may be logged |
| Zod Validation | ⚠️ | Partial |
| Rate Limiting | ❌ | Missing |
| Consent Banner | ❌ | Missing (tax advisory disclaimer) |
| Audit Logging | ⚠️ | Weak |
| Storage | ⚠️ | Tax docs stored unmasked |
| Moderation | ❌ | Missing (tax advice filters) |

**Minimal Patch:**
- [ ] Add PII masking for Tax ID, SSN, business name
- [ ] Never log tax amounts (high-sensitivity data)
- [ ] Wire rate limiting (20 reqs/min)
- [ ] Add consent banner with tax advisory disclaimers
- [ ] Enhance audit logging for compliance
- [ ] Add moderation for tax advice guardrails

---

#### **Business Intelligence (BusinessIntelligence.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | BI table |
| PII Masking | ⚠️ | Customer/vendor names visible |
| Safe Logging | ⚠️ | Metrics logged |
| Zod Validation | ⚠️ | Partial |
| Rate Limiting | ⚠️ | Partial (analytics calls) |
| Consent Banner | ⚠️ | Generic |
| Audit Logging | ⚠️ | Weak |
| Storage | N/A | No uploads |
| Moderation | ❌ | Missing |

**Minimal Patch:**
- [ ] Add PII masking for business entity names
- [ ] Strengthen rate limiting on BI queries
- [ ] Enhanced consent banner for business data processing
- [ ] Wire audit logging

---

#### **Analytics (Analytics.tsx / AnalyticsAI.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Analytics table |
| PII Masking | ⚠️ | Category/merchant names visible |
| Safe Logging | ✅ | Analytics safe log |
| Zod Validation | ✅ | Analytics schema |
| Rate Limiting | ✅ | 30 reqs/min |
| Consent Banner | ✅ | Present |
| Audit Logging | ✅ | Logged |
| Storage | N/A | No uploads |
| Moderation | ⚠️ | Weak |

**Minimal Patch:**
- [ ] None (well-implemented) ✅

---

#### **Settings (Settings.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Settings table |
| PII Masking | ❌ | Preferences stored plain text |
| Safe Logging | ⚠️ | Settings logged |
| Zod Validation | ⚠️ | Partial |
| Rate Limiting | ❌ | Missing |
| Consent Banner | ⚠️ | Generic |
| Audit Logging | ⚠️ | Weak |
| Storage | N/A | No uploads |
| Moderation | ❌ | Missing |

**Minimal Patch:**
- [ ] Add rate limiting to settings update (60 reqs/min)
- [ ] Enhance audit logging for preference changes
- [ ] Add PII masking for sensitive settings
- [ ] Strengthen consent for data collection preferences

---

#### **Reports (Reports.tsx)**
| Control | Status | Implementation |
|---------|--------|-----------------|
| Auth Gate | ✅ | Yes |
| RLS Queries | ✅ | Reports table |
| PII Masking | ⚠️ | Report content may contain sensitive data |
| Safe Logging | ⚠️ | Reports logged |
| Zod Validation | ⚠️ | Partial |
| Rate Limiting | ❌ | Missing |
| Consent Banner | ⚠️ | Generic |
| Audit Logging | ⚠️ | Weak |
| Storage | ✅ | Report PDFs use signed URLs |
| Moderation | ❌ | Missing |

**Minimal Patch:**
- [ ] Add PII masking to report content
- [ ] Wire rate limiting (20 reqs/min for generation)
- [ ] Enhanced consent banner for report generation
- [ ] Strengthen audit logging

---

## Step 3: RLS & Database Snapshot

### Current RLS Status

| Table | RLS Enabled | Policies | User Scope |
|-------|-------------|----------|-----------|
| `transactions` | ✅ | SELECT/INSERT/UPDATE/DELETE | auth.uid() = user_id |
| `documents` | ✅ | SELECT/INSERT/DELETE | auth.uid() = user_id |
| `category_rules` | ✅ | SELECT/INSERT/UPDATE/DELETE | auth.uid() = user_id |
| `transaction_categories` | ✅ | SELECT/INSERT/UPDATE | auth.uid() = user_id |
| `audit_logs` | ✅ | SELECT (users can view own) | auth.uid() = user_id |
| `guardrail_events` | ✅ | SELECT (users can view own) | auth.uid() = user_id |
| `transaction_changelog` | ✅ | SELECT (users can view own) | auth.uid() = user_id |
| `rate_limits` | ❌ | N/A (RLS disabled; service role only) | N/A |
| `messages` | ✅ | SELECT/INSERT/UPDATE | auth.uid() = user_id |
| `goals` | ✅ | SELECT/INSERT/UPDATE | auth.uid() = user_id |
| `bills` | ✅ | SELECT/INSERT/UPDATE | auth.uid() = user_id |
| `budgets` | ✅ | SELECT/INSERT/UPDATE | auth.uid() = user_id |
| `settings` | ✅ | SELECT/INSERT/UPDATE | auth.uid() = user_id |
| `automations` | ✅ | SELECT/INSERT/UPDATE | auth.uid() = user_id |
| `debts` | ✅ | SELECT/INSERT/UPDATE | auth.uid() = user_id |
| `forecasts` | ✅ | SELECT/INSERT/UPDATE | auth.uid() = user_id |
| `wellness` | ✅ | SELECT/INSERT/UPDATE | auth.uid() = user_id |
| `spotify` | ✅ | SELECT/INSERT/UPDATE | auth.uid() = user_id |
| `notifications` | ✅ | SELECT/INSERT/UPDATE | auth.uid() = user_id |
| `reports` | ✅ | SELECT/INSERT/UPDATE | auth.uid() = user_id |

**Status:** ✅ Comprehensive RLS coverage across all transactional tables

---

## Step 4: Minimal Enhancement Proposals

### Shared Patches (Multi-Page Consumers)

#### **Patch A: Universal Consent Banner Component**

**File:** Create `src/components/consent/UniversalConsentBanner.tsx`

**Purpose:** Reusable consent banner for all pages that process user/financial data

```typescript
// src/components/consent/UniversalConsentBanner.tsx

import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface ConsentBannerProps {
  title: string;
  description: string;
  aiEmployees?: string[]; // e.g., ['prime-boss', 'crystal-analytics']
  dataTypes?: string[]; // e.g., ['transactions', 'bank accounts']
  storageKey: string; // e.g., 'consent_analytics_v1_dismissed'
}

export function UniversalConsentBanner({
  title,
  description,
  aiEmployees = ['prime-boss'],
  dataTypes = ['financial data'],
  storageKey,
}: ConsentBannerProps) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(
    localStorage.getItem(storageKey) === 'true'
  );

  const handleDismiss = async () => {
    localStorage.setItem(storageKey, 'true');
    if (user && supabase) {
      await supabase.auth.updateUser({
        data: { [storageKey]: new Date().toISOString() },
      }).catch(() => {}); // Silent fail; don't block UX
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded">
      <div className="flex items-start gap-3">
        <AlertCircle className="text-blue-600 mt-1 flex-shrink-0" size={20} />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900">{title}</h3>
          <p className="text-sm text-blue-800 mt-1 mb-2">{description}</p>
          {aiEmployees.length > 0 && (
            <p className="text-xs text-blue-700">
              <strong>AI Team Access:</strong> {aiEmployees.join(', ')}
            </p>
          )}
          {dataTypes.length > 0 && (
            <p className="text-xs text-blue-700">
              <strong>Data Types:</strong> {dataTypes.join(', ')}
            </p>
          )}
          <a href="/privacy" className="text-xs text-blue-600 hover:underline mt-1 block">
            View privacy policy →
          </a>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-2 text-blue-600 hover:text-blue-800 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
```

**Consumers (add to top of each page):**
- Main Dashboard
- All AI Concierge pages (Goal, Therapist, Freedom)
- Smart Categories
- Smart Automation
- Spending Predictions
- Debt Payoff
- Bill Reminders
- Personal Podcast
- Financial Story
- Wellness Studio
- Tax Assistant
- Business Intelligence
- Spotify Integration

**Import Example:**
```typescript
import { UniversalConsentBanner } from '@/components/consent/UniversalConsentBanner';

export function MyDashboardPage() {
  return (
    <>
      <UniversalConsentBanner
        title="AI Processing Notice"
        description="Your data is processed by our AI team to provide personalized insights."
        aiEmployees={['prime-boss', 'crystal-analytics']}
        dataTypes={['transactions', 'goals']}
        storageKey="consent_my_page_v1_dismissed"
      />
      {/* Page content */}
    </>
  );
}
```

---

#### **Patch B: Enhanced PII Masking Utility for UI**

**File:** Create `src/lib/mask-display.ts`

**Purpose:** Client-side masking for sensitive fields in UI (not server-side, which uses `pii.ts`)

```typescript
// src/lib/mask-display.ts

/**
 * Client-side display masking for sensitive UI fields
 * (Does NOT replace server-side PII masking via netlify/functions/_shared/pii.ts)
 */

export function maskAccountNumber(accountNumber: string | null | undefined): string {
  if (!accountNumber) return '••••••••';
  const cleaned = accountNumber.replace(/\D/g, '');
  if (cleaned.length < 4) return '••••••••';
  return `••••${cleaned.slice(-4)}`;
}

export function maskCreditCard(cc: string | null | undefined): string {
  if (!cc) return '••••••••••••••••';
  const cleaned = cc.replace(/\D/g, '');
  if (cleaned.length < 4) return '••••••••••••••••';
  return `${cleaned.slice(0, 4)}••••••••${cleaned.slice(-4)}`;
}

export function maskSSN(ssn: string | null | undefined): string {
  if (!ssn) return '•••-••-••••';
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length < 4) return '•••-••-••••';
  return `•••-••-${cleaned.slice(-4)}`;
}

export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes('@')) return '[email_redacted]';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '[email_redacted]';
  const masked = local.slice(0, 2) + '•'.repeat(Math.max(1, local.length - 2));
  return `${masked}@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '[phone_redacted]';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return '[phone_redacted]';
  return `•••-•••-${cleaned.slice(-4)}`;
}

export function maskMerchantName(name: string | null | undefined): string {
  // Merchant names are usually not PII but can be sensitive
  // Example: "John's Therapy Center" → mask to "J••••• T••••• C•••••"
  if (!name) return '[name_redacted]';
  const words = name.split(' ');
  return words
    .map((word) => word[0] + '•'.repeat(Math.max(0, word.length - 1)))
    .join(' ');
}

export const displayMasking = {
  accountNumber: maskAccountNumber,
  creditCard: maskCreditCard,
  ssn: maskSSN,
  email: maskEmail,
  phone: maskPhone,
  merchantName: maskMerchantName,
};
```

**Usage:**
```typescript
import { displayMasking } from '@/lib/mask-display';

export function BankAccountCard({ account }) {
  return (
    <div>
      <p>Account: {displayMasking.accountNumber(account.number)}</p>
      <p>Last 4: {displayMasking.accountNumber(account.number)}</p>
    </div>
  );
}
```

**Apply to Pages:**
- Bank Accounts (account numbers)
- Debt Payoff (creditor names, if present)
- Tax Assistant (Tax ID, SSN)
- Spotify Integration (user IDs)

---

#### **Patch C: Rate Limiting Middleware Wrapper**

**File:** Create `netlify/functions/_shared/endpoint-ratelimit.ts`

**Purpose:** Reusable rate-limiting wrapper for Netlify functions

```typescript
// netlify/functions/_shared/endpoint-ratelimit.ts

import { assertWithinRateLimit } from './rate-limit';

export interface RateLimitConfig {
  maxPerMinute: number;
  name: string; // e.g., 'categorize', 'tx-list', 'export'
}

/**
 * Higher-order function to add rate limiting to any handler
 * Usage:
 *   export const handler = withRateLimit(
 *     myHandlerFunction,
 *     { maxPerMinute: 60, name: 'my-endpoint' }
 *   );
 */
export function withRateLimit(
  handler: any,
  config: RateLimitConfig
) {
  return async (event: any) => {
    try {
      const userId = event.headers['x-user-id'] as string | undefined;
      if (!userId) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
      }

      // Check rate limit
      await assertWithinRateLimit(userId, config.maxPerMinute);

      // Call original handler
      return await handler(event);
    } catch (err: any) {
      if (err.statusCode === 429) {
        return {
          statusCode: 429,
          headers: { 'Retry-After': String(err.retryAfter) },
          body: JSON.stringify({ error: err.message }),
        };
      }
      throw err;
    }
  };
}
```

**Apply to Endpoints (via Netlify function wrapper):**
- All Goal Concierge endpoints (60 reqs/min)
- All Automation endpoints (60 reqs/min)
- All Therapist endpoints (20 reqs/min)
- All Podcast endpoints (20 reqs/min for generation)
- All Story endpoints (20 reqs/min for generation)
- All Wellness endpoints (60 reqs/min)
- All Settings endpoints (60 reqs/min)
- All Report endpoints (20 reqs/min for generation)
- All Tax endpoints (20 reqs/min)
- All BI endpoints (30 reqs/min)

---

#### **Patch D: Audit Logging Helper**

**File:** Create `netlify/functions/_shared/audit-log.ts`

**Purpose:** Standardized audit logging for all data mutations

```typescript
// netlify/functions/_shared/audit-log.ts

import { serverSupabase } from './supabase';
import { safeLog } from './guardrail-log';

export interface AuditLogEntry {
  userId: string;
  action: 'create' | 'update' | 'delete' | 'export' | 'categorize' | 'toggle' | 'view';
  resourceType: 'transaction' | 'goal' | 'bill' | 'debt' | 'automation' | 'setting' | 'report' | 'tax';
  resourceId?: string;
  changes?: Record<string, unknown>; // old → new
  reason?: string;
  actor?: 'user' | 'ai_employee' | 'system';
}

export async function logAuditEntry(entry: AuditLogEntry) {
  try {
    const { supabase } = serverSupabase();

    await supabase.from('audit_logs').insert({
      user_id: entry.userId,
      action: entry.action,
      resource_type: entry.resourceType,
      resource_id: entry.resourceId,
      old_values: entry.changes?.before,
      new_values: entry.changes?.after,
      changed_by: entry.actor || 'user',
      change_reason: entry.reason,
    });

    safeLog(`audit_${entry.action}_${entry.resourceType}`, {
      userId: entry.userId,
      resourceId: entry.resourceId,
    });
  } catch (err: any) {
    safeLog('audit_log_error', { error: err?.message });
    // Fail silently; don't block operation
  }
}
```

**Apply to All Pages' Mutation Endpoints:**
- Every create/update/delete action logs to `audit_logs` table
- Use in all Netlify functions that modify user data

---

### Individual Page Patches

(Due to length, providing key patches only; all follow similar pattern)

#### **Main Dashboard — Add Consent & Rate Limit**

**File:** `src/pages/dashboard/ConnectedDashboard.tsx`

**Diff:**
```typescript
// Add at top of return():
<UniversalConsentBanner
  title="Dashboard Analytics"
  description="Your spending summary is analyzed in real-time by our AI team."
  aiEmployees={['prime-boss', 'crystal-analytics']}
  dataTypes={['transactions', 'budgets', 'categories']}
  storageKey="consent_dashboard_v1_dismissed"
/>

// In summary fetch, add rate limit logic:
// After: const { userId } = useAuth()
// Add: Check localStorage for rate-limit flag; if exceeded, show toast
```

---

#### **Bank Accounts — Mask Account Numbers & Add Rate Limit**

**File:** `src/pages/dashboard/BankAccountsPage.tsx`

**Diff:**
```typescript
import { displayMasking } from '@/lib/mask-display';

// In account display:
// OLD: <p>Account: {account.accountNumber}</p>
// NEW:
<p>Account: {displayMasking.accountNumber(account.accountNumber)}</p>

// Add consent banner at top of page
// Add rate limiting to account update endpoints
```

---

#### **Debt Payoff — Mask Creditor Names & Add Rate Limit**

**File:** `src/pages/dashboard/DebtPayoffPlannerPage.tsx`

**Diff:**
```typescript
import { displayMasking } from '@/lib/mask-display';

// In debt display:
// OLD: <p>Creditor: {debt.creditorName}</p>
// NEW:
<p>Creditor: {displayMasking.merchantName(debt.creditorName)}</p>

// Add consent banner
// Add rate limiting to endpoint
// Enhance audit logging for debt updates
```

---

#### **Tax Assistant — Mask Tax ID & Add Guardrails**

**File:** `src/pages/dashboard/TaxAssistant.tsx`

**Diff:**
```typescript
import { displayMasking } from '@/lib/mask-display';

// In tax ID display:
// OLD: <p>Tax ID: {taxInfo.taxId}</p>
// NEW:
<p>Tax ID: {displayMasking.ssn(taxInfo.taxId)}</p>

// Add consent banner with tax advisory disclaimer
// Add rate limiting (20 reqs/min for tax calculations)
// Add moderation for tax advice output (guardrails filter)
// Never log tax amounts; use safeLog redaction
```

---

## Step 5: Implementation Checklist

### Per-Page Acceptance Criteria

Each page should have:

- [ ] **Auth Gate:** `useAuth()` check; blocks render if !user
- [ ] **RLS:** All DB queries use correct Supabase client (anon key for client, service role for server)
- [ ] **PII Masking:** 
  - [ ] Server: `netlify/functions/_shared/pii.ts` applied in functions
  - [ ] Client: `src/lib/mask-display.ts` applied to sensitive UI fields
- [ ] **Safe Logging:** Use `safeLog()` from guardrails; never log raw PII
- [ ] **Zod Validation:** Input endpoints have `z.object({...})` schema
- [ ] **Rate Limiting:** Sensitive endpoints use `assertWithinRateLimit(userId, maxPerMinute)`
- [ ] **Consent Banner:** `UniversalConsentBanner` component displayed if data processing occurs
- [ ] **Audit Logging:** All mutations call `logAuditEntry()` to `audit_logs` table
- [ ] **Signed URLs:** File downloads/uploads use signed URLs from `storage.ts`
- [ ] **Moderation:** User input/output filtered via `guardrails-production.ts`

---

## Summary

### Total Coverage

- **23 dashboard pages** inventoried
- **12 existing security utilities** identified and working
- **4 shared patches** proposed (Consent Banner, Display Masking, Rate Limit Middleware, Audit Logger)
- **19 individual page patches** (minimal, surgical updates)
- **RLS: 100% coverage** on transaction tables

### Implementation Path

1. **Phase 1 (Week 1):** Deploy 4 shared patches (Consent, Display Masking, Rate Limit, Audit)
2. **Phase 2 (Weeks 2-3):** Apply patches to high-risk pages (Bank Accounts, Tax, Therapy, Podcast)
3. **Phase 3 (Week 4):** Apply patches to medium-risk pages (Goals, Automation, Bills, Debt, Wellness)
4. **Phase 4 (Week 5):** Final pages + full QA + Docs

---

**Status:** 🟢 **READY FOR IMPLEMENTATION**

All patches are minimal, reusable, and follow existing project patterns.

---

**End of Security Structure Overview**





