# 🛡️ Guardrails + Prime Bridge + Chat Unification Audit

**Date**: 2025-02-06  
**Status**: ✅ Audit Complete

---

## 📍 Canonical Flow: Message → Guardrails → Model → Response

```
User types message in UnifiedAssistantChat
  ↓
ChatInputBar.onSubmit() → handleSend()
  ↓
useUnifiedChatEngine.sendMessage(message)
  ↓
POST /.netlify/functions/chat
  ↓
[BACKEND] verifyAuth() → get userId from JWT
  ↓
[BACKEND] runInputGuardrails() ← 🛡️ CANONICAL GUARDRAILS HERE
  ├─ PII masking (always on)
  ├─ Content moderation (configurable)
  ├─ Jailbreak detection (configurable)
  └─ Returns: { ok, maskedMessages, signals }
  ↓
If blocked → return safe response (no model call)
If passed → use masked text for routing
  ↓
routeToEmployee() → selects Prime/Liberty/Tag/etc.
  ↓
OpenAI API call with masked message
  ↓
Stream response back to frontend
  ↓
UnifiedAssistantChat displays response
```

**Key Point**: Guardrails are applied **ONLY ONCE** in the backend (`netlify/functions/chat.ts` line 555-600). UI does NOT re-apply guardrails.

---

## ✅ 1. Guardrails Implementation Status

### Canonical Backend Guardrails
- **File**: `netlify/functions/chat.ts` (lines 532-600)
- **Function**: `runInputGuardrails()` from `_shared/guardrails-unified.ts`
- **Applied**: BEFORE routing, BEFORE model calls
- **Coverage**: All employees (Prime, Liberty, Tag, Byte, etc.)

### UI Guardrails Check
- ✅ **No duplicate guardrails in UI** - Verified by grep search
- ✅ `ChatInputBar.tsx` - Only displays `guardrailsStatus` prop (read-only display)
- ✅ `GuardrailsActivePill.tsx` - UI indicator only, no actual masking
- ✅ `GuardrailNotice.tsx` - Display component only

**Conclusion**: Guardrails are correctly centralized in backend. No duplication found.

---

## ✅ 2. Prime Onboarding Status

### Canonical Onboarding Component
- **File**: `src/components/chat/PrimeOnboardingWelcome.tsx`
- **Used in**: `UnifiedAssistantChat.tsx` (line 38, rendered conditionally)
- **Trigger**: `showPrimeOnboarding` useMemo (checks `profile.metadata.prime_initialized !== true`)
- **Purpose**: First-time Prime welcome with action chips

### Legacy/Unused Onboarding Components

#### ❌ `PrimeIntroModal.tsx`
- **Status**: COMMENTED OUT in `DashboardLayout.tsx` (line 414)
- **Action**: ✅ Already disabled (no action needed)
- **Note**: Was a 3-step modal, replaced by `PrimeOnboardingWelcome`

#### ⚠️ `PrimeCustodianOnboardingModal.tsx`
- **Status**: Used in `UnifiedOnboardingFlow.tsx` and `ProfileTab.tsx`
- **Purpose**: Different from Prime onboarding - appears to be for profile/settings onboarding
- **Action**: ✅ Keep (different purpose, not duplicate)

#### ⚠️ `OnboardingWelcomePage.tsx`
- **Status**: Route redirects to `/dashboard` (line 249 in `App.tsx`)
- **Action**: ✅ Keep route redirect (handles legacy URLs)

**Conclusion**: Only ONE Prime onboarding system active (`PrimeOnboardingWelcome`). Legacy components are disabled or serve different purposes.

---

## ✅ 3. Chat Entrypoints Status

### Canonical Chat Component
- **File**: `src/components/chat/UnifiedAssistantChat.tsx`
- **Props**: `initialEmployeeSlug` (determines which employee)
- **Used by**: DashboardLayout, various workspace components
- **Purpose**: Single unified chat for ALL employees (Prime, Liberty, Tag, Byte, etc.)

### Legacy Chat Components (Unused)

#### Legacy Prime Chat Components
- `src/components/chat/_legacy/PrimeChatCentralized.tsx` ❌
- `src/components/chat/_legacy/PrimeChat-page.tsx` ❌
- `src/components/chat/_legacy/PrimeChatInterface.tsx` ❌
- `src/components/prime/PrimeChatV2.tsx` ❌
- `src/components/prime/PrimeChatV2Mount.tsx` ❌
- `src/components/prime/PrimeChatSlideout.tsx` ❌
- `src/components/prime/PrimeChatCentralized.tsx` ❌
- `src/components/chat/PrimeChatWindow.tsx` ❌
- `src/components/chat/PrimeChatWorkspace.tsx` ❌
- `src/components/chat/PrimeSidebarChat.tsx` ❌
- `src/pages/chat/PrimeChatSimple.tsx` ❌
- `src/pages/dashboard/PrimeChatPage.tsx` ❌
- `src/ui/components/PrimeChatMount.tsx` ❌
- `src/ui/components/PrimeChatDrawer.tsx` ❌
- `src/contexts/PrimeChatContext.tsx` ⚠️ (may be used elsewhere)

**Action**: These can be safely deleted if not imported anywhere. Check imports first.

---

## ✅ 4. Trust Message Status

### Canonical Trust Message
- **Component**: `src/components/chat/PrimeTrustMessage.tsx`
- **Used in**: `UnifiedAssistantChat.tsx` (line 39, rendered after first assistant response)
- **Trigger**: `shouldShowTrustMessage` useMemo (checks `guardrails_acknowledged !== true`)
- **Persistence**: `markGuardrailsAcknowledged()` sets `profiles.metadata.guardrails_acknowledged = true`

### Security Messages (Upload Events)
- **Helper**: `src/lib/primeSecurityMessages.ts`
- **Function**: `emitSecurityMessage()` - dispatches custom events to chat
- **Also marks**: `guardrails_acknowledged = true` (line 65-68)
- **Events**: `upload_processing_started`, `upload_failed_or_canceled`, `upload_discard_success`, `upload_discard_failed`

**Conclusion**: Trust message is shown ONCE per user and persisted correctly. No duplication.

---

## 🔍 Duplicate Implementations Found

### ✅ No Critical Duplicates
1. **Guardrails**: ✅ Single backend implementation
2. **Prime Onboarding**: ✅ Single active component (`PrimeOnboardingWelcome`)
3. **Chat Entrypoint**: ✅ Single canonical component (`UnifiedAssistantChat`)
4. **Trust Message**: ✅ Single component with proper persistence

### ⚠️ Legacy Files (Safe to Remove After Verification)

#### Legacy Prime Chat Components (16 files)
These appear unused but should be verified before deletion:
- `src/components/chat/_legacy/PrimeChatCentralized.tsx`
- `src/components/chat/_legacy/PrimeChat-page.tsx`
- `src/components/chat/_legacy/PrimeChatInterface.tsx`
- `src/components/prime/PrimeChatV2.tsx`
- `src/components/prime/PrimeChatV2Mount.tsx`
- `src/components/prime/PrimeChatSlideout.tsx`
- `src/components/prime/PrimeChatCentralized.tsx`
- `src/components/chat/PrimeChatWindow.tsx`
- `src/components/chat/PrimeChatWorkspace.tsx`
- `src/components/chat/PrimeSidebarChat.tsx`
- `src/pages/chat/PrimeChatSimple.tsx`
- `src/pages/dashboard/PrimeChatPage.tsx`
- `src/ui/components/PrimeChatMount.tsx`
- `src/ui/components/PrimeChatDrawer.tsx`
- `src/components/chat/PrimeChatPanel.tsx` (may be used by UnifiedAssistantChat - verify)
- `src/contexts/PrimeChatContext.tsx` (may be used elsewhere - verify)

**Action**: Run grep to verify these are not imported anywhere before deletion.

---

## 📋 Minimal Patch Plan (No Breaking Changes)

### Phase 1: Verification ✅ COMPLETE
1. ✅ Verified legacy Prime chat components:
   - `PrimeChatV2` - Only imported in `PrimeChatV2Mount.tsx` (which is commented out in `main.tsx`)
   - `PrimeChatSlideout` - Not imported anywhere
   - `PrimeChatCentralized` - Not imported anywhere
2. ✅ Verified `PrimeChatPanel.tsx`:
   - Not imported anywhere (marked as LEGACY in file header)
   - File header confirms: "⚠️ LEGACY: Duplicate of UnifiedAssistantChat functionality"
3. ✅ Verified `PrimeChatContext.tsx`:
   - Not imported anywhere

### Phase 2: Cleanup (Optional, Non-Breaking)
If verification shows files are unused:
1. Move legacy files to `src/components/chat/_legacy/` (already exists)
2. Add comment: `// LEGACY: Replaced by UnifiedAssistantChat`
3. Keep for 1-2 releases, then delete

### Phase 3: Documentation (5 min)
1. Update `GUARDRAILS_IMPLEMENTATION_SUMMARY.md` to note:
   - Guardrails are backend-only (no UI duplication)
   - `UnifiedAssistantChat` is the canonical chat component
   - `PrimeOnboardingWelcome` is the canonical onboarding

### Phase 4: Testing Checklist
- [ ] Upload file → Guardrails Active pill shows
- [ ] Send message → Guardrails applied in backend (check Network tab)
- [ ] First Prime chat → `PrimeOnboardingWelcome` shows
- [ ] After first response → `PrimeTrustMessage` shows once
- [ ] Check `profiles.metadata.guardrails_acknowledged` is set to `true`
- [ ] Verify no duplicate guardrails in UI (no re-masking)

---

## ✅ Summary

### Current State: ✅ UNIFIED
- **Guardrails**: Single backend implementation (`netlify/functions/chat.ts`)
- **Prime Onboarding**: Single component (`PrimeOnboardingWelcome`)
- **Chat Entrypoint**: Single component (`UnifiedAssistantChat`)
- **Trust Message**: Single component with proper persistence

### No Action Required
The system is already unified. Legacy files exist but are not active. Optional cleanup can be done after verification.

### Key Files to Keep
- ✅ `netlify/functions/chat.ts` - Canonical chat endpoint with guardrails
- ✅ `netlify/functions/_shared/guardrails-unified.ts` - Guardrails engine
- ✅ `src/components/chat/UnifiedAssistantChat.tsx` - Canonical chat component
- ✅ `src/components/chat/PrimeOnboardingWelcome.tsx` - Canonical onboarding
- ✅ `src/components/chat/PrimeTrustMessage.tsx` - Trust message component
- ✅ `src/lib/primeSecurityMessages.ts` - Security message helper

### Optional Cleanup (After Verification)
- Move/delete legacy Prime chat components (16 files)
- Verify no imports before deletion

---

## 🎯 Conclusion

**Status**: ✅ **ALREADY UNIFIED**

No critical duplicates found. System is correctly architected with:
- Single guardrails implementation (backend)
- Single Prime onboarding (PrimeOnboardingWelcome)
- Single chat component (UnifiedAssistantChat)
- Single trust message system (with persistence)

Optional cleanup of legacy files can be done after import verification.

