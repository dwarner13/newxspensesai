# 🔌 Unified Chat System - End-to-End Wiring Summary

**Date:** January 2025  
**Status:** ✅ **VERIFIED & CONSOLIDATED**  
**Goal:** Confirm unified chat is the only active chat system and document how it's wired

---

## 1. CANONICAL ARCHITECTURE (Confirmed)

### ✅ Backend Stack
- **Endpoint**: `netlify/functions/chat.ts` → `POST /.netlify/functions/chat`
- **Router**: `netlify/functions/_shared/router.ts` → Intelligent employee routing
- **Guardrails**: `netlify/functions/_shared/guardrails-unified.ts` → PII masking + moderation
- **Memory**: `netlify/functions/_shared/memory.ts` → Facts + embeddings + summaries
- **Registry**: `src/employees/registry.ts` → Employee definitions from database

### ✅ Frontend Stack
- **UI Component**: `src/components/chat/UnifiedAssistantChat.tsx`
  - Desktop: Right-side slide-out panel (420px width)
  - Mobile: Full-screen bottom sheet
- **State Hook**: `src/hooks/useUnifiedChatLauncher.ts` → Global chat state (open/close, active employee, activity flags)
- **Backend Hook**: `src/hooks/usePrimeChat.ts` → SSE streaming, message handling
- **Launcher Components**:
  - Desktop: `src/components/chat/DesktopChatSideBar.tsx` (vertical blue pill on right edge)
  - Mobile: `src/components/layout/MobileBottomNav.tsx` (Prime button in bottom nav)

### ✅ Layout Integration
- **Main Layout**: `src/layouts/DashboardLayout.tsx`
  - Renders `UnifiedAssistantChat` once at layout level
  - Renders `DesktopChatSideBar` for desktop
  - Includes `MobileBottomNav` for mobile
  - All dashboard pages use this layout via `MobileLayoutGate` wrapper

---

## 2. END-TO-END FLOW

### User Opens Chat (Desktop)
```
1. User clicks vertical blue pill on right edge
   ↓
2. DesktopChatSideBar.handleClick()
   ↓
3. useUnifiedChatLauncher.openChat({ initialEmployeeSlug })
   ↓
4. Global state updates: isOpen = true, activeEmployeeSlug = ...
   ↓
5. DashboardLayout.tsx detects isOpen change
   ↓
6. UnifiedAssistantChat renders with isOpen={true}
   ↓
7. UnifiedAssistantChat uses usePrimeChat hook
   ↓
8. usePrimeChat calls /.netlify/functions/chat
   ↓
9. Backend: chat.ts → router.ts → guardrails → memory → OpenAI
   ↓
10. SSE stream returns tokens → UnifiedAssistantChat displays messages
```

### User Opens Chat (Mobile)
```
1. User taps "Prime" / AI Chat button in bottom nav
   ↓
2. MobileBottomNav.handleClick() for chatbot item
   ↓
3. useUnifiedChatLauncher.openChat({ initialEmployeeSlug })
   ↓
4. Same flow as desktop from step 4 onwards
```

### User Sends Message
```
1. User types in UnifiedAssistantChat input
   ↓
2. UnifiedAssistantChat.handleSend()
   ↓
3. usePrimeChat.send(message, { files?, employeeSlug })
   ↓
4. POST /.netlify/functions/chat with:
   - userId
   - employeeSlug (from activeEmployeeSlug or initialEmployeeSlug)
   - message
   - sessionId (persisted in localStorage)
   - stream: true
   ↓
5. Backend processes:
   - runInputGuardrails() → PII masking + moderation
   - getMemory() → Retrieve user facts + embeddings
   - routeToEmployee() → Select employee if not specified
   - OpenAI API call with system prompt + memory + messages
   ↓
6. SSE stream returns:
   - text chunks
   - handoff events (employee changes)
   - tool calls
   ↓
7. usePrimeChat.parseSSEEvent() updates messages state
   ↓
8. UnifiedAssistantChat displays streaming response
   ↓
9. When complete, setHasCompletedResponse(true) → Side tab shows activity indicator
```

---

## 3. PAGES & LAYOUTS USING UNIFIED CHAT

### ✅ All Dashboard Pages Use Same Layout

**Layout Structure:**
```
App.tsx
  └─ Routes
      └─ /dashboard (MobileLayoutGate)
          └─ DashboardLayout (src/layouts/DashboardLayout.tsx)
              ├─ DesktopSidebar (left)
              ├─ DashboardHeader
              ├─ <Outlet /> (page content)
              ├─ UnifiedAssistantChat (rendered once)
              ├─ DesktopChatSideBar (desktop launcher)
              └─ MobileBottomNav (mobile launcher)
```

**Dashboard Pages (All use DashboardLayout):**
- `/dashboard` → `XspensesProDashboard`
- `/dashboard/transactions` → `DashboardTransactionsPage`
- `/dashboard/smart-import-ai` → `SmartImportAIPage`
- `/dashboard/goal-concierge` → `GoalConciergePage`
- `/dashboard/debt-payoff-planner` → `DebtPayoffPlannerPage`
- `/dashboard/smart-categories` → `SmartCategoriesPage`
- `/dashboard/spending-predictions` → `SpendingPredictionsPage`
- `/dashboard/ai-financial-assistant` → `AIFinancialAssistantPage`
- ... (all other `/dashboard/*` routes)

**Key Point:** All dashboard pages share the same `DashboardLayout`, which means:
- ✅ Same unified chat component
- ✅ Same desktop side tab launcher
- ✅ Same mobile bottom nav
- ✅ Same global chat state (history preserved across navigation)

---

## 4. OPENING CHAT FROM DASHBOARD PAGES

### ✅ Helper Utility Created

**File**: `src/utils/chatHelpers.ts`

**Usage Example:**
```tsx
import { useChatHelpers, CHAT_EMPLOYEES } from '@/utils/chatHelpers';

function MyPage() {
  const { openChatWithEmployee } = useChatHelpers();
  
  return (
    <button onClick={() => openChatWithEmployee(CHAT_EMPLOYEES.TAG, {
      context: { page: 'transactions', selectionIds: ['tx-1', 'tx-2'] },
      initialQuestion: 'Help me categorize these transactions'
    })}>
      Ask Tag
    </button>
  );
}
```

### ✅ Existing Page Integrations

**DashboardTransactionsPage.tsx:**
- Uses `useUnifiedChatLauncher` directly
- Has "Ask Tag about these transactions" button
- Opens unified chat with `tag-ai` employee

**SmartImportAIPage.tsx:**
- Uses `useUnifiedChatLauncher` directly
- Has "Ask Byte about this import" button
- Opens unified chat with `byte-doc` employee

**DebtPayoffPlannerPage.tsx:**
- Uses `useUnifiedChatLauncher` directly
- Opens unified chat with `liberty-ai` employee

**GoalConciergePage.tsx:**
- ✅ **FIXED**: Removed embedded chat UI
- Now uses `useUnifiedChatLauncher` to open unified chat
- Has "Ask Goalie" button that opens unified chat

---

## 5. LEGACY CODE STATUS

### ✅ Removed from Active Use

**ConnectedDashboard.tsx:**
- ✅ Removed `UniversalChatInterface`, `MobileChatInterface`, `ByteDocumentChat`, `DashboardPrimeChat`
- ✅ Removed `UniversalAIController` and related state
- ✅ No longer renders any chat UI

**main.tsx:**
- ✅ Removed `PrimeChatMount` and `PrimeChatV2Mount` imports

**MobileBottomNav.tsx:**
- ✅ Removed `ByteDocumentChat` import and usage
- ✅ Now uses `useUnifiedChatLauncher` for all chat launches

**GoalConciergePage.tsx:**
- ✅ Removed embedded chat UI (was using legacy `useChat` hook)
- ✅ Now uses unified chat launcher

**SmartImportAIPage.tsx:**
- ✅ Removed `ByteDocumentChat` import (not used)

### ⚠️ Legacy Files Still Exist (But Not Imported)

**Legacy Chat Pages** (in `src/pages/chat/`):
- `PrimeChatSimple.tsx`, `TagChat.tsx`, `GoalieChat.tsx`, etc.
- **Status**: Not imported in active routes
- **Action**: Routes redirect to unified chat via `ChatPageRedirect.tsx`

**Legacy Components** (in `src/components/chat/_legacy/`):
- `ByteDocumentChat.tsx`, `PrimeChat-page.tsx`, etc.
- **Status**: Only imported in test pages (`ByteChatTest.tsx`, `AIEmployeeTestInterface.tsx`)
- **Action**: Safe to archive, but keep for test pages if needed

**Legacy Hooks**:
- `src/hooks/useChat.ts` (not `usePrimeChat`)
- **Status**: Only used by `GoalConciergePage.tsx` (now fixed) and `_legacy/PrimeChat-page.tsx`
- **Action**: Can be archived once legacy components are removed

**Legacy Services**:
- `src/services/UniversalAIController.ts`
- **Status**: Still imported by some components (`MobileChatInterface.tsx`, `UniversalChatInterface.tsx`, `PodcastDashboard.tsx`, etc.)
- **Action**: These components are not used in active routes, but should be migrated if they become active

---

## 6. VERIFICATION CHECKLIST

### ✅ Layout & Wiring
- ✅ `DashboardLayout.tsx` renders `UnifiedAssistantChat` once at layout level
- ✅ `DashboardLayout.tsx` renders `DesktopChatSideBar` for desktop
- ✅ `DashboardLayout.tsx` includes `MobileBottomNav` for mobile
- ✅ All `/dashboard/*` routes use `DashboardLayout` via `MobileLayoutGate`
- ✅ No dashboard page renders its own chat UI

### ✅ Launcher Components
- ✅ Desktop: `DesktopChatSideBar` (vertical blue pill) uses `useUnifiedChatLauncher`
- ✅ Mobile: `MobileBottomNav` Prime button uses `useUnifiedChatLauncher`
- ✅ Both launchers open the same unified chat component

### ✅ Page-Level Chat Opening
- ✅ `DashboardTransactionsPage` uses `useUnifiedChatLauncher` for contextual buttons
- ✅ `SmartImportAIPage` uses `useUnifiedChatLauncher` for contextual buttons
- ✅ `DebtPayoffPlannerPage` uses `useUnifiedChatLauncher` for contextual buttons
- ✅ `GoalConciergePage` uses `useUnifiedChatLauncher` (removed embedded chat)
- ✅ Helper utility `chatHelpers.ts` created for easy chat opening

### ✅ Legacy Code Cleanup
- ✅ No legacy chat components rendered in active routes
- ✅ No legacy chat mounts in `main.tsx`
- ✅ No legacy chat endpoints imported
- ✅ Route-based chat pages redirect to unified chat

### ✅ Security & Architecture
- ✅ All chat requests go through `/.netlify/functions/chat`
- ✅ All requests protected by `guardrails-unified.ts`
- ✅ All requests use canonical memory system
- ✅ No code paths bypass guardrails or memory

---

## 7. KEY FILES SUMMARY

### Layout Files
- **`src/layouts/DashboardLayout.tsx`** ✅ Canonical layout for all dashboard pages
  - Renders `UnifiedAssistantChat`
  - Renders `DesktopChatSideBar`
  - Includes `MobileBottomNav`

### Launcher Components
- **`src/components/chat/DesktopChatSideBar.tsx`** ✅ Desktop vertical blue pill launcher
- **`src/components/layout/MobileBottomNav.tsx`** ✅ Mobile bottom nav with Prime button

### Chat Components
- **`src/components/chat/UnifiedAssistantChat.tsx`** ✅ Single unified chat UI component

### Hooks
- **`src/hooks/useUnifiedChatLauncher.ts`** ✅ Global chat state management
- **`src/hooks/usePrimeChat.ts`** ✅ Backend communication (SSE streaming)

### Utilities
- **`src/utils/chatHelpers.ts`** ✅ Helper for opening chat from any page (NEW)
- **`src/utils/employeeUtils.ts`** ✅ Employee display utilities

### Backend
- **`netlify/functions/chat.ts`** ✅ Canonical chat endpoint
- **`netlify/functions/_shared/router.ts`** ✅ Employee routing
- **`netlify/functions/_shared/guardrails-unified.ts`** ✅ Security layer
- **`netlify/functions/_shared/memory.ts`** ✅ Memory system

---

## 8. REMAINING TODOS & RISKS

### ⚠️ Low Priority TODOs

1. **Archive Legacy Components**:
   - Move `src/components/chat/_legacy/*` to `_archive/` folder
   - Move `src/components/prime/*` (old Prime chat) to archive
   - Keep for reference but mark as deprecated

2. **Archive Legacy Endpoints**:
   - Move `netlify/functions_old/` to `netlify/functions_archive/`
   - Remove `netlify/functions-backup/` if confirmed unused

3. **Remove Deprecated Memory File**:
   - Remove `chat_runtime/memory.ts` (only referenced in docs)

### ⚠️ Potential Risks

1. **Future Dashboard Pages**:
   - **Risk**: New pages might bypass `DashboardLayout` and create their own chat UI
   - **Mitigation**: Document that all dashboard pages must use `DashboardLayout`
   - **Check**: Review any new `/dashboard/*` routes to ensure they use the layout

2. **Legacy Service Still Imported**:
   - **Risk**: `UniversalAIController` still imported by some components (not in active routes)
   - **Mitigation**: If these components become active, migrate them to use unified chat
   - **Files**: `MobileChatInterface.tsx`, `UniversalChatInterface.tsx`, `PodcastDashboard.tsx`

3. **Test Pages**:
   - **Risk**: Test pages (`ByteChatTest.tsx`, `AIEmployeeTestInterface.tsx`) still use legacy components
   - **Mitigation**: These are test pages, acceptable to keep for now
   - **Action**: Consider migrating test pages to use unified chat for consistency

---

## 9. MANUAL TEST CHECKLIST

### Desktop Testing
- [ ] Navigate to `/dashboard` → Side tab visible on right edge
- [ ] Click side tab → Chat panel slides in from right
- [ ] Navigate to `/dashboard/transactions` → Side tab still visible, same position
- [ ] Click "Ask Tag" button → Unified chat opens with Tag employee
- [ ] Close chat → Side tab remains visible
- [ ] Send message → Response streams correctly
- [ ] Navigate to another dashboard page → Chat history preserved

### Mobile Testing
- [ ] Navigate to `/dashboard` → Bottom nav visible
- [ ] Tap "Prime" / AI Chat button → Full-screen chat opens
- [ ] Close chat → Returns to dashboard
- [ ] Re-open chat → History preserved
- [ ] Navigate to `/dashboard/transactions` → Bottom nav still visible
- [ ] Tap "Prime" button → Same unified chat opens

### Security Verification
- [ ] Send message with PII (SSN, credit card) → Verify PII is masked
- [ ] Check network tab → All requests go to `/.netlify/functions/chat`
- [ ] Verify guardrails headers in response → `X-Guardrails`, `X-PII-Mask` present

---

## 10. SUMMARY

### ✅ What's Working
- ✅ Single unified chat system is the only active chat implementation
- ✅ All dashboard pages share the same layout with unified chat
- ✅ Desktop side tab and mobile bottom nav both use the same unified chat
- ✅ Page-level contextual buttons open unified chat with correct employee
- ✅ All chat requests go through canonical endpoint with guardrails and memory
- ✅ No legacy chat components rendered in active routes

### ✅ Architecture Confirmed
- **Layout**: `DashboardLayout.tsx` → Single source of truth for all dashboard pages
- **Launcher**: `DesktopChatSideBar` (desktop) + `MobileBottomNav` (mobile)
- **Chat UI**: `UnifiedAssistantChat` → Rendered once at layout level
- **State**: `useUnifiedChatLauncher` → Global state shared across all pages
- **Backend**: `/.netlify/functions/chat` → Single canonical endpoint

### ✅ Cleanup Completed
- ✅ Removed legacy chat components from `ConnectedDashboard.tsx`
- ✅ Removed legacy mounts from `main.tsx`
- ✅ Removed legacy chat from `MobileBottomNav.tsx`
- ✅ Removed embedded chat from `GoalConciergePage.tsx`
- ✅ Created `ChatPageRedirect.tsx` for legacy routes
- ✅ Created `chatHelpers.ts` utility for easy chat opening

### 🎯 Next Steps (Optional)
1. Archive legacy components to `_archive/` folders
2. Migrate test pages to use unified chat
3. Document that all new dashboard pages must use `DashboardLayout`

---

**End of Summary**






