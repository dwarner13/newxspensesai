# Chat Branding & Suggested Prompts Implementation

**Date:** February 2025  
**Goal:** Centralize employee branding and suggested prompts for premium, consistent chat experience

---

## ✅ COMPLETED CHANGES

### 1. Updated Employee Chat Config

**File:** `src/config/employeeChatConfig.ts`

**Changes:**
- Added `SuggestedPrompt` interface
- Added `suggestedPrompts?: SuggestedPrompt[]` to `EmployeeChatConfig`
- Updated branding and copy for all 4 employees
- Added 3-4 suggested prompts per employee

---

## 📝 UPDATED BRANDING

### Prime (prime-boss)
- **Subtitle:** "AI Orchestrator & Financial Guide" (was "CEO & Strategic Orchestrator")
- **Welcome Message:** "You're not alone with your money anymore. I'm here to help coordinate your financial team, answer questions, and route you to the right specialist when you need expert help."
- **Suggested Prompts:**
  - "Upload bank statements"
  - "Explain my spending"
  - "Fix my categories"

### Byte (byte-docs)
- **Subtitle:** "Smart Import & OCR Wizard" (was "Document & Receipt Processing")
- **Welcome Message:** "I'm your document processing expert. Upload receipts, bank statements, CSVs, or PDFs and I'll extract all transactions automatically with 99.7% accuracy. Just drag and drop or click to upload!"
- **Suggested Prompts:**
  - "Scan my latest receipts and show me today's total spending."
  - "Import my last bank statement and summarize my top merchants."
  - "Flag any duplicate transactions from my recent uploads."
  - "What formats do you support?"

### Tag (tag-ai)
- **Subtitle:** "Smart Categories & Rules Engine" (was "Smart Categories & Rules")
- **Welcome Message:** "I'm your categorization expert. I help fix mis-categorized expenses, create smart rules, and clean up uncategorized transactions. Let me organize your finances automatically!"
- **Suggested Prompts:**
  - "Show me all uncategorized transactions from the last 30 days."
  - "Fix any obvious category mistakes from restaurants vs groceries."
  - "Create a rule so Uber rides always go into 'Transportation'."
  - "Clean up categories"

### Crystal (crystal-analytics)
- **Subtitle:** "Analytics & Insights" (unchanged)
- **Welcome Message:** "I'm your financial analyst. I uncover spending trends, identify top merchants, generate monthly summaries, and detect unusual patterns. Ask me anything about your financial data!"
- **Suggested Prompts:**
  - "Give me a monthly summary of my expenses for the last 3 months."
  - "Show me my top 10 merchants this year."
  - "Highlight any unusual or suspicious spending."
  - "What are my spending trends over the last 6 months?"

---

## 🎨 UI IMPLEMENTATION

### Empty State with Suggested Prompts

**Location:** `src/components/chat/UnifiedAssistantChat.tsx`

**Features:**
- Shows when `displayMessages.length === 0` and not streaming
- Displays welcome card with:
  - Employee emoji/avatar (gradient background)
  - Title and subtitle
  - Welcome message
- Shows suggested prompts as clickable chips below welcome card
- Prompts auto-send when clicked (no need to click send button)
- Responsive design with flex-wrap for mobile

**Styling:**
- Welcome card: `bg-slate-800/60 border border-slate-700/50 rounded-2xl`
- Prompt chips: `rounded-full border border-white/10 bg-white/5 hover:bg-white/10`
- Matches existing app styling

---

## 🔧 HOW TO ADD PROMPTS FOR NEW EMPLOYEES

### Step 1: Update Config

Edit `src/config/employeeChatConfig.ts` and add `suggestedPrompts` to the employee's config:

```typescript
'new-employee-slug': {
  emoji: '🎯',
  title: 'New Employee — Chat',
  subtitle: 'Role Description',
  welcomeMessage: 'Welcome message here...',
  gradient: 'from-color-400 via-color-500 to-color-600',
  suggestedPrompts: [
    { 
      id: 'prompt-1', 
      label: 'Short Label', 
      text: 'The actual prompt text to send' 
    },
    { 
      id: 'prompt-2', 
      label: 'Another Label', 
      text: 'Another prompt text' 
    },
    // Add 3-4 prompts total
  ],
},
```

### Step 2: That's It!

The UI automatically:
- Reads `suggestedPrompts` from config
- Shows them in empty state
- Makes them clickable
- Auto-sends when clicked

**No other changes needed!**

---

## 📊 CONFIG STRUCTURE

```typescript
export interface SuggestedPrompt {
  id: string;           // Unique ID (e.g., 'upload-statements')
  label: string;        // Display text on button (e.g., 'Upload bank statements')
  text: string;         // Actual prompt to send (e.g., 'Help me upload and process my bank statements.')
}

export interface EmployeeChatConfig {
  emoji: string;                    // Emoji icon
  title: string;                     // Chat title
  subtitle?: string;                 // Role description
  welcomeMessage: string;            // Welcome message shown in empty state
  gradient: string;                  // Tailwind gradient classes
  suggestedPrompts?: SuggestedPrompt[]; // Optional suggested prompts
  // ... other fields
}
```

---

## 🎯 KEY FEATURES

### ✅ Centralized Configuration
- All branding in one place (`employeeChatConfig.ts`)
- Single source of truth for prompts
- Easy to update without touching UI code

### ✅ Auto-Send Prompts
- Clicking a prompt immediately sends it
- No need to click send button
- Better UX for quick actions

### ✅ Empty State UX
- Shows welcome message when chat is empty
- Displays employee branding (emoji, title, subtitle)
- Suggests prompts to get started
- Hides when messages exist

### ✅ Responsive Design
- Prompts wrap on mobile
- Welcome card adapts to screen size
- No layout breaking

---

## 📁 FILES CHANGED

1. **`src/config/employeeChatConfig.ts`**
   - Added `SuggestedPrompt` interface
   - Added `suggestedPrompts` field to config
   - Updated branding for all 4 employees
   - Added suggested prompts for each

2. **`src/components/chat/UnifiedAssistantChat.tsx`**
   - Removed separate `SUGGESTED_PROMPTS_BY_EMPLOYEE` constant
   - Now uses `config.suggestedPrompts` from config
   - Added empty state UI with welcome card
   - Added suggested prompts display
   - Updated `handlePromptClick` to auto-send

---

## ✅ VERIFICATION

- [x] All 4 employees have updated branding
- [x] All 4 employees have 3-4 suggested prompts
- [x] Prompts are centralized in config
- [x] Empty state shows welcome message and prompts
- [x] Prompts auto-send when clicked
- [x] UI is responsive and matches app styling
- [x] No duplicate prompt definitions

---

**End of Summary**









