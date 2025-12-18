# Chat System Cleanup Plan

**Date:** February 2025  
**Goal:** Map all chat systems and identify duplicates for removal, keeping only the unified system.

---

## 1. COMPREHENSIVE FILE INVENTORY

### Files Using Chat Hooks/Components

| File Path | Hook/Component Used | Employee(s) | Status | Notes |
|-----------|---------------------|-------------|--------|-------|
| **CORE HOOKS** |
| `src/hooks/usePrimeChat.ts` | Defines `usePrimeChat` | All (via employeeSlug) | ✅ **ACTIVE** | Core chat hook, used by EmployeeChatWorkspace |
| `src/hooks/useUnifiedChatLauncher.ts` | Defines `useUnifiedChatLauncher` | All (via employeeSlug) | ✅ **ACTIVE** | Global state for unified chat |
| `src/ui/hooks/useStreamChat.ts` | Defines `useStreamChat` | All (via employeeSlug) | ⚠️ **LEGACY** | Alternative streaming hook, used by some panels |
| `src/hooks/useUnifiedChatEngine.ts` | Uses `usePrimeChat` | All | ✅ **ACTIVE** | Wrapper around usePrimeChat for UnifiedAssistantChat |
| **UNIFIED CHAT COMPONENTS** |
| `src/components/chat/UnifiedAssistantChat.tsx` | Uses `useUnifiedChatEngine`, `useUnifiedChatLauncher` | All | ✅ **ACTIVE** | Main unified chat component (slideout) |
| `src/layouts/DashboardLayout.tsx` | Renders `UnifiedAssistantChat` | All | ✅ **ACTIVE** | Global chat mount point |
| `src/components/chat/PrimeFloatingButton.tsx` | Uses `useUnifiedChatLauncher` | Prime | ✅ **ACTIVE** | Floating chat button |
| **PAGES USING UNIFIED CHAT** |
| `src/pages/dashboard/AICategorizationPage.tsx` | Uses `useUnifiedChatLauncher` | Tag | ✅ **ACTIVE** | Opens unified chat with Tag |
| `src/pages/dashboard/SmartImportAIPage.tsx` | Uses `useUnifiedChatLauncher` | Byte | ✅ **ACTIVE** | Opens unified chat with Byte |
| `src/pages/dashboard/SmartCategoriesPage.tsx` | Uses `useUnifiedChatLauncher` | Tag | ✅ **ACTIVE** | Opens unified chat with Tag |
| `src/pages/dashboard/PrimeChatPage.tsx` | Uses `useUnifiedChatLauncher` | Prime | ✅ **ACTIVE** | Opens unified chat with Prime |
| `src/pages/dashboard/AnalyticsAI.tsx` | Uses `useUnifiedChatLauncher` (via UnifiedCard) | Crystal | ✅ **ACTIVE** | Opens unified chat with Crystal |
| **EMPLOYEE CHAT WORKSPACE** |
| `src/components/chat/EmployeeChatWorkspace.tsx` | Uses `usePrimeChat` (via props) | All | ✅ **ACTIVE** | Reusable inline chat component |
| `src/components/chat/PrimeSidebarChat.tsx` | Uses `usePrimeChat`, `EmployeeChatWorkspace` | Prime | ⚠️ **LEGACY?** | Sidebar chat, may be unused |
| `src/components/chat/PrimeChatWorkspace.tsx` | Uses `usePrimeChat`, `EmployeeChatWorkspace` | Prime | ⚠️ **LEGACY?** | Inline Prime chat workspace |
| **WORKSPACE OVERLAYS (LEGACY)** |
| `src/components/workspace/AIWorkspaceOverlay.tsx` | Uses `EmployeeChatWorkspace` | All | ⚠️ **LEGACY** | Being phased out per audit v2 |
| `src/components/chat/ByteWorkspaceOverlay.tsx` | Uses `AIWorkspaceOverlay` | Byte | ⚠️ **LEGACY** | Wrapper, being phased out |
| `src/components/workspace/employees/PrimeWorkspace.tsx` | Uses `AIWorkspaceOverlay` | Prime | ⚠️ **LEGACY** | Wrapper, being phased out |
| `src/components/workspace/employees/TagWorkspace.tsx` | Uses `AIWorkspaceOverlay` | Tag | ⚠️ **LEGACY** | Wrapper, being phased out |
| `src/components/workspace/employees/CrystalWorkspace.tsx` | Uses `AIWorkspaceOverlay` | Crystal | ⚠️ **LEGACY** | Wrapper, being phased out |
| `src/components/workspace/employees/LibertyWorkspace.tsx` | Uses `AIWorkspaceOverlay` | Liberty | ⚠️ **LEGACY** | Wrapper, being phased out |
| `src/components/workspace/employees/DashWorkspace.tsx` | Uses `AIWorkspaceOverlay` | Dash | ⚠️ **LEGACY** | Wrapper, being phased out |
| `src/components/workspace/employees/GoalieWorkspace.tsx` | Uses `AIWorkspaceOverlay` | Goalie | ⚠️ **LEGACY** | Wrapper, being phased out |
| `src/components/workspace/employees/FinleyWorkspace.tsx` | Uses `AIWorkspaceOverlay` | Finley | ⚠️ **LEGACY** | Wrapper, being phased out |
| **CHAT PANELS (LEGACY)** |
| `src/components/chat/TagChatPanel.tsx` | Uses `useStreamChat`, `useUnifiedChatLauncher` | Tag | ⚠️ **LEGACY** | May be unused |
| `src/components/chat/ByteChatPanel.tsx` | Uses `useStreamChat`, `useUnifiedChatLauncher` | Byte | ⚠️ **LEGACY** | May be unused |
| `src/components/chat/PrimeChatPanel.tsx` | Uses `useStreamChat`, `useUnifiedChatLauncher` | Prime | ⚠️ **LEGACY** | May be unused |
| **LEGACY CHAT PAGES** |
| `src/pages/chat/PrimeChatSimple.tsx` | Uses `usePrimeChat` | Prime | ⚠️ **LEGACY** | Route redirects to unified chat |
| `src/pages/chat/TagChat.tsx` | Uses `usePrimeChat` | Tag | ⚠️ **LEGACY** | Route redirects to unified chat |
| `src/pages/chat/AnalyticsChat.tsx` | Uses `usePrimeChat` | Crystal | ⚠️ **LEGACY** | Route redirects to unified chat |
| `src/pages/chat/TaxChat.tsx` | Uses `usePrimeChat` | Tax | ⚠️ **LEGACY** | Route redirects to unified chat |
| `src/pages/chat/BIChat.tsx` | Uses `usePrimeChat` | BI | ⚠️ **LEGACY** | Route redirects to unified chat |
| `src/pages/chat/WellnessChat.tsx` | Uses `usePrimeChat` | Wellness | ⚠️ **LEGACY** | Route redirects to unified chat |
| `src/pages/chat/SpotifyChat.tsx` | Uses `usePrimeChat` | Spotify | ⚠️ **LEGACY** | Route redirects to unified chat |
| `src/pages/chat/TherapistChat.tsx` | Uses `usePrimeChat` | Therapist | ⚠️ **LEGACY** | Route redirects to unified chat |
| `src/pages/chat/PodcastChat.tsx` | Uses `usePrimeChat` | Podcast | ⚠️ **LEGACY** | Route redirects to unified chat |
| `src/pages/chat/ChimeChat.tsx` | Uses `usePrimeChat` | Chime | ⚠️ **LEGACY** | Route redirects to unified chat |
| `src/pages/chat/DebtChat.tsx` | Uses `usePrimeChat` | Debt | ⚠️ **LEGACY** | Route redirects to unified chat |
| `src/pages/chat/AutomationChat.tsx` | Uses `usePrimeChat` | Automation | ⚠️ **LEGACY** | Route redirects to unified chat |
| `src/pages/chat/SettingsChat.tsx` | Uses `usePrimeChat` | Settings | ⚠️ **LEGACY** | Route redirects to unified chat |
| **PAGES WITH LOCAL CHAT STATE** |
| `src/pages/dashboard/AIFinancialAssistantPage.tsx` | Local `fetch()` calls | Prime | ⚠️ **MIGRATE** | Should use unified chat |
| `src/pages/dashboard/EmployeeChatPage.tsx` | Uses `usePrimeChat` | All | ⚠️ **MIGRATE?** | May be legacy route |
| **OTHER COMPONENTS** |
| `src/components/chat/ChatPageRedirect.tsx` | Uses `useUnifiedChatLauncher` | All | ✅ **ACTIVE** | Redirects legacy routes to unified chat |
| `src/components/chat/DesktopChatSideBar.tsx` | Uses `useUnifiedChatLauncher` | All | ✅ **ACTIVE** | Employee switcher rail |
| `src/components/chat/ChatHistorySidebar.tsx` | Uses `useUnifiedChatLauncher` | All | ✅ **ACTIVE** | Chat history sidebar |
| `src/components/chat/UnifiedChatLauncher.tsx` | Uses `useUnifiedChatLauncher` | All | ✅ **ACTIVE** | Chat launcher component |
| `src/components/chat/SharedChatInterface.tsx` | Uses `useStreamChat` | All | ⚠️ **LEGACY?** | May be unused |
| `src/components/chat/ByteChatPopUp.tsx` | Uses `EmployeeChatWorkspace` | Byte | ⚠️ **LEGACY?** | May be unused |
| `src/components/chat/PrimeChatWindow.tsx` | Uses `EmployeeChatWorkspace` | Prime | ⚠️ **LEGACY?** | May be unused |
| `src/components/smart-import/ByteIntegratedChat.tsx` | Uses `EmployeeChatWorkspace` | Byte | ⚠️ **LEGACY?** | May be unused |
| `src/components/workspace/employees/DashUnifiedCard.tsx` | Uses `EmployeeChatWorkspace` | Dash | ⚠️ **LEGACY?** | May be unused |
| `src/components/prime/PrimeChatV2.tsx` | Uses `usePrimeChat` | Prime | ⚠️ **LEGACY?** | May be unused |
| `src/contexts/PrimeChatContext.tsx` | Uses `usePrimeChat` | Prime | ⚠️ **LEGACY?** | Context wrapper, may be unused |

---

## 2. CANONICAL CHAT PATHS BY EMPLOYEE

### ✅ Prime (prime-boss)
**Path:** `useUnifiedChatLauncher().openChat({ initialEmployeeSlug: 'prime-boss' })` → `UnifiedAssistantChat`
- **Used by:**
  - `PrimeChatPage.tsx` (route: `/dashboard/prime-chat`)
  - `PrimeFloatingButton.tsx` (global floating button)
  - `DashboardLayout.tsx` (global mount)
- **Status:** ✅ **ACTIVE**

### ✅ Byte (byte-docs)
**Path:** `useUnifiedChatLauncher().openChat({ initialEmployeeSlug: 'byte-docs' })` → `UnifiedAssistantChat`
- **Used by:**
  - `SmartImportAIPage.tsx` (route: `/dashboard/smart-import-ai`)
  - `ByteUnifiedCard.tsx` (opens unified chat)
- **Status:** ✅ **ACTIVE**

### ✅ Tag (tag-ai)
**Path:** `useUnifiedChatLauncher().openChat({ initialEmployeeSlug: 'tag-ai' })` → `UnifiedAssistantChat`
- **Used by:**
  - `AICategorizationPage.tsx` (route: `/dashboard/ai-categorization`)
  - `SmartCategoriesPage.tsx` (route: `/dashboard/smart-categories`)
  - `TagUnifiedCard.tsx` (opens unified chat)
- **Status:** ✅ **ACTIVE**

### ✅ Crystal (crystal-analytics)
**Path:** `useUnifiedChatLauncher().openChat({ initialEmployeeSlug: 'crystal-analytics' })` → `UnifiedAssistantChat`
- **Used by:**
  - `AnalyticsAI.tsx` (route: `/dashboard/analytics-ai`)
  - `AnalyticsUnifiedCard.tsx` (opens unified chat)
- **Status:** ✅ **ACTIVE**

---

## 3. CLEANUP PLAN

### ✅ Keep (Active Components)

1. **Core Hooks:**
   - `src/hooks/usePrimeChat.ts` - Core chat hook (used by EmployeeChatWorkspace)
   - `src/hooks/useUnifiedChatLauncher.ts` - Global state management
   - `src/hooks/useUnifiedChatEngine.ts` - Wrapper for UnifiedAssistantChat

2. **Unified Chat System:**
   - `src/components/chat/UnifiedAssistantChat.tsx` - Main unified chat component
   - `src/components/chat/EmployeeChatWorkspace.tsx` - Reusable inline chat (used by overlays)
   - `src/components/chat/PrimeFloatingButton.tsx` - Global floating button
   - `src/components/chat/ChatPageRedirect.tsx` - Redirects legacy routes
   - `src/components/chat/DesktopChatSideBar.tsx` - Employee switcher rail
   - `src/components/chat/ChatHistorySidebar.tsx` - Chat history
   - `src/components/chat/UnifiedChatLauncher.tsx` - Chat launcher component
   - `src/components/chat/ChatInputBar.tsx` - Reusable input component
   - `src/components/chat/ChatOverlayShell.tsx` - Overlay container

3. **Pages Using Unified Chat:**
   - `src/pages/dashboard/AICategorizationPage.tsx`
   - `src/pages/dashboard/SmartImportAIPage.tsx`
   - `src/pages/dashboard/SmartCategoriesPage.tsx`
   - `src/pages/dashboard/PrimeChatPage.tsx`
   - `src/pages/dashboard/AnalyticsAI.tsx`

4. **Layout:**
   - `src/layouts/DashboardLayout.tsx` - Global chat mount point

### ⚠️ Remove or Refactor (Legacy Components)

1. **Workspace Overlays (Being Phased Out):**
   - `src/components/workspace/AIWorkspaceOverlay.tsx` - **REMOVE** (replaced by UnifiedAssistantChat)
   - `src/components/chat/ByteWorkspaceOverlay.tsx` - **REMOVE** (replaced by unified chat)
   - `src/components/workspace/employees/PrimeWorkspace.tsx` - **REMOVE** (replaced by unified chat)
   - `src/components/workspace/employees/TagWorkspace.tsx` - **REMOVE** (replaced by unified chat)
   - `src/components/workspace/employees/CrystalWorkspace.tsx` - **REMOVE** (replaced by unified chat)
   - `src/components/workspace/employees/LibertyWorkspace.tsx` - **REMOVE** (replaced by unified chat)
   - `src/components/workspace/employees/DashWorkspace.tsx` - **REMOVE** (replaced by unified chat)
   - `src/components/workspace/employees/GoalieWorkspace.tsx` - **REMOVE** (replaced by unified chat)
   - `src/components/workspace/employees/FinleyWorkspace.tsx` - **REMOVE** (replaced by unified chat)

2. **Legacy Chat Panels:**
   - `src/components/chat/TagChatPanel.tsx` - **REMOVE** (if unused)
   - `src/components/chat/ByteChatPanel.tsx` - **REMOVE** (if unused)
   - `src/components/chat/PrimeChatPanel.tsx` - **REMOVE** (if unused)

3. **Legacy Chat Pages (Routes Already Redirect):**
   - `src/pages/chat/PrimeChatSimple.tsx` - **REMOVE** (route redirects)
   - `src/pages/chat/TagChat.tsx` - **REMOVE** (route redirects)
   - `src/pages/chat/AnalyticsChat.tsx` - **REMOVE** (route redirects)
   - `src/pages/chat/TaxChat.tsx` - **REMOVE** (route redirects)
   - `src/pages/chat/BIChat.tsx` - **REMOVE** (route redirects)
   - `src/pages/chat/WellnessChat.tsx` - **REMOVE** (route redirects)
   - `src/pages/chat/SpotifyChat.tsx` - **REMOVE** (route redirects)
   - `src/pages/chat/TherapistChat.tsx` - **REMOVE** (route redirects)
   - `src/pages/chat/PodcastChat.tsx` - **REMOVE** (route redirects)
   - `src/pages/chat/ChimeChat.tsx` - **REMOVE** (route redirects)
   - `src/pages/chat/DebtChat.tsx` - **REMOVE** (route redirects)
   - `src/pages/chat/AutomationChat.tsx` - **REMOVE** (route redirects)
   - `src/pages/chat/SettingsChat.tsx` - **REMOVE** (route redirects)

4. **Other Legacy Components:**
   - `src/components/chat/PrimeSidebarChat.tsx` - **REMOVE** (if unused)
   - `src/components/chat/PrimeChatWorkspace.tsx` - **REMOVE** (if unused)
   - `src/components/chat/SharedChatInterface.tsx` - **REMOVE** (if unused)
   - `src/components/chat/ByteChatPopUp.tsx` - **REMOVE** (if unused)
   - `src/components/chat/PrimeChatWindow.tsx` - **REMOVE** (if unused)
   - `src/components/smart-import/ByteIntegratedChat.tsx` - **REMOVE** (if unused)
   - `src/components/workspace/employees/DashUnifiedCard.tsx` - **CHECK** (may be used)
   - `src/components/prime/PrimeChatV2.tsx` - **REMOVE** (if unused)
   - `src/contexts/PrimeChatContext.tsx` - **REMOVE** (if unused)

5. **Legacy Hook:**
   - `src/ui/hooks/useStreamChat.ts` - **EVALUATE** (used by panels, may be needed for specific use cases)

### 🔄 Pages to Update

1. **Migrate to Unified Chat:**
   - `src/pages/dashboard/AIFinancialAssistantPage.tsx` - Replace local `fetch()` calls with `useUnifiedChatLauncher`
   - `src/pages/dashboard/EmployeeChatPage.tsx` - Migrate to unified chat if still in use

2. **Verify Usage Before Removal:**
   - Check if any workspace panels or cards still reference `AIWorkspaceOverlay` or workspace components
   - Verify `EmployeeChatWorkspace` is only used by `AIWorkspaceOverlay` (if removing overlays, may need to keep for other uses)

---

## 4. MIGRATION CHECKLIST

### Phase 1: Verify Dependencies
- [ ] Search codebase for imports of `AIWorkspaceOverlay`
- [ ] Search codebase for imports of `ByteWorkspaceOverlay`
- [ ] Search codebase for imports of workspace components (TagWorkspace, CrystalWorkspace, etc.)
- [ ] Verify no active routes use legacy chat pages
- [ ] Check if `EmployeeChatWorkspace` is used outside of overlays

### Phase 2: Remove Legacy Components
- [ ] Remove `AIWorkspaceOverlay.tsx` and all workspace wrappers
- [ ] Remove legacy chat panels (TagChatPanel, ByteChatPanel, PrimeChatPanel)
- [ ] Remove legacy chat pages in `src/pages/chat/`
- [ ] Remove unused components (PrimeSidebarChat, PrimeChatWorkspace, etc.)
- [ ] Remove `PrimeChatContext.tsx` if unused

### Phase 3: Migrate Remaining Pages
- [ ] Migrate `AIFinancialAssistantPage.tsx` to unified chat
- [ ] Migrate `EmployeeChatPage.tsx` to unified chat (if still needed)

### Phase 4: Clean Up Imports
- [ ] Remove unused imports from remaining files
- [ ] Update any remaining references to legacy components
- [ ] Verify all routes use unified chat

### Phase 5: Documentation
- [ ] Update component documentation
- [ ] Update route documentation
- [ ] Update developer guide

---

## 5. SUMMARY

### Current State
- **5 pages** fully migrated to unified chat (AICategorizationPage, SmartImportAIPage, SmartCategoriesPage, PrimeChatPage, AnalyticsAI)
- **1 page** still uses local chat state (AIFinancialAssistantPage) - needs migration
- **~15 legacy chat pages** in `src/pages/chat/` - routes redirect, files can be removed
- **~9 workspace overlay components** - being phased out, can be removed
- **~3 chat panels** - may be unused, verify and remove

### Target State
- **Single unified chat system:** `useUnifiedChatLauncher` + `UnifiedAssistantChat`
- **All pages** use unified chat launcher
- **No duplicate chat implementations**
- **Clean component tree** with minimal legacy code

### Estimated Cleanup
- **~30 files** can be removed (legacy pages, overlays, panels)
- **~2 pages** need migration
- **~1 hook** (`useStreamChat`) needs evaluation

---

**End of Cleanup Plan**





