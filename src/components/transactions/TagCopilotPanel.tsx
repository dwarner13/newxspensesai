import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';
import { useTypewriter } from '../../pages/PrimeChatV2/useTypewriter';
import type { CommittedTransaction } from '@/types/transactions';
import { PANEL } from '../../pages/PrimeChatV2/panelConfig';

interface TagAction {
  type: 'filter' | 'bulk_change' | 'undo' | 'reclassify_preview' | 'categorize' | 'update_transaction' | 'handoff';
  search?: string;
  category?: string;
  subcategory?: string;
  merchant?: string;
  confirm?: boolean;
  id?: string;
  saveRule?: boolean;
  to?: string;
  reason?: string;
}

interface TagCopilotPanelProps {
  transaction?: CommittedTransaction | null;
  selectedTransaction?: CommittedTransaction | null;
  onClose: () => void;
  onCategoryUpdated?: () => void;
  onTagAction?: (action: TagAction) => void;
  onToggleActivity?: () => void;
  totalCount?: number;
  firstName?: string;
  totalSpent?: number;
  totalIncome?: number;
  netFlow?: number;
  injectedMessage?: string | null;
  injectedFollowupMerchants?: any[] | null;
  onMerchantCategorize?: (merchantName: string, category: string) => void;
  sharedChatHistory?: { role: string; content: string }[];
  sharedChatReply?: string | null;
  onChatHistoryChange?: (history: { role: string; content: string }[], reply: string | null) => void;
}

function parseTagAction(reply: string): { cleanReply: string; action: TagAction | null } {
  const filterMatch = reply.match(/FILTER:\s*(\{[^}]+\}|[^\n{]+)/);
  const bulkMatch = reply.match(/BULK_CHANGE:(\{[^}]*\})/);
  const undoMatch = reply.match(/UNDO:(\{[^}]*\})/);
  let action: TagAction | null = null;
  let cleanReply = reply;
  if (filterMatch) {
    const raw = filterMatch[1].trim();
    // Support both JSON format {"search":"x","category":"y","subcategory":"z"} and plain text format
    try { const parsed = JSON.parse(raw); action = { type: 'filter', search: parsed.search || '', category: parsed.category || undefined, subcategory: parsed.subcategory || undefined }; } catch { action = { type: 'filter', search: raw }; }
    cleanReply = reply.replace(/\s*FILTER:\s*(?:\{[^}]+\}|[^\n]+)/g, '').trim();
  } else if (bulkMatch) {
    try { action = { type: 'bulk_change', ...JSON.parse(bulkMatch[1]) }; } catch {}
    cleanReply = reply.replace(/BULK_CHANGE:\{[^}]*\}/g, '').trim();
  } else if (undoMatch) {
    action = { type: 'undo' };
    cleanReply = reply.replace(/UNDO:\{[^}]*\}/g, '').trim();
  } else if (/RECLASSIFY_PREVIEW:\{\}/.test(reply)) {
    action = { type: 'reclassify_preview' };
    cleanReply = reply.replace(/RECLASSIFY_PREVIEW:\{\}/g, '').trim();
  } else {
    const updateMatch = reply.match(/UPDATE_TRANSACTION:\s*(\{[^{}]+\})/);
    const catMatch = reply.match(/CATEGORIZE:(\{[^}]+\})/);
    if (updateMatch) {
      try {
        const parsed = JSON.parse(updateMatch[1]);
        action = { type: 'update_transaction', id: parsed.id, category: parsed.category, subcategory: parsed.subcategory || undefined, merchant: parsed.merchant || undefined, saveRule: /SAVE_RULE:true/i.test(reply) };
      } catch {}
      cleanReply = reply.replace(/\s*UPDATE_TRANSACTION:\s*\{[^{}]+\}/g, '').replace(/\s*SAVE_RULE:true/gi, '').trim();
    } else if (catMatch) {
      try { action = { type: 'categorize', ...JSON.parse(catMatch[1]) }; } catch {}
      cleanReply = reply.replace(/CATEGORIZE:\{[^}]+\}/g, '').trim();
    }
  }
  return { cleanReply, action };
}

type ChatMsg = { role: 'tag' | 'user'; text: string; merchantQ?: { name: string; count: number; amount: number; options: string[]; interacAmounts?: Array<{ amount: number; count: number }> }; subcategoryQ?: { merchantName: string; category: string; options: string[] }; followupMerchants?: any[]; txResults?: CommittedTransaction[]; queryKeyword?: string };

const SUBCATEGORY_OPTIONS: Record<string, string[]> = {
  'Transportation': ['Gas & Fuel', 'Parking', 'Transit', 'Vehicle Insurance', 'Vehicle Services', 'Rideshare'],
  'Food & Dining': ['Restaurants', 'Fast Food', 'Coffee & Drinks', 'Delivery', 'Groceries'],
  'Personal Care': ['Hair & Beauty', 'Massage & Wellness', 'Gym & Fitness', 'Clothing'],
  'Healthcare': ['Dental', 'Chiropractic', 'Pharmacy', 'Medical', 'Vision'],
  'Shopping': ['Electronics', 'Auto & Hardware', 'Home & Garden', 'Clothing', 'General'],
  'Subscriptions': ['Software & AI', 'Streaming', 'Memberships', 'News & Media'],
  'Entertainment': ['Gaming & Lottery', 'Movies & Events', 'Sports', 'Golf', 'Hobbies'],
  'Bank Fees': ['Banking', 'Credit Services', 'Loans', 'ATM'],
  'Income': ['Employment', 'Business Income', 'Government Rebate', 'Tax Refund', 'Investment'],
  'Debt Payments': ['Credit Card', 'Line of Credit', 'Loan Payment'],
};

const SUGGEST_CATS: Record<string, string[]> = {
  food: ['Food & Dining', 'Business Meals'], gas: ['Transportation'], hotel: ['Travel', 'Business Travel'],
  pharma: ['Healthcare'], drug: ['Healthcare'], amazon: ['Shopping', 'Business Supplies'],
  walmart: ['Shopping', 'Groceries'], costco: ['Shopping', 'Groceries'], default: ['Food & Dining', 'Shopping', 'Transportation', 'Personal Care', 'Subscriptions'],
};
function suggestCats(name: string): string[] {
  const n = (name || '').toLowerCase();
  for (const [k, v] of Object.entries(SUGGEST_CATS)) { if (k !== 'default' && n.includes(k)) return v; }
  return SUGGEST_CATS.default;
}

// -- Category validation ------------------------------------------------------
// Prevents free-text sentences from being saved as category names.
const CANONICAL_CATEGORIES = [
  'Income', 'Groceries', 'Food & Dining', 'Transportation', 'Housing', 'Utilities',
  'Shopping', 'Subscriptions', 'Entertainment', 'Healthcare', 'Insurance', 'Education',
  'Travel', 'Transfers', 'Bank Fees', 'Business', 'Personal Care', 'Home & Garden',
  'Savings', 'Debt Payments', 'Cash & ATM', 'Health & Fitness', 'Dining',
  'Business Meals', 'Business Travel', 'Business Supplies', 'Other', 'Uncategorized',
] as const;

const CATEGORY_ALIASES: Record<string, string> = {
  'dining': 'Food & Dining',
  'food': 'Food & Dining',
  'food and dining': 'Food & Dining',
  'gas': 'Transportation',
  'fuel': 'Transportation',
  'petro': 'Transportation',
  'health': 'Healthcare',
  'medical': 'Healthcare',
  'dental': 'Healthcare',
  'fees': 'Bank Fees',
  'bank fee': 'Bank Fees',
  'coffee': 'Food & Dining',
  'restaurant': 'Food & Dining',
  'fast food': 'Food & Dining',
  'grocery': 'Groceries',
  'supermarket': 'Groceries',
  'streaming': 'Subscriptions',
  'software': 'Subscriptions',
  'gym': 'Health & Fitness',
  'fitness': 'Health & Fitness',
  'parking': 'Transportation',
  'transit': 'Transportation',
  'rideshare': 'Transportation',
  'uber': 'Transportation',
  'transfer': 'Transfers',
  'etransfer': 'Transfers',
  'e-transfer': 'Transfers',
  'savings': 'Savings',
  'debt': 'Debt Payments',
  'loan': 'Debt Payments',
  'credit card': 'Debt Payments',
  'entertainment': 'Entertainment',
  'golf': 'Entertainment',
  'personal care': 'Personal Care',
  'hair': 'Personal Care',
  'salon': 'Personal Care',
  'business': 'Business',
  'housing': 'Housing',
  'rent': 'Housing',
  'mortgage': 'Housing',
  'utilities': 'Utilities',
  'hydro': 'Utilities',
  'internet': 'Utilities',
  'phone': 'Utilities',
  'insurance': 'Insurance',
  'travel': 'Travel',
  'hotel': 'Travel',
  'airfare': 'Travel',
  'education': 'Education',
  'tuition': 'Education',
  'income': 'Income',
  'payroll': 'Income',
  'salary': 'Income',
  'deposit': 'Income',
  'other': 'Other',
};

/**
 * Returns the canonical category name if input matches, otherwise null.
 * Prevents raw sentences from being written as category names.
 */
function resolveCategory(input: string): string | null {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  // Direct canonical match (case-insensitive)
  const direct = CANONICAL_CATEGORIES.find(c => c.toLowerCase() === lower);
  if (direct) return direct;
  // Alias match
  return CATEGORY_ALIASES[lower] ?? null;
}

function detectQueryKeyword(text: string): string | null {
  const t = text.trim();
  // "show me all massage transactions" - transactions word is optional, handles typos
  const queryMatch = t.match(
    /\b(?:how many|show (?:me )?(?:all )?(?:my )?|find|list(?: all)?(?:\s+my)?|pull up|search for|look up|display|get me|what are my|all my)\s+(?:my\s+)?(.+?)(?:\s+transac\w*|\s+expenses?|\s+purchases?|\s+charges?)?\s*[?!]?\s*$/i
  );
  if (queryMatch?.[1]) {
    const kw = queryMatch[1].trim();
    // Ignore if the captured keyword is too vague or a stop word
    if (kw.length < 2 || /^(all|my|the|a|an|some)$/i.test(kw)) return null;
    return kw;
  }
  // "transactions for/from/at X" or "spending on X"
  const forMatch = t.match(/\b(?:transac\w*|spending|expenses?|charges?)\s+(?:for|on|from|at|with)\s+(.+)/i);
  if (forMatch?.[1]) return forMatch[1].replace(/[?!.]+$/, '').trim();
  return null;
}

export function TagCopilotPanel({ transaction, selectedTransaction, onClose, onCategoryUpdated, onTagAction, onToggleActivity, injectedMessage, injectedFollowupMerchants, onMerchantCategorize, totalCount, firstName, totalSpent, totalIncome, netFlow }: TagCopilotPanelProps) {
  const [localMessages, setLocalMessages] = useState<ChatMsg[]>(() => {
    if (transaction) return [];
    try {
      const saved = localStorage.getItem('tag_chat_history');
      if (!saved) return [];
      const ts = localStorage.getItem('tag_chat_history_ts');
      const age = ts ? Date.now() - Number(ts) : Infinity;
      if (age > 2 * 60 * 60 * 1000) {
        localStorage.removeItem('tag_chat_history');
        localStorage.removeItem('tag_chat_history_ts');
        return [];
      }
      const parsed = JSON.parse(saved);
      // Normalize both formats: Categories uses {role:'assistant'|'user', content}
      // Transactions uses {role:'tag'|'user', text}
      return parsed
        .map((m: any) => ({
          role: (m.role === 'assistant' ? 'tag' : m.role === 'user' ? 'user' : m.role) as 'tag' | 'user',
          text: String(m.text || m.content || '').trim(),
        }))
        .filter((m: any) => m.text.length > 0);
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [smartReview, setSmartReview] = useState<{ issues: Array<{ id: string; merchant: string; currentCategory: string; suggestedCategory: string; suggestedSubcategory: string | null; reason: string; count: number; totalAmount: number; ids: string[] }>; summary: string } | null>(null);
  const [smartReviewLoading, setSmartReviewLoading] = useState(false);
  const [smartReviewApproved, setSmartReviewApproved] = useState<Set<string>>(new Set());
  const [smartReviewRejected, setSmartReviewRejected] = useState<Set<string>>(new Set());
  const [smartReviewCommitting, setSmartReviewCommitting] = useState(false);
  const [smartReviewDone, setSmartReviewDone] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'activity' | 'rules'>('chat');
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [activityMonths, setActivityMonths] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityMonth, setActivityMonth] = useState('');
  const [learnedRules, setLearnedRules] = useState<any[]>([]);
  const [autoFixing, setAutoFixing] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState('');
  const [needsReviewCount, setNeedsReviewCount] = useState<number | null>(null);

  const fetchNeedsReviewCount = useCallback(async () => {
    try {
      const sb = getSupabase(); if (!sb) return;
      const { data: { user } } = await sb.auth.getUser(); if (!user) return;
      // Treat Other / Uncategorized / null as Needs Review - they all mean "uncategorized"
      const { count } = await sb.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', user.id).or('category.eq.Needs Review,category.eq.Other,category.eq.Uncategorized,category.is.null');
      setNeedsReviewCount(count || 0);
    } catch { /* non-blocking */ }
  }, []);

  useEffect(() => { fetchNeedsReviewCount(); }, [fetchNeedsReviewCount]);

  const fetchTxResults = useCallback(async (keyword: string): Promise<CommittedTransaction[]> => {
    try {
      const sb = getSupabase(); if (!sb) return [];
      const { data: { user } } = await sb.auth.getUser(); if (!user) return [];
      const kw = keyword.replace(/'/g, "''");
      const { data } = await sb
        .from('transactions')
        .select('id, merchant_name, amount, date, posted_at, type, category, subcategory, description, user_id')
        .eq('user_id', user.id)
        .or(`merchant_name.ilike.%${kw}%,category.ilike.%${kw}%,description.ilike.%${kw}%`)
        .order('date', { ascending: false })
        .limit(25);
      return (data ?? []) as CommittedTransaction[];
    } catch { return []; }
  }, []);

  const bottomRef = useRef<HTMLDivElement>(null);

  const lastTagIndex = useMemo(() => {
    for (let i = localMessages.length - 1; i >= 0; i--) {
      if (localMessages[i].role === 'tag') return i;
    }
    return -1;
  }, [localMessages]);

  

  const fetchProactiveGreeting = useCallback(async () => {
    const hi = firstName ? `Hey ${firstName}` : 'Hey';
    // Show instant placeholder so there is no blank gap while fetch runs
    setLocalMessages([{ role: 'tag' as const, text: `${hi} - checking your transactions...` }]);
    try {
      const sb = getSupabase(); if (!sb) return;
      const { data: { session } } = await sb.auth.getSession(); if (!session) return;
      const res = await fetch('/.netlify/functions/tag-inbox', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const unresolved = data.unresolved ?? [];
      const unresolvedCount = unresolved.length;
      const totalTxsNR = unresolved.reduce((s: number, m: any) => s + m.transaction_count, 0);
      const totalAmtNR = unresolved.reduce((s: number, m: any) => s + m.total_amount, 0);

      if (unresolvedCount > 0) {
        const topM = unresolved.slice(0, 3).map((m: any) => `\u2022 **${m.merchant_name}** \u00d7${m.transaction_count}`).join('\n');
        setLocalMessages([{
          role: 'tag', text: `${hi} \u2014 you've got **${totalTxsNR} transactions** across ${unresolvedCount} merchants in Needs Review ($${totalAmtNR.toFixed(2)}).\n\nBiggest:\n${topM}\n\nWant to work through them now?`,
          followupMerchants: unresolved,
        }]);
      } else {
        const count = totalCount ?? 0;
        setLocalMessages([{ role: 'tag', text: `${hi} \u2014 your books are looking clean \u2713 All ${count} transactions categorized. Ask me anything about your spending.` }]);
      }
    } catch {
      const count = totalCount ?? 0;
      setLocalMessages([{ role: 'tag', text: `${hi ?? 'Hey'} \u2014 ${count} transactions in view. Tap any row and I'll tell you why I categorized it that way.` }]);
    }
  }, [firstName, totalCount]);

  useEffect(() => {
    if (transaction) {
      const merchant = transaction.merchant_name || 'This transaction';
      const cat = transaction.category || 'Uncategorized';
      setLocalMessages([{ role: 'tag', text: `**${merchant}** \u2014 I put this in **${cat}** because of how it's described. Want to move it somewhere else?` }]);
    } else if (localMessages.length === 0) {
      void fetchProactiveGreeting();
    }
  }, [transaction?.id]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [localMessages]);

  // Pick up injected messages from parent
  useEffect(() => {
    if (injectedMessage) {
      if (injectedFollowupMerchants && injectedFollowupMerchants.length > 0) {
        setLocalMessages(m => [...m, { role: 'tag' as const, text: injectedMessage, followupMerchants: injectedFollowupMerchants }]);
      } else {
        setLocalMessages(m => [...m, { role: 'tag' as const, text: injectedMessage }]);
      }
    }
  }, [injectedMessage]);

  // Merchant queue state
  const [merchantQueue, setMerchantQueue] = useState<any[]>([]);
  const [mqIndex, setMqIndex] = useState(0);
  const [pendingSubcategory, setPendingSubcategory] = useState<{ merchantName: string; category: string } | null>(null);

  const startMerchantQueue = (merchants: any[]) => {
    setMerchantQueue(merchants);
    setMqIndex(0);
    if (merchants[0]) askAboutMerchant(merchants[0], 0);
  };

  const askAboutMerchant = async (merchant: any, idx: number) => {
    const isInterac = /interac|e.?transfer/i.test(merchant.merchant_name);

    if (isInterac && merchant.transaction_count >= 2) {
      // Fetch actual amounts to detect recurring patterns
      try {
        const sb = getSupabase();
        if (sb) {
          const { data: txs } = await sb.from('transactions').select('amount')
            .ilike('merchant_name', `%${merchant.merchant_name}%`)
            .or('category.eq.Needs Review,category.eq.Other,category.eq.Uncategorized,category.is.null')
            .limit(50);
          if (txs && txs.length >= 2) {
            // Group by amount to find recurring
            const amtMap: Record<string, number> = {};
            for (const tx of txs) {
              const key = Math.abs(Number(tx.amount)).toFixed(2);
              amtMap[key] = (amtMap[key] || 0) + 1;
            }
            const recurring = Object.entries(amtMap).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]);

            if (recurring.length > 0) {
              const recLines = recurring.slice(0, 3).map(([amt, c]) => `$${amt} \u00d7${c}`).join(', ');
              setLocalMessages(m => [...m, {
                role: 'tag' as const,
                text: `${idx > 0 ? 'Next up \u2014 ' : ''}**${merchant.merchant_name}** \u00d7${merchant.transaction_count} ($${merchant.total_amount.toFixed(2)}).\n\nI see recurring amounts: ${recLines}. These look like regular payments \u2014 what are they?`,
                merchantQ: {
                  name: merchant.merchant_name, count: merchant.transaction_count, amount: merchant.total_amount,
                  options: ['Income', 'Transfers', 'Housing'],
                  interacAmounts: recurring.map(([amt, c]) => ({ amount: Number(amt), count: c })),
                },
              }]);
              return;
            }
          }
        }
      } catch { /* fall through to default */ }
    }

    setLocalMessages(m => [...m, {
      role: 'tag' as const,
      text: `${idx > 0 ? 'Next up \u2014 ' : ''}**${merchant.merchant_name}** \u00d7${merchant.transaction_count} ($${merchant.total_amount.toFixed(2)}). What are these usually?`,
      merchantQ: { name: merchant.merchant_name, count: merchant.transaction_count, amount: merchant.total_amount, options: suggestCats(merchant.merchant_name) },
    }]);
  };

  const handleMerchantPick = async (category: string, merchantName: string) => {
    // Guard 1: command/question keywords ? route to LLM chat
    if (/\b(show|bring|find|search|can you|what|how|why|filter|list|pull up|undo|categorize|help)\b/i.test(category)) {
      setInput(category);
      setTimeout(() => void send(), 50);
      return;
    }
    // Guard 2: validate against canonical categories n++ reject free-text sentences
    const resolved = resolveCategory(category);
    if (!resolved) {
      // Not a valid category n++ treat as a chat message to Tag, don't advance queue
      void sendAsChatMessage(category);
      return;
    }
    // Use the normalized canonical form
    const canonicalCategory = resolved;
    setLocalMessages(m => [...m, { role: 'user' as const, text: canonicalCategory }]);
    // Check if subcategories exist for this category
    const subcats = SUBCATEGORY_OPTIONS[canonicalCategory];
    if (subcats && subcats.length > 0) {
      setPendingSubcategory({ merchantName, category: canonicalCategory });
      setLocalMessages(m => [...m, {
        role: 'tag' as const,
        text: `Got it \u2014 **${canonicalCategory}**. What type?`,
        subcategoryQ: { merchantName, category: canonicalCategory, options: subcats },
      }]);
      return;
    }
    await saveWithSubcategory(canonicalCategory, merchantName, null);
  };

  const handleSubcategoryPick = async (subcategory: string) => {
    if (!pendingSubcategory) return;
    const { merchantName, category } = pendingSubcategory;
    setLocalMessages(m => [...m, { role: 'user' as const, text: subcategory }]);
    setPendingSubcategory(null);
    await saveWithSubcategory(category, merchantName, subcategory);
  };

  const saveWithSubcategory = async (category: string, merchantName: string, subcategory: string | null, amountRange?: { min?: number; max?: number }) => {
    try {
      const sb = getSupabase();
      if (!sb) throw new Error('No Supabase');
      const { data: { session } } = await sb.auth.getSession();
      if (!session) throw new Error('No session');
      const token = session.access_token;

      let query = sb.from('transactions').select('id, amount')
        .ilike('merchant_name', `%${merchantName}%`)
        .or('category.eq.Needs Review,category.eq.Other,category.eq.Uncategorized,category.is.null');
      const { data: matchingTxs } = await query;

      // Filter by amount range if provided (for INTERAC recurring rules)
      let ids: string[];
      if (amountRange && (amountRange.min != null || amountRange.max != null)) {
        ids = (matchingTxs ?? []).filter(t => {
          const amt = Math.abs(Number(t.amount || 0));
          if (amountRange.min != null && amt < amountRange.min - 0.01) return false;
          if (amountRange.max != null && amt > amountRange.max + 0.01) return false;
          return true;
        }).map(t => t.id);
      } else {
        ids = (matchingTxs ?? []).map(t => t.id);
      }

      if (ids.length > 0) {
        await fetch('/.netlify/functions/tag-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ intent: 'bulk_apply', groups: [{ ids, category, subcategory }] }),
        });
      }

      await fetch('/.netlify/functions/tag-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          intent: 'save_rule', matchValue: merchantName, targetCategory: category,
          targetSubcategory: subcategory, matchType: 'contains',
          ...(amountRange?.min != null ? { amount_min: amountRange.min } : {}),
          ...(amountRange?.max != null ? { amount_max: amountRange.max } : {}),
        }),
      });

      // Trigger live badge refresh across all mounted SmartCategoriesStats consumers
      try { window.dispatchEvent(new Event('tag:stats-refresh')); } catch { /* noop */ }

      const confirmText = subcategory
        ? `\u2713 ${ids.length > 0 ? `${ids.length} ` : ''}${merchantName} \u2192 **${category}** / **${subcategory}**. Rule saved.`
        : `\u2713 ${ids.length > 0 ? `${ids.length} ` : ''}${merchantName} \u2192 **${category}**. Rule saved.`;
      setLocalMessages(m => [...m, { role: 'tag' as const, text: confirmText }]);
      onMerchantCategorize?.(merchantName, category);
      onCategoryUpdated?.(); void fetchNeedsReviewCount();
    } catch (err) {
      console.error('[Tag] saveWithSubcategory error:', err);
      setLocalMessages(m => [...m, { role: 'tag' as const, text: 'Had trouble saving \u2014 try again.' }]);
      return;
    }

    const next = mqIndex + 1;
    setMqIndex(next);
    if (next < merchantQueue.length) {
      setTimeout(() => askAboutMerchant(merchantQueue[next], next), 1000);
    } else {
      setTimeout(() => {
        setLocalMessages(m => [...m, { role: 'tag' as const, text: 'All done! Every merchant has been handled. Your books are looking clean \u2713' }]);
        setMerchantQueue([]);
      }, 1000);
    }
  };

  useEffect(() => {
    if (!transaction && localMessages.length > 0) {
      localStorage.setItem('tag_chat_history', JSON.stringify(localMessages.slice(-20)));
      localStorage.setItem('tag_chat_history_ts', String(Date.now()));
    }
  }, [localMessages, transaction]);

  // Called when user types non-category text during merchant queue
  // Routes to Tag chat WITHOUT advancing the queue
  const sendAsChatMessage = async (text: string) => {
    setLocalMessages(m => [...m, { role: 'user' as const, text }]);
    setBusy(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';
      const currentMerchant = merchantQueue[mqIndex]?.merchant_name;
      const res = await fetch('/.netlify/functions/tag-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: text,
          merchant: currentMerchant,
          context: 'page',
          pageContext: { totalSpent: totalSpent ?? 0, totalIncome: totalIncome ?? 0, transactionCount: totalCount ?? 0 },
          history: localMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const { cleanReply, action: tagAction } = parseTagAction(data.reply);
      // Handle handoff from server
      if (data.handoff?.to && onTagAction) {
        setLocalMessages(m => [...m, { role: 'tag' as const, text: cleanReply }]);
        setBusy(false);
        onTagAction({ type: 'handoff', to: data.handoff.to, reason: data.handoff.reason || '' });
        return;
      }
      setLocalMessages(m => [...m, { role: 'tag' as const, text: cleanReply }]);
      if (tagAction && onTagAction) onTagAction(tagAction);
    } catch {
      setLocalMessages(m => [...m, { role: 'tag' as const, text: 'Something went wrong \u2014 try again.' }]);
    }
    setBusy(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    // If merchant queue is active AND Tag is actively asking about a merchant, treat typed input as category pick
    const lastMsg = localMessages[localMessages.length - 1];
    const tagIsAskingMerchant = lastMsg?.role === 'tag' && lastMsg?.merchantQ;
    if (merchantQueue.length > 0 && mqIndex < merchantQueue.length && tagIsAskingMerchant) {
      setInput('');
      // If user is asking to SEE the transaction rather than categorize it, fetch and show it
      const isShowRequest = /\b(show|see|view|what|which|specific|detail|look|display)\b/i.test(text);
      if (isShowRequest) {
        const currentMerchant = merchantQueue[mqIndex];
        setLocalMessages(m => [...m, { role: 'user' as const, text }]);
        // Fetch actual transactions for this merchant
        const txs = await fetchTxResults(currentMerchant.merchant_name);
        if (txs.length > 0) {
          setLocalMessages(m => [...m, {
            role: 'tag' as const,
            text: `Here's what I have for **${currentMerchant.merchant_name}**:`,
            txResults: txs,
            queryKeyword: currentMerchant.merchant_name,
          }]);
        } else {
          setLocalMessages(m => [...m, { role: 'tag' as const, text: `I couldn't pull up the details for **${currentMerchant.merchant_name}** right now.` }]);
        }
        return;
      }
      void handleMerchantPick(text, merchantQueue[mqIndex].merchant_name);
      return;
    }
    const txId = transaction?.id ?? null;
    setInput('');
    setLocalMessages(m => [...m, { role: 'user' as const, text }]);
    setBusy(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token ?? '';
      const history = localMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
      const res = await fetch('/.netlify/functions/tag-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` },
        body: JSON.stringify({
          transactionId: txId, message: text, history,
          merchant: transaction?.merchant_name || undefined,
          context: transaction ? undefined : 'page',
          pageContext: {
            totalSpent: totalSpent ?? 0,
            totalIncome: totalIncome ?? 0,
            netFlow: netFlow ?? 0,
            transactionCount: totalCount ?? 0,
          },
          selectedTransaction: selectedTransaction ? {
            id: selectedTransaction.id,
            merchant: selectedTransaction.merchant_name || (selectedTransaction as any).merchant || null,
            amount: selectedTransaction.amount,
            date: selectedTransaction.date || selectedTransaction.posted_at,
            category: selectedTransaction.category,
            subcategory: selectedTransaction.subcategory,
            description: (selectedTransaction as any).description || null,
          } : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const { cleanReply, action: tagAction } = parseTagAction(data.reply);
      // Handle handoff from server - short-circuit before other processing
      if (data.handoff?.to && onTagAction) {
        setLocalMessages(m => [...m, { role: 'tag' as const, text: cleanReply }]);
        setBusy(false);
        onTagAction({ type: 'handoff', to: data.handoff.to, reason: data.handoff.reason });
        return;
      }
      setLocalMessages(m => [...m, { role: 'tag' as const, text: cleanReply }]);
      // Detect query keyword - if user asked to see transactions, fetch inline results
      // Skip client-side query detection - backend now handles search
      // via injectedTxContext (real Supabase data injected before model call)
      const queryKw = null;
      if (tagAction && onTagAction && !queryKw) onTagAction(tagAction);
      if (data.action?.action && data.action?.category) {
        onCategoryUpdated?.(); void fetchNeedsReviewCount();
      }
      if (queryKw) {
        const txs = await fetchTxResults(queryKw);
        if (txs.length > 0) {
          setLocalMessages(m => [...m, { role: 'tag' as const, text: '', txResults: txs, queryKeyword: queryKw }]);
        }
      }
    } catch {
      setLocalMessages(m => [...m, { role: 'tag' as const, text: 'Something went wrong - try again.' }]);
    }
    setBusy(false);
  };

  const fetchActivityLog = async (month?: string) => {
    setActivityLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token;
      const url = month ? `/.netlify/functions/tag-activity-log?month=${month}` : '/.netlify/functions/tag-activity-log';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.ok) { setActivityLog(data.entries || []); setActivityMonths(data.monthlySummary || []); }
    } catch { /* silent */ }
    finally { setActivityLoading(false); }
  };

  const fetchRules = async () => {
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session) return;
      const { data } = await supabase!.from('category_rules').select('id, merchant_pattern, category, subcategory, match_type, is_active, created_at, updated_at').eq('user_id', session.user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(50);
      setLearnedRules(data || []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (activeTab === 'activity') void fetchActivityLog(activityMonth || undefined);
    if (activeTab === 'rules') void fetchRules();
  }, [activeTab, activityMonth]);

  const runSmartReview = async () => {
    setSmartReviewLoading(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/.netlify/functions/tag-smart-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: '{}',
      });
      const data = await res.json();
      if (data.ok && data.issues?.length > 0) {
        const mapped = data.issues.map((i: any) => ({ ...i, ids: i.transactionIds || i.ids || [] }));
        setSmartReview({ issues: mapped, summary: `Found ${data.issueCount} issues across ${data.totalAffected} transactions` });
        setSmartReviewApproved(new Set(mapped.map((i: any) => i.id)));
      } else {
        setSmartReview({ issues: [], summary: 'No issues found - your categorizations look clean!' });
      }
    } catch { /* silent */ }
    finally { setSmartReviewLoading(false); }
  };

  const commitSmartReview = async () => {
    if (!smartReview) return;
    setSmartReviewCommitting(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token;
      const approved = smartReview.issues.filter(i => smartReviewApproved.has(i.id));
      for (const issue of approved) {
        if (issue.id.startsWith('dup-')) {
          // Duplicate fix: delete all records except the first (keepId)
          const keepId = issue.transactionIds[0];
          const toDelete = issue.transactionIds.filter((id: string) => id !== keepId);
          if (toDelete.length > 0) {
            for (const id of toDelete) {
              await supabase!.from('transactions').delete().eq('id', id).eq('user_id', session!.user.id);
            }
          }
        } else {
          await fetch('/.netlify/functions/tag-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ intent: 'commit', matchValue: issue.merchant, targetCategory: issue.suggestedCategory, matchType: 'contains', affectedIds: issue.ids }),
          });
        }
      }
      setSmartReviewDone(true);
      const totalFixed = approved.reduce((s, i) => s + i.count, 0);
      setLocalMessages(prev => [...prev, { role: 'tag' as const, text: `Done \u2713 Fixed **${totalFixed} transactions** across **${approved.length} merchants**. Rules saved \u2014 Tag will remember these for future imports.` }]);
      setSmartReview(null);
      onCategoryUpdated?.(); void fetchNeedsReviewCount();
    } catch { /* silent */ }
    finally { setSmartReviewCommitting(false); }
  };

  return (
    <>
      
      <div style={{ position:'fixed', bottom:0, right:0, top:0, width:520, background:'#0b1220', borderLeft:'1px solid rgba(34,211,153,0.15)', zIndex:71, display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:"'Plus Jakarta Sans',sans-serif", boxShadow:'-8px 0 40px rgba(0,0,0,0.5)' }}>
        {/* HEADER */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(34,211,153,0.15)', border:'1px solid rgba(34,211,153,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#22d3ee', flexShrink:0 }}>T</div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:15, fontWeight:700, color:'#e8ecf4' }}>Tag <span style={{ color:'#7b8ba5', fontWeight:400 }}>Copilot</span></span>
              {needsReviewCount !== null && needsReviewCount > 0 ? (
                <div style={{ padding:'6px 14px', borderRadius:20, background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.4)', display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#fbbf24', boxShadow:'0 0 8px rgba(251,191,36,0.8)' }} />
                  <span style={{ fontSize:13, fontWeight:800, color:'#fbbf24' }}>{needsReviewCount} to review</span>
                </div>
              ) : needsReviewCount !== null ? (
                <div style={{ padding:'4px 10px', borderRadius:20, background:'rgba(34,211,153,0.08)', border:'1px solid rgba(34,211,153,0.22)', display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:'#34d399' }} />
                  <span style={{ fontSize:10, fontWeight:600, color:'#34d399' }}>Online</span>
                </div>
              ) : null}
            </div>
            <div style={{ fontSize:11, color:'#7b8ba5' }}>Categorization assistant</div>
          </div>
          <button onClick={async () => {
            localStorage.removeItem('tag_chat_history');
            localStorage.removeItem('tag_chat_history_ts');
            setLocalMessages([]);
            setMerchantQueue([]);
            setMqIndex(0);
            // Clear Supabase page conversation
            try {
              const sb = getSupabase(); if (sb) {
                const { data: { user } } = await sb.auth.getUser();
                if (user) await sb.from('tag_conversations').delete().eq('user_id', user.id).eq('merchant_name', '__page__');
              }
            } catch { /* silent */ }
            // Re-run proactive greeting
            void fetchProactiveGreeting();
          }} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#9ba8bc', fontSize:12, display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:6 }}><Trash2 size={13} /> Clear</button>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#c8d0e0', padding:4, display:'flex' }}><X style={{ width:18, height:18 }} /></button>
        </div>
        {/* TAB BAR */}
        <div style={{ display:'flex', gap:4, padding:'8px 20px 0', borderBottom:'1px solid #1e2d4a', flexShrink:0 }}>
          {([{ id:'chat' as const, label:'\uD83D\uDCAC Chat' }, { id:'activity' as const, label:'\uD83D\uDCCB Activity' }, { id:'rules' as const, label:'\u26A1 Rules' }]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding:'7px 14px', borderRadius:'8px 8px 0 0', fontSize:12, fontWeight:600, background:activeTab === tab.id ? '#111a2e' : 'transparent', border:`1px solid ${activeTab === tab.id ? '#1e2d4a' : 'transparent'}`, borderBottom:activeTab === tab.id ? '1px solid #111a2e' : 'none', color:activeTab === tab.id ? '#22d3ee' : '#7b8ba5', cursor:'pointer', marginBottom:-1, fontFamily:'inherit' }}>{tab.label}</button>
          ))}
        </div>
        {/* G��G�� CHAT TAB G��G�� */}
        {activeTab === 'chat' && (<>
        {/* ACTIVE TRANSACTION PILL */}
        {transaction && (
          <div style={{ margin:'12px 16px 0', padding:'10px 14px', borderRadius:8, background:'rgba(34,211,153,0.06)', border:'1px solid rgba(34,211,153,0.12)', fontSize:13, color:'#c8d0e0' }}>
            <span style={{ color:'#e8ecf4', fontWeight:600 }}>{transaction.merchant_name || 'Transaction'}</span>
            {' -+ $'}{Math.abs(transaction.amount).toFixed(2)}
            {' -+ '}<span style={{ color:'#22d3ee' }}>{transaction.category || 'Uncategorized'}</span>
          </div>
        )}
        {/* MESSAGES */}
        <div ref={messagesContainerRef} style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', justifyContent:'flex-start', gap:12 }}>
          {localMessages.map((m, i) => {
            const isLastTag = m.role === 'tag' && i === lastTagIndex;
            return (
              <div key={i} style={{ display:'flex', gap:8, justifyContent: m.role==='user' ? 'flex-end' : 'flex-start', animation: isLastTag ? 'tagMsgIn 0.18s ease forwards' : 'none' }}>
              <style>{'@keyframes tagMsgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}'}</style>
                {m.role==='tag' && (
                  <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(34,211,153,0.12)', border:'1px solid rgba(34,211,153,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#22d3ee', flexShrink:0, marginTop:2 }}>T</div>
                )}
                <div style={{ maxWidth:'85%', minWidth: m.role==='user' ? 120 : undefined }}>
                  <div style={{ padding:'10px 14px', borderRadius: m.role==='user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: m.role==='user' ? 'rgba(34,211,153,0.15)' : 'rgba(255,255,255,0.04)', border:`1px solid ${m.role==='user' ? 'rgba(34,211,153,0.25)' : 'rgba(255,255,255,0.06)'}`, fontSize:15, color:'#e8ecf4', lineHeight:1.7, animation:'chatMsgIn 0.18s ease forwards', wordBreak:'break-word', overflowWrap:'break-word', whiteSpace:'pre-wrap' }}>
                    {(m.text ?? '').split('**').map((part, j) => j % 2 === 1 ? <strong key={j} style={{color:'#22d3ee'}}>{part}</strong> : <span key={j}>{part}</span>)}
                  </div>
                  {m.merchantQ && i === localMessages.length - 1 && (
                    <div style={{ marginTop:8 }}>
                      {m.merchantQ.interacAmounts && m.merchantQ.interacAmounts.length > 0 ? (
                        <>
                          <div style={{ fontSize:10, color:'#475569', marginBottom:6, fontWeight:600 }}>Categorize by amount:</div>
                          {m.merchantQ.interacAmounts.map(ia => (
                            <div key={ia.amount} style={{ display:'flex', gap:5, marginBottom:4, alignItems:'center' }}>
                              <span style={{ fontSize:11, color:'#94a3b8', width:80, flexShrink:0 }}>${ia.amount.toFixed(2)} \u00d7{ia.count}</span>
                              {['Income', 'Transfers', 'Housing'].map(cat => (
                                <button key={cat} onClick={async () => {
                                  setLocalMessages(ms => [...ms, { role:'user' as const, text: `$${ia.amount} \u2192 ${cat}` }]);
                                  await saveWithSubcategory(cat, m.merchantQ!.name, cat === 'Income' ? 'Employment' : cat === 'Transfers' ? 'e-Transfer' : 'Rent or Mortgage', { min: ia.amount - 0.01, max: ia.amount + 0.01 });
                                }} style={{ padding:'3px 9px', borderRadius:12, fontSize:10, fontWeight:600, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#cbd5e1', cursor:'pointer' }}>{cat}</button>
                              ))}
                            </div>
                          ))}
                          <div style={{ display:'flex', gap:5, marginTop:6 }}>
                            {m.merchantQ.options.map(cat => (
                              <button key={cat} onClick={() => void handleMerchantPick(cat, m.merchantQ!.name)} style={{ padding:'5px 11px', borderRadius:16, fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#cbd5e1', cursor:'pointer' }}>All \u2192 {cat}</button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                          {m.merchantQ.options.map(cat => (
                            <button key={cat} onClick={() => void handleMerchantPick(cat, m.merchantQ!.name)} style={{ padding:'5px 11px', borderRadius:16, fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#cbd5e1', cursor:'pointer' }}>{cat}</button>
                          ))}
                        </div>
                      )}
                      <button onClick={() => { setLocalMessages(ms => [...ms, { role:'tag', text:`Skipping ${m.merchantQ!.name}.` }]); const next = mqIndex + 1; setMqIndex(next); if (next < merchantQueue.length) setTimeout(() => askAboutMerchant(merchantQueue[next], next), 400); }} style={{ marginTop:4, padding:'5px 11px', borderRadius:16, fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', color:'#475569', cursor:'pointer' }}>Skip {'\u2192'}</button>
                    </div>
                  )}
                  {m.subcategoryQ && i === localMessages.length - 1 && (
                    <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:5 }}>
                      {m.subcategoryQ.options.map(sub => (
                        <button key={sub} onClick={() => void handleSubcategoryPick(sub)} style={{ padding:'5px 11px', borderRadius:16, fontSize:11, fontWeight:600, background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', color:'#22d3ee', cursor:'pointer' }}>{sub}</button>
                      ))}
                      <button onClick={() => { setPendingSubcategory(null); void saveWithSubcategory(m.subcategoryQ!.category, m.subcategoryQ!.merchantName, null); }} style={{ padding:'5px 11px', borderRadius:16, fontSize:11, fontWeight:600, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', color:'#475569', cursor:'pointer' }}>Skip {'\u2192'}</button>
                    </div>
                  )}
                  {m.followupMerchants && i === localMessages.length - 1 && (
                    <div style={{ display:'flex', gap:8, marginTop:10 }}>
                      <button onClick={() => startMerchantQueue(m.followupMerchants!)} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:700, background:'rgba(34,211,238,0.15)', border:'1px solid rgba(34,211,238,0.3)', color:'#22d3ee', cursor:'pointer' }}>Yes, let's go {'\u2192'}</button>
                      <button onClick={() => setLocalMessages(ms => [...ms, { role:'tag', text:"No problem \u2014 I'll be here. Check Activity anytime." }])} style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', color:'#475569', cursor:'pointer' }}>Later</button>
                    </div>
                  )}
                  {m.txResults && m.txResults.length > 0 && (
                    <div style={{ marginTop: m.text ? 10 : 0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                        <div style={{ height:1, flex:1, background:'rgba(34,211,238,0.15)' }} />
                        <span style={{ fontSize:10, fontWeight:700, color:'#22d3ee', letterSpacing:'0.08em', textTransform:'uppercase', whiteSpace:'nowrap' }}>
                          {m.txResults.length} result{m.txResults.length !== 1 ? 's' : ''}{m.queryKeyword ? ` \u00b7 "${m.queryKeyword}"` : ''}
                        </span>
                        <div style={{ height:1, flex:1, background:'rgba(34,211,238,0.15)' }} />
                      </div>
                      <div style={{ marginBottom:8, padding:'5px 10px', borderRadius:8, background:'rgba(34,211,238,0.06)', border:'1px solid rgba(34,211,238,0.12)', fontSize:11, color:'#94a3b8', display:'flex', justifyContent:'space-between' }}>
                        <span>Total spent</span>
                        <span style={{ color:'#e8ecf4', fontWeight:700 }}>
                          ${m.txResults.filter(t => (t as any).type !== 'income').reduce((s, t) => s + Math.abs(Number(t.amount)), 0).toFixed(2)}
                        </span>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {m.txResults.map(tx => {
                          const isEditing = editingTxId === tx.id;
                          const txDate = (tx.date || (tx as any).posted_at || '').split('T')[0];
                          return (
                            <div key={tx.id} style={{ borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', overflow:'hidden' }}>
                              <div style={{ padding:'10px 12px', display:'flex', gap:10, alignItems:'flex-start' }}>
                                <div style={{ flexShrink:0, padding:'4px 0', textAlign:'center', minWidth:58 }}>
                                  <div style={{ fontSize:13, fontWeight:800, color: (tx as any).type === 'income' ? '#4ade80' : '#f87171', lineHeight:1 }}>
                                    {(tx as any).type === 'income' ? '+' : '-'}${Math.abs(Number(tx.amount)).toFixed(2)}
                                  </div>
                                  <div style={{ fontSize:9, color:'#475569', marginTop:2 }}>{txDate}</div>
                                </div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ fontSize:12, fontWeight:700, color:'#e8ecf4', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                    {tx.merchant_name || (tx as any).description || 'Unknown'}
                                  </div>
                                  <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:3 }}>
                                    <span style={{ fontSize:9, fontWeight:700, color:'#22d3ee', background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.2)', borderRadius:6, padding:'1px 6px', whiteSpace:'nowrap' }}>
                                      {tx.category || 'Uncategorized'}
                                    </span>
                                    {(tx as any).subcategory && (
                                      <span style={{ fontSize:9, color:'#475569', whiteSpace:'nowrap' }}>{'\u00b7'} {(tx as any).subcategory}</span>
                                    )}
                                  </div>
                                </div>
                                <div style={{ display:'flex', gap:4, flexShrink:0, alignItems:'center' }}>
                                  <button
                                    onClick={() => { setEditingTxId(isEditing ? null : tx.id); setEditingCategory(tx.category || ''); }}
                                    style={{ fontSize:9, fontWeight:700, padding:'3px 7px', borderRadius:6, background: isEditing ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.05)', border:`1px solid ${isEditing ? 'rgba(34,211,238,0.4)' : 'rgba(255,255,255,0.1)'}`, color: isEditing ? '#22d3ee' : '#94a3b8', cursor:'pointer' }}
                                  >{isEditing ? 'Cancel' : 'Change'}</button>
                                  <button
                                    onClick={async () => {
                                      const merchantName = tx.merchant_name; if (!merchantName) return;
                                      try {
                                        const sb = getSupabase(); if (!sb) return;
                                        const { data: { session } } = await sb.auth.getSession(); if (!session) return;
                                        await fetch('/.netlify/functions/tag-action', { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}`}, body: JSON.stringify({ intent:'save_rule', matchValue: merchantName, targetCategory: tx.category, targetSubcategory: (tx as any).subcategory || null, matchType:'contains' }) });
                                        setLocalMessages(ms => [...ms, { role:'tag' as const, text:`\u2713 Rule saved: **${merchantName}** \u2192 **${tx.category}** from now on.` }]);
                                      } catch { setLocalMessages(ms => [...ms, { role:'tag' as const, text:'Could not save rule \u2014 try again.' }]); }
                                    }}
                                    style={{ fontSize:9, fontWeight:700, padding:'3px 7px', borderRadius:6, background:'rgba(200,166,78,0.08)', border:'1px solid rgba(200,166,78,0.2)', color:'#c8a64e', cursor:'pointer' }}
                                  >Rule {'\u2726'}</button>
                                </div>
                              </div>
                              {isEditing && (
                                <div style={{ padding:'8px 12px 10px', borderTop:'1px solid rgba(34,211,238,0.1)', background:'rgba(34,211,238,0.03)' }}>
                                  <div style={{ fontSize:9, fontWeight:700, color:'#475569', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:6 }}>Move to category</div>
                                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                                    {CANONICAL_CATEGORIES.filter(c => c !== 'Uncategorized').map(cat => (
                                      <button key={cat} onClick={async () => {
                                        try {
                                          const sb = getSupabase(); if (!sb) return;
                                          await sb.from('transactions').update({ category: cat, subcategory: null }).eq('id', tx.id);
                                          setLocalMessages(ms => ms.map(msg => msg.txResults ? { ...msg, txResults: msg.txResults.map(t => t.id === tx.id ? { ...t, category: cat, subcategory: undefined } : t) } : msg));
                                          setEditingTxId(null);
                                          setLocalMessages(ms => [...ms, { role:'tag' as const, text:`\u2713 **${tx.merchant_name}** moved to **${cat}**.` }]);
                                          onCategoryUpdated?.(); void fetchNeedsReviewCount();
                                        } catch { setLocalMessages(ms => [...ms, { role:'tag' as const, text:'Update failed \u2014 try again.' }]); }
                                      }} style={{ fontSize:9, fontWeight:600, padding:'3px 8px', borderRadius:6, background: cat === tx.category ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.04)', border:`1px solid ${cat === tx.category ? 'rgba(34,211,238,0.3)' : 'rgba(255,255,255,0.08)'}`, color: cat === tx.category ? '#22d3ee' : '#94a3b8', cursor:'pointer' }}>{cat}</button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Smart Review trigger */}
          {localMessages.length > 0 && needsReviewCount !== null && needsReviewCount > 0 && !smartReview && !smartReviewLoading && !smartReviewDone && (
            <div style={{ marginBottom: 12 }}>
              <button onClick={runSmartReview} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', fontSize: 13, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                <span style={{ fontSize: 16 }}>{'\uD83D\uDD0D'}</span>
                <div style={{ textAlign: 'left' as const }}>
                  <div>Run Smart Review</div>
                  <div style={{ fontSize: 11, fontWeight: 400, color: 'rgba(251,191,36,0.7)' }}>Tag scans all transactions for errors</div>
                </div>
              </button>
            </div>
          )}
          {smartReviewLoading && (
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, color: '#fbbf24', fontSize: 13 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(251,191,36,0.3)', borderTopColor: '#fbbf24', animation: 'spin 1s linear infinite' }} />
              Scanning your transactions...
              <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
            </div>
          )}
          {smartReview && smartReview.issues.length > 0 && !smartReviewDone && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 10, textTransform: 'uppercase' as const, letterSpacing: 1 }}>{'\uD83D\uDD0D'} Tag found {smartReview.issues.length} issues</div>
              <div style={{ fontSize: 12, color: '#7b8ba5', marginBottom: 12 }}>{smartReview.summary}</div>
              {smartReview.issues.map(issue => (
                <div key={issue.id} style={{ padding: '12px 14px', borderRadius: 12, background: smartReviewApproved.has(issue.id) ? 'rgba(34,211,153,0.06)' : smartReviewRejected.has(issue.id) ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', border: `1px solid ${smartReviewApproved.has(issue.id) ? 'rgba(34,211,153,0.2)' : smartReviewRejected.has(issue.id) ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)'}`, marginBottom: 8, opacity: smartReviewRejected.has(issue.id) ? 0.5 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e8ecf4', marginBottom: 2 }}>{issue.merchant}</div>
                      <div style={{ fontSize: 11, color: '#7b8ba5' }}>{issue.reason}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' as const }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>{issue.currentCategory}</span>
                        <span style={{ fontSize: 11, color: '#475569' }}>{'\u2192'}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(34,211,153,0.1)', border: '1px solid rgba(34,211,153,0.2)', color: '#34d399' }}>{issue.suggestedCategory}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#e8ecf4' }}>{issue.count} transactions {'\u00b7'} <span style={{ color: '#c8a64e' }}>${issue.totalAmount.toLocaleString('en-CA', { maximumFractionDigits: 0 })}</span></span>
                      </div>
                      <button onClick={() => { window.location.href = `/dashboard/transactions?search=${encodeURIComponent(issue.merchant)}`; }} style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: '#22d3ee', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' as const, fontFamily: 'inherit' }}>View transactions {'\u2192'}</button>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 8, flexShrink: 0 }}>
                      <button onClick={() => { setSmartReviewApproved(prev => { const n = new Set(prev); n.add(issue.id); return n; }); setSmartReviewRejected(prev => { const n = new Set(prev); n.delete(issue.id); return n; }); }} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: smartReviewApproved.has(issue.id) ? 'rgba(34,211,153,0.2)' : 'rgba(255,255,255,0.06)', color: smartReviewApproved.has(issue.id) ? '#34d399' : '#475569', cursor: 'pointer', fontSize: 14 }}>{'\u2713'}</button>
                      <button onClick={() => { setSmartReviewRejected(prev => { const n = new Set(prev); n.add(issue.id); return n; }); setSmartReviewApproved(prev => { const n = new Set(prev); n.delete(issue.id); return n; }); }} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: smartReviewRejected.has(issue.id) ? 'rgba(248,113,113,0.2)' : 'rgba(255,255,255,0.06)', color: smartReviewRejected.has(issue.id) ? '#f87171' : '#475569', cursor: 'pointer', fontSize: 14 }}>{'\u2717'}</button>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={commitSmartReview} disabled={smartReviewCommitting || smartReviewApproved.size === 0} style={{ flex: 1, padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg, #22d3ee, #0891b2)', border: 'none', color: '#0b1220', fontWeight: 700, fontSize: 13, cursor: smartReviewApproved.size === 0 ? 'default' : 'pointer', opacity: smartReviewApproved.size === 0 ? 0.5 : 1, fontFamily: 'inherit' }}>
                  {smartReviewCommitting ? 'Fixing...' : `Fix ${smartReviewApproved.size} issue${smartReviewApproved.size !== 1 ? 's' : ''} \u26A1`}
                </button>
                <button onClick={() => setSmartReview(null)} style={{ padding: '11px 16px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#475569', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Skip</button>
              </div>
            </div>
          )}
          {smartReview && smartReview.issues.length === 0 && (
            <div style={{ marginBottom: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(34,211,153,0.06)', border: '1px solid rgba(34,211,153,0.2)', fontSize: 13, color: '#34d399' }}>
              {'\u2713'} {smartReview.summary}
            </div>
          )}

          {busy && (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ width:26, height:26, borderRadius:'50%', background:'rgba(34,211,153,0.12)', border:'1px solid rgba(34,211,153,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#22d3ee' }}>T</div>
              <div style={{ fontSize:13, color:'#e8ecf4' }}>Thinking...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        {/* SELECTED TX CONTEXT */}
        {selectedTransaction && (
          <div style={{ padding:'8px 16px', borderTop:'1px solid rgba(34,211,238,0.15)', background:'rgba(34,211,238,0.04)', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:12 }}>{'\uD83D\uDCCC'}</span>
            <span style={{ fontSize:11, color:'#22d3ee', fontWeight:600, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {selectedTransaction.merchant_name || 'Unknown'} - ${Math.abs(selectedTransaction.amount).toFixed(2)} on {selectedTransaction.date || selectedTransaction.posted_at?.split('T')[0] || '?'}
            </span>
            <span style={{ fontSize:10, color:'#475569' }}>Say "change this to..." to recategorize</span>
          </div>
        )}
        {/* INPUT */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.06)', display:'flex', gap:8, alignItems:'flex-end', flexShrink:0 }}>
          <textarea
            rows={2}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder="Ask Tag anything..."
            style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'8px 12px', fontSize:14, color:'#e8ecf4', outline:'none', fontFamily:'inherit', resize:'none', lineHeight:1.5, minHeight:38 }}
          />
          <button
            onClick={() => void send()}
            disabled={busy || !input.trim()}
            style={{ width:38, height:38, borderRadius:10, background: busy ? 'rgba(34,211,153,0.1)' : 'rgba(34,211,153,0.2)', border:'1px solid rgba(34,211,153,0.3)', display:'flex', alignItems:'center', justifyContent:'center', cursor: busy ? 'default' : 'pointer', color:'#22d3ee', flexShrink:0 }}
          >
            <Send style={{ width:16, height:16 }} />
          </button>
        </div>
        </>)}
        {/* G��G�� ACTIVITY TAB G��G�� */}
        {activeTab === 'activity' && (
          <div style={{ flex:1, overflowY:'auto', minHeight:0, padding:'16px 20px' }}>
            <div style={{ display:'flex', gap:6, marginBottom:16, overflowX:'auto', scrollbarWidth:'none' as any }}>
              <button onClick={() => setActivityMonth('')} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:600, background:!activityMonth ? 'rgba(34,211,238,0.12)' : '#111a2e', border:`1px solid ${!activityMonth ? '#22d3ee' : '#1e2d4a'}`, color:!activityMonth ? '#22d3ee' : '#7b8ba5', cursor:'pointer', flexShrink:0, fontFamily:'inherit' }}>All time</button>
              {activityMonths.map(m => (
                <button key={m.month} onClick={() => setActivityMonth(m.month)} style={{ padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:600, background:activityMonth === m.month ? 'rgba(34,211,238,0.12)' : '#111a2e', border:`1px solid ${activityMonth === m.month ? '#22d3ee' : '#1e2d4a'}`, color:activityMonth === m.month ? '#22d3ee' : '#7b8ba5', cursor:'pointer', flexShrink:0, fontFamily:'inherit' }}>
                  {new Date(m.month + '-01').toLocaleDateString('en-CA', { month:'short', year:'numeric' })} ({m.changes})
                </button>
              ))}
            </div>
            {activityLoading && <div style={{ display:'flex', alignItems:'center', gap:10, color:'#7b8ba5', fontSize:13 }}><div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid #1e2d4a', borderTopColor:'#22d3ee', animation:'spin 1s linear infinite' }} />Loading...</div>}
            {!activityLoading && activityLog.length === 0 && <div style={{ textAlign:'center', padding:'40px 0', color:'#7b8ba5', fontSize:13 }}>No activity yet - changes by Tag will appear here.</div>}
            {!activityLoading && (() => {
              const groups: Record<string, any[]> = {};
              activityLog.forEach(log => { const d = new Date(log.created_at).toLocaleDateString('en-CA', { weekday:'long', month:'long', day:'numeric' }); if (!groups[d]) groups[d] = []; groups[d].push(log); });
              return Object.entries(groups).map(([date, logs]) => (
                <div key={date} style={{ marginBottom:20 }}>
                  <div style={{ fontSize:10, textTransform:'uppercase' as const, letterSpacing:1.4, color:'#475569', fontWeight:700, marginBottom:8 }}>{date}</div>
                  {logs.map((log: any, li: number) => (
                    <div key={log.id || li} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', borderRadius:10, background:'#111a2e', border:'1px solid #1e2d4a', marginBottom:6 }}>
                      <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, background:'rgba(34,211,238,0.12)', border:'1px solid rgba(34,211,238,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'#22d3ee' }}>T</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between' }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'#e8ecf4' }}>{log.merchant_name || 'Unknown'}</div>
                          {log.transaction_amount && <div style={{ fontSize:12, fontWeight:700, color:'#7b8ba5', flexShrink:0 }}>${Math.abs(Number(log.transaction_amount)).toFixed(2)}</div>}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4, flexWrap:'wrap' as const }}>
                          {log.previous_category && <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:'rgba(248,113,113,0.1)', color:'#f87171' }}>{log.previous_category}</span>}
                          {log.previous_category && <span style={{ fontSize:10, color:'#475569' }}>{'\u2192'}</span>}
                          <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:'rgba(34,211,153,0.1)', color:'#34d399' }}>{log.new_category}{log.new_subcategory ? ` \u00b7 ${log.new_subcategory}` : ''}</span>
                          <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:'#0b1220', border:'1px solid #1e2d4a', color:'#475569' }}>{log.change_source === 'smart_review' ? '\uD83D\uDD0D Review' : log.change_source === 'tag_rule' ? '\u26A1 Rule' : log.change_source === 'tag_chat' ? '\uD83D\uDCAC Chat' : '\u270F\uFE0F Manual'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ));
            })()}
          </div>
        )}
        {/* G��G�� RULES TAB G��G�� */}
        {activeTab === 'rules' && (
          <div style={{ flex:1, overflowY:'auto', minHeight:0, padding:'16px 20px' }}>
            <div style={{ marginBottom:14 }}>
              <button
                onClick={handleAutoFix}
                disabled={autoFixing}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:700, background:autoFixing ? 'rgba(251,146,60,0.15)' : 'rgba(251,146,60,0.08)', border:'1px solid rgba(251,146,60,0.35)', color:'#fb923c', cursor:autoFixing ? 'default' : 'pointer', fontFamily:'inherit', width:'100%', justifyContent:'center' }}
              >
                {autoFixing ? '⟳ Fixing...' : '⚡ Auto-Fix Income/Expense Errors'}
              </button>
            </div>
            {learnedRules.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 0', color:'#7b8ba5', fontSize:13 }}>No rules saved yet - Tag saves rules when you fix a merchant.</div>
            ) : learnedRules.map((rule: any) => {
              const fmtRuleDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
              const created = rule.created_at ? fmtRuleDate(rule.created_at) : null;
              const updated = rule.updated_at ? fmtRuleDate(rule.updated_at) : null;
              const dateLabel = updated && created && updated !== created
                ? `Updated ${updated}`
                : created
                ? `Added ${created}`
                : '';
              return (
                <div key={rule.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', borderRadius:10, background:'#111a2e', border:'1px solid #1e2d4a', marginBottom:6 }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(34,211,238,0.12)', border:'1px solid rgba(34,211,238,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800, color:'#22d3ee', flexShrink:0, marginTop:2 }}>{'\u26A1'}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#e8ecf4', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{rule.merchant_pattern}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                      <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:'rgba(34,211,153,0.1)', color:'#34d399' }}>{rule.category}{rule.subcategory ? ` \u00b7 ${rule.subcategory}` : ''}</span>
                      <span style={{ fontSize:9, color:'#475569' }}>{rule.match_type}</span>
                    </div>
                    {dateLabel && (
                      <div style={{ fontSize:10, color:'#475569', marginTop:4 }}>{dateLabel}</div>
                    )}
                  </div>
                </div>
              );
            })}
            <button onClick={() => window.location.href = '/dashboard/categories/rules'} style={{ marginTop:12, fontSize:12, color:'#22d3ee', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>View all rules {'\u2192'}</button>
          </div>
        )}
        {/* Guardrails footer */}
        <div style={{ padding:'6px 16px', borderTop:'1px solid rgba(255,255,255,0.04)', flexShrink:0, textAlign:'center' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, marginBottom:4 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#34d399', boxShadow:'0 0 6px rgba(52,211,153,0.5)', flexShrink:0 }} />
              <span style={{ fontSize:10, color:'#475569', letterSpacing:'0.03em' }}>Tag AI {'\u2022'} Guardrails + PII protection active</span>
            </div>
            <div style={{ fontSize:9, color:'#334155', lineHeight:1.4, maxWidth:320, margin:'0 auto' }}>Not financial, tax, or legal advice. Consult your accountant for professional guidance.</div>
          </div>
        </div>
      </div>
    </>
  );
}






