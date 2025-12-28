# 🧪 Unified Chat System - Test Plan

**Date**: 2025-01-XX  
**Purpose**: Manual testing checklist for unified chat implementation

---

## ✅ Test Checklist

### 1. Contextual Chat Buttons

#### 1.1 Transactions Page → Ask Tag
- [ ] Navigate to `/dashboard/transactions`
- [ ] Locate "Ask Tag" button in header
- [ ] Click "Ask Tag" button
- [ ] **Expected**: 
  - Unified chat opens (slide-out on desktop, bottom-sheet on mobile)
  - Header shows Tag emoji (🏷️) and name
  - Initial question appears: "Help me understand and clean up my recent transactions."
  - Chat context includes `{ page: 'transactions' }`

#### 1.2 Smart Import Page → Ask Byte
- [ ] Navigate to `/dashboard/smart-import-ai`
- [ ] Locate "Ask Byte" button
- [ ] Click "Ask Byte" button
- [ ] **Expected**:
  - Unified chat opens
  - Header shows Byte emoji (📄) and name
  - Initial question appears: "Help me understand and process this statement."
  - Chat context includes `{ page: 'smart-import' }`

#### 1.3 Goals Page → Ask Goalie
- [ ] Navigate to `/dashboard/goal-concierge`
- [ ] Locate "Ask Goalie" button
- [ ] Click "Ask Goalie" button
- [ ] **Expected**:
  - Unified chat opens
  - Header shows Goalie emoji (🥅) and name
  - Initial question appears: "Help me set or adjust my financial goals based on my recent activity."
  - Chat context includes `{ page: 'goals' }`

#### 1.4 Debt Page → Ask Liberty
- [ ] Navigate to `/dashboard/debt-payoff-planner`
- [ ] Locate "Ask Liberty" button
- [ ] Click "Ask Liberty" button
- [ ] **Expected**:
  - Unified chat opens
  - Header shows Liberty emoji (🗽) and name
  - Initial question appears: "Help me create a debt freedom plan based on my current debts and income."
  - Chat context includes `{ page: 'debts' }`

---

### 2. File Upload from Chat

#### 2.1 Upload PDF/Statement
- [ ] Open unified chat (from any page)
- [ ] Click paperclip (📎) button or drag/drop a PDF file
- [ ] Select a bank statement PDF
- [ ] **Expected**:
  - Upload progress indicator shows ("📤 Uploading document...")
  - File appears in upload preview area
  - Upload completes successfully
  - File is sent to Smart Import pipeline (`smart-import-init` → upload → `smart-import-finalize`)
  - `docId` is stored in upload context

#### 2.2 Upload Image/Screenshot
- [ ] Open unified chat
- [ ] Click image (🖼) button
- [ ] Select or capture an image (receipt, loan screenshot, etc.)
- [ ] **Expected**:
  - Upload progress shows
  - Image appears in preview
  - Upload completes
  - File processed through Smart Import pipeline

#### 2.3 Ask About Uploaded Document
- [ ] After uploading a document (from 2.1 or 2.2)
- [ ] Type: "What is this document?" or "Byte, analyze this"
- [ ] Send message
- [ ] **Expected**:
  - Message includes document context (docId)
  - Backend receives context and can reference the uploaded document
  - AI responds appropriately (Byte processes, Tag categorizes, etc.)

#### 2.4 Upload Error Handling
- [ ] Try uploading a file that's too large or unsupported format
- [ ] **Expected**:
  - Error message appears
  - Upload preview doesn't show invalid file
  - User can try again

---

### 3. Employee Awareness & Handoffs

#### 3.1 Employee Display
- [ ] Open chat with Tag (`initialEmployeeSlug: 'tag-ai'`)
- [ ] **Expected**:
  - Header shows Tag emoji (🏷️) and name
  - Role description visible: "Auto-categorizes transactions"

#### 3.2 Handoff Detection
- [ ] Send a message that triggers employee handoff (e.g., "Help me with debt" → Prime hands off to Liberty)
- [ ] **Expected**:
  - Handoff message appears: "Prime → Liberty"
  - Header updates to show new employee
  - New employee responds

#### 3.3 Employee Switching
- [ ] In chat, ask: "Blitz, turn this into an action plan"
- [ ] **Expected**:
  - Header updates to show Blitz
  - Blitz responds with action plan

---

### 4. Guardrails & User Identity

#### 4.1 Guardrails Indicator
- [ ] Open unified chat
- [ ] Scroll to bottom
- [ ] **Expected**:
  - Footer shows: "🔒 Guardrails + PII Protection Active"

#### 4.2 User Name Display
- [ ] Open unified chat
- [ ] Check header
- [ ] **Expected**:
  - Shows "Chatting as [FirstName]" or "Chatting as [EmailUsername]"
  - Name comes from auth context

---

### 5. Desktop vs Mobile

#### 5.1 Desktop Experience
- [ ] Open dashboard on desktop (width > 768px)
- [ ] Click floating chat button (bottom-right)
- [ ] **Expected**:
  - Chat slides out from right side
  - Width: ~420px
  - Backdrop overlay appears
  - ESC key closes chat
  - Can navigate dashboard pages while chat stays open

#### 5.2 Mobile Experience
- [ ] Open dashboard on mobile (width < 768px)
- [ ] Click floating chat button
- [ ] **Expected**:
  - Chat opens as full-screen bottom sheet
  - Drag handle visible at top
  - Can drag down to minimize
  - Minimized pill shows employee + status
  - Tap pill to reopen

#### 5.3 State Persistence
- [ ] Open chat, send a few messages
- [ ] Close chat (desktop) or minimize (mobile)
- [ ] Navigate to different dashboard page
- [ ] Reopen chat
- [ ] **Expected**:
  - Previous messages still visible
  - Same `sessionId` maintained
  - Conversation history preserved

---

### 6. Integration Points

#### 6.1 Floating Button
- [ ] Check dashboard layout (desktop + mobile)
- [ ] **Expected**:
  - Floating button visible (bottom-right desktop, above bottom nav mobile)
  - Button has gradient background (blue to purple)
  - Clicking opens unified chat

#### 6.2 Global Events
- [ ] Dispatch `window.dispatchEvent(new CustomEvent('unified-chat:open', { detail: { initialEmployeeSlug: 'tag-ai' } }))`
- [ ] **Expected**:
  - Chat opens with Tag as initial employee

#### 6.3 Context Passing
- [ ] Open chat from Transactions page with context
- [ ] Check browser console or network tab
- [ ] **Expected**:
  - Chat request includes context in payload
  - Backend receives context (if supported)

---

### 7. Legacy Chat Cleanup

#### 7.1 Old Chat Entry Points
- [ ] Check if old Prime-only chat buttons still exist
- [ ] **Expected**:
  - Old buttons either:
    - Updated to use `openChat()` with `initialEmployeeSlug: 'prime-boss'`
    - Or removed/hidden

#### 7.2 Navigation
- [ ] Check sidebar/navigation
- [ ] **Expected**:
  - No separate "Prime Chat" or "Tag Chat" pages visible
  - All chat flows go through unified chat

---

## 🐛 Known Issues / TODOs

### Upload Pipeline
- [ ] **TODO**: Backend chat endpoint needs to accept `docId`/`importId` in context
- [ ] **TODO**: Backend tools (Byte, Tag, etc.) need to use document context
- [ ] **TODO**: Add system message when upload completes (currently just console.log)

### Employee Tracking
- [ ] **TODO**: Track employee per message (currently uses active employee)
- [ ] **TODO**: Show employee badge on each assistant message

### Context Passing
- [ ] **TODO**: Backend needs to handle `context` parameter in chat request
- [ ] **TODO**: Tools need to access context (page, filters, selectionIds)

---

## 📊 Test Results Summary

### ✅ Passed Tests
- [ ] Contextual buttons appear on all target pages
- [ ] Buttons open unified chat with correct employee
- [ ] Upload UI works (file selection, drag/drop)
- [ ] Upload connects to Smart Import pipeline
- [ ] Employee awareness in header
- [ ] Guardrails indicator visible
- [ ] User name displays correctly
- [ ] Desktop slide-out works
- [ ] Mobile bottom-sheet works
- [ ] State persists across navigation

### ⚠️ Issues Found
1. **Issue**: [Description]
   - **Severity**: High/Medium/Low
   - **Steps to reproduce**: [Steps]
   - **Expected**: [Expected behavior]
   - **Actual**: [Actual behavior]

2. **Issue**: [Description]
   - **Severity**: High/Medium/Low
   - **Steps to reproduce**: [Steps]
   - **Expected**: [Expected behavior]
   - **Actual**: [Actual behavior]

---

## 🎯 Quick Sanity Checks

### Minimum Viable Test (5 minutes)
1. ✅ Click floating button → Chat opens
2. ✅ Type message → AI responds
3. ✅ Upload file → Shows progress
4. ✅ Click "Ask Tag" from Transactions → Opens with Tag
5. ✅ Close and reopen → History preserved

If all 5 pass, core functionality works! ✅

---

## 📝 Notes

- Test on both desktop (Chrome/Firefox) and mobile (iOS Safari/Chrome)
- Check browser console for errors
- Verify network requests in DevTools
- Test with real user account (not just demo user)

---

**Test Date**: _______________  
**Tester**: _______________  
**Overall Status**: ✅ Pass / ⚠️ Issues Found / ❌ Failed















