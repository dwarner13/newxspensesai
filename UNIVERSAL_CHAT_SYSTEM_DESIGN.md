# 🎯 Universal Multi-Employee Chatbot System - Complete Design

**Project**: XspensesAI Universal Chat  
**Status**: Design Phase  
**Architecture**: Single Unified Chat System

---

## 🎯 Executive Vision

### The One Chatbot Principle

**XspensesAI has ONE chatbot. Not multiple chatbots. ONE.**

This single universal chat panel:
- Works everywhere in the app
- Supports all employees (Prime, Liberty, Blitz, Crystal, Tag, Byte, Finley, Goalie)
- Preserves complete memory across all interactions
- Handles uploads, workflows, analysis, planning, and recall
- Links seamlessly to dashboard pages
- Works identically on desktop and mobile

**All previous separate chatbot implementations are consolidated into this system.**

---

## 🏗️ High-Level Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    XspensesAI Dashboard                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Any Dashboard Page                                   │ │
│  │  (Transactions, Goals, Import, Loans, Insights, etc.)  │ │
│  │                                                        │ │
│  │  [User clicks "Ask Prime" or floating chat button]   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                              │
│                    ┌──────────────────┐                    │
│                    │  Universal Chat   │                    │
│                    │  (One Panel)      │                    │
│                    │                   │                    │
│                    │  ┌────────────┐  │                    │
│                    │  │  Header     │  │                    │
│                    │  ├────────────┤  │                    │
│                    │  │  Messages   │  │                    │
│                    │  │  (All      │  │                    │
│                    │  │  Employees)│  │                    │
│                    │  ├────────────┤  │                    │
│                    │  │  Composer  │  │                    │
│                    │  └────────────┘  │                    │
│                    └──────────────────┘                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Memory Layer                                         │ │
│  │  - Conversation History                              │ │
│  │  - User Facts                                        │ │
│  │  - RAG Embeddings                                    │ │
│  │  - Session Summaries                                │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Single Source of Truth**: One chat component, one conversation thread
2. **Employee Switching**: Employees hand off within the same conversation
3. **Persistent Memory**: Everything remembered forever, across sessions
4. **Universal Access**: Chat accessible from any page, any context
5. **Seamless Integration**: Chat links to dashboard without losing context

---

## 🎨 UX Concept Overview

### The Chat Experience Flow

```
User Journey:
1. User opens chat (from anywhere)
   → Chat slides out/in (desktop/mobile)
   → Shows current conversation history
   → Active employee displayed in header

2. User sends message
   → Message appears immediately
   → Employee processes (shows "working...")
   → Response streams in
   → If handoff needed → Shows handoff animation
   → New employee responds

3. User uploads file
   → Upload progress shown
   → Byte processes automatically
   → Handoff chain: Byte → Finley → Liberty → Blitz
   → All visible in same chat thread

4. User navigates dashboard
   → Chat stays open (desktop)
   → Chat minimizes to pill (mobile)
   → History preserved
   → Can continue conversation

5. User recalls past conversation
   → Types: "Show me my July expenses discussion"
   → AI searches memory
   → Returns summary + link to dashboard
   → Can view full history in side panel
```

### Key UX Patterns

#### 1. **Always-On Context**
- Chat remembers everything: uploads, loans, goals, plans, insights
- No need to re-explain context
- Employees reference past conversations naturally

#### 2. **Transparent Employee Switching**
- Clear indicators when employees hand off
- User always knows who's responding
- Status shows what each employee is doing

#### 3. **Background Processing**
- Employees work while user explores dashboard
- Notifications when tasks complete
- Results appear in chat when ready

#### 4. **History Recall**
- Natural language queries: "Show me that car loan plan"
- AI searches past conversations
- Returns relevant context + dashboard links

---

## 🧩 Core Component Architecture

### Component Hierarchy

```
UniversalChatPanel (Root)
├── ChatHeader
│   ├── EmployeeAvatar
│   ├── EmployeeName
│   ├── EmployeeRole
│   ├── StatusChip
│   ├── UserNameDisplay ("Helping Darrell...")
│   └── EmployeeSwitcher (dropdown)
│
├── ChatMessages (Scrollable)
│   ├── MessageList
│   │   ├── UserMessage
│   │   ├── AIMessage (with employee badge)
│   │   ├── HandoffMessage (special styling)
│   │   ├── SystemMessage
│   │   ├── CTAMessage (actionable links)
│   │   └── ToolChip (shows tool usage)
│   │
│   └── HistoryRecallPanel (side panel, expandable)
│       ├── ConversationSearch
│       ├── ConversationList
│       └── ConversationViewer
│
├── ChatComposer
│   ├── UploadZone (drag/drop)
│   ├── AttachmentPreview
│   ├── InputField (multi-line)
│   ├── ActionButtons (📎 🖼 🎤)
│   └── SendButton
│
├── BackgroundTaskIndicator
│   ├── TaskList
│   └── TaskNotification
│
└── GuardrailsIndicator
    └── PIIProtectionBadge
```

### Component Specifications

#### 1. UniversalChatPanel (Root)

**Purpose**: Main container that orchestrates everything

**Props:**
```typescript
interface UniversalChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmployee?: string; // Default: 'prime'
  conversationId?: string;  // For resuming conversations
  context?: {
    page?: string;          // Current dashboard page
    action?: string;        // 'ask_prime', 'ask_crystal', etc.
    data?: any;            // Page-specific context
  };
}
```

**State:**
```typescript
interface ChatState {
  // Conversation
  conversationId: string | null;
  messages: ChatMessage[];
  currentEmployee: string;
  
  // UI
  isOpen: boolean;
  isMinimized: boolean; // Mobile only
  isMobile: boolean;
  
  // Memory
  conversationHistory: ConversationSummary[];
  userFacts: UserFact[];
  
  // Background tasks
  backgroundTasks: BackgroundTask[];
  
  // Uploads
  uploads: {
    files: File[];
    status: 'idle' | 'uploading' | 'processing' | 'complete';
    progress: number;
  };
  
  // History recall
  historyRecall: {
    isOpen: boolean;
    searchQuery: string;
    results: ConversationMatch[];
  };
}
```

**Key Methods:**
```typescript
// Message handling
sendMessage(text: string, attachments?: File[]): Promise<void>
handleEmployeeHandoff(from: string, to: string, context: any): void

// Memory
loadConversationHistory(): Promise<void>
recallConversation(query: string): Promise<ConversationMatch[]>

// Uploads
handleFileUpload(files: File[]): Promise<void>
processUploadWithByte(file: File): Promise<void>

// Background tasks
addBackgroundTask(task: BackgroundTask): void
completeTask(taskId: string, result: any): void
```

#### 2. ChatHeader

**Purpose**: Show current employee, status, and controls

**Layout:**
```
┌─────────────────────────────────────────────┐
│  👑 Prime          [Working...]  [Switch]  │
│  Your AI financial cofounder               │
│  Helping Darrell...                         │
└─────────────────────────────────────────────┘
```

**Components:**
- **EmployeeAvatar**: Emoji or icon (40x40px)
- **EmployeeName**: Bold, 16px
- **EmployeeRole**: Subtitle, 12px, muted
- **StatusChip**: 
  - `Working...` (pulsing amber)
  - `Done` (green checkmark)
  - `Idle` (gray)
  - `Awaiting upload` (blue, animated)
- **UserNameDisplay**: "Helping [Name]..." (12px, muted)
- **EmployeeSwitcher**: Dropdown to manually switch

**Status States:**
```typescript
type EmployeeStatus = 
  | { type: 'working'; message: string; progress?: number }
  | { type: 'done'; completedAt: Date; result?: any }
  | { type: 'idle' }
  | { type: 'awaiting_upload'; fileType: string }
  | { type: 'handing_off'; to: string };
```

#### 3. ChatMessages

**Purpose**: Render message list with all message types

**Message Types:**

**UserMessage:**
```typescript
interface UserMessage {
  id: string;
  type: 'user';
  content: string;
  timestamp: Date;
  attachments?: File[];
}
```
- Right-aligned
- Blue background (`bg-blue-600`)
- Shows attachments as thumbnails

**AIMessage:**
```typescript
interface AIMessage {
  id: string;
  type: 'ai';
  employee: string;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  tools?: ToolCall[];
  cta?: CTAAction;
}
```
- Left-aligned
- Gray background (`bg-white/10`)
- Employee badge (emoji + name)
- Tool chips below message
- CTA button if present

**HandoffMessage:**
```typescript
interface HandoffMessage {
  id: string;
  type: 'handoff';
  from: string;
  to: string;
  message: string;
  timestamp: Date;
}
```
- Centered
- Special styling (gradient border)
- Animation: fade out old → slide in new

**SystemMessage:**
```typescript
interface SystemMessage {
  id: string;
  type: 'system';
  content: string;
  timestamp: Date;
}
```
- Centered
- Subtle gray
- For background task updates

**CTAMessage:**
```typescript
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
- Special card styling
- Prominent CTA button
- Clicking navigates but keeps chat open

**ToolChip:**
```typescript
interface ToolChip {
  tool: string;
  employee: string;
  result?: any;
}
```
- Small chips below messages
- Examples: "📄 Byte OCR", "📊 Crystal Spending Summary", "🧮 Finley Loan Forecast"

#### 4. ChatComposer

**Purpose**: Input field + upload controls

**Layout:**
```
┌─────────────────────────────────────────────┐
│  [📎] [🖼] [🎤] [Input field...]    [Send] │
└─────────────────────────────────────────────┘
```

**Features:**
- **Drag-and-drop zone** (desktop)
- **File picker** (PDF, images, CSV)
- **Camera integration** (mobile)
- **Voice input** (triggers voice modal)
- **Multi-line textarea** (auto-expands to 4 lines)
- **Send button** (disabled when empty)

**Upload Flow:**
1. User selects/uploads file
2. Show preview + progress
3. Upload to server
4. Auto-trigger Byte processing
5. Show "Byte is processing..."
6. Byte completes → Handoff to appropriate employee
7. Employee responds with results

#### 5. HistoryRecallPanel

**Purpose**: Search and view past conversations

**UI:**
```
┌─────────────────────────────────────────────┐
│  🔍 Search past conversations...            │
├─────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐ │
│  │ 📅 July 2025 - Car Loan Discussion    │ │
│  │ "Analyzed your car loan terms..."     │ │
│  │ [View] [Open Dashboard]              │ │
│  └───────────────────────────────────────┘ │
│  ┌───────────────────────────────────────┐ │
│  │ 📅 June 2025 - Spending Analysis     │ │
│  │ "Reviewed your June expenses..."     │ │
│  │ [View] [Open Dashboard]              │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Search Logic:**
- Natural language queries
- Semantic search (RAG embeddings)
- Date range matching
- Topic matching (loans, expenses, goals, etc.)

**Results:**
- Conversation summary
- Date/time
- Relevant employees
- Dashboard links
- Option to view full transcript

---

## 🧠 Memory Architecture

### Memory Layers

```
┌─────────────────────────────────────────────┐
│  Layer 1: Active Conversation              │
│  - Last 20 messages                         │
│  - Current context                          │
│  - Active employee                          │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  Layer 2: Session Summary                  │
│  - Compressed conversation summary          │
│  - Key facts extracted                     │
│  - Tools used                               │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  Layer 3: User Facts (Long-term)           │
│  - Persistent facts about user               │
│  - Preferences, goals, financial data        │
│  - Confidence scores                        │
└─────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────┐
│  Layer 4: RAG Embeddings                   │
│  - Document embeddings                      │
│  - Semantic search                          │
│  - Receipts, statements, plans              │
└─────────────────────────────────────────────┘
```

### Memory Persistence

**Database Tables:**
```sql
-- Conversation sessions
chat_sessions (
  id UUID PRIMARY KEY,
  user_id TEXT,
  employee_slug TEXT,  -- Can change during handoffs
  title TEXT,
  summary TEXT,        -- Compressed summary
  message_count INT,
  last_message_at TIMESTAMPTZ
)

-- Individual messages
chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id),
  role TEXT,           -- 'user', 'assistant', 'system'
  content TEXT,
  redacted_content TEXT,  -- PII-safe version
  employee_slug TEXT,  -- Which employee sent this
  metadata JSONB,      -- Tool calls, handoffs, etc.
  created_at TIMESTAMPTZ
)

-- User facts (long-term memory)
user_memory_facts (
  id UUID PRIMARY KEY,
  user_id TEXT,
  fact TEXT,
  category TEXT,      -- 'preference', 'financial', 'goal'
  confidence NUMERIC,
  learned_from_session_id UUID,
  expires_at TIMESTAMPTZ,
  verified BOOLEAN
)

-- RAG embeddings
memory_embeddings (
  id UUID PRIMARY KEY,
  user_id TEXT,
  content TEXT,
  embedding VECTOR(1536),
  metadata JSONB,     -- Type, date, source
  created_at TIMESTAMPTZ
)
```

### Memory Retrieval Flow

```
User sends message
  ↓
1. Load active conversation (last 20 messages)
  ↓
2. Load session summary (compressed context)
  ↓
3. Load relevant user facts (preferences, goals)
  ↓
4. Semantic search RAG embeddings (if needed)
  ↓
5. Combine into context block
  ↓
6. Send to AI employee
  ↓
7. Extract new facts (background)
  ↓
8. Update session summary (periodically)
```

---

## 🔄 Employee Handoff System

### Handoff Flow

```
User: "I uploaded a car loan screenshot"
  ↓
Prime: "Let me connect you with Byte..."
  ↓
[Handoff Animation]
  ↓
Byte: "I've extracted your loan data..."
  ↓
Byte: "Handing you off to Finley for calculations..."
  ↓
[Handoff Animation]
  ↓
Finley: "I've calculated your payoff timeline..."
  ↓
Finley: "Liberty will create your freedom plan..."
  ↓
[Handoff Animation]
  ↓
Liberty: "Here's your debt freedom plan..."
  ↓
Liberty: "Blitz will create your action checklist..."
  ↓
[Handoff Animation]
  ↓
Blitz: "ATTACK PLAN ready! Here's your checklist..."
```

### Handoff Implementation

**Backend Detection:**
```typescript
// In chat.ts backend
if (response.meta?.handoff) {
  const { from, to, context } = response.meta.handoff;
  
  // Send handoff event in SSE stream
  sendSSE({
    type: 'handoff',
    from,
    to,
    message: `Handing you off to ${to}...`,
    context
  });
  
  // Continue with new employee
  const newEmployeeResponse = await getEmployeeResponse(to, message, context);
  sendSSE({
    type: 'message',
    employee: to,
    content: newEmployeeResponse
  });
}
```

**Frontend Handling:**
```typescript
// In UniversalChatPanel
const handleHandoff = (from: string, to: string, context: any) => {
  // Add handoff message
  addMessage({
    type: 'handoff',
    from,
    to,
    message: `${from} is handing you off to ${to}...`
  });
  
  // Update current employee
  setCurrentEmployee(to);
  
  // Update header status
  setStatus({ type: 'handing_off', to });
  
  // Trigger handoff animation
  triggerHandoffAnimation(from, to);
};
```

### Handoff Animation

**Sequence:**
1. Fade out current employee avatar (200ms)
2. Show handoff message (300ms)
3. Slide in new employee avatar (300ms)
4. Fade in welcome message (200ms)

**Total Duration:** ~1s

---

## 📱 Desktop vs Mobile Layouts

### Desktop: Slide-Out Panel

**Specifications:**
- Width: `380px` (min) to `420px` (max)
- Height: `100vh`
- Position: Fixed right, slides in from right edge
- Z-index: `z-50`
- Animation: `translate-x-0` (300ms ease-out)

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Dashboard Content                         │
│                                            │
│                    ┌──────────────────┐  │
│                    │  Chat Panel       │  │
│                    │  (380-420px)      │  │
│                    │                   │  │
│                    │  ┌────────────┐  │  │
│                    │  │  Header    │  │  │
│                    │  ├────────────┤  │  │
│                    │  │  Messages  │  │  │
│                    │  │            │  │  │
│                    │  ├────────────┤  │  │
│                    │  │  Composer  │  │  │
│                    │  └────────────┘  │  │
│                    └──────────────────┘  │
└─────────────────────────────────────────────┘
```

**Behavior:**
- Slides out from right
- Backdrop overlay (click to close)
- ESC key closes
- Stays open when navigating dashboard
- History preserved

### Mobile: Bottom Sheet

**Specifications:**
- Width: `100vw`
- Height: `100vh` (minus safe area)
- Position: Fixed bottom
- Animation: `translate-y-0` (400ms cubic-bezier)

**States:**

**1. Minimized (Floating Pill):**
```
┌─────────────────────────────────────┐
│  Dashboard Content                   │
│                                      │
│                                      │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ 👑 Prime • Working...          │  │  ← Pill
│  └───────────────────────────────┘  │
│  [Bottom Nav]                        │
└─────────────────────────────────────┘
```
- Height: `56px`
- Shows: Employee avatar + name + status
- Tap to expand

**2. Expanded (Full Screen):**
```
┌─────────────────────────────────────┐
│  ────────────────────────────────    │  ← Drag handle
│  👑 Prime          [Working...] [×]  │  ← Header
├─────────────────────────────────────┤
│                                     │
│  Messages Area                      │
│  (scrollable)                       │
│                                     │
├─────────────────────────────────────┤
│  [📎] [🖼] [Input...]        [Send] │  ← Composer
└─────────────────────────────────────┘
```
- Full screen
- Drag down to minimize
- Backdrop (tap to close)

**Floating Button:**
- Fixed bottom-right
- `56x56px` circular
- Gradient background
- Pulsing when active task
- Notification badge when new message

---

## 🔗 Dashboard Integration

### Deep Linking System

**CTA Links in Messages:**
```typescript
interface CTAAction {
  type: 'navigate' | 'open_modal' | 'execute_tool';
  target: string;
  params?: Record<string, any>;
}

// Examples:
{
  type: 'navigate',
  target: '/dashboard/debt-payoff-planner',
  params: { loanId: '123' }
}

{
  type: 'open_modal',
  target: 'add-goal',
  params: { category: 'debt' }
}

{
  type: 'execute_tool',
  target: 'export-report',
  params: { format: 'pdf' }
}
```

### Navigation Flow

**User clicks CTA:**
1. Chat stays open (preserves context)
2. Dashboard navigates to target page
3. Chat history remains visible
4. User can continue conversation

**Example:**
```
Liberty: "Your debt plan is ready!"
         [View Debt Plan →]
         
User clicks CTA
  ↓
Dashboard navigates to /dashboard/debt-payoff-planner
Chat stays open
  ↓
User: "Can you adjust the timeline?"
Liberty: "Sure! What timeline would you prefer?"
```

### Context Passing

**When opening chat from dashboard:**
```typescript
// From transactions page
openChat({
  employee: 'tag',
  context: {
    page: 'transactions',
    data: {
      month: '2025-07',
      category: 'dining'
    }
  }
});

// Chat opens with context
Tag: "I see you're looking at July dining expenses. 
      Want me to analyze patterns?"
```

---

## 🔍 History Recall System

### User Queries

**Natural Language Examples:**
- "Show me my expenses from July"
- "Bring up that car loan plan we discussed"
- "What did we say about my payday loans?"
- "Recall my spending analysis from last month"

### Recall Flow

```
User: "Show me my July expenses discussion"
  ↓
1. Parse query (extract: month="July", topic="expenses")
  ↓
2. Search conversation summaries
  ↓
3. Semantic search RAG embeddings
  ↓
4. Match date ranges
  ↓
5. Return matches:
   - Conversation summary
   - Date/time
   - Relevant employees
   - Dashboard links
   - Key facts extracted
  ↓
6. Display in HistoryRecallPanel
  ↓
7. User clicks "View" → Shows full transcript
  ↓
8. User clicks "Open Dashboard" → Navigates to page
```

### Recall Implementation

**Backend:**
```typescript
async function recallConversation(
  userId: string,
  query: string
): Promise<ConversationMatch[]> {
  // 1. Parse query
  const parsed = parseRecallQuery(query);
  // { month: '2025-07', topic: 'expenses', keywords: [...] }
  
  // 2. Search summaries
  const summaries = await searchSummaries(userId, parsed);
  
  // 3. Semantic search embeddings
  const embeddings = await semanticSearch(userId, query);
  
  // 4. Combine and rank
  const matches = combineAndRank(summaries, embeddings);
  
  return matches;
}
```

**Frontend:**
```typescript
const handleRecall = async (query: string) => {
  setHistoryRecall({ isOpen: true, searchQuery: query });
  
  const results = await recallConversation(userId, query);
  
  setHistoryRecall(prev => ({
    ...prev,
    results
  }));
};
```

### Recall UI

**HistoryRecallPanel:**
```
┌─────────────────────────────────────────────┐
│  🔍 Search past conversations...           │
│  [Show me my July expenses]                 │
├─────────────────────────────────────────────┤
│  📅 July 2025 - Spending Analysis          │
│  "Analyzed your July expenses..."          │
│  Employees: Tag, Crystal                   │
│  [View Full] [Open Dashboard]              │
├─────────────────────────────────────────────┤
│  📅 July 15, 2025 - Car Loan Discussion    │
│  "Reviewed your car loan terms..."         │
│  Employees: Byte, Finley, Liberty          │
│  [View Full] [Open Dashboard]             │
└─────────────────────────────────────────────┘
```

---

## 🛠️ Tool Transparency

### Tool Chip System

**Display:**
- Small chips below AI messages
- Show which tools were used
- Clickable to see details

**Examples:**
```
👑 Prime: "I've analyzed your loan..."
   📄 Byte OCR
   🧮 Finley Loan Forecast
   ⚡ Blitz Action Plan
   🎯 Goalie Goal created
```

**Implementation:**
```typescript
interface ToolCall {
  id: string;
  tool: string;
  employee: string;
  input: any;
  output: any;
  timestamp: Date;
}

// In message rendering
{toolCalls.map(tool => (
  <ToolChip
    key={tool.id}
    tool={tool.tool}
    employee={tool.employee}
    onClick={() => showToolDetails(tool)}
  />
))}
```

---

## 🔒 Guardrails Integration

### PII Protection Display

**Bottom Label:**
```
┌─────────────────────────────────────────────┐
│  🔒 Guardrails Active — PII Protected       │
└─────────────────────────────────────────────┘
```

**Status:**
- Always visible when guardrails are active
- Shows PII detection status
- Links to guardrails settings

**Integration:**
```typescript
// From guardrails system
const guardrailStatus = useGuardrailsStatus();

<GuardrailsIndicator
  active={guardrailStatus.active}
  piiDetected={guardrailStatus.piiDetected}
  onSettingsClick={() => openGuardrailsSettings()}
/>
```

---

## 📊 State Management Architecture

### Global Chat Store

**Using Zustand (recommended):**

```typescript
interface ChatStore {
  // Conversation
  conversationId: string | null;
  messages: ChatMessage[];
  currentEmployee: string;
  
  // UI State
  isOpen: boolean;
  isMinimized: boolean;
  isMobile: boolean;
  
  // Memory
  conversationHistory: ConversationSummary[];
  userFacts: UserFact[];
  
  // Background Tasks
  backgroundTasks: BackgroundTask[];
  
  // Uploads
  uploads: UploadState;
  
  // History Recall
  historyRecall: HistoryRecallState;
  
  // Actions
  sendMessage: (text: string, files?: File[]) => Promise<void>;
  switchEmployee: (employeeId: string) => void;
  handleHandoff: (from: string, to: string, context: any) => void;
  loadConversation: (conversationId: string) => Promise<void>;
  recallConversation: (query: string) => Promise<void>;
  addBackgroundTask: (task: BackgroundTask) => void;
  completeTask: (taskId: string, result: any) => void;
}
```

### Persistence Strategy

**LocalStorage:**
- UI preferences (open/closed, minimized)
- Last conversation ID
- Last employee used

**Database:**
- All messages
- Conversation summaries
- User facts
- RAG embeddings

**Session Storage:**
- Current conversation state (temporary)
- Upload progress (temporary)

---

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Create `UniversalChatPanel` component
- [ ] Desktop slide-out layout
- [ ] Mobile bottom-sheet layout
- [ ] Basic message rendering
- [ ] Integration with chat API
- [ ] State management setup

### Phase 2: Employee System (Week 3-4)
- [ ] Employee routing integration
- [ ] Handoff detection and animation
- [ ] Employee switcher UI
- [ ] Status indicators
- [ ] Multi-employee message rendering

### Phase 3: Memory & History (Week 5-6)
- [ ] Conversation history loading
- [ ] Session summary system
- [ ] History recall UI
- [ ] Search functionality
- [ ] RAG integration

### Phase 4: Uploads & Processing (Week 7-8)
- [ ] File upload UI
- [ ] Drag-and-drop (desktop)
- [ ] Camera integration (mobile)
- [ ] Byte processing integration
- [ ] Auto-routing after upload

### Phase 5: Dashboard Integration (Week 9-10)
- [ ] CTA link component
- [ ] Dashboard navigation
- [ ] Context passing
- [ ] Deep linking
- [ ] Background task notifications

### Phase 6: Polish & Optimization (Week 11-12)
- [ ] Animations
- [ ] Performance optimization
- [ ] Error handling
- [ ] Analytics
- [ ] User testing

---

## 🎯 Success Metrics

### Engagement
- Chat open rate
- Messages per session
- Employee switches per conversation
- Upload frequency
- History recall usage

### Performance
- Message send latency (<500ms)
- Upload completion time
- Background task completion rate
- Error rate (<1%)

### User Satisfaction
- Task completion rate
- CTA click-through rate
- User feedback scores
- Support ticket reduction

---

## 📝 Key Takeaways

1. **ONE chatbot** - All employees operate in the same panel
2. **Persistent memory** - Everything remembered forever
3. **Seamless handoffs** - Employees collaborate automatically
4. **Universal access** - Chat works from anywhere
5. **History recall** - Natural language search past conversations
6. **Dashboard linking** - CTAs navigate but preserve context
7. **Background processing** - Employees work while users explore
8. **Tool transparency** - Users see what tools are used

---

**This design document serves as the complete blueprint for the universal multi-employee chatbot system. All components, flows, and integrations are documented for implementation.**













