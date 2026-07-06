# XspensesAI Chat System Architecture

**Date**: January 21, 2025  
**Status**: Current State Analysis (No Changes Made)

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Message Flow](#message-flow)
3. [Component Map](#component-map)
4. [Routes & Entry Points](#routes--entry-points)
5. [UI State Locations](#ui-state-locations)
6. [Known Issues](#known-issues)

---

## High-Level Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE LAYER                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ UnifiedCard  │  │ UnifiedCard  │  │ UnifiedCard  │      │
│  │   (Byte)     │  │    (Tag)     │  │  (Crystal)   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘             │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │ useUnifiedChat │                        │
│                   │    Launcher    │                        │
│                   └────────┬───────┘                        │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │ UnifiedAssistant│                        │
│                   │      Chat       │                        │
│                   └────────┬───────┘                        │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                              │
                              │ HTTP POST
                              │
┌─────────────────────────────▼─────────────────────────────────┐
│                    NETLIFY FUNCTION LAYER                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  /.netlify/functions/chat                            │   │
│  │  - Employee routing                                  │   │
│  │  - Guardrails & PII masking                          │   │
│  │  - Session management                                │   │
│  │  - Memory retrieval                                  │   │
│  │  - OpenAI streaming                                  │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
                      │ OpenAI API
                      │
┌─────────────────────▼────────────────────────────────────────┐
│                    OPENAI API LAYER                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  - GPT-4o-mini (default)                                     │
│  - Employee-specific model configs                           │
│  - Tool calling support                                      │
│  - Streaming responses                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Unified Chat Interface**: Single `UnifiedAssistantChat` component handles all employees
2. **Global State Management**: `useUnifiedChatLauncher` hook manages global chat state via singleton pattern
3. **Employee Routing**: Backend (`netlify/functions/chat`) routes messages to correct employee based on `employeeSlug`
4. **Dual UI Modes**: 
   - Prime uses `PrimeSlideoutShell` (right-side slideout)
   - Other employees use `ChatOverlayShell` (centered overlay)

---

## Message Flow

### Complete Flow: UI → Backend → OpenAI → Response

```
1. USER TYPES MESSAGE
   │
   ├─> UnifiedAssistantChat.tsx
   │   └─> handleSend() called
   │
2. HOOK PROCESSING
   │
   ├─> useStreamChat.sendMessage()
   │   └─> Creates user message object
   │   └─> Sets streaming state
   │
3. HTTP REQUEST
   │
   ├─> POST /.netlify/functions/chat
   │   Body: {
   │     userId: string,
   │     employeeSlug: 'prime-boss' | 'byte-docs' | 'tag-ai' | 'crystal-analytics',
   │     message: string,
   │     sessionId: string (optional),
   │     stream: true
   │   }
   │
4. BACKEND PROCESSING (netlify/functions/chat.ts)
   │
   ├─> Guardrails check (runInputGuardrails)
   │   ├─> PII masking
   │   ├─> Content moderation
   │   └─> Jailbreak detection
   │
   ├─> Employee routing
   │   ├─> Load employee profile from database
   │   ├─> Get system prompt
   │   └─> Get allowed tools
   │
   ├─> Session management
   │   ├─> Ensure session exists (chat_sessions table)
   │   └─> Load conversation history (chat_messages table)
   │
   ├─> Memory retrieval (optional)
   │   └─> Search embeddings for relevant context
   │
   ├─> OpenAI API call
   │   ├─> Build messages array (system + history + user)
   │   ├─> Configure model (employee-specific)
   │   └─> Stream response
   │
5. STREAMING RESPONSE
   │
   ├─> Server-Sent Events (SSE)
   │   ├─> data: { type: 'token', content: '...' }
   │   ├─> data: { type: 'tool_call', ... }
   │   └─> data: { type: 'done' }
   │
6. FRONTEND PROCESSING
   │
   ├─> useStreamChat hook
   │   ├─> Parses SSE events
   │   ├─> Updates message state
   │   ├─> Handles tool calls
   │   └─> Updates streaming state
   │
7. UI UPDATE
   │
   └─> UnifiedAssistantChat re-renders
       └─> Messages displayed in scrollable area
```

### Employee Routing

**Prime (`prime-boss`)**:
- Default fallback if no slug provided
- Uses `PrimeSlideoutShell` (right-side slideout)
- Has attached floating rail on left side
- Guardrails banner shown

**Byte (`byte-docs`)**:
- Document processing specialist
- Uses `ChatOverlayShell` (centered overlay)
- Special file upload handling via `ByteInlineUpload`
- Entry: Smart Import AI page

**Tag (`tag-ai`)**:
- Categorization specialist
- Uses `ChatOverlayShell` (centered overlay)
- Entry: Smart Categories page

**Crystal (`crystal-analytics`)**:
- Analytics & insights specialist
- Uses `ChatOverlayShell` (centered overlay)
- Entry: Analytics AI page

---

## Component Map

### Core Chat Components

#### 1. `UnifiedAssistantChat.tsx`
**Location**: `src/components/chat/UnifiedAssistantChat.tsx`  
**Purpose**: Main chat interface component for all employees

**What it renders**:
- Prime: `PrimeSlideoutShell` with attached floating rail
- Others: `ChatOverlayShell` (centered overlay)

**Key Props**:
- `isOpen: boolean` - Controls visibility
- `onClose: () => void` - Close handler
- `initialEmployeeSlug?: string` - Default: 'prime-boss'
- `conversationId?: string` - Session ID
- `context?: any` - Page context data
- `initialQuestion?: string` - Pre-filled message

**Key State**:
- `inputMessage: string` - Current input text
- `isRailHidden: boolean` - Rail visibility (Prime only)
- `showUploadCard: boolean` - Upload UI visibility
- `uploadStatus: StatusType | null` - Upload progress

**Connections**:
- Uses `useUnifiedChatLauncher` for global state
- Uses `useStreamChat` for message streaming
- Uses `EMPLOYEE_CHAT_CONFIG` for employee configs
- Renders `PrimeSlideoutShell` or `ChatOverlayShell` based on employee

**Rendering Logic**:
```typescript
if (normalizedSlug === 'prime-boss') {
  // Prime: Right-side slideout with attached rail
  return <PrimeSlideoutShell floatingRail={...} />
} else {
  // Others: Centered overlay
  return <ChatOverlayShell />
}
```

---

#### 2. `useUnifiedChatLauncher.ts`
**Location**: `src/hooks/useUnifiedChatLauncher.ts`  
**Purpose**: Global state management for chat system

**State Structure**:
```typescript
interface ChatState {
  isOpen: boolean;
  options: ChatLaunchOptions;
  activeEmployeeSlug?: string;
  activeEmployeeEmoji?: string;
  activeEmployeeShortName?: string;
  isWorking: boolean;
  hasCompletedResponse: boolean;
  hasNewResponse: boolean;
  hasAttention: boolean;
  hasActivity: boolean;
  lastAssistantMessageAt?: number;
  lastChatViewedAt?: number;
  progress?: number;
}
```

**Key Functions**:
- `openChat(options?)` - Opens chat with employee slug
- `closeChat()` - Closes chat
- `setActiveEmployee(slug)` - Switches active employee
- `setIsWorking(boolean)` - Updates working state
- `setHasCompletedResponse(boolean)` - Marks response complete

**Implementation Pattern**:
- Singleton global state object
- Listener pattern for React components
- Defaults to `'prime-boss'` if no slug provided

---

#### 3. `useStreamChat.ts`
**Location**: `src/ui/hooks/useStreamChat.ts`  
**Purpose**: Handles message streaming from backend

**Key Functions**:
- `sendMessage(content: string)` - Sends message to backend
- `stop()` - Cancels streaming

**State**:
- `messages: Message[]` - Conversation history
- `isStreaming: boolean` - Currently streaming
- `error: Error | null` - Error state
- `isToolExecuting: boolean` - Tool call in progress
- `currentTool: string | null` - Active tool name
- `activeEmployeeSlug: string` - Current employee (can change via handoff)

**API Call**:
```typescript
POST /.netlify/functions/chat
Body: {
  userId: string,
  employeeSlug: string,
  message: string,
  sessionId?: string,
  stream: true
}
```

---

#### 4. `DesktopChatSideBar.tsx`
**Location**: `src/components/chat/DesktopChatSideBar.tsx`  
**Purpose**: Global floating rail on right edge of screen

**What it renders**:
- Vertical stack of icon buttons
- Prime, Byte, Tag, Crystal buttons
- History button
- Workspace button
- Prime Tools button

**Positioning**:
- Fixed to right edge of screen
- Desktop-only (hidden on mobile)
- z-index: 998

**Key Actions**:
- Each button calls `openChat({ initialEmployeeSlug: '...' })`
- Workspace button navigates to `/dashboard/prime-chat`
- History button dispatches `openChatHistory` event

**Rendering Location**:
- Rendered in `DashboardLayout.tsx` (line 576)
- Conditionally hidden when `isChatOpen` is true

---

#### 5. `PrimeSlideoutShell.tsx`
**Location**: `src/components/prime/PrimeSlideoutShell.tsx`  
**Purpose**: Right-side slideout panel shell for Prime

**What it renders**:
- Sticky header with title, subtitle, status badge
- Guardrails banner (optional)
- Scrollable content area
- Sticky footer (optional)
- Floating rail (optional, absolutely positioned on left)

**Key Props**:
- `title: string` - Panel title
- `subtitle?: string` - Description
- `statusBadge?: ReactNode` - Status indicator
- `floatingRail?: ReactNode` - Rail component
- `onClose?: () => void` - Close handler
- `footer?: ReactNode` - Footer content

**Positioning**:
- Fixed right-side slideout
- `max-w-xl` width
- `h-[calc(100vh-3rem)]` height
- `overflow-visible` to allow rail to extend outside

**Floating Rail**:
- Absolutely positioned: `-left-12 top-1/2 -translate-y-1/2`
- Contains buttons for Byte, Tag, Crystal, Hide/Show, History, Workspace, Prime Tools
- Only visible when `floatingRail` prop provided

---

#### 6. `ChatOverlayShell.tsx`
**Location**: `src/components/chat/ChatOverlayShell.tsx`  
**Purpose**: Centered overlay shell for non-Prime employees

**What it renders**:
- Centered modal card
- Gradient border (amber/orange/pink)
- Header with title, subtitle, status
- Scrollable content area
- Footer with input bar
- Suggested prompts row (optional)

**Positioning**:
- Fixed overlay covering entire screen
- Centered card: `w-[min(1280px,100vw-3rem)]`
- Height: `h-[min(620px,calc(100vh-5rem))]`
- z-index: 50

**Used For**:
- Byte (`byte-docs`)
- Tag (`tag-ai`)
- Crystal (`crystal-analytics`)
- Finley (`finley-forecasts`)
- All other employees

---

#### 7. `ChatInputBar.tsx`
**Location**: `src/components/chat/ChatInputBar.tsx`  
**Purpose**: Reusable input bar component

**What it renders**:
- Textarea input
- Gradient send button (circular)
- Loading spinner when streaming

**Key Props**:
- `value: string` - Input value
- `onChange: (value) => void` - Change handler
- `onSubmit: () => void` - Submit handler
- `placeholder?: string` - Placeholder text
- `isStreaming?: boolean` - Streaming state
- `sendButtonGradient?: string` - Button gradient classes
- `sendButtonGlow?: string` - Button glow color

**Send Button**:
- Gradient: `from-amber-400 via-orange-500 to-pink-500` (default)
- Size: `h-12 w-16` (rounded-full)
- Icon: `Send` from lucide-react (`text-slate-950`)

---

### Supporting Components

#### 8. `EmployeeChatWorkspace.tsx`
**Location**: `src/components/chat/EmployeeChatWorkspace.tsx`  
**Purpose**: Legacy chat workspace component (still used in some places)

**Status**: ⚠️ Legacy - Being phased out in favor of `UnifiedAssistantChat`

---

#### 9. `PrimeChatPanel.tsx`, `TagChatPanel.tsx`, `ByteChatPanel.tsx`
**Location**: `src/components/chat/*ChatPanel.tsx`  
**Purpose**: Legacy employee-specific panels

**Status**: ⚠️ Legacy - Not used by unified system

---

#### 10. `PrimeFloatingButton.tsx`
**Location**: `src/components/chat/PrimeFloatingButton.tsx`  
**Purpose**: Floating action button (bottom-right)

**What it renders**:
- Fixed position button (bottom-right)
- Crown emoji (👑)
- Gradient background (blue to purple)

**Behavior**:
- Hidden on dashboard routes
- Calls `openChat({ initialEmployeeSlug: 'prime-boss' })`
- z-index: 30

**Rendering Location**:
- `DashboardLayout.tsx` (line 585)
- Hidden when `isChatOpen` is true

---

### Configuration Files

#### 11. `employeeChatConfig.ts`
**Location**: `src/config/employeeChatConfig.ts`  
**Purpose**: Employee configuration and styling

**Structure**:
```typescript
EMPLOYEE_CHAT_CONFIG: Record<EmployeeChatKey, EmployeeChatConfig>

interface EmployeeChatConfig {
  emoji: string;
  title: string;
  subtitle?: string;
  welcomeMessage: string;
  gradient: string; // Tailwind gradient classes
  cardTitle?: string;
  description?: string;
  badgeLabel?: string;
  quickActions?: QuickAction[];
}
```

**Defined Employees**:
- `prime-boss` - 👑 Prime — Chat
- `byte-docs` - 📥 Byte — Chat
- `tag-ai` - 🏷️ Tag — Chat
- `crystal-analytics` - 📊 Crystal — Chat
- `finley-forecasts` - 🧮 Finley — Chat
- `goalie-goals` - 🎯 Goalie — Chat
- `blitz-debt` - ⚡ Blitz — Chat
- `liberty-freedom` - 🗽 Liberty — Chat
- `chime-reminders` - 🔔 Chime — Chat
- `ledger-tax` - 📋 Ledger — Chat

---

#### 12. `employeeUtils.ts`
**Location**: `src/utils/employeeUtils.ts`  
**Purpose**: Helper functions for employee info

**Key Functions**:
- `getEmployeeDisplay(slug)` - Returns emoji + shortName
- `getEmployeeInfo(slug)` - Returns full employee info
- `getEmployeeEmoji(slug)` - Returns emoji only
- `getEmployeeName(slug)` - Returns name only

**Slug Mapping**:
- Maps canonical slugs (`byte-docs`, `tag-ai`) to employee keys
- Handles multiple slug variations (e.g., `byte-doc`, `byte-docs`, `byte-ai` → `byte`)

---

## Routes & Entry Points

### Prime Chat Entry Points

#### 1. Sidebar "Prime Chat" Button
**Location**: `DesktopChatSideBar.tsx` (line 112-124)  
**Action**: 
```typescript
openChat({
  initialEmployeeSlug: 'prime-boss',
  context: { source: 'rail-prime' }
})
```

#### 2. Floating Rail Buttons (Inside Prime Chat)
**Location**: `UnifiedAssistantChat.tsx` (line 441-520)  
**Action**: 
- Byte button: `setActiveEmployeeGlobal('byte-docs')`
- Tag button: `setActiveEmployeeGlobal('tag-ai')`
- Crystal button: `setActiveEmployeeGlobal('crystal-analytics')`
- History button: Dispatches `openChatHistory` event
- Workspace button: Navigates to `/dashboard/prime-chat`
- Prime Tools button: Opens Prime Tools overlay

#### 3. Prime Chat Page (`/dashboard/prime-chat`)
**Location**: `src/pages/dashboard/PrimeChatPage.tsx`  
**Action**:
- Page loads → `setActiveEmployee('prime-boss')` (line 48)
- `PrimeUnifiedCard` has `onChatInputClick` → calls `openWorkspace()` (line 137)
- `openWorkspace()` → `setActiveEmployee('prime-boss')` + `setPrimePanel('chat')` (line 114-117)

**Note**: PrimeChatPage doesn't directly render `UnifiedAssistantChat`. It relies on `DashboardLayout` to render it based on global state.

#### 4. Prime Floating Button (Bottom-Right)
**Location**: `PrimeFloatingButton.tsx` (line 29-42)  
**Action**:
```typescript
openChat({ 
  initialEmployeeSlug: 'prime-boss',
  context: { source: 'floating-bubble-prime' }
})
```

**Visibility**: Hidden on dashboard routes

---

### Byte (Smart Import) Entry Points

#### 1. Smart Import AI Page (`/dashboard/smart-import-ai`)
**Location**: `src/pages/dashboard/SmartImportAIPage.tsx`  
**Action**:
- `ByteUnifiedCard` button → `handleChatClick()` (line 50-59)
- Calls `openChat({ initialEmployeeSlug: 'byte-docs', ... })`

#### 2. DesktopChatSideBar Button
**Location**: `DesktopChatSideBar.tsx` (line 127-139)  
**Action**:
```typescript
openChat({
  initialEmployeeSlug: 'byte-docs',
  context: { source: 'rail-byte' }
})
```

#### 3. Floating Rail (Inside Prime Chat)
**Location**: `UnifiedAssistantChat.tsx` (line 444-453)  
**Action**: `setActiveEmployeeGlobal('byte-docs')`

---

### Tag (Smart Categories) Entry Points

#### 1. Smart Categories Page (`/dashboard/smart-categories`)
**Location**: `src/pages/dashboard/SmartCategoriesPage.tsx`  
**Action**:
- `TagUnifiedCard` button → `handleChatClick()` (line 36-49)
- Calls `openChat({ initialEmployeeSlug: 'tag-ai', ... })`

#### 2. DesktopChatSideBar Button
**Location**: `DesktopChatSideBar.tsx` (line 141-154)  
**Action**:
```typescript
openChat({
  initialEmployeeSlug: 'tag-ai',
  context: { source: 'rail-tag' }
})
```

#### 3. Floating Rail (Inside Prime Chat)
**Location**: `UnifiedAssistantChat.tsx` (line 456-465)  
**Action**: `setActiveEmployeeGlobal('tag-ai')`

---

### Crystal (Analytics) Entry Points

#### 1. Analytics AI Page (`/dashboard/analytics-ai`)
**Location**: `src/pages/dashboard/AnalyticsAI.tsx`  
**Action**:
- `AnalyticsUnifiedCard` button → `handleChatClick()` (line 22-35)
- Calls `openChat({ initialEmployeeSlug: 'crystal-analytics', ... })`

#### 2. DesktopChatSideBar Button
**Location**: `DesktopChatSideBar.tsx` (line 156-169)  
**Action**:
```typescript
openChat({
  initialEmployeeSlug: 'crystal-analytics',
  context: { source: 'rail-analytics' }
})
```

#### 3. Floating Rail (Inside Prime Chat)
**Location**: `UnifiedAssistantChat.tsx` (line 468-477)  
**Action**: `setActiveEmployeeGlobal('crystal-analytics')`

---

### Finley (AI Chat Assistant) Entry Points

#### 1. AI Chat Assistant Page (`/dashboard/ai-chat-assistant`)
**Location**: `src/pages/dashboard/AIChatAssistantPage.tsx`  
**Action**:
- `FinleyUnifiedCard` button → `handleChatClick()` (line 22-35)
- Calls `openChat({ initialEmployeeSlug: 'finley-forecasts', ... })`

---

## UI State Locations

### Prime Slideout UI

**Location**: `UnifiedAssistantChat.tsx` (lines 422-709)  
**Shell**: `PrimeSlideoutShell.tsx`

**Components**:
- **Header**: Sticky header with title "PRIME — CHAT", subtitle, status badge
- **Floating Rail**: Absolutely positioned on left side (`-left-12`)
  - Contains: Byte, Tag, Crystal, Hide/Show, History, Workspace, Prime Tools buttons
  - Only visible when `isRailHidden === false`
- **Messages Area**: Scrollable div with message bubbles
- **Footer**: Input bar with textarea + send button

**Styling**:
- Right-side slideout: `max-w-xl`, `h-[calc(100vh-3rem)]`
- Gradient border: `from-slate-900/80 via-slate-950 to-slate-950`
- Shadow: `shadow-[0_0_0_1px_rgba(15,23,42,0.9),-18px_0_40px_rgba(56,189,248,0.25)]`

---

### Non-Prime Overlay UI

**Location**: `UnifiedAssistantChat.tsx` (lines 712-838)  
**Shell**: `ChatOverlayShell.tsx`

**Components**:
- **Header**: Title (e.g., "BYTE — CHAT"), subtitle, status badge, close button
- **Messages Area**: Scrollable div with message bubbles
- **Footer**: `ChatInputBar` component with gradient send button

**Styling**:
- Centered overlay: `w-[min(1280px,100vw-3rem)]`, `h-[min(620px,calc(100vh-5rem))]`
- Gradient border: `from-amber-400/60 via-orange-500/50 to-pink-500/60`
- Background: `bg-[#050816]/95 backdrop-blur-2xl`

---

### Send Button Locations

#### Prime Chat Send Button
**Location**: `UnifiedAssistantChat.tsx` (lines 560-572)  
**Current Code**:
```tsx
<button
  type="submit"
  disabled={isStreaming || !inputMessage.trim()}
  className="h-10 w-10 shrink-0 rounded-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-lg"
>
  {isStreaming ? (
    <Loader2 className="h-5 w-5 animate-spin text-white" />
  ) : (
    <Send className="h-5 w-5 text-white" fill="none" strokeWidth={2.5} />
  )}
</button>
```

**Status**: ✅ Fixed (orange gradient, white icon, proper sizing)

---

#### Non-Prime Chat Send Button
**Location**: `ChatInputBar.tsx` (lines 92-128)  
**Current Code**:
```tsx
<button
  type="submit"
  disabled={!value.trim() || isStreaming || disabled}
  className="flex items-center justify-center h-12 w-16 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 ..."
>
  {isStreaming ? (
    <Loader2 className="h-5 w-5 text-slate-950 animate-spin" />
  ) : (
    <Send className="h-5 w-5 text-slate-950" />
  )}
</button>
```

**Status**: ✅ Uses gradient (amber/orange/pink), dark icon

---

### Floating Rails

#### 1. Global Desktop Rail (Right Edge)
**Location**: `DashboardLayout.tsx` (line 576)  
**Component**: `DesktopChatSideBar`  
**Positioning**: Fixed to right edge, z-index: 998  
**Visibility**: Hidden when `isChatOpen === true`

**Buttons**:
- Prime (Crown icon)
- Byte (Upload icon)
- Tag (Tags icon)
- Crystal (LineChart icon)
- History (History icon)
- Workspace (LayoutDashboard icon)
- Prime Tools (Grid3X3 icon)

---

#### 2. Prime Chat Attached Rail (Left Side)
**Location**: `UnifiedAssistantChat.tsx` (lines 441-520)  
**Positioning**: Absolutely positioned inside `PrimeSlideoutShell`  
**CSS**: `absolute -left-12 top-1/2 -translate-y-1/2`  
**Parent**: `PrimeSlideoutShell` with `overflow-visible`

**Buttons**:
- Byte (Upload icon) → `setActiveEmployeeGlobal('byte-docs')`
- Tag (Tags icon) → `setActiveEmployeeGlobal('tag-ai')`
- Crystal (LineChart icon) → `setActiveEmployeeGlobal('crystal-analytics')`
- Hide/Show (Eye/EyeOff icon) → `setIsRailHidden(!isRailHidden)`
- History (History icon) → Dispatches `openChatHistory` event
- Workspace (LayoutDashboard icon) → Navigates to `/dashboard/prime-chat`
- Prime Tools (Grid3X3 icon) → Opens Prime Tools overlay

**Status**: ✅ Attached to panel (not screen), moves with slideout

---

### Teal Chat Bars / Duplicate Inputs

**Status**: ✅ **REMOVED** - No teal chat bars found in current codebase

**Previous Locations** (now removed):
- ❌ No `bg-teal-*` classes found in chat components
- ❌ No `bg-[#00...]` teal colors found
- ❌ No duplicate chat inputs found

**Remaining Teal References**:
- `TagUnifiedCard.tsx` (line 57): `bg-teal-600` - Avatar circle (cosmetic, not chat input)
- `TagWorkspacePanel.tsx`: Teal accent colors for UI elements (not chat bars)

---

## Known Issues

### 1. Send Button Icon Visibility

**Issue**: Send icon may not be visible in some browsers  
**Location**: `UnifiedAssistantChat.tsx` (line 570)  
**Current Fix**: Added `fill="none" strokeWidth={2.5}` props  
**Status**: ✅ Fixed in code, may require cache clear

**Root Cause**: Icon color may be overridden by CSS or browser defaults

---

### 2. Employee Slug Defaulting to Prime

**Issue**: All pages opening Prime chat instead of their own employee  
**Location**: Multiple UnifiedCard components  
**Status**: ✅ **FIXED**

**Root Cause**: UnifiedCards weren't calling `openChat()` directly, relying on parent pages  
**Fix Applied**: 
- `ByteUnifiedCard`: Added `useUnifiedChatLauncher` + `handleChatClick` with `byte-docs`
- `FinleyUnifiedCard`: Added `useUnifiedChatLauncher` + `handleChatClick` with `finley-forecasts`
- `TagUnifiedCard`: Already correct (`tag-ai`)
- `AnalyticsUnifiedCard`: Already correct (`crystal-analytics`)

---

### 3. Chat Content Not Displaying

**Issue**: Byte/Tag/Analytics pages show only header, no messages  
**Location**: `UnifiedAssistantChat.tsx`  
**Status**: ⚠️ **POTENTIALLY FIXED** (requires testing)

**Possible Causes**:
- Messages not loading from backend
- Scroll container height issues
- Employee slug mismatch

**Fix Applied**: Added `min-h-full` to messages container

---

### 4. Database Table Missing

**Issue**: `chat_convo_summaries` table may not exist  
**Location**: `useChatSessions.ts` (line 62)  
**Status**: ✅ **FIXED** with fallback

**Fix Applied**: 
- Try `chat_convo_summaries` first
- Fallback to `chat_sessions` if table missing
- Return empty array if both fail (chat still works)

---

### 5. Floating Rail Positioning

**Issue**: Rail may be too far left or clipped  
**Location**: `PrimeSlideoutShell.tsx` (line 86)  
**Status**: ✅ **FIXED**

**Current Position**: `-left-12 top-1/2 -translate-y-1/2`  
**Parent Overflow**: Changed to `overflow-visible` to prevent clipping

---

### 6. Inconsistencies Between Prime vs Others

**UI Differences**:
- ✅ **Prime**: Right-side slideout (`PrimeSlideoutShell`)
- ✅ **Others**: Centered overlay (`ChatOverlayShell`)
- ✅ **Prime**: Has attached floating rail
- ✅ **Others**: No rail (use global `DesktopChatSideBar`)

**Send Button Differences**:
- ✅ **Prime**: Orange solid button (`bg-orange-500`)
- ✅ **Others**: Gradient button (`from-amber-400 via-orange-500 to-pink-500`)

**These are intentional design differences, not bugs.**

---

## Backend Architecture

### Netlify Function: `/.netlify/functions/chat`

**Location**: `netlify/functions/chat.ts`  
**Purpose**: Unified chat endpoint for all employees

**Request Format**:
```typescript
POST /.netlify/functions/chat
Body: {
  userId: string,
  employeeSlug?: string, // Defaults to 'prime-boss'
  message: string,
  sessionId?: string,
  stream?: boolean // Default: true
}
```

**Response Format**:
- **Streaming**: Server-Sent Events (SSE)
  ```
  data: { type: 'token', content: '...' }
  data: { type: 'tool_call', ... }
  data: { type: 'done' }
  ```
- **Non-streaming**: JSON
  ```json
  { content: "...", toolCalls: [...] }
  ```

**Processing Flow**:
1. Guardrails check (`runInputGuardrails`)
2. Employee routing (load from `employee_profiles` table)
3. Session management (`chat_sessions` table)
4. Load conversation history (`chat_messages` table)
5. Memory retrieval (optional, embeddings search)
6. OpenAI API call
7. Save messages to database
8. Generate conversation summary (async, non-blocking)

**Employee Configuration**:
- Loaded from `employee_profiles` table
- Includes: `system_prompt`, `tools_allowed`, `model_config`
- Fallback to defaults if not found

---

## Summary

### Current State

✅ **Working**:
- Unified chat system for all employees
- Global state management via `useUnifiedChatLauncher`
- Prime slideout with attached rail
- Non-Prime centered overlays
- Employee routing in backend
- Guardrails & PII protection
- Session management
- Message streaming

⚠️ **Needs Testing**:
- Send button icon visibility (fixed in code, needs cache clear)
- Chat content display for Byte/Tag/Analytics (fixes applied)
- Employee slug routing (fixes applied)

✅ **Fixed**:
- UnifiedCards now call `openChat()` directly
- Database fallback for missing `chat_convo_summaries`
- Floating rail positioning
- Send button styling

### Architecture Strengths

1. **Unified Interface**: Single component handles all employees
2. **Global State**: Centralized state management prevents conflicts
3. **Flexible UI**: Different shells for Prime vs others
4. **Backend Routing**: Employee-specific prompts and tools
5. **Session Management**: Persistent conversations

### Architecture Weaknesses

1. **Dual UI Modes**: Prime vs others have different shells (intentional but adds complexity)
2. **Global State Singleton**: Can cause issues if multiple instances
3. **Legacy Components**: Some old chat components still exist (not used)
4. **Slug Variations**: Multiple slug formats (`byte-doc`, `byte-docs`, `byte-ai`)

---

**End of Architecture Document**


