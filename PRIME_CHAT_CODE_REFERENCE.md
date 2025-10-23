# 🔗 Prime Chat Code Reference - Complete Implementation

**Date:** 2025-10-19  
**Purpose:** Exact code locations and integration points for Phase 2+ planning  
**Scope:** All production chat code with line numbers

---

## 📍 FILE LOCATIONS & KEY INTEGRATION POINTS

### 1. Main Chat Component
**File:** `src/components/chat/PrimeChatCentralized.tsx` (250 lines)

#### Entry Point
```typescript
// Props
interface PrimeChatCentralizedProps {
  isOpen: boolean;
  onClose: () => void;
}

// Usage
<PrimeChatCentralized isOpen={isPrimeChatOpen} onClose={() => setIsPrimeChatOpen(false)} />
```

#### Key Integration Points
| Location | Current Code | Phase 2 Enhancement |
|----------|--------------|-------------------|
| **Line 39-43** | `createOrUseSession('prime-boss')` | ← Add greeting loading here |
| **Line 99-130** | Empty state greeting card | ← Add quick action chips here |
| **Line 132-185** | Message rendering loop | ← Add handoff message type here |
| **Line 167** | Message timestamp | ← Add context attribution here |
| **Line 213-221** | Textarea input | ← Add placeholder from greeting |

---

### 2. State Management Hook
**File:** `src/hooks/_legacy/useChat.ts` (410 lines)

#### Hook Signature (Line 53-59)
```typescript
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    employeeSlug: initialEmployeeSlug = 'byte-doc',
    sessionId: initialSessionId = null,
    onError,
    apiEndpoint = '/.netlify/functions/chat',
  } = options;
```

#### State Variables (Line 61-68)
```typescript
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
const [currentEmployeeSlug, setCurrentEmployeeSlug] = useState(initialEmployeeSlug);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<Error | null>(null);
```

#### Message Type Definition (Line 14-29)
```typescript
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  employee?: {
    slug: string;
    title: string;
    emoji?: string;
  };
  metadata?: {
    tool_calls?: any[];
    citations?: any[];
    feedback?: any;
  };
}
```

**Phase 2 Enhancement:**
```typescript
// ADD these fields to metadata
metadata?: {
  tool_calls?: any[];
  citations?: any[];
  feedback?: any;
  factsUsed?: string[];           // ← NEW
  segmentationDecision?: {         // ← NEW
    status: UserStatus;
    confidence: number;
  };
  handoffTarget?: string;          // ← NEW
  delegationReason?: string;       // ← NEW
  confidenceScore?: number;        // ← NEW
};
```

#### Send Message Function (Line 89-191)
```typescript
const sendMessage = useCallback(
  async (text: string) => {
    // Line 106-111: Create user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    // Line 130-143: Call API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: getUserId(),
        employeeSlug: currentEmployeeSlug,
        message: text,
        session_id: sessionId,
        stream: true,  // ← SSE streaming enabled
      }),
      signal: controller.signal,
    });

    // Line 151-160: Handle SSE or JSON
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      await handleSSEStream(response, aiMessageId);
    } else {
      const data = await response.json();
      updateAIMessage(aiMessageId, data.content, data.employee);
      if (data.session_id) {
        setSessionId(data.session_id);
      }
    }
  },
  [isLoading, sessionId, currentEmployeeSlug, apiEndpoint, onError]
);
```

#### SSE Stream Handler (Line 197-299)
```typescript
const handleSSEStream = useCallback(
  async (response: Response, messageId: string) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          switch (data.type) {
            case 'start':
              if (data.session_id) setSessionId(data.session_id);
              if (data.employee) updateAIMessage(messageId, '', data.employee);
              break;

            case 'text':
              appendToAIMessage(messageId, data.content || '');
              break;

            case 'tool_call':
              // Line 239-257: Add to metadata
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === messageId
                    ? {
                        ...msg,
                        metadata: {
                          ...msg.metadata,
                          tool_calls: [
                            ...(msg.metadata?.tool_calls || []),
                            data.tool,
                          ],
                        },
                      }
                    : msg
                )
              );
              break;

            case 'done':
              // Stream complete
              break;
          }
        }
      }
    }
  },
  []
);
```

**Phase 2 Enhancement:** Add new event types
```typescript
case 'handoff':
  updateAIMessage(messageId, undefined, undefined, {
    handoffTarget: data.targetEmployee,
    delegationReason: data.reason,
  });
  break;

case 'facts':
  updateAIMessage(messageId, undefined, undefined, {
    factsUsed: data.facts,
  });
  break;
```

#### Session Management (Line 338-349)
```typescript
const createOrUseSession = useCallback(async (employeeSlug: string) => {
  setCurrentEmployeeSlug(employeeSlug);
  
  // Check localStorage for existing session
  const stored = localStorage.getItem(`chat_session_${employeeSlug}`);
  if (stored) {
    setSessionId(stored);
  } else {
    // Session will be created on first message
    setSessionId(null);
  }
}, []);
```

---

### 3. Byte Chat Template (Clone for Phase 2)
**File:** `src/components/chat/ByteChatCentralized.tsx` (237 lines)

#### Differences from Prime
| Element | Prime | Byte |
|---------|-------|------|
| **employeeSlug** | `'prime-boss'` | `'byte-doc'` |
| **Avatar Icon** | `<Crown />` | `📄` emoji |
| **Colors** | Purple-Blue gradient | Blue gradient |
| **Title** | "Prime" | "Byte" |
| **Subtitle** | "CEO & Strategic Orchestrator" | "Document Processing Specialist" |
| **Message Logic** | Same | Same |
| **Input Logic** | Same | Same |

**Copy this file to create Crystal/Custodian chats:**
```bash
cp src/components/chat/ByteChatCentralized.tsx src/components/chat/CrystalChatCentralized.tsx
# Then update:
# - employeeSlug: 'crystal-analytics'
# - Avatar to 📊
# - Colors to green/teal
# - Title/subtitle
```

---

## 🔌 NETLIFY.TOML CONFIG

**File:** `netlify.toml`

```toml
# ✅ Redirect all routes to index.html (SPA mode)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# ✅ Functions defaults
[functions]
  node_bundler = "esbuild"
  timeout = "26s"            # timeout must be a STRING with "s"

# ✅ Build config
[build]
  command = "npm run build"
  publish = "dist"
```

**Implications for Phase 2:**
- SSE streaming works because SPA redirects to index.html (not blocking)
- 26-second timeout covers streaming responses
- Functions can emit `tool_call` / `handoff` / `facts` events

---

## 📊 VITE CONFIG

**File:** `vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8888,
    strictPort: true,
    hmr: { host: "localhost", port: 8888 }
  },
  resolve: { alias: { "@": "/src" } }
});
```

**Use `@` alias for imports:**
```typescript
import { useChat } from "@/hooks/_legacy/useChat";
import { PrimeChatCentralized } from "@/components/chat/PrimeChatCentralized";
```

---

## 🎯 PHASE 2 ENHANCEMENT ROADMAP

### Step 1: Create Enhanced Types
**File:** `src/types/chat.ts` (NEW)

```typescript
// ============================================================================
// Enhanced Chat Types for Phase 2+
// ============================================================================

import { ChatMessage } from '@/hooks/_legacy/useChat';

export type UserStatus = 'new' | 'returning' | 'power_user';

export interface PrimeIntroMessage {
  message: string;
  actions: QuickAction[];
  facts?: string[];
  recommendations?: string[];
}

export interface QuickAction {
  id: string;
  label: string;
  emoji?: string;
  intent: string;  // e.g., "analyze_spending", "check_budget"
  description?: string;
}

export interface EnhancedChatMessage extends ChatMessage {
  metadata?: {
    tool_calls?: any[];
    citations?: any[];
    feedback?: any;
    
    // Phase 2 fields
    factsUsed?: string[];
    segmentationDecision?: {
      status: UserStatus;
      confidence: number;
    };
    handoffTarget?: string;
    delegationReason?: string;
    confidenceScore?: number;
  };
  type?: 'user' | 'assistant' | 'system' | 'handoff';  // NEW: handoff type
}
```

### Step 2: Extend useChat Hook
**File:** `src/hooks/_legacy/useChat.ts` (UPDATE)

**Location: Line 14-29 (ChatMessage interface)**

Replace:
```typescript
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  employee?: {
    slug: string;
    title: string;
    emoji?: string;
  };
  metadata?: {
    tool_calls?: any[];
    citations?: any[];
    feedback?: any;
  };
}
```

With:
```typescript
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  type?: 'user' | 'assistant' | 'system' | 'handoff';  // ← NEW
  employee?: {
    slug: string;
    title: string;
    emoji?: string;
  };
  metadata?: {
    tool_calls?: any[];
    citations?: any[];
    feedback?: any;
    factsUsed?: string[];                    // ← NEW
    segmentationDecision?: {                 // ← NEW
      status: 'new' | 'returning' | 'power_user';
      confidence: number;
    };
    handoffTarget?: string;                  // ← NEW
    delegationReason?: string;               // ← NEW
    confidenceScore?: number;                // ← NEW
  };
}
```

**Location: Line 222-290 (SSE event handler)**

Add after `case 'tool_result':` block:

```typescript
case 'handoff':
  // Handle handoff message
  const handoffMsg: ChatMessage = {
    id: `handoff-${Date.now()}`,
    role: 'system',
    type: 'handoff',
    content: `Connecting to ${data.targetEmployee}...`,
    timestamp: new Date().toISOString(),
    metadata: {
      handoffTarget: data.targetEmployee,
      delegationReason: data.reason,
    },
  };
  setMessages(prev => [...prev, handoffMsg]);
  break;

case 'facts':
  // Update message with facts used
  setMessages(prev =>
    prev.map(msg =>
      msg.id === messageId
        ? {
            ...msg,
            metadata: {
              ...msg.metadata,
              factsUsed: data.facts,
            },
          }
        : msg
    )
  );
  break;

case 'segmentation':
  // Update with user segmentation
  setMessages(prev =>
    prev.map(msg =>
      msg.id === messageId
        ? {
            ...msg,
            metadata: {
              ...msg.metadata,
              segmentationDecision: data.decision,
            },
          }
        : msg
    )
  );
  break;
```

### Step 3: Create Quick Action Chips Component
**File:** `src/components/chat/QuickActionChips.tsx` (NEW)

```typescript
import React from 'react';
import { QuickAction } from '@/types/chat';

interface QuickActionChipsProps {
  actions: QuickAction[];
  onSelect: (intent: string) => void;
  loading?: boolean;
}

export const QuickActionChips: React.FC<QuickActionChipsProps> = ({
  actions,
  onSelect,
  loading = false,
}) => {
  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {actions.map(action => (
        <button
          key={action.id}
          onClick={() => onSelect(action.intent)}
          disabled={loading}
          className="px-3 py-2 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg text-sm hover:bg-purple-100 disabled:opacity-50 transition-colors"
        >
          <span className="mr-1">{action.emoji || '💡'}</span>
          {action.label}
        </button>
      ))}
    </div>
  );
};
```

### Step 4: Create Handoff Message Component
**File:** `src/components/chat/HandoffMessage.tsx` (NEW)

```typescript
import React from 'react';
import { Zap } from 'lucide-react';

interface HandoffMessageProps {
  targetEmployee: string;
  reason?: string;
  emoji?: string;
}

export const HandoffMessage: React.FC<HandoffMessageProps> = ({
  targetEmployee,
  reason,
  emoji = '🤝',
}) => {
  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 px-4 py-3 my-2 rounded-r-lg">
      <p className="text-sm font-medium text-blue-900 flex items-center gap-2">
        <span>{emoji}</span>
        Connecting to {targetEmployee}...
      </p>
      {reason && (
        <p className="text-xs text-blue-700 mt-1">{reason}</p>
      )}
    </div>
  );
};
```

### Step 5: Update PrimeChatCentralized
**File:** `src/components/chat/PrimeChatCentralized.tsx` (UPDATE)

#### Location: Line 39-43 (Initialize session)

Add greeting loading:
```typescript
const [greeting, setGreeting] = useState<PrimeIntroMessage | null>(null);

useEffect(() => {
  if (isOpen) {
    createOrUseSession('prime-boss');
    
    // NEW: Load adaptive greeting if empty state
    if (messages.length === 0 && user?.id) {
      loadAdaptiveGreeting(user.id);
    }
  }
}, [isOpen, createOrUseSession, messages.length, user?.id]);

const loadAdaptiveGreeting = async (userId: string) => {
  try {
    const response = await fetch('/.netlify/functions/prime-greeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await response.json();
    setGreeting(data);
  } catch (error) {
    console.error('Failed to load greeting:', error);
  }
};
```

#### Location: Line 99-130 (Empty state)

Add quick action chips:
```typescript
{messages.length === 0 && !isLoading && (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mb-4">
      <Crown className="w-10 h-10 text-white" />
    </div>
    
    {/* Dynamic greeting (Phase 1 output) */}
    {greeting ? (
      <>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{greeting.message}</h3>
        {greeting.actions && (
          <QuickActionChips 
            actions={greeting.actions}
            onSelect={handleSend}
            loading={isLoading}
          />
        )}
      </>
    ) : (
      <>
        <h3 className="text-xl font-bold text-gray-900 mb-2">👑 Welcome! I'm Prime</h3>
        {/* ... existing capability tiles ... */}
      </>
    )}
  </div>
)}
```

#### Location: Line 132-185 (Message rendering)

Add handoff message type:
```typescript
{messages.map((message) => {
  // NEW: Handle handoff messages
  if (message.type === 'handoff') {
    return (
      <div key={message.id}>
        <HandoffMessage
          targetEmployee={message.metadata?.handoffTarget || 'Team Member'}
          reason={message.metadata?.delegationReason}
        />
      </div>
    );
  }

  // Existing: Regular messages
  return (
    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {/* ... existing message bubble code ... */}
      
      {/* Add context attribution (NEW) */}
      <div className="text-[10px] mt-2 opacity-60">
        {new Date(message.timestamp).toLocaleTimeString()}
        {message.metadata?.factsUsed && (
          <span> • Based on {message.metadata.factsUsed.length} facts</span>
        )}
      </div>
    </div>
  );
})}
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 2A: Foundation (1 week)
- [ ] Create `src/types/chat.ts` with enhanced metadata
- [ ] Update `ChatMessage` interface in `useChat.ts`
- [ ] Create `QuickActionChips.tsx` component
- [ ] Create `HandoffMessage.tsx` component
- [ ] Test component rendering in isolation

### Phase 2B: Hook Integration (1 week)
- [ ] Add new SSE event handlers (`handoff`, `facts`, `segmentation`)
- [ ] Update `updateAIMessage` to handle new metadata
- [ ] Test streaming with mock events
- [ ] Add error handling for Phase 2 events

### Phase 2C: UI Integration (1 week)
- [ ] Wire adaptive greeting loading in `PrimeChatCentralized`
- [ ] Add quick action chips to empty state
- [ ] Add handoff message rendering
- [ ] Add context attribution to message footer
- [ ] Test all flows end-to-end

### Phase 2D: Multi-Employee (1 week)
- [ ] Clone `ByteChatCentralized` to `CrystalChatCentralized`
- [ ] Update for `crystal-analytics` slug
- [ ] Test Crystal chat independently
- [ ] Create employee switcher UI (optional for Phase 2)

### Phase 2E: Testing & Polish (1 week)
- [ ] Unit tests for components
- [ ] Integration tests for hook
- [ ] E2E tests for full flow
- [ ] Performance profiling
- [ ] Documentation & examples

---

## 🎓 LEARNING RESOURCES

**SSE Streaming Pattern:**
```typescript
// How the hook currently streams:
// 1. POST to /.netlify/functions/chat with stream: true
// 2. Response arrives as text/event-stream
// 3. Events come as: data: {"type": "text", "content": "..."}
// 4. Hook parses JSON and updates message state
// 5. UI auto-renders as state changes

// For Phase 2, we add new event types:
// - data: {"type": "handoff", "targetEmployee": "Crystal"}
// - data: {"type": "facts", "facts": ["fact1", "fact2"]}
// - data: {"type": "segmentation", "decision": {...}}
```

**Modal State Pattern:**
```typescript
// Typical usage in dashboard page:
const [isPrimeChatOpen, setIsPrimeChatOpen] = useState(false);

// Button to open
<button onClick={() => setIsPrimeChatOpen(true)}>Ask Prime</button>

// Modal at bottom of page
<PrimeChatCentralized 
  isOpen={isPrimeChatOpen} 
  onClose={() => setIsPrimeChatOpen(false)}
/>
```

**Session Persistence:**
```typescript
// Sessions auto-saved to localStorage
// Key: chat_session_{employeeSlug}
// Value: sessionId string

// Survives page reload - when user reopens chat,
// hook loads existing session from localStorage
// All previous messages preserved
```

---

## ✅ READY FOR PHASE 2 IMPLEMENTATION

**Current State:** ✅ Foundation complete  
**Next Step:** Confirm Phase 2 roadmap with questions above  
**Timeline:** 2-3 weeks for full Phase 2  
**Risk Level:** 🟢 Low (non-breaking extensions only)

All code locations, integration points, and implementation details documented above.
Ready to proceed when you confirm the architectural decisions! 🚀





