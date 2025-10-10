# AI Employee Tools & Memory Guide
## Complete Analysis of Current Capabilities & Expansion Opportunities

Last Updated: October 10, 2025

---

## 🧠 **PART 1: Chat Memory - What Employees Have Now**

### ✅ **YES - Employees Have Comprehensive Memory**

Every AI employee has access to **four types of memory**:

### **1. Conversation History (Session Memory)**
```sql
-- Stored in: chat_sessions & chat_messages tables
- Full transcript of every conversation
- Persistent across page refreshes
- Isolated per user + employee combination
- Includes metadata (tool calls, feedback, citations)
```

**Example:**
```
User talks to Byte on Monday: "I prefer CSV exports"
User talks to Byte on Friday: [Byte remembers the CSV preference]
```

### **2. User Facts (Long-Term Memory)**
```sql
-- Stored in: user_memory_facts table
- Persistent facts learned about the user
- Categories: preference, financial, personal, goal
- Confidence scoring (0.0-1.0)
- Can expire (for temporary facts)
- Verified flag (user-confirmed vs. inferred)
```

**Example Facts:**
```sql
{fact: "Prefers aggressive debt payoff over investing", confidence: 0.95}
{fact: "Self-employed freelancer, 1099 income", confidence: 1.0}
{fact: "Has $45k student loans at 5% interest", confidence: 1.0}
{fact: "Goal: Save $10k for house by Dec 2025", confidence: 1.0}
{fact: "Prefers Montserrat font in UI", confidence: 1.0}
```

### **3. RAG Memory (Document/Data Embeddings)**
```sql
-- Stored in: memory_embeddings table (pgvector)
- Semantic search across all user documents
- Receipts, bank statements, goals, notes
- 1536-dimensional embeddings (OpenAI text-embedding-3-small)
- Fast similarity search (cosine distance)
```

**Example:**
```
User: "What did I spend on coffee last month?"
System: [Vector search finds 3 Starbucks receipts + 2 cafe transactions]
Crystal: "You spent $87 on coffee in October across 5 visits."
```

### **4. Session Summaries (Rolling Context)**
```sql
-- Stored in: chat_session_summaries table
- Auto-generated summaries of long conversations
- Keeps context manageable (avoids token limits)
- Key facts extracted and highlighted
```

**Example:**
```
After 50-message conversation:
Summary: "User discussed Q4 tax strategy. Decided to max out SEP-IRA 
         contributions. Needs to make $8k payment by Dec 15. Prefers 
         email reminders."
```

---

## 🛠️ **PART 2: Tools - What Employees Have Now**

### **Currently Implemented Tools:**

| Tool | Status | Who Has It | Purpose |
|------|--------|------------|---------|
| **delegate** | ✅ **ACTIVE** | Prime only | Delegate tasks to specialists |
| **ocr** | ⚠️ **STUB** | Byte | Extract text from images/PDFs |
| **sheet_export** | ⚠️ **STUB** | Prime, Byte | Export data to Google Sheets |
| **bank_match** | ⚠️ **STUB** | Prime, Tag, Crystal, Ledger, Blitz | Match transactions to statements |

### **Tool Access Per Employee:**

```typescript
// From: employee_profiles table, tools_allowed column

Prime:    ['delegate', 'sheet_export', 'bank_match']
Byte:     ['ocr', 'sheet_export']
Tag:      ['bank_match']
Crystal:  ['sheet_export', 'bank_match']
Ledger:   ['sheet_export', 'bank_match']
Goalie:   ['sheet_export']
Blitz:    ['sheet_export', 'bank_match']
```

### **How Tool Access Works:**

1. **Tool Registry** (`tools_registry` table):
   - Central list of all available tools
   - Handler path (where the code lives)
   - Auth scope (service, user, admin, none)
   - Parameter schema (JSON Schema validation)

2. **Employee Whitelist** (`tools_allowed` array):
   - Only whitelisted employees can call a tool
   - Enforced at runtime before tool execution
   - Prevents unauthorized access (e.g., Goalie can't call OCR)

3. **OpenAI Function Calling**:
   - Tools are passed as "functions" to OpenAI
   - AI decides when to call which tool
   - System executes tool and returns result
   - AI synthesizes result into response

---

## 🚀 **PART 3: What Tools SHOULD We Add?**

### **HIGH PRIORITY - Core Functionality** 🔥

#### **1. OCR Tool (Document Vision)**
**Status**: Stub exists, needs implementation  
**Priority**: 🔥🔥🔥 Critical for Byte  
**Implementation**: GPT-4o vision API  
**Who Needs It**: Byte (primary), Prime (delegation)

**Capabilities:**
```typescript
// Use GPT-4o vision for intelligent OCR
- Extract text from receipts
- Parse invoice line items
- Read handwritten notes
- Understand table structures
- Multi-language support
```

**Example:**
```typescript
async function ocrTool(params: { imageUrl: string }) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          { 
            type: 'text', 
            text: 'Extract all text and structure from this receipt. Return as JSON with: merchant, date, items[], subtotal, tax, total.' 
          },
          { 
            type: 'image_url', 
            image_url: { url: params.imageUrl } 
          }
        ]
      }
    ]
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

**Why This is Smart:**
- ✅ No external OCR service needed
- ✅ Understands context (not just raw text)
- ✅ Handles complex layouts (tables, multi-column)
- ✅ Returns structured data automatically

---

#### **2. Bank Sync Tool (Plaid Integration)**
**Status**: Stub exists, needs implementation  
**Priority**: 🔥🔥🔥 Critical for automation  
**Implementation**: Plaid API  
**Who Needs It**: All employees

**Capabilities:**
```typescript
- Connect bank accounts securely
- Auto-import transactions daily
- Categorize transactions automatically
- Reconcile statements
- Detect duplicate transactions
- Track account balances
```

**Example:**
```typescript
async function bankSyncTool(params: { 
  userId: string; 
  action: 'connect' | 'sync' | 'list_accounts' 
}) {
  switch (params.action) {
    case 'connect':
      // Generate Plaid Link token
      const linkToken = await plaidClient.linkTokenCreate({
        user: { client_user_id: params.userId },
        products: ['transactions', 'auth'],
        country_codes: ['US'],
        language: 'en',
      });
      return { link_token: linkToken.link_token };
    
    case 'sync':
      // Fetch latest transactions
      const transactions = await plaidClient.transactionsSync({
        access_token: userAccessToken,
      });
      
      // Store in database
      for (const txn of transactions.added) {
        await supabase.from('transactions').insert({
          user_id: params.userId,
          amount: txn.amount,
          date: txn.date,
          merchant: txn.merchant_name,
          category: txn.category,
        });
      }
      
      return { imported: transactions.added.length };
    
    case 'list_accounts':
      // Get connected accounts
      const accounts = await plaidClient.accountsGet({
        access_token: userAccessToken,
      });
      return { accounts: accounts.accounts };
  }
}
```

**Why This is Smart:**
- ✅ Eliminates manual data entry
- ✅ Real-time financial data
- ✅ Trusted by major banks
- ✅ Secure OAuth flow

---

#### **3. Google Sheets Export Tool**
**Status**: Stub exists, needs implementation  
**Priority**: 🔥🔥 High - users love spreadsheets  
**Implementation**: Google Sheets API  
**Who Needs It**: All employees

**Capabilities:**
```typescript
- Export transactions to Google Sheets
- Create formatted reports
- Update existing sheets
- Share with accountant/spouse
```

**Example:**
```typescript
async function sheetExportTool(params: {
  userId: string;
  data: any[];
  sheetName: string;
  format: 'table' | 'list';
}) {
  // Auth with Google (OAuth2)
  const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });
  
  // Create or update spreadsheet
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: params.sheetName },
      sheets: [{
        properties: { title: 'Transactions' },
        data: [{
          rowData: params.data.map(row => ({
            values: Object.values(row).map(val => ({ userEnteredValue: { stringValue: String(val) } }))
          }))
        }]
      }]
    }
  });
  
  return { 
    spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheet.data.spreadsheetId}` 
  };
}
```

**Why This is Smart:**
- ✅ Users already know Google Sheets
- ✅ Easy collaboration with accountants
- ✅ Powerful data analysis & pivots
- ✅ Mobile app support

---

### **MEDIUM PRIORITY - Enhanced Capabilities** ⚡

#### **4. Tax Form Generator (IRS E-File)**
**Priority**: 🔥🔥 High for Ledger  
**Who Needs It**: Ledger (primary)

**Capabilities:**
- Generate IRS forms (1040, Schedule C, 1099, etc.)
- Populate with user data automatically
- E-file directly to IRS (with signature)
- Track estimated quarterly taxes

---

#### **5. Receipt Storage & Search**
**Priority**: 🔥🔥 High for Byte  
**Who Needs It**: Byte, Ledger

**Capabilities:**
- Upload photos → auto-extract data → store in DB
- Full-text search across all receipts
- Find by merchant, date, amount, category
- Export for audit trail

---

#### **6. Budget Planner & Alerts**
**Priority**: 🔥 Medium for Goalie/Crystal  
**Who Needs It**: Goalie, Crystal, Blitz

**Capabilities:**
- Set budget by category
- Real-time spending alerts
- SMS/email notifications
- Adjust budget mid-month

---

#### **7. Debt Payoff Calculator**
**Priority**: 🔥 Medium for Blitz  
**Who Needs It**: Blitz (primary)

**Capabilities:**
- Calculate avalanche vs. snowball scenarios
- Show total interest saved
- Generate month-by-month payment schedule
- Simulate extra payments

---

### **LOW PRIORITY - Nice to Have** 💡

#### **8. AI Email Assistant**
- Read receipts from Gmail
- Forward to Byte for auto-categorization
- Extract subscription renewals

#### **9. Voice Interface (Whisper + TTS)**
- Speech-to-text for hands-free input
- Text-to-speech for responses
- Phone call integration

#### **10. Crypto Tax Calculator**
- Import from Coinbase/Binance
- Calculate capital gains
- Generate Form 8949

#### **11. Investment Portfolio Tracker**
- Connect Robinhood/E*TRADE
- Track performance
- Rebalancing recommendations

#### **12. Bill Negotiation Bot**
- Call service providers
- Negotiate lower rates
- Cancel unwanted subscriptions

---

## 🎯 **PART 4: Is This Approach Smart? (YES!)**

### ✅ **Why Tools + Memory = Winning Combo**

#### **1. Multiplies AI Capabilities**
```
AI without tools = Smart chat
AI with tools = Autonomous agent that can ACTUALLY DO THINGS
```

**Example:**
```
Without tools:
User: "Import my bank statements"
AI: "Here's how to manually upload your statements..."

With tools:
User: "Import my bank statements"
AI: [Calls bank_sync tool]
    [Imports 42 transactions]
    "Done! Imported 42 transactions from Chase. Top category: Dining ($340)."
```

#### **2. Enables True Automation**
- **No human in the loop** = Set it and forget it
- **Proactive actions** = "Ledger noticed you hit your side-hustle income threshold and auto-filed your quarterly tax estimate"
- **24/7 availability** = Works while you sleep

#### **3. Creates Competitive Moat**
- Generic chatbots can't connect to banks or file taxes
- This makes your system **irreplaceable**
- Users can't easily switch to competitors

#### **4. Justifies Premium Pricing**
```
Chatbot that answers questions: $10/month
System that imports transactions, categorizes them, 
files taxes, and optimizes debt: $50/month (5x value)
```

---

### ⚠️ **Potential Challenges (& How to Solve Them)**

#### **Challenge 1: Tool Complexity**
**Problem**: Hard to build and maintain tools  
**Solution**: Start with high-value, low-complexity tools first
- ✅ OCR: Use GPT-4o vision (no external service)
- ✅ Sheets: Google API is well-documented
- ⚠️ Bank sync: Plaid handles complexity, you just integrate

#### **Challenge 2: Security & Auth**
**Problem**: Tools need sensitive permissions (bank access, tax data)  
**Solution**: OAuth 2.0 for everything, service-role isolation
- Users authorize via OAuth (Plaid Link, Google OAuth)
- Tokens stored encrypted in Supabase
- Tools run as service role (RLS protects user data)

#### **Challenge 3: Error Handling**
**Problem**: External APIs fail, users get frustrated  
**Solution**: Graceful degradation + retry logic
```typescript
try {
  const result = await bankSyncTool(params);
  return result;
} catch (error) {
  if (error.code === 'ITEM_LOGIN_REQUIRED') {
    return {
      success: false,
      message: "Your bank connection expired. Please reconnect.",
      action: "reconnect_bank"
    };
  }
  // Fallback to manual upload
  return {
    success: false,
    message: "Auto-import failed. Would you like to upload manually?",
    action: "manual_upload"
  };
}
```

#### **Challenge 4: Cost Escalation**
**Problem**: External API calls cost money (Plaid, OCR, etc.)  
**Solution**: Usage limits + tiered pricing
- Free tier: 10 OCR scans/month, manual bank import
- Pro tier: Unlimited OCR, auto bank sync, tax filing
- Business tier: Multi-user, audit logs, API access

---

## 📋 **PART 5: Recommended Tool Implementation Roadmap**

### **Phase 1: Core Tools (Weeks 1-2)** 🔥
1. ✅ **OCR Tool** (GPT-4o vision)
   - Byte can process receipts
   - Highest user-requested feature
   - Effort: 2-3 days

2. ✅ **Google Sheets Export**
   - All employees can export data
   - Users love spreadsheets
   - Effort: 2-3 days

3. ✅ **Memory Access API**
   - Employees can query user facts
   - Employees can store new facts
   - Effort: 1 day (mostly done)

### **Phase 2: Automation (Weeks 3-4)** ⚡
4. ✅ **Bank Sync Tool** (Plaid)
   - Auto-import transactions
   - Game-changer for UX
   - Effort: 1 week (includes OAuth)

5. ✅ **Receipt Storage**
   - Upload → OCR → Categorize → Store
   - End-to-end workflow
   - Effort: 2-3 days

### **Phase 3: Advanced (Months 2-3)** 💡
6. ✅ **Tax Form Generator**
   - Ledger can generate 1040, Schedule C
   - Effort: 2 weeks (complex logic)

7. ✅ **Budget Alerts**
   - Proactive notifications
   - Effort: 1 week

8. ✅ **Debt Calculator**
   - Blitz-specific tool
   - Effort: 3-4 days

---

## 💻 **PART 6: How to Implement a New Tool (Step-by-Step)**

### **Example: Building the OCR Tool**

#### **Step 1: Create Tool File**
```typescript
// chat_runtime/tools/ocr.ts

import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface OCRToolParams {
  imageUrl: string;
  extractionGoal?: string; // "receipt", "invoice", "statement", "general"
}

export interface OCRToolResult {
  success: boolean;
  extractedText: string;
  structuredData?: {
    merchant?: string;
    date?: string;
    total?: number;
    items?: Array<{ description: string; amount: number }>;
  };
  confidence: number;
}

export async function ocrTool(
  params: OCRToolParams,
  context: { userId: string }
): Promise<OCRToolResult> {
  try {
    const prompt = params.extractionGoal === 'receipt'
      ? 'Extract: merchant name, date, line items with prices, subtotal, tax, and total. Return as JSON.'
      : 'Extract all visible text accurately.';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: params.imageUrl } }
          ]
        }
      ],
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content || '';

    // Try to parse as JSON for structured data
    let structuredData;
    try {
      structuredData = JSON.parse(content);
    } catch {
      // Plain text extraction
    }

    return {
      success: true,
      extractedText: content,
      structuredData,
      confidence: 0.95, // Could use logprobs for real confidence
    };
  } catch (error) {
    return {
      success: false,
      extractedText: '',
      confidence: 0,
    };
  }
}

// OpenAI function definition
export const ocrToolDefinition = {
  type: 'function' as const,
  function: {
    name: 'ocr',
    description: 'Extract text and data from images, receipts, invoices, or documents.',
    parameters: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          description: 'URL of the image to process',
        },
        extractionGoal: {
          type: 'string',
          enum: ['receipt', 'invoice', 'statement', 'general'],
          description: 'Type of document being processed',
        },
      },
      required: ['imageUrl'],
    },
  },
};
```

#### **Step 2: Register in Database**
```sql
-- supabase/migrations/005_add_ocr_tool.sql

INSERT INTO tools_registry (
  name, 
  purpose, 
  description, 
  handler_path, 
  auth_scope, 
  parameters_schema
) VALUES (
  'ocr',
  'Extract text from images and PDFs',
  'Uses GPT-4o vision to intelligently extract text and structured data from receipts, invoices, statements, and other documents.',
  'chat_runtime/tools/ocr.ts',
  'user',
  '{
    "type": "object",
    "properties": {
      "imageUrl": {"type": "string"},
      "extractionGoal": {
        "type": "string",
        "enum": ["receipt", "invoice", "statement", "general"]
      }
    },
    "required": ["imageUrl"]
  }'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
  purpose = EXCLUDED.purpose,
  description = EXCLUDED.description,
  handler_path = EXCLUDED.handler_path,
  parameters_schema = EXCLUDED.parameters_schema;
```

#### **Step 3: Enable for Byte**
```sql
-- Give Byte access to OCR tool
UPDATE employee_profiles
SET tools_allowed = array_append(tools_allowed, 'ocr')
WHERE slug = 'byte-doc'
  AND NOT ('ocr' = ANY(tools_allowed));
```

#### **Step 4: Wire Up in Chat Handler**
```typescript
// netlify/functions/chat.ts

import { ocrTool, ocrToolDefinition } from '../../chat_runtime/tools/ocr';
import { delegateTool, delegateToolDefinition } from '../../chat_runtime/tools/delegate';

// Build tools array dynamically based on employee
const tools = [];
if (employee.tools_allowed.includes('delegate')) {
  tools.push(delegateToolDefinition);
}
if (employee.tools_allowed.includes('ocr')) {
  tools.push(ocrToolDefinition);
}

// In tool execution loop
for (const toolCall of toolCalls) {
  if (toolCall.function.name === 'ocr') {
    const args = JSON.parse(toolCall.function.arguments);
    const result = await ocrTool(args, { userId });
    conversationMessages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    });
  }
}
```

#### **Step 5: Test**
```typescript
// Test script
User: "Extract text from this receipt: https://example.com/receipt.jpg"
Byte: [Calls OCR tool]
      [Receives: {merchant: "Starbucks", total: 5.50, ...}]
      "I found a Starbucks receipt for $5.50. Should I log this as a Dining expense?"
```

---

## ✅ **Final Recommendations**

### **Short Answer: YES, This is a VERY Smart Approach**

**Why:**
1. ✅ **Memory** gives continuity and personalization
2. ✅ **Tools** enable real actions (not just advice)
3. ✅ **Specialization** creates expert employees
4. ✅ **Automation** removes friction for users
5. ✅ **Competitive moat** makes you irreplaceable

### **Priority Order:**
1. 🔥 **OCR** (game-changer, easy to implement)
2. 🔥 **Bank Sync** (automation, high value)
3. 🔥 **Sheets Export** (user-requested, easy)
4. ⚡ **Tax Forms** (differentiation, high value)
5. ⚡ **Receipt Storage** (workflow completion)
6. 💡 **Budget Alerts** (proactive engagement)
7. 💡 **Debt Calculator** (specialist tool)

### **Next Action:**
Would you like me to implement the **OCR Tool** right now? It would take ~30 minutes and immediately unlock Byte's core capability.


