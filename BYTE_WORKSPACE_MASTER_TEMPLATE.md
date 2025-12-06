# Byte Workspace Master Template Analysis

## Step 1: Source of Truth Summary

### File 1: `src/pages/dashboard/SmartImportChatPage.tsx`

**Component Name:** `SmartImportChatPage`

**Purpose:** Main page component that renders the 3-column dashboard layout and manages the floating workspace overlay state.

**Props:** None (page component)

**Internal Structure:**
```
<DashboardSection>
  <Grid (3 columns)>
    <Left Column> → <ByteWorkspacePanel />
    <Center Column> → <ByteUnifiedCard />
    <Right Column> → <ActivityPanel />
  </Grid>
</DashboardSection>
<ByteWorkspaceOverlay open={isByteWorkspaceOpen} onClose={closeByteWorkspace} />
```

**Key Styling Classes:**
- Grid: `grid grid-cols-12 gap-0 items-stretch`
- Columns: `col-span-12 lg:col-span-4/5/3 flex flex-col`
- Height: `minHeight: 'calc(100vh - 200px)'`

**Important Logic:**
- State: `isByteWorkspaceOpen` (boolean)
- Handlers: `openByteWorkspace()`, `closeByteWorkspace()`
- Launchers: Overlay opens from `ByteUnifiedCard` "Expand" button and chat input click

**Assumptions:**
- Route: `/dashboard/smart-import-ai`
- Overlay is controlled by page-level state
- No props needed - self-contained page

---

### File 2: `src/components/chat/ByteWorkspaceOverlay.tsx`

**Component Name:** `ByteWorkspaceOverlay`

**Purpose:** Floating centered workspace overlay with backdrop blur, header, chat body, guardrails status, and input composer.

**Props:**
```typescript
interface ByteWorkspaceOverlayProps {
  open: boolean;
  onClose: () => void;
}
```

**Internal Structure (Top to Bottom):**

1. **Backdrop Layer** (`fixed inset-0 z-[80]`)
   - `bg-slate-950/50 backdrop-blur-md`
   - Centers panel with `flex items-center justify-center`
   - Closes on backdrop click

2. **Floating Panel** (`max-w-5xl h-[72vh] rounded-3xl`)
   - `border border-slate-500/40`
   - `bg-slate-950/90 shadow-2xl`
   - Animation: `opacity-0 translate-y-6 scale-95` → `opacity-100 translate-y-0 scale-100`

3. **Header** (`flex-shrink-0 px-6 py-4`)
   - Left: Avatar (📄 in indigo circle) + Title + Subtitle + "SMART IMPORT WORKSPACE" pill
   - Right: Guardrails chip + Close (X) button
   - Border: `border-b border-slate-800/60`

4. **Body Layout** (`flex h-[calc(72vh-4rem)] flex-col`)
   - Chat area: `flex-1 min-h-0 overflow-hidden`
     - Contains `<EmployeeChatWorkspace employeeSlug="byte-docs" />`
   - Guardrails strip: `flex-shrink-0 px-6 py-2`
   - Composer: `flex-shrink-0 px-6 pb-4`

5. **Guardrails Strip** (between chat and composer)
   - Centered chip with Lock icon
   - Dynamic colors: emerald (active) / amber (unknown)

6. **Input Composer** (`bg-slate-800 rounded-xl px-3 py-2`)
   - Left: 3 action icons (Paperclip, Upload, FileText)
   - Center: Text input (`flex-1`)
   - Right: Send button (gradient blue circle)

**Key Styling Classes:**

**Backdrop:**
- `fixed inset-0 z-[80] flex items-center justify-center`
- `bg-slate-950/50 backdrop-blur-md`
- `transition-opacity duration-200`

**Panel:**
- `relative w-full max-w-5xl h-[72vh]`
- `rounded-3xl border border-slate-500/40`
- `bg-slate-950/90 shadow-2xl`
- `transition-all duration-200 ease-out`

**Header:**
- `px-6 py-4 border-b border-slate-800/60 bg-slate-950/95`
- Avatar: `h-10 w-10 rounded-full bg-indigo-500/80 shadow-lg shadow-indigo-500/30`
- Workspace pill: `rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] uppercase`

**Guardrails Chip (Active):**
- `bg-emerald-500/10 text-emerald-200 border-emerald-500/40`
- Dot: `bg-emerald-400 animate-pulse`

**Input Bar:**
- `bg-slate-800 rounded-xl px-3 py-2 border border-slate-700`
- `focus-within:border-blue-500`

**Send Button:**
- `bg-gradient-to-br from-blue-500 to-blue-600 rounded-full w-10 h-10`
- `shadow-lg shadow-blue-500/30 hover:scale-105`

**Important Logic:**

1. **Animation State:**
   - `useEffect` triggers `isAnimating` on `open` change
   - Uses `requestAnimationFrame` for smooth transition
   - CSS classes: `opacity-0 translate-y-6 scale-95` → `opacity-100 translate-y-0 scale-100`

2. **ESC Key Handler:**
   - `useEffect` adds/removes event listener
   - Closes overlay on ESC press
   - Auto-focuses input on open

3. **Body Scroll Lock:**
   - `useEffect` sets `document.body.style.overflow = 'hidden'` when open
   - Restores on close

4. **Chat Integration:**
   - Uses `EmployeeChatWorkspace` component
   - Receives `sendFunction` via `onSendFunctionReady` callback
   - Receives `isStreaming` via `onStreamingStateChange` callback
   - Receives guardrails status via `onGuardrailsStateChange` callback

5. **Send Logic:**
   - Controlled input (`inputValue` state)
   - `handleSend` calls `sendFunction(message)` from EmployeeChatWorkspace
   - Clears input immediately after sending
   - Disabled during streaming or when no sendFunction

**How EmployeeChatWorkspace Receives/Returns Events:**

**Receives:**
- `employeeSlug="byte-docs"` - Employee identifier
- `showHeader={false}` - Hides internal header (using overlay header instead)
- `showComposer={false}` - Hides internal composer (using overlay composer instead)

**Returns via Callbacks:**
- `onSendFunctionReady(setSendFunction)` - Provides `send(message: string) => Promise<void>`
- `onStreamingStateChange(setIsStreaming)` - Provides `isStreaming: boolean`
- `onGuardrailsStateChange((guardrails, pii) => {...})` - Provides guardrails status

**How Guardrail State is Passed Down:**

1. `EmployeeChatWorkspace` reads `headers.guardrails` and `headers.piiMask` from `usePrimeChat` hook
2. Calls `onGuardrailsStateChange(guardrailsActive, piiProtectionActive)` when headers change
3. `ByteWorkspaceOverlay` receives via callback and updates local state
4. State is used to style guardrails chips (emerald vs amber)

**Assumptions:**

- **Employee Slug:** Hardcoded `"byte-docs"` (line 170)
- **Layout Sizes:** 
  - Panel: `max-w-5xl` (1280px), `h-[72vh]` (72% viewport)
  - Header height: ~4rem (calculated in body: `h-[calc(72vh-4rem)]`)
- **Colors:**
  - Avatar: `bg-indigo-500/80` (indigo)
  - Workspace pill: `border-indigo-500/40 bg-indigo-500/10 text-indigo-100/90`
  - Send button: `from-blue-500 to-blue-600` (blue gradient)
- **Padding:**
  - Header: `px-6 py-4` (24px horizontal, 16px vertical)
  - Composer container: `px-6 pb-4` (24px horizontal, 16px bottom)
  - Input bar: `px-3 py-2` (12px horizontal, 8px vertical)
- **Placeholder Text:** Hardcoded `"Message Byte..."` (line 227)
- **Action Icons:** Hardcoded Paperclip, Upload, FileText (lines 203-220)

---

### File 3: `src/components/chat/EmployeeChatWorkspace.tsx`

**Component Name:** `EmployeeChatWorkspace`

**Purpose:** Reusable chat workspace component that handles all chat logic (messages, streaming, guardrails) via `usePrimeChat` hook.

**Props:**
```typescript
interface EmployeeChatWorkspaceProps {
  employeeSlug: string;
  initialQuestion?: string;
  conversationId?: string;
  className?: string;
  showHeader?: boolean;
  showComposer?: boolean;
  onSendFunctionReady?: (sendFn: (message: string) => Promise<void>) => void;
  onStreamingStateChange?: (isStreaming: boolean) => void;
  onGuardrailsStateChange?: (guardrailsActive: boolean, piiProtectionActive: boolean) => void;
}
```

**Internal Structure:**

1. **Header** (conditional, `showHeader={true}` by default)
   - Avatar + Employee name + Role + "Chatting as {userName}"
   - Hidden in ByteWorkspaceOverlay (`showHeader={false}`)

2. **Messages Area** (`flex-1 min-h-0 overflow-y-auto`)
   - Welcome state (when `messages.length === 0`)
   - Message bubbles (user, assistant, system)
   - Upload indicator
   - Streaming indicator ("{employee} is typing...")

3. **Composer** (conditional, `showComposer={true}` by default)
   - Upload previews
   - Action buttons (Paperclip, Image, Mic)
   - Textarea input
   - Send button
   - Guardrails indicator
   - Hidden in ByteWorkspaceOverlay (`showComposer={false}`)

**Key Styling Classes:**

- Container: `flex flex-col h-full`
- Messages: `flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3`
- User bubble: `max-w-[85%] px-4 py-2 rounded-2xl bg-blue-600`
- Assistant bubble: `max-w-[85%] px-4 py-2 rounded-2xl bg-slate-800/70 border border-slate-700/50`
- Welcome: `flex flex-col items-center justify-center h-full text-center`

**Important Logic:**

1. **Chat Hook Integration:**
   - Uses `usePrimeChat(userId, conversationId, employeeSlug)`
   - Returns: `messages`, `input`, `setInput`, `isStreaming`, `send`, `headers`

2. **Guardrails Detection:**
   - Reads `headers.guardrails` and `headers.piiMask` from `usePrimeChat`
   - Calls `onGuardrailsStateChange` when headers change
   - Logic: `guardrails === 'active' || guardrails === 'enabled'`

3. **Send Function Exposure:**
   - Wraps `send()` in `sendWrapper` function
   - Calls `onSendFunctionReady(sendWrapper)` when `send` changes

4. **Streaming State Exposure:**
   - Calls `onStreamingStateChange(isStreaming)` when streaming state changes

5. **File Upload:**
   - Uses `useSmartImport` hook for file uploads
   - Supports drag & drop
   - Shows upload previews

**How It Receives/Returns Events:**

**Receives:**
- `employeeSlug` - Used to initialize `usePrimeChat` and get employee info
- `showHeader/showComposer` - Control visibility of internal UI
- Callback props for exposing state to parent

**Returns:**
- `onSendFunctionReady(sendFn)` - Provides send function
- `onStreamingStateChange(isStreaming)` - Provides streaming state
- `onGuardrailsStateChange(guardrails, pii)` - Provides guardrails status

**Assumptions:**
- Uses `usePrimeChat` hook (universal chat hook)
- Employee info comes from `getEmployeeInfo(employeeSlug)` utility
- Welcome message uses employee name from `getEmployeeInfo`

---

### File 4: Helper Utilities

**`src/utils/employeeUtils.ts`**

**Purpose:** Maps employee slugs to employee info (name, emoji, role).

**Key Functions:**
- `getEmployeeInfo(slug)` - Returns `{ key, name, emoji, role, slug }`
- `getEmployeeName(slug)` - Returns employee name
- `getEmployeeEmoji(slug)` - Returns emoji

**Slug Mapping:**
- `'byte-docs'`, `'byte-doc'`, `'byte-ai'` → all map to `'byte'` key
- Falls back to Prime if slug not found

**`src/hooks/usePrimeChat.ts`**

**Purpose:** Universal chat hook that handles streaming, messages, guardrails headers.

**Returns:**
```typescript
{
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  isStreaming: boolean;
  send: (message: string) => Promise<void>;
  headers: ChatHeaders; // Contains guardrails, piiMask, employee, etc.
  activeEmployeeSlug: string;
  // ... other utilities
}
```

**Guardrails Detection:**
- Reads `headers.guardrails` and `headers.piiMask` from chat response
- Values: `'active'`, `'enabled'`, or undefined

---

## Step 2: Universal vs Byte-Specific Code

### A. Universal (Used by Every Employee)

#### 1. Floating Overlay Shell
- **Backdrop:** `fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 backdrop-blur-md`
- **Panel:** `max-w-5xl h-[72vh] rounded-3xl border border-slate-500/40 bg-slate-950/90 shadow-2xl`
- **Animation:** Scale/fade from bottom-center
- **Click-outside:** Closes on backdrop click
- **Status:** ✅ Universal

#### 2. Header Layout Structure
- **Container:** `flex items-center justify-between px-6 py-4 border-b`
- **Left side:** Avatar + Title + Subtitle + Workspace pill
- **Right side:** Guardrails chip + Close button
- **Status:** ✅ Universal (content is Byte-specific)

#### 3. Close Button + ESC Handler
- **Button:** `rounded-full border border-slate-700/70 bg-slate-900/80`
- **ESC handler:** `useEffect` with keyboard event listener
- **Status:** ✅ Universal

#### 4. Backdrop Blur
- **Classes:** `bg-slate-950/50 backdrop-blur-md`
- **Status:** ✅ Universal

#### 5. Guardrail Chip Logic
- **Dynamic colors:** Emerald (active) / Amber (unknown)
- **State management:** Reads from `onGuardrailsStateChange` callback
- **Display locations:** Header chip + Middle strip
- **Status:** ✅ Universal (text content is Byte-specific)

#### 6. Chat Message Body
- **Container:** `flex-1 min-h-0 overflow-hidden`
- **Content:** Uses `EmployeeChatWorkspace` component
- **Status:** ✅ Universal

#### 7. Composer Section Structure
- **Container:** `border-t border-slate-800/60 bg-slate-950/95 flex-shrink-0`
- **Input bar:** `bg-slate-800 rounded-xl px-3 py-2 border`
- **Layout:** Icons + Input + Send button
- **Status:** ✅ Universal (icons and placeholder are Byte-specific)

#### 8. Animation Wrapper
- **State:** `isAnimating` triggered by `open` prop
- **Classes:** `opacity-0 translate-y-6 scale-95` → `opacity-100 translate-y-0 scale-100`
- **Status:** ✅ Universal

#### 9. Body Scroll Lock
- **Logic:** `document.body.style.overflow = 'hidden'` when open
- **Status:** ✅ Universal

#### 10. Input State Management
- **Controlled input:** `inputValue` state
- **Send handler:** Calls `sendFunction` from EmployeeChatWorkspace
- **Loading state:** Disabled during streaming
- **Status:** ✅ Universal

---

### B. Byte-Specific (Needs to Become Props)

#### 1. Title
- **Current:** `"Byte — Smart Import AI"` (line 129)
- **Proposed Prop:** `title: string`
- **Type:** `string`
- **Example:** `"Byte — Smart Import AI"`, `"Prime — AI CEO"`, `"Tag — Smart Categories"`

#### 2. Subtitle
- **Current:** `"Data Processing Specialist · Helps you import and understand your documents"` (line 136)
- **Proposed Prop:** `subtitle: string`
- **Type:** `string`
- **Example:** `"Data Processing Specialist · Helps you import and understand your documents"`

#### 3. Avatar Emoji
- **Current:** `"📄"` (line 121)
- **Proposed Prop:** `avatarEmoji: string`
- **Type:** `string`
- **Example:** `"📄"`, `"👑"`, `"🏷️"`

#### 4. Avatar Color
- **Current:** `bg-indigo-500/80` (line 120)
- **Proposed Prop:** `avatarColorClass?: string`
- **Type:** `string` (Tailwind color class)
- **Default:** `"bg-indigo-500/80"`
- **Example:** `"bg-indigo-500/80"`, `"bg-purple-500/80"`, `"bg-blue-500/80"`

#### 5. Workspace Label
- **Current:** `"Smart Import Workspace"` (line 132)
- **Proposed Prop:** `workspaceLabel?: string`
- **Type:** `string | undefined`
- **Default:** `undefined` (hide if not provided)
- **Example:** `"Smart Import Workspace"`, `"CEO Workspace"`, `"Categories Workspace"`

#### 6. Workspace Pill Color
- **Current:** `border-indigo-500/40 bg-indigo-500/10 text-indigo-100/90` (line 131)
- **Proposed Prop:** `workspacePillColorClass?: string`
- **Type:** `string` (Tailwind color class prefix)
- **Default:** Uses `avatarColorClass` or `"indigo"`
- **Example:** `"indigo"`, `"purple"`, `"blue"`

#### 7. Employee Slug
- **Current:** `"byte-docs"` (line 170)
- **Proposed Prop:** `employeeSlug: string`
- **Type:** `string`
- **Example:** `"byte-docs"`, `"prime-boss"`, `"tag-ai"`

#### 8. Input Placeholder
- **Current:** `"Message Byte..."` (line 227)
- **Proposed Prop:** `inputPlaceholder?: string`
- **Type:** `string | undefined`
- **Default:** `"Message..."` or derived from employee name
- **Example:** `"Message Byte..."`, `"Message Prime..."`, `"Ask Tag..."`

#### 9. Action Icons
- **Current:** Hardcoded Paperclip, Upload, FileText (lines 203-220)
- **Proposed Prop:** `actionIcons?: Array<{ icon: React.ReactNode, label: string, onClick: () => void }>`
- **Type:** `Array<ActionIcon>` or `React.ReactNode[]`
- **Default:** `undefined` (hide if not provided)
- **Example:** Byte-specific icons for document uploads

#### 10. Send Button Color
- **Current:** `from-blue-500 to-blue-600` (line 247)
- **Proposed Prop:** `sendButtonColorClass?: string`
- **Type:** `string` (Tailwind gradient class)
- **Default:** `"from-blue-500 to-blue-600"`
- **Example:** `"from-blue-500 to-blue-600"`, `"from-purple-500 to-purple-600"`

#### 11. Guardrails Text (Header)
- **Current:** `"Guardrails + PII Protection Active"` / `"Guardrails Status Unknown"` (lines 151-152)
- **Proposed Prop:** `guardrailsText?: { active: string, unknown: string }`
- **Type:** `{ active: string, unknown: string } | undefined`
- **Default:** `{ active: "Guardrails + PII Protection Active", unknown: "Guardrails Status Unknown" }`

#### 12. Guardrails Text (Strip)
- **Current:** `"Guardrails Active · PII protection on"` / `"Guardrails Status Unknown"` (lines 193-194)
- **Proposed Prop:** Same as above, or separate `guardrailsStripText`

---

## Step 3: Proposed Universal Component API

### Main Component: `<AIWorkspaceOverlay />`

```typescript
interface AIWorkspaceOverlayProps {
  // Core props
  open: boolean;
  onClose: () => void;
  
  // Employee identification
  employeeSlug: string;
  
  // Header content
  title: string;
  subtitle: string;
  workspaceLabel?: string;
  
  // Avatar
  avatarEmoji: string;
  avatarColorClass?: string; // e.g., "bg-indigo-500/80"
  avatarShadowColorClass?: string; // e.g., "shadow-indigo-500/30"
  
  // Workspace pill styling
  workspacePillColorClass?: string; // e.g., "indigo" (for border-indigo-500/40)
  
  // Input composer
  inputPlaceholder?: string;
  actionIcons?: React.ReactNode[]; // Custom action icons (optional)
  sendButtonColorClass?: string; // e.g., "from-blue-500 to-blue-600"
  
  // Guardrails text customization
  guardrailsText?: {
    headerActive: string;
    headerUnknown: string;
    stripActive: string;
    stripUnknown: string;
  };
  
  // Layout customization
  maxWidth?: string; // e.g., "max-w-5xl"
  height?: string; // e.g., "h-[72vh]"
  
  // Advanced
  conversationId?: string;
  initialQuestion?: string;
}
```

### Sub-Components to Extract

#### 1. `<AIWorkspaceHeader />`

**Purpose:** Reusable header with avatar, title, subtitle, workspace pill, guardrails chip, and close button.

**Props:**
```typescript
interface AIWorkspaceHeaderProps {
  avatarEmoji: string;
  avatarColorClass?: string;
  avatarShadowColorClass?: string;
  title: string;
  subtitle: string;
  workspaceLabel?: string;
  workspacePillColorClass?: string;
  guardrailsActive: boolean;
  piiProtectionActive: boolean;
  guardrailsText?: { active: string; unknown: string };
  onClose: () => void;
  titleId?: string; // For aria-labelledby
}
```

**Why Reusable:**
- Same layout structure for all employees
- Only content changes (title, emoji, colors)
- Consistent styling and spacing

#### 2. `<AIWorkspaceInput />`

**Purpose:** Reusable input composer with action icons, text input, and send button.

**Props:**
```typescript
interface AIWorkspaceInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  isStreaming: boolean;
  disabled?: boolean;
  actionIcons?: React.ReactNode[];
  sendButtonColorClass?: string;
  employeeName?: string; // For dynamic placeholder
}
```

**Why Reusable:**
- Same input bar structure
- Only icons and placeholder change
- Consistent send button behavior

#### 3. `<AIWorkspaceGuardrailsChip />`

**Purpose:** Reusable guardrails status chip with dynamic colors.

**Props:**
```typescript
interface AIWorkspaceGuardrailsChipProps {
  guardrailsActive: boolean;
  piiProtectionActive: boolean;
  variant?: 'header' | 'strip';
  text?: {
    active: string;
    unknown: string;
  };
}
```

**Why Reusable:**
- Same logic for all employees
- Only text content may vary
- Consistent visual styling

#### 4. `<AIWorkspaceContainer />`

**Purpose:** Reusable overlay wrapper with backdrop, animation, and scroll lock.

**Props:**
```typescript
interface AIWorkspaceContainerProps {
  open: boolean;
  onClose: () => void;
  maxWidth?: string;
  height?: string;
  children: React.ReactNode;
  ariaLabelledBy?: string;
}
```

**Why Reusable:**
- Same backdrop and animation logic
- Same ESC key handling
- Same body scroll lock
- Only content changes

---

## Step 4: Refactor Plan

### Phase 1: Extract Universal Components (No Breaking Changes)

**Goal:** Create reusable components without changing Byte workspace yet.

#### 1.1 Create Component Directory Structure

```
src/components/workspace/
├── AIWorkspaceOverlay.tsx          # Main overlay component
├── AIWorkspaceHeader.tsx           # Header sub-component
├── AIWorkspaceInput.tsx            # Input composer sub-component
├── AIWorkspaceGuardrailsChip.tsx   # Guardrails chip sub-component
├── AIWorkspaceContainer.tsx         # Container wrapper sub-component
└── index.ts                         # Barrel exports
```

#### 1.2 Extract `<AIWorkspaceContainer />`

**File:** `src/components/workspace/AIWorkspaceContainer.tsx`

**Extract:**
- Backdrop layer
- Floating panel wrapper
- Animation logic
- ESC key handler
- Body scroll lock
- Click-outside handler

**Props:**
```typescript
interface AIWorkspaceContainerProps {
  open: boolean;
  onClose: () => void;
  maxWidth?: string; // default: "max-w-5xl"
  height?: string; // default: "h-[72vh]"
  children: React.ReactNode;
  ariaLabelledBy?: string;
}
```

#### 1.3 Extract `<AIWorkspaceHeader />`

**File:** `src/components/workspace/AIWorkspaceHeader.tsx`

**Extract:**
- Header layout structure
- Avatar circle
- Title + Subtitle layout
- Workspace pill
- Guardrails chip (header variant)
- Close button

**Props:** (as defined above)

#### 1.4 Extract `<AIWorkspaceGuardrailsChip />`

**File:** `src/components/workspace/AIWorkspaceGuardrailsChip.tsx`

**Extract:**
- Guardrails chip logic
- Dynamic color classes
- Pulse animation
- Lock icon

**Props:** (as defined above)

#### 1.5 Extract `<AIWorkspaceInput />`

**File:** `src/components/workspace/AIWorkspaceInput.tsx`

**Extract:**
- Input bar container
- Action icons container
- Text input field
- Send button with loading state

**Props:** (as defined above)

#### 1.6 Create `<AIWorkspaceOverlay />`

**File:** `src/components/workspace/AIWorkspaceOverlay.tsx`

**Composition:**
- Uses `<AIWorkspaceContainer />` for wrapper
- Uses `<AIWorkspaceHeader />` for header
- Uses `<EmployeeChatWorkspace />` for chat body
- Uses `<AIWorkspaceGuardrailsChip />` for guardrails strip
- Uses `<AIWorkspaceInput />` for composer

**Props:** (as defined in Step 3)

---

### Phase 2: Migrate Byte Workspace (Test Migration)

**Goal:** Replace `ByteWorkspaceOverlay` with `AIWorkspaceOverlay` using Byte-specific props.

#### 2.1 Update `ByteWorkspaceOverlay.tsx`

**Option A:** Keep as wrapper (recommended for backward compatibility)
```typescript
export function ByteWorkspaceOverlay({ open, onClose }: ByteWorkspaceOverlayProps) {
  return (
    <AIWorkspaceOverlay
      open={open}
      onClose={onClose}
      employeeSlug="byte-docs"
      title="Byte — Smart Import AI"
      subtitle="Data Processing Specialist · Helps you import and understand your documents"
      workspaceLabel="Smart Import Workspace"
      avatarEmoji="📄"
      avatarColorClass="bg-indigo-500/80"
      avatarShadowColorClass="shadow-indigo-500/30"
      workspacePillColorClass="indigo"
      inputPlaceholder="Message Byte..."
      actionIcons={[
        <Paperclip />,
        <Upload />,
        <FileText />
      ]}
      sendButtonColorClass="from-blue-500 to-blue-600"
    />
  );
}
```

**Option B:** Replace entirely (cleaner, but requires updating imports)

#### 2.2 Test Byte Workspace

- Verify overlay opens/closes
- Verify chat sends messages
- Verify guardrails status displays
- Verify animations work
- Verify ESC key closes
- Verify backdrop click closes

---

### Phase 3: Migrate Other Workspaces (One-by-One)

**Goal:** Migrate each dashboard workspace to use `AIWorkspaceOverlay`.

#### 3.1 Prime Chat Workspace

**File:** `src/pages/dashboard/PrimeChatPage.tsx` (or similar)

**Changes:**
- Add state: `const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false)`
- Replace existing chat UI with `<AIWorkspaceOverlay />`
- Configure with Prime-specific props:
  - `employeeSlug="prime-boss"`
  - `title="Prime — AI CEO"`
  - `avatarEmoji="👑"`
  - `avatarColorClass="bg-purple-500/80"`
  - etc.

#### 3.2 Smart Categories Workspace

**File:** `src/pages/dashboard/SmartCategoriesPage.tsx` (or similar)

**Changes:**
- Same pattern as Prime
- Configure with Tag-specific props:
  - `employeeSlug="tag-ai"`
  - `title="Tag — Smart Categories"`
  - `avatarEmoji="🏷️"`
  - `avatarColorClass="bg-blue-500/80"`
  - etc.

#### 3.3 Continue for All Workspaces

- Transactions AI
- Goal Concierge
- Crystal Analytics
- etc.

---

### Phase 4: Cleanup

#### 4.1 Remove Old Components

- Keep `ByteWorkspaceOverlay.tsx` as wrapper (or remove if fully replaced)
- Remove any other employee-specific overlay components
- Update imports across codebase

#### 4.2 Documentation

- Update component docs
- Create usage examples
- Document prop types

---

## Final File Structure

```
src/
├── components/
│   ├── workspace/
│   │   ├── AIWorkspaceOverlay.tsx          # Main universal component
│   │   ├── AIWorkspaceHeader.tsx           # Header sub-component
│   │   ├── AIWorkspaceInput.tsx            # Input composer sub-component
│   │   ├── AIWorkspaceGuardrailsChip.tsx   # Guardrails chip sub-component
│   │   ├── AIWorkspaceContainer.tsx         # Container wrapper sub-component
│   │   └── index.ts                         # Barrel exports
│   │
│   └── chat/
│       ├── EmployeeChatWorkspace.tsx        # Unchanged - universal chat logic
│       └── ByteWorkspaceOverlay.tsx         # Wrapper (or removed)
│
├── pages/
│   └── dashboard/
│       ├── SmartImportChatPage.tsx          # Uses AIWorkspaceOverlay
│       ├── PrimeChatPage.tsx                # Uses AIWorkspaceOverlay
│       ├── SmartCategoriesPage.tsx          # Uses AIWorkspaceOverlay
│       └── ...                              # All other workspace pages
│
└── hooks/
    └── usePrimeChat.ts                      # Unchanged - universal chat hook
```

---

## Master Plan Summary

### ✅ Step 1: Extract Universal Components
1. Create `src/components/workspace/` directory
2. Extract 4 sub-components (Container, Header, Input, GuardrailsChip)
3. Create main `AIWorkspaceOverlay` component
4. Test components in isolation

### ✅ Step 2: Migrate Byte Workspace
1. Update `ByteWorkspaceOverlay` to use `AIWorkspaceOverlay`
2. Pass Byte-specific props
3. Test thoroughly
4. Verify no regressions

### ✅ Step 3: Migrate Other Workspaces
1. Prime Chat → `AIWorkspaceOverlay`
2. Smart Categories → `AIWorkspaceOverlay`
3. Continue for all workspaces
4. Test each migration

### ✅ Step 4: Cleanup
1. Remove old employee-specific overlays
2. Update documentation
3. Create usage examples

---

## Risk Mitigation

### Potential Issues:

1. **Breaking Changes:** Keep `ByteWorkspaceOverlay` as wrapper initially
2. **Styling Differences:** Use props for all Byte-specific styling
3. **Chat Logic:** Keep `EmployeeChatWorkspace` unchanged
4. **Routing:** Don't change route paths
5. **State Management:** Keep page-level state management

### Testing Checklist:

- [ ] Overlay opens/closes correctly
- [ ] Chat sends messages
- [ ] Messages stream in
- [ ] Guardrails status displays
- [ ] ESC key closes overlay
- [ ] Backdrop click closes overlay
- [ ] Body scroll is locked when open
- [ ] Input focuses on open
- [ ] Animations are smooth
- [ ] Mobile responsive (if applicable)

---

## Ready to Proceed?

**Status:** ✅ Ready

**Next Steps:**
1. Create `src/components/workspace/` directory
2. Extract universal components
3. Test with Byte workspace
4. Migrate other workspaces one-by-one

**Estimated Effort:**
- Phase 1 (Extract): 2-3 hours
- Phase 2 (Migrate Byte): 1 hour
- Phase 3 (Migrate Others): 1-2 hours per workspace
- Phase 4 (Cleanup): 1 hour

**Total:** ~8-12 hours for complete migration











