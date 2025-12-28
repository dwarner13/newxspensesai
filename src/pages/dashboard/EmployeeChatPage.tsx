import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Send, X, User, Loader2, Brain, Tag, Sparkles, TrendingUp, Info, ArrowRight, AlertCircle, UploadCloud, CheckCircle, Plus, Paperclip } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePrimeChat, ChatMessage } from '../../hooks/usePrimeChat';
import HeaderStrip from '../../components/HeaderStrip';
import SystemStatus from '../../components/SystemStatus';
import { getSupabase } from '../../lib/supabase';
import { useSmartImport } from '../../hooks/useSmartImport';

// Demo user ID constant (matches AuthContext)
const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

// Type for location state - all fields optional
type EmployeeChatLocationState = {
  from?: string;
  initialEmployeeSlug?: string;
  source?: string;
  contextType?: string;
  fromEmployee?: string;
  transaction?: {
    id: string;
    date: string;
    amount: number;
    description: string;
    merchant?: string | null;
    category: string;
    type: 'income' | 'expense';
    confidence?: number | null;
    receipt_url?: string | null;
  };
  category?: string;
  learnedCount?: number;
  aiCount?: number;
  avgConfidence?: number | null;
  transactionCount?: number;
  totalAmount?: number;
};

// Employee configuration mapping
const EMPLOYEE_CONFIG: Record<string, { name: string; description: string; icon: React.ReactNode; gradient: string }> = {
  prime: {
    name: 'Prime',
    description: 'Your AI CEO',
    icon: <Brain className="w-6 h-6 text-white" />,
    gradient: 'from-purple-500 to-pink-500',
  },
  crystal: {
    name: 'Crystal',
    description: 'Analytics & Insights',
    icon: <Sparkles className="w-6 h-6 text-white" />,
    gradient: 'from-purple-500 to-pink-500',
  },
  tag: {
    name: 'Tag',
    description: 'Transaction Categorizer',
    icon: <Tag className="w-6 h-6 text-white" />,
    gradient: 'from-blue-500 to-cyan-500',
  },
  byte: {
    name: 'Byte',
    description: 'Smart Import & OCR',
    icon: <Brain className="w-6 h-6 text-white" />,
    gradient: 'from-green-500 to-emerald-500',
  },
  'blitz-ai': {
    name: 'Blitz',
    description: 'Rapid Actions & Alerts',
    icon: <Sparkles className="w-6 h-6 text-white" />,
    gradient: 'from-yellow-500 to-orange-500',
  },
};

type EmployeeId = 'prime' | 'crystal' | 'tag' | 'blitz-ai';

export default function EmployeeChatPage() {
  const params = useParams<{ employeeId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Safe auth access - handle undefined/null cases
  // useAuth() can return undefined if context is not available, so we handle that gracefully
  const authContext = useAuth();
  const user = authContext?.user ?? null;
  
  // CRITICAL: Declare loadedHistoryMessages FIRST, before any useMemo or hooks that might reference it
  // This prevents temporal dead zone errors
  const [loadedHistoryMessages, setLoadedHistoryMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const introSentRef = useRef<boolean>(false);
  const prevMessageCountRef = useRef<number>(0); // Track message count for reduced logging
  const inputRef = useRef<HTMLTextAreaElement>(null); // Ref for chat input to maintain focus
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // File upload state
  const [uploadStatus, setUploadStatus] = useState<{
    status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
    message: string;
    transactionCount?: number;
  }>({ status: 'idle', message: '' });
  
  // Smart Import hook for file uploads
  const { uploadFile, uploading, progress, error: uploadError } = useSmartImport();
  
  // Safe location state access - never assume state exists
  const locationState = useMemo(() => {
    try {
      if (location && location.state && typeof location.state === 'object') {
        return location.state as EmployeeChatLocationState;
      }
    } catch (e) {
      console.warn('[EmployeeChatPage] Error reading location.state:', e);
    }
    return {} as EmployeeChatLocationState; // Return empty object, not null
  }, [location]);
  
  // Determine employee from multiple sources with safe fallbacks
  // Priority: location.state.initialEmployeeSlug > route param > default
  const normalizedEmployeeId: EmployeeId = useMemo(() => {
    try {
      // First try location state
      if (locationState.initialEmployeeSlug && typeof locationState.initialEmployeeSlug === 'string') {
        const slug = locationState.initialEmployeeSlug.toLowerCase();
        // Map backend slugs to frontend IDs
        if (slug === 'tag-ai' || slug === 'tag') return 'tag';
        if (slug === 'crystal-ai' || slug === 'crystal') return 'crystal';
        if (slug === 'prime-boss' || slug === 'prime') return 'prime';
        if (slug === 'blitz-ai' || slug === 'blitz') return 'blitz-ai';
      }
      
      // Then try route param
      if (params.employeeId && typeof params.employeeId === 'string') {
        const lowerId = params.employeeId.toLowerCase();
        if (['prime', 'crystal', 'tag', 'blitz-ai', 'blitz'].includes(lowerId)) {
          if (lowerId === 'blitz') return 'blitz-ai';
          return lowerId as EmployeeId;
        }
      }
      
      // Handle /dashboard/blitz route (no employeeId param)
      if (location.pathname === '/dashboard/blitz') {
        return 'blitz-ai';
      }
    } catch (e) {
      console.warn('[EmployeeChatPage] Error normalizing employeeId:', e);
    }
    return 'prime'; // Default fallback
  }, [locationState.initialEmployeeSlug, params.employeeId]);
  
  // Parse context from location state - fully safe access
  const chatContext = useMemo(() => {
    if (!locationState || typeof locationState !== 'object') return null;
    
    // Check for transaction context
    if (locationState.transaction && typeof locationState.transaction === 'object') {
      const tx = locationState.transaction;
      return {
        type: 'transaction' as const,
        data: tx,
        fromEmployee: locationState.fromEmployee,
        contextType: locationState.contextType || 'transaction',
      };
    }
    
    // Check for category context
    if (locationState.contextType === 'category' && locationState.category && typeof locationState.category === 'string') {
      return {
        type: 'category' as const,
        data: {
          category: locationState.category,
          learnedCount: typeof locationState.learnedCount === 'number' ? locationState.learnedCount : 0,
          aiCount: typeof locationState.aiCount === 'number' ? locationState.aiCount : 0,
          avgConfidence: typeof locationState.avgConfidence === 'number' ? locationState.avgConfidence : null,
          transactionCount: typeof locationState.transactionCount === 'number' ? locationState.transactionCount : 0,
          totalAmount: typeof locationState.totalAmount === 'number' ? locationState.totalAmount : 0,
        },
        fromEmployee: locationState.fromEmployee,
        contextType: 'category',
      };
    }
    
    return null;
  }, [locationState]);
  
  // Build system prompt for backend (not displayed)
  const systemPrompt = useMemo(() => {
    // When NO context, provide default prompt for Tag that includes upload/handoff rules
    // This ensures Tag knows how to handle upload questions even without transaction/category context
    if (!chatContext) {
      if (normalizedEmployeeId === 'tag') {
        return `You are Tag, a friendly transaction categorization AI assistant working inside **XspensesAI**, a comprehensive financial management platform. You help users organize and understand their financial transactions by categorizing them accurately and learning from user corrections.

**CRITICAL CONTEXT - You are part of XspensesAI:**
- You live inside XspensesAI, not a generic platform or third-party service
- Transaction categories like "Income", "Entertainment", "Food & Dining" are categories from the user's own financial data in XspensesAI

**THE XSPENSESAI ORG CHART - Know Who Does What:**

**Your Role:**
- **Tag** = Smart Categories & Transaction Categorization Specialist
- You focus on: categorizing transactions, explaining categorization decisions, merchant patterns, category-level insights
- Your domain: transaction organization, category learning, merchant insights

**Other AI Employees & Their Roles:**

1. **Byte** (slug: byte-docs)
   - Role: Smart Import AI & Document Processing Specialist
   - Handles: OCR, bank statement uploads, PDF/PNG/image processing, document parsing, data extraction from receipts/statements
   - When to hand off: User asks about Smart Import, document uploads, OCR, bank statements, PDF parsing, receipt scanning, "how do I import my data"

2. **Prime** (slug: prime-boss)
   - Role: CEO, Strategic Advisor, Router
   - Handles: High-level strategy, big-picture questions, coordinating the team, "who should I talk to" questions, app-wide questions
   - When to hand off: User asks "which employee should I talk to about X?", meta questions about the platform, strategic financial planning

3. **Crystal** (slug: crystal-ai)
   - Role: Analytics & Insights Expert
   - Handles: Spending trends, financial insights, reports, pattern analysis beyond single categories
   - When to hand off: User asks for overall spending trends, multi-category analysis, financial reports

**HANDOFF RULES - When to Transfer Conversations:**

**CRITICAL: You MUST use your \`request_employee_handoff\` tool when users ask about topics outside your domain. NEVER say "I can't help with that" or "I don't have that capability" when we have a specialized employee who handles it.**

**ALWAYS use your \`request_employee_handoff\` tool when:**

1. **User asks about Smart Import, OCR, or document uploads:**
   - Examples: "Who handles Smart Import?", "How do I upload bank statements?", "Who does OCR?", "I have questions about document import", "How can I upload a statement?", "Can you help me upload a document?", "I need to upload a PDF", "How do I import my bank statements?"
   - **ACTION:** IMMEDIATELY call \`request_employee_handoff\` with \`targetEmployeeSlug: "byte-docs"\`
   - **Response:** "Byte is our Smart Import AI specialist who handles OCR and document uploads. I'll transfer you to Byte now." [Then call the tool]
   - **DO NOT** try to explain how uploads work yourself - Byte is the expert.
   - **DO NOT** call categorization tools like tag_explain_category or tag_category_brain for upload questions - these are for transactions and categories, not file uploads.

2. **User asks "who should I talk to" or "which employee handles X":**
   - Examples: "Who would I speak to about Smart Import?", "Which AI handles document processing?", "Who should I ask about taxes?", "Who handles uploads?"
   - **ACTION:** Identify the right employee and call \`request_employee_handoff\` with the appropriate slug:
     - Smart Import/OCR/uploads → "byte-docs"
     - "Who handles X?" or routing questions → "prime-boss"
     - Analytics/trends → "crystal-ai"
     - Taxes → "ledger-tax"
     - Goals → "goalie-goals"
   - **Response:** "[Employee] handles [topic]. I'll transfer you now." [Then call the tool]

3. **User asks questions clearly outside your domain:**
   - Examples: "How do I upload a PDF?", "What are my tax deductions?", "Show me spending trends across all categories"
   - **ACTION:** Call \`request_employee_handoff\` to the appropriate employee
   - **Response:** "That's outside my area - let me connect you with [Employee] who specializes in that." [Then call the tool]

**FORBIDDEN RESPONSES - NEVER say these:**
- "I don't have the capability to assist with uploads"
- "I can't help with document uploads"
- "I specialize only in categorization"
- "You'll need to contact support"
- "I don't handle that"

**INSTEAD:** Always hand off to the right employee using \`request_employee_handoff\`. XspensesAI has specialized employees for every task - use them!

**HOW TO ADD INCOME OR TRANSACTIONS IN XSPENSESAI:**

When users ask "How can I add my income?" or "How do I add a transaction?" or "Could you help me add it?", provide clear, step-by-step guidance specific to XspensesAI:

**Option 1: Manual Entry (Best for single transactions):**
1. Navigate to the **Transactions** page in XspensesAI (usually accessible from the dashboard sidebar or navigation menu)
2. Click the **"Add Transaction"** button (or similar button/link)
3. Fill in the details:
   - Select the **Income** category (or any other category for expenses)
   - Enter the amount
   - Set the date
   - Add a description/merchant name (optional but helpful)
4. Click **Save** or **Add** to create the transaction
5. I (Tag) will automatically categorize it based on what I've learned, or you can correct me if needed

**Option 2: Smart Import (Best for bulk imports or bank statements):**
- Go to the **Smart Import** section (usually in the dashboard or navigation)
- Upload your bank statement (PDF, PNG, or other supported formats)
- Byte (our Smart Import AI) will process the document using OCR
- Transactions will be automatically extracted and I'll categorize them
- You can review and correct any categorizations I make

**IMPORTANT:**
- You (Tag) **cannot click buttons or navigate the app** - you can only guide the user step-by-step
- Be specific about XspensesAI features (Transactions page, Add Transaction button, Smart Import section)
- If the user is clearly asking about uploading documents/bank statements, you can either:
  - Give a brief explanation of Smart Import, OR
  - Use \`request_employee_handoff\` to transfer them to Byte (byte-docs) for detailed upload guidance
- **NEVER** say "contact support" or "I can't help with that" - always provide actionable guidance or hand off to the right employee

**Example Responses:**
- User: "How can I add my income into my category?"
  You: "In XspensesAI, you can add income by going to the **Transactions** page and clicking the **Add Transaction** button. Then select the **Income** category, enter the amount and date, and save. I'll automatically categorize it based on what I've learned from your past transactions. If you have a bank statement with multiple transactions, you can also use **Smart Import** to upload it and I'll process everything at once!"

- User: "Could you help me add it?"
  You: "I can guide you through it! In XspensesAI, go to the **Transactions** page and click **Add Transaction**. Choose **Income** as the category, enter the amount and date, then save. I can't click buttons for you, but I'm here to help if you have questions about categorizing it!"

**Your Tools:**
- tag_category_brain: Get aggregated stats for a spending category (totals, top merchants, trends)
- tag_merchant_insights: Show what you've learned about how the user categorizes specific merchants
- tag_explain_category: Explain why you categorized a transaction a certain way
- request_employee_handoff: Transfer conversation to another employee (use this when questions are outside your domain)
- sheet_export: Export data to spreadsheets

**Tone:**
- Be warm, friendly, and encouraging
- Reference XspensesAI naturally (e.g., "In XspensesAI, Smart Import AI lets you...")
- When users ask who to contact, immediately use \`request_employee_handoff\` - don't just suggest, actually transfer them
- When users ask how to add income/transactions, give specific XspensesAI instructions - don't give generic "open the app" advice
- Celebrate learning progress when you've learned from user corrections
- Keep responses conversational, not robotic

**Example Handoff Flow:**
User: "Who handles Smart Import?"
You: "Byte is our Smart Import AI specialist who handles OCR and document uploads. I'll transfer you to Byte now." [Call request_employee_handoff with targetEmployeeSlug: "byte-docs"]
System: Handoff complete - conversation continues with Byte

**Conversation History Awareness:**
- If there is any prior conversation history in this session, do NOT reintroduce yourself. Just continue naturally from the context and answer the user's question directly.`;
      }
      return null;
    }
    
    if (chatContext.type === 'transaction') {
      const tx = chatContext.data;
      
      // Format date
      let formattedDate = tx.date || 'Not specified';
      if (formattedDate && formattedDate !== 'Not specified') {
        try {
          const dateObj = new Date(formattedDate);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
          }
        } catch (e) {
          // Keep original format
        }
      }
      
      // Format amount
      const amountDisplay = tx.type === 'income' 
        ? `+$${Math.abs(tx.amount).toFixed(2)}`
        : `-$${Math.abs(tx.amount).toFixed(2)}`;
      
      if (normalizedEmployeeId === 'tag') {
        return `You are Tag, a friendly and helpful transaction categorization AI within **XspensesAI**. The user is asking about a specific transaction.

**Transaction Context:**
- ID: ${tx.id}
- Description: "${tx.description || 'N/A'}"
- Amount: ${amountDisplay}
- Category: "${tx.category || 'Uncategorized'}"
- Date: ${formattedDate}
- Merchant: ${tx.merchant || 'Not specified'}
- Type: ${tx.type === 'income' ? 'Income' : 'Expense'}
${tx.confidence ? `- Confidence: ${Math.round(tx.confidence * 100)}%` : ''}

**Your Role:**
- When the user asks "why" or "why is this categorized as ${tx.category}", immediately use your tag_explain_category tool with transactionId "${tx.id}" to explain the categorization reasoning.
- If they ask about merchant patterns or "how do I usually categorize this merchant", use tag_merchant_insights.
- Speak like a friendly analyst: be conversational, clear, and invite follow-up questions.
- Explain both the AI reasoning AND any learned patterns from past user corrections.

**CRITICAL: Upload Questions - DO NOT Call Categorization Tools:**
- If the user asks about uploading files, bank statements, PDF/PNG receipts, Smart Import, document uploads, or file imports, you MUST NOT call tag_explain_category, tag_category_brain, or any transaction-based categorization tools.
- NEVER treat words like "upload", "statement", "document", "file", "Smart Import", "PDF", "PNG", "receipt scan", or "import" as transaction IDs or category names.
- In these cases, you MUST instead call the request_employee_handoff tool with targetEmployeeSlug: "byte-docs" and clearly explain to the user that you're sending them to the document upload specialist.
- Example: User says "how can I upload a statement" → You: "Byte handles Smart Import and document uploads. I'll transfer you to Byte now." [Then immediately call request_employee_handoff with targetEmployeeSlug: "byte-docs"]

**Handoff Rules (XspensesAI Org Chart):**
- **Byte** (slug: byte-docs) handles: Smart Import, OCR, document uploads, bank statements, PDF/PNG parsing
- **Prime** (slug: prime-boss) handles: High-level strategy, "who should I talk to" questions, app-wide questions
- If user asks about document uploads, OCR, Smart Import, or bank statements → **immediately call request_employee_handoff** with targetEmployeeSlug: "byte-docs"
- If user asks "who handles X?" or "which employee should I talk to?" → call request_employee_handoff to the appropriate employee
- **DO NOT try to answer questions outside your domain** - hand off immediately

**Your Tools:**
- tag_explain_category: Explain why a transaction is categorized a certain way
- tag_merchant_insights: Show learning history for a merchant
- request_employee_handoff: Transfer conversation to another employee (use this for upload/Smart Import questions)

**Example responses:**
- "I categorized this as ${tx.category} because [explanation]. Would you like me to explain more about how I learned this pattern?"
- "Let me check why I categorized this transaction..." (then use tag_explain_category tool)
- User: "How do I upload a bank statement?" → You: "Byte handles Smart Import and document uploads. I'll transfer you to Byte now." [Call request_employee_handoff with targetEmployeeSlug: "byte-docs"]`;
      } else if (normalizedEmployeeId === 'crystal') {
        return `You are Crystal, an AI financial analyst. The user is asking about a specific transaction.

**Transaction Context:**
- Date: ${formattedDate}
- Merchant: ${tx.merchant || 'Not specified'}
- Amount: ${amountDisplay}
- Category: ${tx.category || 'Uncategorized'}
- Type: ${tx.type === 'income' ? 'Income' : 'Expense'}
- Description: ${tx.description || 'No description'}

Analyze this transaction in context of the user's overall spending. Highlight patterns, concerns, or opportunities.`;
      } else if (normalizedEmployeeId === 'prime') {
        return `You are Prime, the lead financial AI. Tag has already categorized this transaction. You're here to explain bigger-picture implications, potential risks, and anything the user should double-check.

**Transaction Context:**
- ID: ${tx.id}
- Description: "${tx.description || 'N/A'}"
- Amount: ${amountDisplay}
- Category: "${tx.category || 'Uncategorized'}"
- Date: ${formattedDate}
- Merchant: ${tx.merchant || 'Not specified'}
- Type: ${tx.type === 'income' ? 'Income' : 'Expense'}
${tx.confidence ? `- Confidence: ${Math.round(tx.confidence * 100)}%` : ''}

**Your Role:**
- Focus on strategic insights, risks, and things the user should verify.
- Explain if this transaction fits their spending patterns or stands out.
- Highlight any potential concerns (unusual amounts, merchants, timing).
- Provide coaching on how to improve their financial habits related to this transaction.
- Be conversational and helpful, acknowledging Tag's categorization work.`;
      }
    } else if (chatContext.type === 'category') {
      const cat = chatContext.data;
      const learnedPercent = cat.transactionCount > 0 
        ? Math.round((cat.learnedCount / cat.transactionCount) * 100) 
        : 0;
      const aiPercent = cat.transactionCount > 0 
        ? Math.round((cat.aiCount / cat.transactionCount) * 100) 
        : 0;
      
      if (normalizedEmployeeId === 'tag') {
        return `You are Tag, a friendly transaction categorization AI within **XspensesAI**. The user is asking about the "${cat.category}" category.

**CRITICAL: The category name is "${cat.category}" - you MUST use this EXACT name (case-sensitive) when calling tag_category_brain.**

**Category Stats (from UI - use these as fallback only):**
- Category: ${cat.category}
- Total transactions: ${cat.transactionCount}
- Learned from your corrections: ${cat.learnedCount} (${learnedPercent}%)
- AI categorized: ${cat.aiCount} (${aiPercent}%)
${cat.avgConfidence !== null && cat.avgConfidence !== undefined ? `- Average confidence: ${Math.round(cat.avgConfidence * 100)}%` : ''}
- Total amount: $${Math.abs(cat.totalAmount).toFixed(2)}

**Your Role & Tool Usage:**

**IMPORTANT: Only call tools when the user asks a question. Do NOT call tools automatically on conversation start or without a user query.**

1. **Category-level questions → ALWAYS use tag_category_brain FIRST:**
   - When users ask ANY of these patterns: "What have you learned about this category?", "How much do I usually spend here?", "Which merchants are most common?", "Is this trending up or down?", "Tell me about this category", "What can you tell me about ${cat.category}?", "What do you know about ${cat.category}?", "Show me stats for this category", "Analyze this category", "how much can I save?", "where does my money come from?", "what are my top sources?"
   - **ACTION:** Immediately call tag_category_brain with category="${cat.category}" (use the EXACT name from above, case-sensitive).
   - **DO NOT call this tool automatically** - wait for the user to ask a question first.
   - The tool returns: totalTransactions, totalSpent, totalIncome, avgTransactionAmount, topMerchants[], aiConfidenceSummary (avgConfidence, aiCount, learnedCount), notes[], firstSeenAt, lastSeenAt.
   - **USE THE TOOL'S DATA, NOT THE UI STATS** - the tool has the most accurate, up-to-date information from the database.
   
2. **Using tool data in follow-up questions:**
   - When answering questions like "how much can I save?" or "where does my money come from?", use the data from tag_category_brain that was already called in this conversation.
   - Reference specific numbers from the tool results: totalSpent, totalIncome, topMerchants, avgTransactionAmount.
   - Example: "Based on your Income category (~$${cat.totalAmount.toFixed(2)} from ${cat.transactionCount} transactions, mostly from [top merchant names]), here's a rough saving suggestion..."
   - If tag_category_brain hasn't been called yet for this question, call it first, then use its data to answer.

3. **Formatting Guidelines:**
   - Format currency: "$1,234.56" (use commas for thousands, 2 decimal places)
   - Format percentages: "75%" (round to whole numbers)
   - Format dates: "January 15, 2024" (readable format)
   - Keep responses concise: 2-4 sentences max, then invite follow-up questions

4. **Response Structure (when tag_category_brain returns data):**
   - Start with a warm greeting: "Great question! Let me check what I've learned..."
   - Share key stats: totalTransactions, totalSpent (or totalIncome if it's an income category)
   - Highlight top merchants: "Your top merchants here are [name1] with X transactions, [name2] with Y transactions..."
   - Include learning progress: Reference aiConfidenceSummary.learnedCount and celebrate if high
   - Use notes[] array: These contain helpful insights - incorporate them naturally
   - End with invitation: "Want to know more about any specific merchant or pattern?"

5. **Example Response (after calling tag_category_brain):**
   "Great question! I've analyzed ${cat.transactionCount} transactions in ${cat.category}. Here's what I found:

   - Total spending: $${Math.abs(cat.totalAmount).toFixed(2)}
   - Average per transaction: $[use avgTransactionAmount from tool]
   - Top merchants: [list top 3 from topMerchants array]
   - Learning progress: I've learned from [learnedCount] of your corrections (${learnedPercent}%) - ${learnedPercent >= 70 ? 'excellent!' : 'keep correcting and I\'ll learn faster!'}

   [Include relevant insights from notes[] array]

   Want to dive deeper into any specific merchant or pattern?"

6. **If tool returns empty/error:**
   - Say: "I don't have enough data yet for this category, but here's what I can see from the UI: ${cat.transactionCount} transaction${cat.transactionCount !== 1 ? 's' : ''} so far. As you add more transactions and correct my categorizations, I'll learn your patterns better!"

7. **Other Tools:**
   - Specific transaction "why" → Use tag_explain_category with transaction ID
   - Merchant history → Use tag_merchant_insights with merchant name

**CRITICAL: Upload Questions - DO NOT Call Categorization Tools:**
- If the user asks about uploading files, bank statements, PDF/PNG receipts, Smart Import, document uploads, or file imports, you MUST NOT call tag_explain_category, tag_category_brain, or any transaction-based categorization tools.
- NEVER treat words like "upload", "statement", "document", "file", "Smart Import", "PDF", "PNG", "receipt scan", or "import" as transaction IDs or category names.
- In these cases, you MUST instead call the request_employee_handoff tool with targetEmployeeSlug: "byte-docs" and clearly explain to the user that you're sending them to the document upload specialist.
- Example: User says "how can I upload a statement" → You: "Byte handles Smart Import and document uploads. I'll transfer you to Byte now." [Then immediately call request_employee_handoff with targetEmployeeSlug: "byte-docs"]

**Handoff Rules (XspensesAI Org Chart):**
- **Byte** (slug: byte-docs) handles: Smart Import, OCR, document uploads, bank statements, PDF/PNG parsing
- **Prime** (slug: prime-boss) handles: High-level strategy, "who should I talk to" questions, app-wide questions
- If user asks about document uploads, OCR, Smart Import, or bank statements → **immediately call request_employee_handoff** with targetEmployeeSlug: "byte-docs"
- If user asks "who handles X?" or "which employee should I talk to?" → call request_employee_handoff to the appropriate employee
- **DO NOT try to answer questions outside your domain** - hand off immediately

**Your Tools:**
- tag_category_brain: Get aggregated stats for a spending category
- tag_explain_category: Explain why a transaction is categorized a certain way
- tag_merchant_insights: Show learning history for a merchant
- request_employee_handoff: Transfer conversation to another employee (use this for upload/Smart Import questions)
- sheet_export: Export data to spreadsheets

**Tone:**
- Be warm, friendly, and encouraging
- Celebrate learning progress
- Keep it conversational, not robotic
- Use emojis sparingly (only when celebrating: 🎉 ✅)

**Conversation History Awareness:**
- If there is any prior conversation history in this session, do NOT reintroduce yourself. Just continue naturally from the context and answer the user's question directly.`;
      } else if (normalizedEmployeeId === 'crystal') {
        return `You are Crystal, an AI financial analyst. The user is asking about the "${cat.category}" category.

**Category Analysis:**
- Category: ${cat.category}
- Total transactions: ${cat.transactionCount}
- Learned from corrections: ${cat.learnedCount} (${learnedPercent}%)
- AI categorized: ${cat.aiCount} (${aiPercent}%)
${cat.avgConfidence !== null && cat.avgConfidence !== undefined ? `- Average confidence: ${Math.round(cat.avgConfidence * 100)}%` : ''}
- Total amount: $${Math.abs(cat.totalAmount).toFixed(2)}

**Your Role:**
- Turn Tag's learning data into higher-level financial insights.
- Explain what these stats mean for the user's financial health.
- Suggest actionable insights like "watch this category next month" or "compare to last month".
- If ${learnedPercent}% is high, explain that Tag has learned their preferences well - this means more accurate categorization going forward.
- If ${learnedPercent}% is low, suggest that correcting more transactions will help Tag learn faster.

**What to discuss:**
- What this category's spending patterns mean for their budget
- Trends and patterns in this category
- Comparison opportunities (month-over-month, year-over-year)
- Actionable recommendations based on Tag's learning progress`;
      } else if (normalizedEmployeeId === 'prime') {
        return `You are Prime, the lead financial AI. Tag has been learning patterns in this category. You're here to talk about strategy, trends, and coaching around this category.

**Category Stats:**
- Category: ${cat.category}
- Total transactions: ${cat.transactionCount}
- Learned from corrections: ${cat.learnedCount} (${learnedPercent}%)
- AI categorized: ${cat.aiCount} (${aiPercent}%)
${cat.avgConfidence !== null && cat.avgConfidence !== undefined ? `- Average confidence: ${Math.round(cat.avgConfidence * 100)}%` : ''}
- Total amount: $${Math.abs(cat.totalAmount).toFixed(2)}

**Your Role:**
- Provide strategic financial coaching and insights about this category.
- Discuss trends, risks, and opportunities related to this spending category.
- Help the user understand what Tag's learning means for their financial health.
- Suggest actionable strategies for managing this category better.
- Be conversational and helpful, acknowledging Tag's categorization work.`;
      }
    }
    
    return null;
  }, [chatContext, normalizedEmployeeId]);

  // Use the chat hook with the employee override and system prompt
  // Use demo user ID if no user is logged in (instead of 'anonymous' which causes UUID errors)
  // Safe access: handle null/undefined user gracefully
  const effectiveUserId = useMemo(() => {
    if (user && typeof user === 'object' && 'id' in user && user.id) {
      return String(user.id);
    }
    return DEMO_USER_ID;
  }, [user]);
  
  // Generate stable session ID per user + employee combination
  // This ensures conversation history is maintained across messages
  // Stored in localStorage so it persists across page refreshes
  // IMPORTANT: Use useMemo instead of useState to ensure normalizedEmployeeId is available
  const safeUserId = useMemo(() => {
    return effectiveUserId || DEMO_USER_ID;
  }, [effectiveUserId]);
  
  // Generate stable sessionId based on userId + employeeId combination
  // This ensures the same session is reused for the same user + employee pair
  const safeSessionId = useMemo(() => {
    const userId = safeUserId || DEMO_USER_ID;
    const employeeId = normalizedEmployeeId || 'prime';
    const storageKey = `chat_session_${userId}_${employeeId}`;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && stored.trim()) {
        return stored;
      }
    } catch (e) {
      console.warn('[EmployeeChatPage] localStorage access failed:', e);
    }
    
    // Generate new UUID for this user + employee combination
    try {
      const newSessionId = crypto.randomUUID();
      localStorage.setItem(storageKey, newSessionId);
      return newSessionId;
    } catch (e) {
      console.warn('[EmployeeChatPage] Failed to generate/store sessionId:', e);
      // Fallback: generate a simple session ID without localStorage
      return `session-${userId}-${employeeId}-${Date.now()}`;
    }
  }, [safeUserId, normalizedEmployeeId]);
  
  // Derived state - check if history has been loaded (for UI indicators)
  // loadedHistoryMessages is already declared at the top of the component
  const hasLoadedHistory = loadedHistoryMessages.length > 0;
  
  // Map EmployeeId to usePrimeChat employeeOverride format
  const employeeOverride = useMemo(() => {
    if (normalizedEmployeeId === 'blitz-ai') return 'blitz';
    return normalizedEmployeeId as 'prime' | 'crystal' | 'tag' | 'blitz';
  }, [normalizedEmployeeId]);
  
  const { messages, send, headers, input, setInput, isStreaming, toolCalls, activeEmployeeSlug } = usePrimeChat(
    safeUserId,
    safeSessionId, // Pass stable sessionId instead of undefined
    employeeOverride,
    systemPrompt,
    loadedHistoryMessages // Pass loaded history messages to populate UI - safely declared at top of component
  );
  
  // Update normalizedEmployeeId if handoff occurred (activeEmployeeSlug from hook reflects handoff)
  // Map backend slug to frontend ID for UI consistency
  const effectiveEmployeeId = useMemo(() => {
    if (activeEmployeeSlug) {
      const slug = activeEmployeeSlug.toLowerCase();
      if (slug === 'tag-ai' || slug === 'tag') return 'tag';
        if (slug === 'crystal-ai' || slug === 'crystal') return 'crystal';
      if (slug === 'prime-boss' || slug === 'prime') return 'prime';
      if (slug === 'byte-docs' || slug === 'byte') return 'byte';
    }
    return normalizedEmployeeId; // Fallback to original
  }, [activeEmployeeSlug, normalizedEmployeeId]);
  
  // Check if Byte is active (for showing upload UI)
  const isByteActive = useMemo(() => {
    return effectiveEmployeeId === 'byte' || activeEmployeeSlug === 'byte-docs' || activeEmployeeSlug === 'byte';
  }, [effectiveEmployeeId, activeEmployeeSlug]);
  
  // Use effective employee ID for UI (updates on handoff)
  const employeeConfig = EMPLOYEE_CONFIG[effectiveEmployeeId] || EMPLOYEE_CONFIG.prime;
  
  // Load previous messages from session on mount
  useEffect(() => {
    let mounted = true;
    
    const loadMessageHistory = async () => {
      // Safe checks: ensure sessionId and effectiveUserId are valid strings
      if (!safeSessionId || !safeSessionId.trim() || !safeUserId || !safeUserId.trim()) {
        setIsLoadingHistory(false);
        return;
      }
      
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setIsLoadingHistory(false);
          return;
        }
        
        // Fetch messages from chat_messages table
        const { data, error: fetchError } = await supabase
          .from('chat_messages')
          .select('id, role, content, created_at')
          .eq('session_id', safeSessionId)
          .eq('user_id', safeUserId)
          .order('created_at', { ascending: true })
          .limit(50); // Load last 50 messages
        
        if (fetchError) {
          console.warn('[EmployeeChatPage] Failed to load message history:', fetchError);
          setIsLoadingHistory(false);
          return;
        }
        
        if (mounted && data && data.length > 0) {
          // Convert database messages to ChatMessage format
          const loadedMessages: ChatMessage[] = data
            .filter(m => m.role !== 'system') // Filter out system messages
            .map(m => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content || '',
              createdAt: m.created_at,
            }));
          
          if (loadedMessages.length > 0) {
            setLoadedHistoryMessages(loadedMessages);
            console.log(`[EmployeeChatPage] Loaded ${loadedMessages.length} previous messages from session ${safeSessionId}`);
          }
        }
      } catch (err: any) {
        console.error('[EmployeeChatPage] Error loading message history:', err);
        if (mounted) {
          setError('Failed to load chat history. You can still continue chatting.');
        }
      } finally {
        if (mounted) {
          setIsLoadingHistory(false);
        }
      }
    };
    
    loadMessageHistory();
    
    return () => {
      mounted = false;
    };
  }, [safeSessionId, safeUserId]);

  // Reduced logging: only log when message count changes (not every render)
  useEffect(() => {
    const filteredMessages = messages.filter((m) => m.role !== 'system');
    if (import.meta.env.DEV && filteredMessages.length !== prevMessageCountRef.current) {
      console.log(`[EmployeeChat] Messages updated: ${prevMessageCountRef.current} → ${filteredMessages.length}`);
      prevMessageCountRef.current = filteredMessages.length;
    }
  }, [messages.length]); // Only depend on length, not the full array

  // Auto-scroll to bottom (but don't steal focus from input)
  useEffect(() => {
    // Only scroll if input is not focused (to avoid stealing focus)
    if (document.activeElement !== inputRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Ensure input is focused on mount (if no messages yet)
  useEffect(() => {
    if (messages.length === 0 && !isStreaming) {
      // Small delay to ensure textarea is mounted
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, []); // Only run on mount

  // Refocus input when streaming finishes (if user hasn't moved focus elsewhere)
  const prevIsStreamingRef = useRef(isStreaming);
  useEffect(() => {
    // Detect when streaming transitions from true → false
    if (prevIsStreamingRef.current === true && isStreaming === false) {
      // Only refocus if user hasn't manually moved focus to another interactive element
      const activeElement = document.activeElement;
      const isInputFocused = activeElement === inputRef.current;
      const isOtherInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'BUTTON'
      );
      
      // If no interactive element is focused (or body/document), gently refocus the textarea
      if (!isInputFocused && !isOtherInputFocused) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    }
    prevIsStreamingRef.current = isStreaming;
  }, [isStreaming]);
  
  // Send friendly intro message for Crystal and Prime (NOT Tag - Tag waits for user input)
  useEffect(() => {
    // Skip auto-send for Tag
    if (normalizedEmployeeId === 'tag') {
      return;
    }
    
    // Reset intro sent flag when context changes
    if (!chatContext || !systemPrompt) {
      introSentRef.current = false;
      return;
    }
    
    // Only send if we haven't sent it yet and there are no messages
    if (introSentRef.current || messages.length > 0) return;
    
    introSentRef.current = true;
    
    if (chatContext.type === 'transaction') {
      const tx = chatContext.data;
      
      if (normalizedEmployeeId === 'crystal') {
        const friendlyIntro = `Hey! I'm Crystal. I'm analyzing your transaction "${tx.description || 'this transaction'}" in the "${tx.category || 'Uncategorized'}" category. What insights would you like about this transaction?`;
        setTimeout(() => send(friendlyIntro), 500);
      } else if (normalizedEmployeeId === 'prime') {
        const friendlyIntro = `Hey, I'm Prime. Tag has already categorized this transaction. Ask me about the bigger picture, risks, or anything you should double-check here.`;
        setTimeout(() => send(friendlyIntro), 500);
      }
    } else if (chatContext.type === 'category') {
      const cat = chatContext.data;
      
      if (normalizedEmployeeId === 'crystal') {
        const friendlyIntro = `Hi, I'm Crystal. I'm looking at trends in your **${cat.category}** category. Ask me about patterns, risks, or how to improve your spending here.`;
        setTimeout(() => send(friendlyIntro), 500);
      } else if (normalizedEmployeeId === 'prime') {
        const friendlyIntro = `Hey, I'm Prime. I'm looking at your **${cat.category}** category and Tag's learning so far. Ask me about trends, risks, or strategy for this category.`;
        setTimeout(() => send(friendlyIntro), 500);
      }
    }
  }, [chatContext, normalizedEmployeeId, send, messages.length, systemPrompt]);
  
  // Build static intro message for Tag (displayed in UI only, not sent to backend)
  const tagStaticIntro = useMemo(() => {
    // Only show intro if:
    // 1. It's Tag
    // 2. There are no current messages
    // 3. There is no loaded history (indicating this is truly a fresh conversation)
    if (normalizedEmployeeId !== 'tag' || messages.length > 0 || loadedHistoryMessages.length > 0) return null;
    
    if (chatContext?.type === 'transaction') {
      const tx = chatContext.data;
      return `Hey! I'm Tag. I'm looking at this specific transaction in your **${tx.category || 'Uncategorized'}** category. Ask me why it's categorized this way or how I usually treat this merchant.`;
    } else if (chatContext?.type === 'category') {
      const cat = chatContext.data;
      return `Hey! I'm Tag. I'm looking at your **${cat.category}** category with ${cat.transactionCount} transaction${cat.transactionCount !== 1 ? 's' : ''}. Ask me what I've learned, how much you typically spend here, or which merchants show up the most.`;
    }
    
    return `Hey! I'm Tag. Ask me what I've learned about a category, how much you usually spend, or which merchants dominate it.`;
  }, [normalizedEmployeeId, chatContext, messages.length, loadedHistoryMessages.length]);

  // Handle send
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;
    send(input);
    // input is cleared by hook
    // Refocus input after sending to keep caret visible
    // Use longer timeout to ensure focus happens after any re-renders or scroll effects
    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // Handle file upload - works for any employee, but Byte is best for processing
  const handleFileUpload = useCallback(async (file: File) => {
    if (!safeUserId) return;
    
    try {
      setUploadStatus({ status: 'uploading', message: 'Uploading statement...' });
      
      // Upload file using Smart Import hook
      const result = await uploadFile(safeUserId, file, 'chat');
      
      if (result.rejected) {
        setUploadStatus({
          status: 'error',
          message: result.reason || 'Upload was rejected',
        });
        setTimeout(() => {
          setUploadStatus({ status: 'idle', message: '' });
        }, 5000);
        return;
      }
      
      setUploadStatus({
        status: 'processing',
        message: 'Processing transactions with OCR...',
      });
      
      // Poll for transaction count (check imports table or transactions_staging)
      // For now, wait a reasonable time for OCR to complete, then send chat message
      setTimeout(async () => {
        try {
          // Try to get transaction count from the import
          // This is a simplified version - in production you might poll the import status
          const supabase = getSupabase();
          const { data: importData } = await supabase
            .from('imports')
            .select('id, status')
            .eq('user_id', safeUserId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          // Check transactions_staging for count
          let transactionCount = 0;
          if (importData?.id) {
            const { count } = await supabase
              .from('transactions_staging')
              .select('*', { count: 'exact', head: true })
              .eq('import_id', importData.id)
              .eq('user_id', safeUserId);
            transactionCount = count || 0;
          }
          
          setUploadStatus({
            status: 'success',
            message: transactionCount > 0 
              ? `Upload complete! Found ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}.`
              : `Upload complete! Document processed successfully.`,
            transactionCount,
          });
          
          // Send a chat message about the upload
          // If Tag is active, this will trigger handoff to Byte
          // If Byte is active, Byte can respond directly
          const uploadMessage = transactionCount > 0
            ? `I just uploaded ${file.name}. Found ${transactionCount} transaction${transactionCount !== 1 ? 's' : ''}. Can you help me review them?`
            : `I just uploaded ${file.name}. Can you help me review the transactions?`;
          
          send(uploadMessage);
          
          // Clear status after 5 seconds
          setTimeout(() => {
            setUploadStatus({ status: 'idle', message: '' });
          }, 5000);
        } catch (pollErr: any) {
          console.error('[EmployeeChatPage] Error polling for transactions:', pollErr);
          // Still show success and send message even if polling fails
          setUploadStatus({
            status: 'success',
            message: `Upload complete! Document processed successfully.`,
          });
          send(`I just uploaded ${file.name}. Can you help me review the transactions?`);
          setTimeout(() => {
            setUploadStatus({ status: 'idle', message: '' });
          }, 5000);
        }
      }, 3000); // Wait 3 seconds for OCR/parsing to complete
      
    } catch (err: any) {
      console.error('[EmployeeChatPage] File upload error:', err);
      setUploadStatus({
        status: 'error',
        message: err.message || 'Upload failed. Please try again.',
      });
      
      // Clear error after 5 seconds
      setTimeout(() => {
        setUploadStatus({ status: 'idle', message: '' });
      }, 5000);
    }
  }, [safeUserId, uploadFile, send]);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileUpload]);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      // Check file type
      const validTypes = ['application/pdf', 'text/csv', 'image/png', 'image/jpeg', 'image/jpg'];
      const validExtensions = ['.pdf', '.csv', '.png', '.jpg', '.jpeg'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
        setUploadStatus({
          status: 'error',
          message: 'Unsupported file type. Please upload PDF, CSV, or image files.',
        });
        setTimeout(() => setUploadStatus({ status: 'idle', message: '' }), 3000);
        return;
      }
      
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // Get return origin from location state (where user came from) - fully safe access
  const returnOrigin = useMemo(() => {
    try {
      if (locationState && typeof locationState === 'object' && locationState.from && typeof locationState.from === 'string') {
        return locationState.from;
      }
    } catch (e) {
      console.warn('[EmployeeChatPage] Error reading return origin:', e);
    }
    return '/dashboard'; // Default to /dashboard if no origin specified
  }, [locationState]);

  const handleClose = () => {
    navigate(returnOrigin);
  };

  // Build context-aware placeholder text
  const placeholderText = useMemo(() => {
    if (chatContext) {
      if (chatContext.type === 'transaction' && normalizedEmployeeId === 'tag') {
        return "Ask Tag why this transaction is categorized this way, or how it usually treats this merchant...";
      } else if (chatContext.type === 'category' && normalizedEmployeeId === 'tag') {
        return "Ask Tag what it has learned about this category, how much you usually spend, or which merchants dominate it...";
      } else if (chatContext.type === 'category' && normalizedEmployeeId === 'crystal') {
        return "Ask Crystal about trends, risks, or ideas to improve this category...";
      } else if (chatContext.type === 'transaction' && normalizedEmployeeId === 'prime') {
        return "Ask Prime about risks, trends, or things to double-check for this transaction...";
      } else if (chatContext.type === 'category' && normalizedEmployeeId === 'prime') {
        return "Ask Prime about trends, risks, and strategy for this category...";
      }
    }
    if (normalizedEmployeeId === 'prime') {
      return "Ask Prime anything about your money, goals, or spending...";
    }
    return "Ask your AI assistant about your spending or categories...";
  }, [chatContext, normalizedEmployeeId]);

  // Handle handoff to Prime
  const handleAskPrime = () => {
    if (!chatContext) return;
    
    const state: any = {
      source: 'tag-handoff',
      contextType: chatContext.type,
      fromEmployee: 'tag-ai',
      from: returnOrigin, // Preserve return origin so Prime can navigate back too
    };
    
    if (chatContext.type === 'transaction') {
      state.transaction = chatContext.data;
    } else if (chatContext.type === 'category') {
      state.category = chatContext.data.category;
      state.learnedCount = chatContext.data.learnedCount;
      state.aiCount = chatContext.data.aiCount;
      state.avgConfidence = chatContext.data.avgConfidence;
      state.transactionCount = chatContext.data.transactionCount;
      state.totalAmount = chatContext.data.totalAmount;
    }
    
    navigate('/dashboard/chat/prime', { state });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className={`bg-black/20 backdrop-blur-sm border-b ${
        normalizedEmployeeId === 'tag' ? 'border-blue-500/20' : 'border-purple-500/20'
      }`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 bg-gradient-to-br ${employeeConfig.gradient} rounded-full flex items-center justify-center`}>
                {employeeConfig.icon}
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{employeeConfig.name} AI</h1>
                <p className={`text-sm ${
                  normalizedEmployeeId === 'tag' ? 'text-blue-300' : 'text-purple-300'
                }`}>{employeeConfig.description}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Context Label */}
          {chatContext && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-1 rounded-full border ${
                chatContext.type === 'transaction'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
              }`}>
                {chatContext.type === 'transaction' ? 'Transaction Context' : 'Category Context'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-300">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {/* Loading History Indicator */}
        {isLoadingHistory && (
          <div className="mb-4 text-xs text-white/60 flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Loading conversation history...</span>
          </div>
        )}
        
        {/* System Status Panel */}
        <SystemStatus headers={headers} />
        
        {/* Header Strip shows headers from the server response */}
        <HeaderStrip headers={headers} />
        
        {/* Show if session summary was applied */}
        {headers?.["X-Session-Summary"] && (
          <div className="mb-2 text-xs px-2 py-1 rounded bg-yellow-50 border border-yellow-200">
            Context-Summary (recent) applied
          </div>
        )}
        
        {/* Ask Prime Button - Show when Tag has context */}
        {chatContext && normalizedEmployeeId === 'tag' && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleAskPrime}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 rounded-lg text-sm text-white/90 hover:text-white transition-all"
            >
              <Brain className="w-4 h-4" />
              <span>Ask Prime about this</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dev Mode: Tool Call Debug Panel */}
        {import.meta.env.DEV && toolCalls && toolCalls.length > 0 && (
          <div className="mb-4 bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-yellow-400" />
              <h3 className="text-xs font-semibold text-yellow-300">🔧 Dev: Tool Calls</h3>
              <span className="text-xs text-yellow-400/60 ml-auto">({toolCalls.length} total)</span>
            </div>
            <div className="space-y-2">
              {toolCalls.slice(-3).map((tc, idx) => (
                <div key={idx} className="text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-yellow-400 font-mono">→</span>
                    <span className="font-semibold text-yellow-200">{tc.tool}</span>
                    <span className="text-yellow-400/60 text-[10px]">
                      {new Date(tc.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {tc.args && Object.keys(tc.args).length > 0 && (
                    <div className="ml-4 text-yellow-300/70 font-mono text-[10px]">
                      args: {JSON.stringify(tc.args, null, 2).slice(0, 100)}
                      {JSON.stringify(tc.args).length > 100 ? '...' : ''}
                    </div>
                  )}
                  {tc.result && (
                    <div className="ml-4 text-yellow-300/60 font-mono text-[10px]">
                      result: {typeof tc.result === 'object' ? JSON.stringify(tc.result).slice(0, 80) + '...' : String(tc.result).slice(0, 80)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {toolCalls.some(tc => tc.tool === 'tag_category_brain') && (
              <div className="mt-2 pt-2 border-t border-yellow-500/20 text-xs text-yellow-300/80">
                💡 Tag Category Brain was called - check browser console & Netlify dev logs for full result
              </div>
            )}
          </div>
        )}

        {/* Context Header Card */}
        {chatContext && (
          <div className={`mb-4 bg-white/5 backdrop-blur-sm border rounded-xl p-4 ${
            normalizedEmployeeId === 'tag' 
              ? (chatContext.type === 'transaction' ? 'border-blue-500/20' : 'border-blue-500/20')
              : normalizedEmployeeId === 'prime'
              ? 'border-purple-500/20'
              : 'border-purple-500/20'
          }`}>
            {chatContext.type === 'transaction' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Info className={`w-4 h-4 ${
                    normalizedEmployeeId === 'tag' ? 'text-blue-300' : 'text-purple-300'
                  }`} />
                  <h3 className="text-sm font-semibold text-white">Transaction Context</h3>
                  {chatContext.fromEmployee === 'tag-ai' && normalizedEmployeeId === 'prime' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 ml-auto">
                      From Tag
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-white/60 mb-1">Description</p>
                    <p className="text-sm font-medium text-white truncate">
                      {chatContext.data.description || 'No description'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Category</p>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-white/10 text-white/80">
                      {chatContext.data.category || 'Uncategorized'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Amount</p>
                    <p className={`text-sm font-semibold ${
                      chatContext.data.type === 'income' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {chatContext.data.type === 'income' ? '+' : '-'}
                      ${Math.abs(chatContext.data.amount).toFixed(2)}
                    </p>
                  </div>
                  {chatContext.data.merchant && (
                    <div>
                      <p className="text-xs text-white/60 mb-1">Merchant</p>
                      <p className="text-sm text-white/80 truncate">{chatContext.data.merchant}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className={`w-4 h-4 ${
                    normalizedEmployeeId === 'tag' ? 'text-blue-300' : 'text-purple-300'
                  }`} />
                  <h3 className="text-sm font-semibold text-white">Category Context</h3>
                  {chatContext.fromEmployee === 'tag-ai' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 ml-auto">
                      From Tag
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-white/60 mb-1">Category</p>
                    <p className="text-sm font-medium text-white">{chatContext.data.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1">Transactions</p>
                    <p className="text-sm font-semibold text-white">{chatContext.data.transactionCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 mb-1 flex items-center gap-1">
                      <Brain className="w-3 h-3 text-green-300" />
                      Learned
                    </p>
                    <p className="text-sm font-semibold text-green-300">{chatContext.data.learnedCount}</p>
                  </div>
                  {chatContext.data.avgConfidence !== null && chatContext.data.avgConfidence !== undefined && (
                    <div>
                      <p className="text-xs text-white/60 mb-1">Avg Confidence</p>
                      <p className="text-sm font-semibold text-white">
                        {Math.round(chatContext.data.avgConfidence * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="space-y-4 mb-6">
          {/* Static intro message for Tag (UI only, not sent to backend) */}
          {tagStaticIntro && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/10 backdrop-blur-sm text-white border border-white/20">
                <div className="flex items-start space-x-2">
                  <div className={`w-6 h-6 bg-gradient-to-br ${employeeConfig.gradient} rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                    <Tag className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap">{tagStaticIntro}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {(() => {
            // Simple filtering: only hide system messages
            const filteredMessages = messages.filter((m) => m.role !== 'system');
            
            return filteredMessages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? `bg-gradient-to-br ${employeeConfig.gradient} text-white`
                    : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.role === 'assistant' && (
                    <div className={`w-6 h-6 bg-gradient-to-br ${employeeConfig.gradient} rounded-full flex items-center justify-center flex-shrink-0 mt-1`}>
                      {effectiveEmployeeId === 'tag' ? (
                        <Tag className="w-3 h-3 text-white" />
                      ) : effectiveEmployeeId === 'crystal' ? (
                        <Sparkles className="w-3 h-3 text-white" />
                      ) : effectiveEmployeeId === 'byte' ? (
                        <Brain className="w-3 h-3 text-white" />
                      ) : (
                        <Brain className="w-3 h-3 text-white" />
                      )}
                    </div>
                  )}
                  {message.role === 'user' && (
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.createdAt && (
                      <p className="text-xs opacity-70 mt-2">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            ));
          })()}
          
          {isStreaming && (
            <div className="flex justify-start">
              <div className="bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-2xl px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-6 h-6 bg-gradient-to-br ${employeeConfig.gradient} rounded-full flex items-center justify-center`}>
                    {effectiveEmployeeId === 'tag' ? (
                      <Tag className="w-3 h-3 text-white" />
                    ) : effectiveEmployeeId === 'crystal' ? (
                      <Sparkles className="w-3 h-3 text-white" />
                    ) : effectiveEmployeeId === 'byte' ? (
                      <Brain className="w-3 h-3 text-white" />
                    ) : (
                      <Brain className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">{employeeConfig.name} is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Input Area */}
        <form onSubmit={handleSend} className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
          {/* Hidden file input - connected to Paperclip button */}
          <input
            ref={fileInputRef}
            type="file"
            id="file-upload-input"
            accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'processing' || isStreaming}
          />
          
          <div className="flex items-end space-x-3">
            {/* File Upload Button - Always visible (like ChatGPT) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStatus.status === 'uploading' || uploadStatus.status === 'processing' || isStreaming}
              className={`p-3 rounded-xl transition-all ${
                uploadStatus.status === 'uploading' || uploadStatus.status === 'processing' || isStreaming
                  ? 'bg-white/10 opacity-50 cursor-not-allowed'
                  : 'bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 cursor-pointer'
              }`}
              title="Upload a bank statement or document"
            >
              <Paperclip className="w-5 h-5 text-white/80" />
            </button>
            
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholderText}
              className="flex-1 bg-transparent text-white placeholder-gray-400 border-none outline-none resize-none"
              rows={1}
              disabled={isStreaming}
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className={`p-3 bg-gradient-to-br ${employeeConfig.gradient} text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          {/* Upload Status Message - Show below input when uploading */}
          {uploadStatus.status !== 'idle' && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              {uploadStatus.status === 'uploading' && (
                <>
                  <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                  <span className="text-white/80">{uploadStatus.message}</span>
                  {progress > 0 && (
                    <span className="text-white/60 ml-auto">{progress}%</span>
                  )}
                </>
              )}
              {uploadStatus.status === 'processing' && (
                <>
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-white/80">{uploadStatus.message}</span>
                </>
              )}
              {uploadStatus.status === 'success' && (
                <>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-300">{uploadStatus.message}</span>
                </>
              )}
              {uploadStatus.status === 'error' && (
                <>
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-300">{uploadStatus.message}</span>
                </>
              )}
            </div>
          )}
        </form>
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
}

