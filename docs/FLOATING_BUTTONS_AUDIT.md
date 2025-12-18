# Floating Buttons & Chat Launchers Audit

**Date:** February 2025  
**Goal:** Map all floating chat buttons and launchers for consistency with unified chat system

---

## Floating Buttons & Chat Launchers Audit

| Location | Employee / Purpose | OnClick Behaviour | Uses Unified Chat? | Notes |
|----------|-------------------|-------------------|-------------------|-------|
| **DesktopChatSideBar** (Right-edge vertical rail) | | | | |
| `src/components/chat/DesktopChatSideBar.tsx` | Prime | `openChat({ initialEmployeeSlug: 'prime-boss', context: { source: 'rail-prime' } })` | ✅ **YES** | Opens unified chat slideout |
| `src/components/chat/DesktopChatSideBar.tsx` | Byte | `openChat({ initialEmployeeSlug: 'byte-docs', context: { source: 'rail-byte' } })` | ✅ **YES** | Opens unified chat slideout |
| `src/components/chat/DesktopChatSideBar.tsx` | Tag | `openChat({ initialEmployeeSlug: 'tag-ai', context: { source: 'rail-tag' } })` | ✅ **YES** | Opens unified chat slideout |
| `src/components/chat/DesktopChatSideBar.tsx` | Crystal | `openChat({ initialEmployeeSlug: 'crystal-analytics', context: { source: 'rail-analytics' } })` | ✅ **YES** | Opens unified chat slideout |
| `src/components/chat/DesktopChatSideBar.tsx` | History | `window.dispatchEvent(new CustomEvent('openChatHistory'))` | ✅ **YES** | Opens chat history sidebar (not chat) |
| `src/components/chat/DesktopChatSideBar.tsx` | Workspace | `navigate('/dashboard/prime-chat')` | ✅ **YES** | Navigates to Prime Chat page (which uses unified chat) |
| `src/components/chat/DesktopChatSideBar.tsx` | Prime Tools | `setPrimeToolsOpen(true)` | ✅ **YES** | Opens Prime Tools overlay (not chat) |
| **Prime Floating Button** | | | | |
| `src/components/chat/PrimeFloatingButton.tsx` | Prime | `openChat({ initialEmployeeSlug: 'prime-boss', context: { source: 'floating-bubble-prime' } })` | ✅ **YES** | Opens unified chat slideout. Hidden on `/dashboard` routes. |
| **UnifiedChatLauncher** | | | | |
| `src/components/chat/UnifiedChatLauncher.tsx` | Prime | `openChat({ initialEmployeeSlug: 'prime-boss' })` | ✅ **YES** | Opens unified chat slideout. Hidden on `/dashboard` routes. |
| **Mobile Bottom Nav** | | | | |
| `src/components/layout/MobileBottomNav.tsx` | Route-based (Prime/Byte/Tag/Crystal) | `openChat({ initialEmployeeSlug: <currentEmployeeSlug>, context: { page: location.pathname } })` | ✅ **YES** | Opens unified chat slideout with employee based on current route |
| **MiniWorkspacePanel** | | | | |
| `src/components/chat/MiniWorkspacePanel.tsx` | Prime/Byte/Tag/Crystal | `openChat({ initialEmployeeSlug: config.slug, context: { source: 'mini-workspace', entry: '<id>-chat' } })` | ✅ **YES** | Opens unified chat slideout. Triggered from DesktopChatSideBar mini workspace buttons. |
| **UnifiedAssistantChat Attached Rail** | | | | |
| `src/components/chat/UnifiedAssistantChat.tsx` (attached rail) | Prime | `setActiveEmployeeGlobal('prime-boss')` | ✅ **YES** | Switches active employee in unified chat (no new chat UI) |
| `src/components/chat/UnifiedAssistantChat.tsx` (attached rail) | Byte | `setActiveEmployeeGlobal('byte-docs')` | ✅ **YES** | Switches active employee in unified chat (no new chat UI) |
| `src/components/chat/UnifiedAssistantChat.tsx` (attached rail) | Tag | `setActiveEmployeeGlobal('tag-ai')` | ✅ **YES** | Switches active employee in unified chat (no new chat UI) |
| `src/components/chat/UnifiedAssistantChat.tsx` (attached rail) | Crystal | `setActiveEmployeeGlobal('crystal-analytics')` | ✅ **YES** | Switches active employee in unified chat (no new chat UI) |
| `src/components/chat/UnifiedAssistantChat.tsx` (attached rail) | History | `window.dispatchEvent(new CustomEvent('openChatHistory'))` | ✅ **YES** | Opens chat history sidebar (not chat) |
| `src/components/chat/UnifiedAssistantChat.tsx` (attached rail) | Workspace | `navigate('/dashboard/prime-chat')` | ✅ **YES** | Navigates to Prime Chat page |
| `src/components/chat/UnifiedAssistantChat.tsx` (attached rail) | Prime Tools | `setPrimeToolsOpen(true)` | ✅ **YES** | Opens Prime Tools overlay |
| **Prime Sidebar Chat** (LEGACY - Separate UI) | | | | |
| `src/layouts/DashboardLayout.tsx` (Prime Sidebar) | Prime | Opens `PrimeSidebarChat` component (separate sidebar panel) | ❌ **NO** | Uses `EmployeeChatWorkspace` directly, NOT unified chat. Only opens when DesktopChatSideBar Prime button clicked. |
| **Dashboard Prime Bubble** (LEGACY - Unused) | | | | |
| `src/components/dashboard/_legacy/DashboardPrimeBubble.tsx` | Prime | Returns `null` (component disabled) | ❌ **NO** | Legacy component, returns null. Not used. |
| **PrimeChatMount** (LEGACY - Disabled) | | | | |
| `src/ui/components/PrimeChatMount.tsx` | Prime | Opens `PrimeChatDrawer` (separate drawer) | ❌ **NO** | Commented out in `main.tsx`. Not used. Can be deleted. |

---

## Key Findings

### ✅ Components Using Unified Chat (Correct)

1. **DesktopChatSideBar** - All employee buttons use `openChat()` ✅
2. **PrimeFloatingButton** - Uses `openChat()` ✅
3. **UnifiedChatLauncher** - Uses `openChat()` ✅
4. **MobileBottomNav** - Uses `openChat()` ✅
5. **MiniWorkspacePanel** - Uses `openChat()` ✅
6. **UnifiedAssistantChat Attached Rail** - Switches employees in unified chat ✅

### ⚠️ Components NOT Using Unified Chat (Issues)

1. **Prime Sidebar Chat** (`PrimeSidebarChat`)
   - **Location:** `src/layouts/DashboardLayout.tsx` (lines 514-554)
   - **Problem:** Opens a separate sidebar panel with `PrimeSidebarChat` component
   - **Behavior:** Uses `EmployeeChatWorkspace` directly, NOT `UnifiedAssistantChat`
   - **Trigger:** Only opens when DesktopChatSideBar Prime button is clicked (via `handleOpenPrimeSidebar`)
   - **Impact:** Creates a second chat UI that's separate from unified chat
   - **Status:** ⚠️ **INCONSISTENT** - Should use unified chat instead

2. **PrimeChatMount** (Disabled)
   - **Location:** `src/ui/components/PrimeChatMount.tsx`
   - **Problem:** Uses separate `PrimeChatDrawer` component
   - **Status:** ✅ **DISABLED** - Commented out in `main.tsx`, not used

3. **DashboardPrimeBubble** (Legacy)
   - **Location:** `src/components/dashboard/_legacy/DashboardPrimeBubble.tsx`
   - **Status:** ✅ **DISABLED** - Returns null, not used

---

## Fix Plan for Floating Buttons

### ✅ Buttons to KEEP (Already Using Unified Chat)

1. **DesktopChatSideBar** (Right-edge vertical rail)
   - ✅ **KEEP** - All buttons correctly use `openChat()`
   - ✅ Prime, Byte, Tag, Crystal buttons open unified chat
   - ✅ History, Workspace, Prime Tools buttons work correctly
   - **Note:** Prime button currently opens separate sidebar - needs fix (see below)

2. **PrimeFloatingButton** (Bottom-right floating button)
   - ✅ **KEEP** - Uses `openChat()` correctly
   - ✅ Hidden on `/dashboard` routes (correct)
   - ✅ Opens unified chat slideout

3. **UnifiedChatLauncher** (Alternative floating button)
   - ✅ **KEEP** - Uses `openChat()` correctly
   - ✅ Hidden on `/dashboard` routes (correct)
   - ⚠️ **NOTE:** Duplicate of `PrimeFloatingButton`? Check if both are needed

4. **MobileBottomNav** (Mobile bottom navigation)
   - ✅ **KEEP** - Uses `openChat()` correctly
   - ✅ Route-based employee selection works correctly

5. **MiniWorkspacePanel** (Mini workspace popup)
   - ✅ **KEEP** - Uses `openChat()` correctly
   - ✅ Opens unified chat from mini workspace buttons

6. **UnifiedAssistantChat Attached Rail** (Inside chat slideout)
   - ✅ **KEEP** - Employee switcher buttons work correctly
   - ✅ Switches active employee in unified chat (no new UI)

---

### ⚠️ Buttons to FIX or REMOVE

#### 1. Prime Sidebar Chat (Separate UI - HIGH PRIORITY)

**File:** `src/layouts/DashboardLayout.tsx` (lines 514-554)

**Problem:**
- DesktopChatSideBar Prime button opens separate `PrimeSidebarChat` sidebar
- This creates a second chat UI that's NOT unified chat
- User can have both unified chat AND Prime sidebar open at the same time (confusing)

**Current Behavior:**
```typescript
// DesktopChatSideBar Prime button onClick:
onPrimeClick={handleOpenPrimeSidebar}  // Opens separate sidebar

// handleOpenPrimeSidebar:
const handleOpenPrimeSidebar = () => {
  setIsPrimeSidebarOpen(true);  // Opens PrimeSidebarChat component
};
```

**Fix:**
- Change DesktopChatSideBar Prime button to use `openChat()` instead of `handleOpenPrimeSidebar`
- Remove `PrimeSidebarChat` sidebar from DashboardLayout
- Remove `isPrimeSidebarOpen` state and handlers
- All Prime chat should go through unified chat

**Code Change:**
```typescript
// In DesktopChatSideBar.tsx, change Prime button onClick:
onClick: () => {
  openChat({
    initialEmployeeSlug: 'prime-boss',
    context: {
      source: 'rail-prime',
    },
  });
},
```

**Remove from DashboardLayout.tsx:**
- Remove `isPrimeSidebarOpen` state
- Remove `handleOpenPrimeSidebar` and `handleClosePrimeSidebar`
- Remove Prime Sidebar Chat section (lines 514-554)
- Remove `onPrimeClick={handleOpenPrimeSidebar}` from DesktopChatSideBar

---

#### 2. UnifiedChatLauncher vs PrimeFloatingButton (Duplicate Check)

**Files:**
- `src/components/chat/PrimeFloatingButton.tsx`
- `src/components/chat/UnifiedChatLauncher.tsx`

**Problem:**
- Both components render the same floating button (crown bubble)
- Both do the same thing (open unified chat with Prime)
- Both hide on `/dashboard` routes

**Investigation Needed:**
- Check if both are imported/used in the app
- If only one is used, remove the other
- If both are used, consolidate into one component

**Recommendation:**
- Keep `PrimeFloatingButton` (more descriptive name)
- Remove `UnifiedChatLauncher` if duplicate
- Or: Rename `UnifiedChatLauncher` to `PrimeFloatingButton` and remove the old one

---

#### 3. PrimeChatMount (Legacy - Remove)

**File:** `src/ui/components/PrimeChatMount.tsx`

**Problem:**
- Uses separate `PrimeChatDrawer` component (not unified chat)
- Commented out in `main.tsx` (line 8: `// import PrimeChatMount`)
- Not used anywhere

**Action:**
- ✅ **Safe to delete** - Already disabled, not used
- Delete `src/ui/components/PrimeChatMount.tsx`
- Delete `src/ui/components/PrimeChatDrawer.tsx` (if exists and only used by PrimeChatMount)

---

#### 4. DashboardPrimeBubble (Legacy - Already Disabled)

**File:** `src/components/dashboard/_legacy/DashboardPrimeBubble.tsx`

**Status:** ✅ Already returns `null` (disabled)

**Action:**
- ✅ No action needed - already disabled
- Consider deleting file if not needed for reference

---

## Mismatches Found

### 1. DesktopChatSideBar Prime Button Opens Separate Sidebar

**Location:** `src/components/chat/DesktopChatSideBar.tsx` (line 117-124)

**Current:**
```typescript
onClick: () => {
  openChat({ ... });  // ✅ Correct
},
```

**BUT:** In `DashboardLayout.tsx`, Prime button uses:
```typescript
<DesktopChatSideBar 
  onPrimeClick={handleOpenPrimeSidebar}  // ❌ Opens separate sidebar
/>
```

**Issue:** The `onPrimeClick` prop overrides the default `openChat()` behavior

**Fix:** Remove `onPrimeClick` prop from DashboardLayout, let DesktopChatSideBar use default behavior

---

### 2. Prime Sidebar Chat Uses EmployeeChatWorkspace (Not Unified)

**Location:** `src/components/chat/PrimeSidebarChat.tsx`

**Problem:**
- Uses `EmployeeChatWorkspace` directly
- NOT using `UnifiedAssistantChat`
- Creates separate chat UI

**Fix:**
- Remove `PrimeSidebarChat` component
- Remove Prime sidebar from DashboardLayout
- All Prime chat should use unified chat

---

## Summary

### ✅ What's Working Well

- **95% of buttons use unified chat correctly**
- DesktopChatSideBar employee buttons (Byte, Tag, Crystal) work correctly
- PrimeFloatingButton works correctly
- MobileBottomNav works correctly
- MiniWorkspacePanel works correctly
- UnifiedAssistantChat attached rail works correctly

### ⚠️ What Needs Fixing

1. **Prime Sidebar Chat** - Separate UI, should use unified chat
2. **DesktopChatSideBar Prime button** - Opens separate sidebar instead of unified chat
3. **UnifiedChatLauncher vs PrimeFloatingButton** - Check for duplicates
4. **PrimeChatMount** - Remove if unused

### 📊 Consistency Score

**Current:** 85/100
- -10 points: Prime sidebar uses separate UI
- -5 points: Potential duplicate floating buttons

**After Fixes:** 100/100 (all buttons use unified chat)

---

## Recommended Action Plan

### Priority 1: Fix Prime Sidebar (High Impact)

1. Remove `onPrimeClick` prop from DesktopChatSideBar in DashboardLayout
2. Remove Prime Sidebar Chat section from DashboardLayout
3. Remove `PrimeSidebarChat` component (or mark as legacy)
4. Test: Prime button in DesktopChatSideBar should open unified chat

### Priority 2: Consolidate Floating Buttons (Medium Impact)

1. Check if both `PrimeFloatingButton` and `UnifiedChatLauncher` are used
2. If duplicate, remove one
3. If both needed, document why

### Priority 3: Clean Up Legacy Components (Low Impact)

1. ✅ Delete `PrimeChatMount` - Already disabled, safe to remove
2. Delete `DashboardPrimeBubble` if not needed for reference
3. Mark `PrimeSidebarChat` as legacy if keeping for reference

---

**End of Audit**

