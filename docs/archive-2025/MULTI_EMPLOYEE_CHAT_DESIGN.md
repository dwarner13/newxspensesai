# 🎨 Multi-Employee AI Chatbot System - Complete UX/UI Design

**Project**: XspensesAI Universal Chat Panel  
**Date**: 2025-01-XX  
**Status**: Design Phase  
**Architect**: UI/UX + AI System Designer

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core UX Principles](#core-ux-principles)
3. [Desktop Experience](#desktop-experience)
4. [Mobile Experience](#mobile-experience)
5. [Component Architecture](#component-architecture)
6. [State Management](#state-management)
7. [Employee System Integration](#employee-system-integration)
8. [Animations & Transitions](#animations--transitions)
9. [Background Task Handling](#background-task-handling)
10. [Cross-Dashboard Routing](#cross-dashboard-routing)
11. [Implementation Roadmap](#implementation-roadmap)

---

## 🎯 Executive Summary

### Vision
A universal, persistent chat interface that serves as the central nervous system of XspensesAI. Users interact with multiple AI employees seamlessly, with context preserved across conversations, dashboard navigation, and background tasks.

### Key Features
- **Universal Access**: Single chat panel accessible from anywhere in the app
- **Multi-Employee Support**: Switch between employees mid-conversation
- **Persistent History**: Chat history preserved across sessions and navigation
- **Background Processing**: Employees work while users explore the dashboard
- **Smart Handoffs**: Employees collaborate automatically (Byte → Finley → Liberty → Blitz)
- **Upload Integration**: Drag/drop screenshots, PDFs, receipts
- **Dashboard Linking**: Chat messages can link to specific dashboard pages
- **Responsive Design**: Desktop slide-out + Mobile bottom-sheet

---

## 🧭 Core UX Principles

### 1. **Always Available, Never Intrusive**
- Chat is accessible but doesn't block dashboard usage
- Minimized state shows activity without distraction
- Notifications are contextual and actionable

### 2. **Context Preservation**
- Conversation history persists across:
  - Dashboard page changes
  - App refreshes
  - Employee switches
  - Background tasks
- Each conversation thread maintains full context

### 3. **Employee Transparency**
- Always show which employee is responding
- Clear handoff indicators when employees collaborate
- Status indicators for working/idle/awaiting states

### 4. **Seamless Multi-Employee Workflows**
- Users don't need to manually switch employees
- System intelligently routes to the right employee
- Handoffs feel natural, not jarring

### 5. **Mobile-First Responsiveness**
- Mobile gets full-screen bottom-sheet experience
- Desktop gets elegant slide-out panel
- Both maintain feature parity

---

## 💻 Desktop Experience

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard Content Area                                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Main Dashboard                                      │   │
│  │                                                       │   │
│  │  [User can interact with dashboard]                  │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│                    ┌──────────────────┐                      │
│                    │  Chat Slideout   │                      │
│                    │  (380-420px)     │                      │
│                    │                  │                      │
│                    │  ┌────────────┐ │                      │
│                    │  │  Header    │ │                      │
│                    │  ├────────────┤ │                      │
│                    │  │  Messages │ │                      │
│                    │  │            │ │                      │
│                    │  │            │ │                      │
│                    │  ├────────────┤ │                      │
│                    │  │  Composer  │ │                      │
│                    │  └────────────┘ │                      │
│                    └──────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### Desktop Chat Panel Specifications

**Dimensions:**
- Width: `380px` (min) to `420px` (max)
- Height: `100vh` (full viewport)
- Position: Fixed right, slides in from right edge
- Z-index: `z-50` (above dashboard, below modals)

**Animation:**
- Slide-in: `translate-x-0` (300ms ease-out)
- Slide-out: `translate-x-full` (300ms ease-in)
- Backdrop: `bg-black/50 backdrop-blur-sm` (fades in/out)

### Desktop Header Component

```
┌─────────────────────────────────────────────┐
│  👑 Prime          [Working...]  [×]         │
│  Your AI financial cofounder                 │
└─────────────────────────────────────────────┘
```

**Components:**
- **Employee Avatar**: Emoji or icon (40x40px)
- **Employee Name**: Bold, 16px
- **Status Chip**: 
  - `Working...` (pulsing animation)
  - `Done` (green checkmark)
  - `Idle` (gray)
  - `Awaiting upload` (blue, animated)
- **Close Button**: Top-right X (44x44px touch target)

**Status Chip States:**
```typescript
type EmployeeStatus = 
  | { type: 'working'; message: string }      // "Analyzing your loan..."
  | { type: 'done'; completedAt: Date }      // Task finished
  | { type: 'idle' }                          // Ready for input
  | { type: 'awaiting_upload'; fileType: string } // Waiting for file
```

### Desktop Message Area

**Layout:**
- Scrollable container (`overflow-y-auto`)
- Padding: `16px` vertical, `12px` horizontal
- Message spacing: `12px` between messages

**Message Types:**

1. **User Message** (Right-aligned)
```
┌─────────────────────────────────────┐
│  User message content here           │
│  2:34 PM                             │
└─────────────────────────────────────┘
```

2. **AI Message** (Left-aligned)
```
┌─────────────────────────────────────┐
│  👑 Prime                            │
│  AI response content here            │
│  2:35 PM                             │
└─────────────────────────────────────┘
```

3. **Handoff Message** (Centered, special styling)
```
┌─────────────────────────────────────┐
│  🔄 Liberty is now helping you       │
│  Prime handed off to Liberty        │
└─────────────────────────────────────┘
```

4. **System Message** (Centered, subtle)
```
┌─────────────────────────────────────┐
│  Byte is processing your document...│
└─────────────────────────────────────┘
```

5. **CTA Message** (Actionable)
```
┌─────────────────────────────────────┐
│  👑 Prime                            │
│  Your debt plan is ready!            │
│  ┌───────────────────────────────┐  │
│  │  View Debt Plan →            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Desktop Composer

```
┌─────────────────────────────────────────────┐
│  [📎] [🖼] [🎤] [Input field...] [Send]    │
└─────────────────────────────────────────────┘
```

**Components:**
- **Attachment Button**: File picker (PDF, images)
- **Image Button**: Image picker (camera/gallery)
- **Voice Button**: Voice input trigger
- **Input Field**: Multi-line textarea (max 4 lines visible)
- **Send Button**: Disabled when empty, enabled when typing

**Upload States:**
- **Idle**: Gray icons
- **Uploading**: Spinner animation
- **Processing**: "Byte is processing..." indicator
- **Complete**: Success checkmark

### Desktop Sidebar Integration

**Chat Icon in Sidebar:**
- Shows notification dot when:
  - Employee is working on background task
  - New message arrives while chat closed
  - Task completion notification
- Pulsing animation when active task completes

**Notification Badge:**
```
┌─────────┐
│  💬  🔴  │  ← Red dot indicates activity
└─────────┘
```

---

## 📱 Mobile Experience

### Layout Structure

```
┌─────────────────────────────────────┐
│  Dashboard Header                   │
├─────────────────────────────────────┤
│                                     │
│  Dashboard Content                  │
│  (scrollable)                       │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  Bottom Nav                         │
└─────────────────────────────────────┘
         ┌──────────────┐
         │   [AI] 🔴    │  ← Floating button
         └──────────────┘
```

### Mobile Bottom Sheet

**States:**

1. **Minimized** (Floating Pill)
```
┌─────────────────────────────┐
│  👑 Prime • Working...       │
└─────────────────────────────┘
```
- Height: `60px`
- Position: Fixed bottom, centered
- Shows: Employee avatar + name + status
- Tap to expand

2. **Expanded** (Full Screen)
```
┌─────────────────────────────────────┐
│  ────────────────────────────────   │ ← Drag handle
│  👑 Prime          [Working...] [×] │
├─────────────────────────────────────┤
│                                     │
│  Messages Area                      │
│  (scrollable)                       │
│                                     │
├─────────────────────────────────────┤
│  [📎] [🖼] [Input...] [Send]        │
└─────────────────────────────────────┘
```
- Height: `100vh` (minus safe area)
- Position: Fixed bottom
- Drag down to minimize
- Backdrop: `bg-black/50` (tappable to close)

### Mobile Floating Button

**Location:**
- Fixed bottom-right
- Above bottom navigation
- `56x56px` circular button
- Gradient background: `linear-gradient(135deg, #3b82f6, #8b5cf6)`
- Shadow: `shadow-2xl`

**States:**
- **Idle**: Static AI icon
- **Active Task**: Pulsing animation
- **New Message**: Notification badge (red dot)
- **Multiple Employees Working**: Shows count badge

**Animation:**
```css
@keyframes pulse-glow {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
}

.active-task {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

### Mobile Minimized Pill

**When Chat is Minimized:**

```
┌─────────────────────────────────────┐
│  Dashboard Content                  │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐ │
│  │ 👑 Prime • Analyzing loan...  │ │ ← Minimized pill
│  └───────────────────────────────┘ │
│  [Bottom Nav]                       │
└─────────────────────────────────────┘
```

**Pill Specifications:**
- Height: `56px`
- Border radius: `28px` (pill shape)
- Background: `bg-zinc-900/95 backdrop-blur-md`
- Border: `border border-white/10`
- Padding: `12px 16px`
- Content: Avatar (24px) + Name + Status
- Tap anywhere to expand

**Status Indicators:**
- **Working**: Animated dots `...`
- **Done**: Green checkmark ✓
- **Awaiting**: Blue upload icon ⬆

---

## 🧩 Component Architecture

### Core Components

```
UniversalChatPanel/
├── UniversalChatPanel.tsx          # Main container
├── ChatHeader.tsx                  # Employee info + status
├── ChatMessages.tsx                # Message list
├── ChatComposer.tsx                # Input + uploads
├── EmployeeSwitcher.tsx            # Employee selector
├── HandoffIndicator.tsx           # Handoff animations
├── BackgroundTaskIndicator.tsx    # Working status
├── CTALink.tsx                     # Dashboard links
└── MobileChatSheet.tsx            # Mobile bottom sheet
```

### Component Breakdown

#### 1. UniversalChatPanel.tsx

**Purpose**: Main container that handles desktop/mobile rendering

**Props:**
```typescript
interface UniversalChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmployee?: string; // 'prime', 'blitz', etc.
  conversationId?: string;  // For resuming conversations
}
```

**Responsibilities:**
- Detect desktop vs mobile
- Render appropriate layout (slideout vs bottom-sheet)
- Manage global chat state
- Handle keyboard shortcuts (ESC to close)
- Persist conversation state

**State:**
```typescript
interface ChatState {
  currentEmployee: string;
  messages: ChatMessage[];
  status: EmployeeStatus;
  isTyping: boolean;
  attachments: File[];
  backgroundTasks: BackgroundTask[];
  conversationId: string | null;
}
```

#### 2. ChatHeader.tsx

**Purpose**: Display employee info and status

**Props:**
```typescript
interface ChatHeaderProps {
  employee: Employee;
  status: EmployeeStatus;
  onClose: () => void;
  onSwitchEmployee: () => void;
}
```

**Features:**
- Employee avatar + name
- Status chip with animation
- Employee switcher button
- Close button

**Status Animations:**
```typescript
// Working state - pulsing animation
.working-status {
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

#### 3. ChatMessages.tsx

**Purpose**: Render message list with proper styling

**Props:**
```typescript
interface ChatMessagesProps {
  messages: ChatMessage[];
  currentEmployee: string;
  onMessageAction?: (action: MessageAction) => void;
}
```

**Message Types:**
```typescript
type ChatMessage = 
  | UserMessage
  | AIMessage
  | HandoffMessage
  | SystemMessage
  | CTAMessage;

interface UserMessage {
  id: string;
  type: 'user';
  content: string;
  timestamp: Date;
  attachments?: File[];
}

interface AIMessage {
  id: string;
  type: 'ai';
  employee: string;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface HandoffMessage {
  id: string;
  type: 'handoff';
  from: string;
  to: string;
  message: string;
  timestamp: Date;
}

interface CTAMessage {
  id: string;
  type: 'cta';
  employee: string;
  content: string;
  cta: {
    label: string;
    action: 'navigate' | 'open_modal' | 'execute_tool';
    target: string;
  };
  timestamp: Date;
}
```

**Rendering Logic:**
- User messages: Right-aligned, blue background
- AI messages: Left-aligned, gray background, employee badge
- Handoff messages: Centered, special styling with animation
- System messages: Centered, subtle gray
- CTA messages: Special card styling with button

#### 4. ChatComposer.tsx

**Purpose**: Input field + upload controls

**Props:**
```typescript
interface ChatComposerProps {
  onSend: (message: string, attachments: File[]) => void;
  onUpload: (files: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
}
```

**Features:**
- Multi-line textarea (auto-expands to 4 lines max)
- File upload button (PDF, images)
- Image picker (camera/gallery on mobile)
- Voice input button
- Send button (disabled when empty)
- Drag-and-drop zone (desktop)

**Upload Flow:**
1. User selects file → Show preview
2. Upload starts → Show progress
3. Byte processes → Show "Byte is processing..."
4. Route to appropriate employee → Show handoff
5. Employee responds → Show result

#### 5. EmployeeSwitcher.tsx

**Purpose**: Allow manual employee switching

**Props:**
```typescript
interface EmployeeSwitcherProps {
  currentEmployee: string;
  availableEmployees: Employee[];
  onSwitch: (employeeId: string) => void;
}
```

**UI:**
- Dropdown menu (desktop) or bottom sheet (mobile)
- Shows employee avatar, name, specialty
- Indicates which employee is active
- Shows "recommended" employees based on context

**Employee List:**
```typescript
const EMPLOYEES = [
  { id: 'prime', name: 'Prime', emoji: '👑', specialty: 'Orchestration' },
  { id: 'blitz', name: 'Blitz', emoji: '⚡', specialty: 'Debt Elimination' },
  { id: 'liberty', name: 'Liberty', emoji: '🗽', specialty: 'Financial Freedom' },
  { id: 'byte', name: 'Byte', emoji: '📄', specialty: 'Document Processing' },
  { id: 'tag', name: 'Tag', emoji: '🏷️', specialty: 'Categorization' },
  { id: 'crystal', name: 'Crystal', emoji: '🔮', specialty: 'Predictions' },
  { id: 'goalie', name: 'Goalie', emoji: '🥅', specialty: 'Goals' },
  { id: 'finley', name: 'Finley', emoji: '💰', specialty: 'Financial Planning' },
  // ... more employees
];
```

#### 6. HandoffIndicator.tsx

**Purpose**: Animate employee handoffs

**Props:**
```typescript
interface HandoffIndicatorProps {
  from: string;
  to: string;
  message?: string;
}
```

**Animation:**
```
1. Show "Prime is handing you off to Liberty..."
2. Fade out current employee avatar
3. Slide in new employee avatar
4. Show welcome message from new employee
```

**Visual Flow:**
```
┌─────────────────────────────────────┐
│  👑 Prime                           │
│  Let me connect you with Liberty... │
│                                     │
│  ────────────→                      │
│                                     │
│  🗽 Liberty                         │
│  Hi! I'm Liberty, your financial   │
│  freedom specialist...              │
└─────────────────────────────────────┘
```

#### 7. BackgroundTaskIndicator.tsx

**Purpose**: Show when employees are working in background

**Props:**
```typescript
interface BackgroundTaskIndicatorProps {
  tasks: BackgroundTask[];
  onTaskComplete?: (task: BackgroundTask) => void;
}
```

**Task Types:**
```typescript
interface BackgroundTask {
  id: string;
  employee: string;
  type: 'processing' | 'analysis' | 'generation';
  message: string;
  startedAt: Date;
  estimatedCompletion?: Date;
  progress?: number; // 0-100
}
```

**Display:**
- In chat header: "Byte is processing your document..."
- In sidebar: Notification badge
- In minimized pill: Status text
- Completion: Notification + sound (optional)

#### 8. CTALink.tsx

**Purpose**: Render actionable links in messages

**Props:**
```typescript
interface CTALinkProps {
  label: string;
  action: 'navigate' | 'open_modal' | 'execute_tool';
  target: string;
  onClick?: () => void;
}
```

**Examples:**
- "View Debt Plan" → Navigate to `/dashboard/debt-payoff-planner`
- "See Transactions" → Navigate to `/dashboard/transactions`
- "Export Report" → Execute export tool
- "Set Up Goal" → Open goal creation modal

**Behavior:**
- Clicking CTA navigates to dashboard page
- Chat stays open (preserves context)
- Dashboard updates, chat history remains

---

## 🔄 State Management

### Global Chat State

**Store Structure:**
```typescript
interface ChatStore {
  // Conversation state
  conversations: Map<string, Conversation>;
  activeConversationId: string | null;
  
  // Current session
  currentEmployee: string;
  messages: ChatMessage[];
  status: EmployeeStatus;
  
  // UI state
  isOpen: boolean;
  isMobile: boolean;
  isMinimized: boolean; // Mobile only
  
  // Background tasks
  backgroundTasks: BackgroundTask[];
  
  // Upload state
  uploads: {
    files: File[];
    status: 'idle' | 'uploading' | 'processing' | 'complete';
    progress: number;
  };
}
```

### State Persistence

**LocalStorage Keys:**
- `chat:conversations` - All conversation history
- `chat:activeConversation` - Current conversation ID
- `chat:lastEmployee` - Last used employee
- `chat:isOpen` - Chat panel open state (desktop)
- `chat:isMinimized` - Minimized state (mobile)

**Session Persistence:**
- Messages persist across page refreshes
- Employee context preserved
- Background tasks continue after refresh

### State Updates

**Actions:**
```typescript
// Conversation actions
createConversation(employeeId: string): string;
loadConversation(conversationId: string): void;
addMessage(message: ChatMessage): void;
updateMessage(messageId: string, updates: Partial<ChatMessage>): void;

// Employee actions
switchEmployee(employeeId: string): void;
handoffEmployee(from: string, to: string, context: any): void;

// UI actions
openChat(): void;
closeChat(): void;
minimizeChat(): void; // Mobile only
expandChat(): void; // Mobile only

// Background task actions
addBackgroundTask(task: BackgroundTask): void;
updateTaskProgress(taskId: string, progress: number): void;
completeTask(taskId: string, result: any): void;

// Upload actions
addFiles(files: File[]): void;
startUpload(): void;
updateUploadProgress(progress: number): void;
completeUpload(result: any): void;
```

---

## 🤖 Employee System Integration

### Employee Routing

**Current System:**
- `src/lib/universalAIEmployeeConnection.ts` - Employee personalities
- `src/systems/AIEmployeeOrchestrator.ts` - Routing logic
- `netlify/functions/chat.ts` - Backend endpoint

**Integration Points:**

1. **Message Sending:**
```typescript
// Send message to current employee
const response = await sendChatMessage({
  userId: user.id,
  employeeSlug: currentEmployee,
  message: text,
  sessionId: conversationId,
  attachments: files,
  stream: true
});
```

2. **Handoff Detection:**
```typescript
// Backend returns handoff metadata
if (response.meta?.handoff) {
  const { from, to, context } = response.meta.handoff;
  handleEmployeeHandoff(from, to, context);
}
```

3. **Background Task Detection:**
```typescript
// Backend indicates long-running task
if (response.meta?.backgroundTask) {
  const task = response.meta.backgroundTask;
  addBackgroundTask({
    id: task.id,
    employee: currentEmployee,
    type: task.type,
    message: task.message,
    startedAt: new Date()
  });
}
```

### Multi-Employee Workflow Example

**Scenario: User uploads car loan screenshot**

```
1. User uploads screenshot
   → Chat shows: "Uploading..."
   
2. Byte processes document
   → Chat shows: "Byte is extracting data from your loan..."
   → Background task indicator appears
   
3. Byte completes → Handoff to Finley
   → Chat shows: "Byte handed off to Finley"
   → Finley: "I've analyzed your loan terms. Let me calculate..."
   
4. Finley completes → Handoff to Liberty
   → Chat shows: "Finley handed off to Liberty"
   → Liberty: "Based on Finley's analysis, here's your debt freedom plan..."
   
5. Liberty completes → Handoff to Blitz
   → Chat shows: "Liberty handed off to Blitz"
   → Blitz: "ATTACK PLAN ready! Here's your action checklist..."
   
6. Blitz completes → Handoff to Goalie
   → Chat shows: "Blitz handed off to Goalie"
   → Goalie: "I've created a payoff goal for you. View it here →"
   
7. User clicks CTA → Navigates to goals page
   → Chat stays open with full history
```

### Employee Status Management

**Status Flow:**
```
Idle → Working → Done → Idle
  ↓       ↓
  └───────┴──→ Awaiting Upload
```

**Status Updates:**
- Employee starts task → `status = { type: 'working', message: '...' }`
- Employee completes task → `status = { type: 'done', completedAt: Date }`
- Employee needs upload → `status = { type: 'awaiting_upload', fileType: '...' }`
- After 5 seconds → `status = { type: 'idle' }`

---

## ✨ Animations & Transitions

### Slide Animations

**Desktop Slide-Out:**
```css
.chat-panel {
  transform: translateX(100%);
  transition: transform 300ms ease-out;
}

.chat-panel.open {
  transform: translateX(0);
}
```

**Mobile Bottom-Sheet:**
```css
.chat-sheet {
  transform: translateY(100%);
  transition: transform 400ms cubic-bezier(0.4, 0, 0.2, 1);
}

.chat-sheet.open {
  transform: translateY(0);
}
```

### Message Animations

**Message Entry:**
```css
@keyframes slideInMessage {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message {
  animation: slideInMessage 300ms ease-out;
}
```

**Typing Indicator:**
```css
@keyframes typingDots {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-10px); }
}

.typing-dot {
  animation: typingDots 1.4s ease-in-out infinite;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}
```

### Handoff Animation

**Sequence:**
1. Fade out current employee (200ms)
2. Show handoff message (300ms)
3. Slide in new employee (300ms)
4. Fade in welcome message (200ms)

**Total Duration:** ~1s

### Status Pulse

**Working Status:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.working-status {
  animation: pulse 1.5s ease-in-out infinite;
}
```

### Notification Badge

**Pulse Animation:**
```css
@keyframes pulse-glow {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
  }
  50% {
    transform: scale(1.1);
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
  }
}

.notification-badge {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

---

## 🔄 Background Task Handling

### Task Lifecycle

```
1. Task Created
   → Add to backgroundTasks array
   → Show in chat header
   → Show notification badge in sidebar
   
2. Task Progress
   → Update progress percentage
   → Update status message
   → Show in minimized pill (mobile)
   
3. Task Complete
   → Remove from backgroundTasks
   → Show completion notification
   → Pulse chat icon
   → Auto-open chat if minimized
   
4. User Views Result
   → Show result in chat
   → Provide CTA if applicable
```

### Task Types

**Processing Tasks:**
- Document OCR (Byte)
- Data extraction (Byte)
- Transaction import (Byte)

**Analysis Tasks:**
- Spending analysis (Crystal)
- Debt analysis (Finley)
- Goal calculations (Goalie)

**Generation Tasks:**
- Report generation (Prism)
- Plan creation (Liberty)
- Checklist creation (Blitz)

### Task Notifications

**Desktop:**
- Sidebar chat icon shows badge
- Chat header shows "Employee is working..."
- Notification toast on completion

**Mobile:**
- Floating button pulses
- Minimized pill shows status
- Full-screen notification on completion

### Task Persistence

**Across Sessions:**
- Tasks stored in database
- Resume on app reload
- Show status in chat history

---

## 🔗 Cross-Dashboard Routing

### CTA Link System

**Link Types:**
```typescript
type CTAAction = 
  | { type: 'navigate'; path: string }
  | { type: 'open_modal'; modalId: string }
  | { type: 'execute_tool'; toolId: string; params: any };
```

### Navigation Flow

**User clicks CTA:**
1. Chat stays open (preserves context)
2. Dashboard navigates to target page
3. Chat history remains visible
4. User can continue conversation

**Example:**
```
User: "Show me my debt plan"
Liberty: "Here's your plan! [View Debt Plan →]"
User clicks CTA
→ Dashboard navigates to /dashboard/debt-payoff-planner
→ Chat stays open
→ User can ask follow-up questions
```

### Deep Linking

**Chat can link to:**
- Dashboard pages: `/dashboard/transactions`
- Specific views: `/dashboard/transactions?filter=debt`
- Modals: `?modal=add-goal`
- Employee workspaces: `/dashboard/smart-import-ai`

### Context Preservation

**When navigating:**
- Conversation history preserved
- Current employee context maintained
- Background tasks continue
- Upload state preserved

---

## 🚀 Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)

**Tasks:**
- [ ] Create `UniversalChatPanel` component
- [ ] Implement desktop slide-out layout
- [ ] Implement mobile bottom-sheet layout
- [ ] Set up state management (Zustand/Context)
- [ ] Integrate with existing chat API
- [ ] Add message rendering (user/AI messages)

**Deliverables:**
- Basic chat panel (desktop + mobile)
- Message sending/receiving
- Employee switching UI

### Phase 2: Employee System (Week 3-4)

**Tasks:**
- [ ] Integrate employee routing
- [ ] Implement handoff detection
- [ ] Add handoff animations
- [ ] Create employee switcher component
- [ ] Add employee status indicators
- [ ] Implement status updates

**Deliverables:**
- Multi-employee support
- Seamless handoffs
- Status indicators

### Phase 3: Upload & Processing (Week 5-6)

**Tasks:**
- [ ] Add file upload UI
- [ ] Implement drag-and-drop (desktop)
- [ ] Add camera integration (mobile)
- [ ] Integrate Byte processing
- [ ] Add upload progress indicators
- [ ] Implement auto-routing after upload

**Deliverables:**
- Full upload flow
- Byte integration
- Auto-routing to appropriate employee

### Phase 4: Background Tasks (Week 7-8)

**Tasks:**
- [ ] Implement background task tracking
- [ ] Add task progress indicators
- [ ] Create notification system
- [ ] Add task completion handlers
- [ ] Implement task persistence

**Deliverables:**
- Background task system
- Notifications
- Task persistence

### Phase 5: Dashboard Integration (Week 9-10)

**Tasks:**
- [ ] Add CTA link component
- [ ] Implement dashboard navigation
- [ ] Add deep linking support
- [ ] Test context preservation
- [ ] Add onboarding flow

**Deliverables:**
- CTA links
- Dashboard integration
- Onboarding

### Phase 6: Polish & Optimization (Week 11-12)

**Tasks:**
- [ ] Add animations
- [ ] Optimize performance
- [ ] Add error handling
- [ ] Implement retry logic
- [ ] Add analytics
- [ ] User testing

**Deliverables:**
- Polished UI
- Performance optimizations
- Analytics

---

## 📐 Wireframes

### Desktop Chat Panel

```
┌─────────────────────────────────────────────┐
│  ┌───────────────────────────────────────┐ │
│  │ 👑 Prime          [Working...]      [×] │ │ Header
│  │ Your AI financial cofounder            │ │
│  └───────────────────────────────────────┘ │
│  ┌───────────────────────────────────────┐ │
│  │                                       │ │
│  │  ┌───────────────────────────────┐   │ │
│  │  │ User message                  │   │ │ Messages
│  │  │ 2:34 PM                       │   │ │
│  │  └───────────────────────────────┘   │ │
│  │                                       │ │
│  │  ┌───────────────────────────────┐   │ │
│  │  │ 👑 Prime                      │   │ │
│  │  │ AI response here...           │   │ │
│  │  │ 2:35 PM                       │   │ │
│  │  └───────────────────────────────┘   │ │
│  │                                       │ │
│  │  ┌───────────────────────────────┐   │ │
│  │  │ 🔄 Liberty is now helping you │   │ │ Handoff
│  │  └───────────────────────────────┘   │ │
│  │                                       │ │
│  └───────────────────────────────────────┘ │
│  ┌───────────────────────────────────────┐ │
│  │ [📎] [🖼] [Input field...]    [Send] │ │ Composer
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Mobile Bottom Sheet (Expanded)

```
┌─────────────────────────────────────┐
│  ────────────────────────────────   │ Drag handle
│  👑 Prime          [Working...] [×] │ Header
├─────────────────────────────────────┤
│                                     │
│  ┌───────────────────────────────┐  │
│  │ User message                 │  │
│  │ 2:34 PM                      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 👑 Prime                     │  │ Messages
│  │ AI response...                │  │
│  │ 2:35 PM                       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🔄 Liberty is helping you... │  │ Handoff
│  └───────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│ [📎] [🖼] [Input...]        [Send] │ Composer
└─────────────────────────────────────┘
```

### Mobile Minimized Pill

```
┌─────────────────────────────────────┐
│  Dashboard Content                  │
│                                     │
│                                     │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ 👑 Prime • Analyzing loan... │  │ Minimized pill
│  └───────────────────────────────┘  │
│  [Bottom Nav]                       │
└─────────────────────────────────────┘
```

---

## 🎨 Design Tokens

### Colors

```typescript
const colors = {
  // Chat backgrounds
  chatBg: '#0b1220',
  chatBorder: 'rgba(255, 255, 255, 0.1)',
  
  // Message bubbles
  userMessageBg: '#3b82f6',
  aiMessageBg: 'rgba(255, 255, 255, 0.1)',
  
  // Status colors
  working: '#fbbf24', // Amber
  done: '#10b981',     // Green
  idle: '#6b7280',     // Gray
  awaiting: '#3b82f6', // Blue
  
  // Employee colors
  prime: '#fbbf24',    // Gold
  blitz: '#ef4444',    // Red
  liberty: '#3b82f6',  // Blue
  byte: '#8b5cf6',     // Purple
  tag: '#10b981',      // Green
  crystal: '#ec4899',  // Pink
  goalie: '#06b6d4',   // Cyan
  finley: '#f59e0b',   // Orange
};
```

### Typography

```typescript
const typography = {
  // Headers
  headerTitle: 'font-semibold text-base',
  headerSubtitle: 'text-xs text-white/70',
  
  // Messages
  messageText: 'text-sm leading-relaxed',
  messageTime: 'text-xs text-white/50',
  
  // Status
  statusText: 'text-xs font-medium',
};
```

### Spacing

```typescript
const spacing = {
  panelPadding: '16px',
  messageSpacing: '12px',
  composerPadding: '12px',
  headerHeight: '64px',
  composerHeight: '80px',
};
```

### Shadows

```typescript
const shadows = {
  panel: 'shadow-2xl',
  message: 'shadow-sm',
  button: 'shadow-lg',
  floatingButton: 'shadow-2xl',
};
```

---

## 🔍 Edge Cases & Considerations

### Error Handling

**Network Errors:**
- Show retry button
- Preserve message in composer
- Queue for retry

**Upload Errors:**
- Show error message
- Allow re-upload
- Preserve file selection

**Employee Errors:**
- Fallback to Prime
- Show error message
- Log for debugging

### Performance

**Message Rendering:**
- Virtualize long message lists
- Lazy load images
- Debounce scroll events

**State Updates:**
- Batch state updates
- Use React.memo for messages
- Optimize re-renders

### Accessibility

**Keyboard Navigation:**
- Tab through controls
- Enter to send
- ESC to close
- Arrow keys for message navigation

**Screen Readers:**
- Announce new messages
- Describe employee switches
- Announce status changes

**Touch Targets:**
- Minimum 44x44px
- Adequate spacing
- Clear visual feedback

---

## 📊 Success Metrics

### User Engagement
- Chat open rate
- Messages per session
- Employee switches per conversation
- Upload frequency

### Performance
- Message send latency
- Upload completion time
- Background task completion rate
- Error rate

### User Satisfaction
- Task completion rate
- CTA click-through rate
- User feedback scores
- Support ticket reduction

---

## 🎯 Next Steps

1. **Review & Approve Design**
   - Stakeholder review
   - Technical feasibility check
   - Design system alignment

2. **Create Component Library**
   - Build reusable components
   - Set up Storybook
   - Create component docs

3. **Implement Phase 1**
   - Start with core infrastructure
   - Test desktop + mobile layouts
   - Integrate with existing chat API

4. **Iterate Based on Feedback**
   - User testing
   - Performance optimization
   - Feature refinement

---

**End of Design Document**

This document serves as the complete blueprint for building the multi-employee chatbot system. All components, states, animations, and integrations are documented for implementation.















