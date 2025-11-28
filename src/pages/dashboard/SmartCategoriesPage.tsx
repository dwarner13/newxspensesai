import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MobilePageTitle from '../../components/ui/MobilePageTitle';
import { supabase } from '../../lib/supabase';
import type { Transaction } from '../../types/transactions';
import { Loader2, Tag, TrendingUp, Sparkles, Brain, Crown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSmartImport } from '../../hooks/useSmartImport';
import { TagWorkspace } from '../../components/workspace/employees/TagWorkspace';
import { TagWorkspacePanel } from '../../components/workspace/employees/TagWorkspacePanel';
import { TagUnifiedCard } from '../../components/workspace/employees/TagUnifiedCard';
import { ActivityPanel } from '../../components/dashboard/ActivityPanel';
import { DashboardSection } from '../../components/ui/DashboardSection';

const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';

export type SmartCategorySummary = {
  category: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  isExpenseCategory: boolean;
  trend: 'up' | 'down' | 'flat'; // Placeholder for now
  // Tag learning metrics
  learnedCount: number;        // category_source = 'learned'
  aiCount: number;             // category_source = 'ai'
  manualCount: number;          // category_source = 'manual' or null
  avgConfidence: number | null; // Average confidence across all transactions
  learningDominance: 'mostly-learned' | 'mostly-ai' | 'mixed' | 'unknown';
};

const SmartCategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'all-time'>('all-time');
  
  // Workspace overlay state
  const [isTagWorkspaceOpen, setIsTagWorkspaceOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedCategoryForChat, setSelectedCategoryForChat] = useState<SmartCategorySummary | null>(null);
  
  // Smart Import hook for file uploads (used by workspace overlay, not inline)
  const { uploadFile } = useSmartImport();

  // Fetch transactions with Tag learning data
  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId]);

  const fetchTransactions = async () => {
    if (!userId) {
      setError('Please sign in to view Smart Categories');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (!supabase) {
        throw new Error('Database connection not available');
      }

      // Fetch transactions with category_source and confidence for Tag learning metrics
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, date, posted_at, description, merchant, category, amount, type, confidence, category_source, source_type')
        .eq('user_id', userId)
        .order('posted_at', { ascending: false })
        .limit(1000); // Increased limit to get better category stats

      if (transactionsError) {
        throw new Error(transactionsError.message || 'Failed to load transactions');
      }

      // Transform Supabase data to match our Transaction interface
      // Include category_source and confidence for Tag learning metrics
      const formattedTransactions: Transaction[] = (transactionsData || []).map((tx: any) => ({
        id: tx.id,
        date: tx.date || tx.posted_at,
        description: tx.description || tx.memo || tx.merchant || 'Unknown',
        category: tx.category || 'Uncategorized',
        amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount) || 0,
        type: tx.type === 'income' || tx.type === 'Credit' ? 'income' : 'expense',
        merchant: tx.merchant || null,
        confidence: tx.confidence ?? null,
        source_type: tx.category_source || tx.source_type || null, // Use category_source from migration
      }));

      setTransactions(formattedTransactions);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  // Group transactions by category and calculate stats with Tag learning metrics
  const categorySummaries = useMemo<SmartCategorySummary[]>(() => {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    // Group by category
    const categoryMap = new Map<string, Transaction[]>();

    transactions.forEach((tx) => {
      const category = tx.category || 'Uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(tx);
    });

    // Calculate stats for each category including Tag learning metrics
    const summaries: SmartCategorySummary[] = Array.from(categoryMap.entries()).map(([category, txs]) => {
      const totalAmount = txs.reduce((sum, tx) => {
        const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount)) || 0;
        return sum + amount;
      }, 0);

      const transactionCount = txs.length;
      const averageAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;

      // Determine if expense category: net is negative OR most transactions are expenses
      const expenseCount = txs.filter(tx => tx.type === 'expense').length;
      const isExpenseCategory = totalAmount < 0 || expenseCount > transactionCount / 2;

      // Tag learning metrics
      const learnedCount = txs.filter(tx => tx.source_type === 'learned').length;
      const aiCount = txs.filter(tx => tx.source_type === 'ai').length;
      const manualCount = txs.filter(tx => 
        tx.source_type === 'manual' || 
        tx.source_type === null || 
        tx.source_type === undefined
      ).length;

      // Calculate average confidence (only for transactions with confidence values)
      const confidences = txs
        .map(tx => tx.confidence)
        .filter((conf): conf is number => conf !== null && conf !== undefined);
      const avgConfidence = confidences.length > 0
        ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
        : null;

      // Determine learning dominance
      let learningDominance: 'mostly-learned' | 'mostly-ai' | 'mixed' | 'unknown' = 'unknown';
      if (transactionCount > 0) {
        const learnedPercent = (learnedCount / transactionCount) * 100;
        const aiPercent = (aiCount / transactionCount) * 100;
        
        if (learnedPercent >= 70) {
          learningDominance = 'mostly-learned';
        } else if (aiPercent >= 70) {
          learningDominance = 'mostly-ai';
        } else if (learnedCount > 0 || aiCount > 0) {
          learningDominance = 'mixed';
        }
      }

      // Placeholder trend (fake for now)
      const trend: 'up' | 'down' | 'flat' = 'flat';

      return {
        category,
        totalAmount,
        transactionCount,
        averageAmount,
        isExpenseCategory,
        trend,
        learnedCount,
        aiCount,
        manualCount,
        avgConfidence,
        learningDominance,
      };
    });

    // Sort by absolute totalAmount descending (biggest categories at top)
    return summaries.sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount));
  }, [transactions]);

  // Calculate overall stats
  const stats = useMemo(() => {
    const totalExpenses = categorySummaries
      .filter(cat => cat.isExpenseCategory)
      .reduce((sum, cat) => sum + Math.abs(cat.totalAmount), 0);

    const totalIncome = categorySummaries
      .filter(cat => !cat.isExpenseCategory)
      .reduce((sum, cat) => sum + cat.totalAmount, 0);

    return {
      categoryCount: categorySummaries.length,
      totalExpenses,
      totalIncome,
    };
  }, [categorySummaries]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getLearningBadge = (summary: SmartCategorySummary) => {
    if (summary.learningDominance === 'mostly-learned') {
      return {
        text: 'Mostly Learned',
        className: 'bg-green-500/20 text-green-300 border-green-500/30',
        icon: <Brain className="w-3 h-3" />
      };
    } else if (summary.learningDominance === 'mostly-ai') {
      return {
        text: 'Mostly AI',
        className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        icon: <Sparkles className="w-3 h-3" />
      };
    } else if (summary.learningDominance === 'mixed') {
      return {
        text: 'Mixed Source',
        className: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        icon: <Tag className="w-3 h-3" />
      };
    }
    return {
      text: 'Unknown',
      className: 'bg-white/10 text-white/60 border-white/20',
      icon: null
    };
  };

  const handleAskTag = (categorySummary: SmartCategorySummary) => {
    // Open Tag workspace overlay with category context
    setSelectedCategoryForChat(categorySummary);
    setIsTagWorkspaceOpen(true);
    setIsMinimized(false);
  };

  const handleAskCrystal = (categorySummary: SmartCategorySummary) => {
    navigate('/dashboard/chat/crystal', {
      state: {
        source: 'smart-categories',
        contextType: 'category',
        from: location.pathname, // Return origin: Smart Categories page
        category: categorySummary.category,
        learnedCount: categorySummary.learnedCount,
        aiCount: categorySummary.aiCount,
        avgConfidence: categorySummary.avgConfidence,
        transactionCount: categorySummary.transactionCount,
        totalAmount: categorySummary.totalAmount,
      },
    });
  };

  const handleAskPrime = (categorySummary: SmartCategorySummary) => {
    navigate('/dashboard/chat/prime', {
      state: {
        source: 'smart-categories',
        contextType: 'category',
        from: location.pathname, // Return origin: Smart Categories page
        category: categorySummary.category,
        learnedCount: categorySummary.learnedCount,
        aiCount: categorySummary.aiCount,
        avgConfidence: categorySummary.avgConfidence,
        transactionCount: categorySummary.transactionCount,
        totalAmount: categorySummary.totalAmount,
      },
    });
  };

  // Build category context for workspace overlay (matches EmployeeChatPage format)
  const chatContext = useMemo(() => {
    if (!selectedCategoryForChat) return null;
    return {
      type: 'category' as const,
      data: {
        category: selectedCategoryForChat.category,
        learnedCount: selectedCategoryForChat.learnedCount,
        aiCount: selectedCategoryForChat.aiCount,
        avgConfidence: selectedCategoryForChat.avgConfidence,
        transactionCount: selectedCategoryForChat.transactionCount,
        totalAmount: selectedCategoryForChat.totalAmount,
      },
    };
  }, [selectedCategoryForChat]);

  // Build system prompt for Tag with category context (for workspace overlay)
  const systemPrompt = useMemo(() => {
    if (!chatContext || chatContext.type !== 'category') return null;
    
    const cat = chatContext.data;
    const learnedPercent = cat.transactionCount > 0 
      ? Math.round((cat.learnedCount / cat.transactionCount) * 100) 
      : 0;
    const aiPercent = cat.transactionCount > 0 
      ? Math.round((cat.aiCount / cat.transactionCount) * 100) 
      : 0;
    
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
- Use emojis sparingly (only when celebrating: 🎉 ✅)`;
  }, [chatContext]);

  // Removed all inline chat code - chat is now only in workspace overlay

  // Workspace overlay handlers (consolidated)
  const openTagWorkspace = () => {
    setIsTagWorkspaceOpen(true);
    setIsMinimized(false);
  };
  
  const closeTagWorkspace = () => {
    setIsTagWorkspaceOpen(false);
    setIsMinimized(false);
    setSelectedCategoryForChat(null);
  };
  
  const minimizeTagWorkspace = () => {
    setIsTagWorkspaceOpen(false);
    setIsMinimized(true);
  };

  return (
    <>
      <DashboardSection className="flex flex-col">
        {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
        {/* 3-column grid: col-span-4 (33%), col-span-5 (42%), col-span-3 (25%) with equal heights */}
        <div className="grid grid-cols-12 gap-0 items-stretch" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* LEFT COLUMN (col-span-4 = 33%): Tag Workspace */}
          <section className="col-span-12 lg:col-span-4 flex flex-col">
            <TagWorkspacePanel />
          </section>

          {/* CENTER COLUMN (col-span-5 = 42%): Tag Unified Card */}
          <section className="col-span-12 lg:col-span-5 flex flex-col">
            <TagUnifiedCard onExpandClick={openTagWorkspace} onChatInputClick={openTagWorkspace} />
          </section>

          {/* RIGHT COLUMN (col-span-3 = 25%): Activity Feed */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col">
            <ActivityPanel />
          </aside>
        </div>
      </DashboardSection>

      {/* Tag Workspace Overlay - Floating centered chatbot */}
      <TagWorkspace 
        open={isTagWorkspaceOpen} 
        onClose={closeTagWorkspace}
        minimized={isMinimized}
        onMinimize={minimizeTagWorkspace}
      />
    </>
  );
};

export default SmartCategoriesPage;
