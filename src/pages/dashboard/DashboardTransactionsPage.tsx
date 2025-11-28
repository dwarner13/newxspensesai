import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import MobilePageTitle from '../../components/ui/MobilePageTitle';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import DocumentViewerModal from '../../components/ui/DocumentViewerModal';
import TransactionCard from '../../components/transactions/TransactionCard';
import TransactionDetailPanel from '../../components/transactions/TransactionDetailPanel';
import type { Transaction } from '../../types/transactions';
import { VALID_CATEGORIES } from '../../orchestrator/aiEmployees';
import { useAuth } from '../../contexts/AuthContext';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { 
  FileText, 
  Search, 
  TrendingUp,
  DollarSign,
  Brain,
  X,
  AlertTriangle,
  CheckCircle,
  Mic,
  Upload,
  Plus,
  Loader2
} from 'lucide-react';

interface AIInsight {
  id: string;
  type: 'warning' | 'tip' | 'pattern' | 'prediction';
  title: string;
  description: string;
}

// Transaction type is imported from src/types/transactions.ts

/**
 * Queue category feedback for Tag AI learning
 * Sends category correction feedback to the backend so Tag can learn from user corrections
 * 
 * This function is called automatically when a user changes a transaction's category.
 * It sends the old category, new category, and transaction details to the Tag learning system.
 */
const queueCategoryFeedbackForTag = async (
  transaction: Transaction,
  newCategory: string,
  userId: string
) => {
  // Log for debugging (helpful to see in console)
  console.log('[Tag Learning] Category correction feedback:', {
    transactionId: transaction.id,
    merchant: transaction.merchant || 'N/A',
    oldCategory: transaction.category,
    newCategory: newCategory,
    timestamp: new Date().toISOString()
  });

  try {
    // Send feedback to backend Tag learning endpoint
    const response = await fetch('/.netlify/functions/tag-learn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        userId: userId,
        transactionId: transaction.id,
        merchant: transaction.merchant || null,
        description: transaction.description || null,
        oldCategory: transaction.category,
        newCategory: newCategory,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Tag Learning] Failed to save feedback:', errorData);
      // Fail silently - don't show error to user since this is background learning
      return;
    }

    const result = await response.json();
    console.log('[Tag Learning] Feedback saved successfully:', result.feedbackId);
  } catch (error) {
    console.error('[Tag Learning] Error sending feedback:', error);
    // Fail silently - don't show error to user since this is background learning
  }
};

const DashboardTransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();
  const { openChat } = useUnifiedChatLauncher();
  
  // Handlers for AI actions from detail panel
  const handleAskCrystalAboutTransaction = (tx: Transaction) => {
    // Ensure we pass a complete, clean transaction object with all required fields
    // Use the exact transaction object that's displayed in the UI
    // Ensure date is never empty - check for both null/undefined AND empty strings
    const transactionDate = (tx.date && tx.date.trim()) || new Date().toISOString().split('T')[0];
    
    navigate('/dashboard/chat/crystal', {
      state: {
        source: 'transactions-panel',
        contextType: 'single-transaction',
        from: location.pathname, // Return origin: Transactions page
        transaction: {
          id: tx.id,
          date: transactionDate,
          amount: tx.amount,
          description: tx.description || '',
          merchant: tx.merchant || null,
          category: tx.category || 'Uncategorized',
          type: tx.type, // 'income' | 'expense' - this is already correctly set from Supabase
          confidence: tx.confidence || null,
          receipt_url: tx.receipt_url || null,
        },
      },
    });
  };

  const handleAskTagAboutTransaction = (tx: Transaction) => {
    // Ensure we pass a complete, clean transaction object with all required fields
    // Ensure date is never empty - check for both null/undefined AND empty strings
    const transactionDate = (tx.date && tx.date.trim()) || new Date().toISOString().split('T')[0];
    
    navigate('/dashboard/chat/tag', {
      state: {
        source: 'transactions-panel',
        contextType: 'single-transaction',
        from: location.pathname, // Return origin: Transactions page
        transaction: {
          id: tx.id,
          date: transactionDate,
          amount: tx.amount,
          description: tx.description || '',
          merchant: tx.merchant || null,
          category: tx.category || 'Uncategorized',
          type: tx.type, // 'income' | 'expense' - this is already correctly set from Supabase
          confidence: tx.confidence || null,
          receipt_url: tx.receipt_url || null,
        },
      },
    });
  };

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'all-time' | 'this-month' | 'last-month' | 'this-year'>('all-time');
  const [viewMode, setViewMode] = useState<'all' | 'spend' | 'income' | 'docs'>('all');
  const [crystalOpen, setCrystalOpen] = useState(false);
  const [crystalInput, setCrystalInput] = useState('');
  const [crystalMessages, setCrystalMessages] = useState<Array<{type: 'user' | 'ai', text: string}>>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [newTransactionForm, setNewTransactionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    merchant: '',
    category: 'Uncategorized',
    amount: '',
    type: 'expense' as 'income' | 'expense',
  });

  // Function to fetch transactions
  const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        
        if (!supabase) {
          toast.error('Database connection not available');
          setIsLoading(false);
          return;
        }
        
        const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";
        
        // Fetch transactions from Supabase for TEST user
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', TEST_USER_ID)
          .order('posted_at', { ascending: false })
          .limit(500); // Increased from 100 to 500 to support bank statements with many transactions

        if (transactionsError) {
          console.error('Error fetching transactions:', transactionsError);
          toast.error('Failed to load transactions');
          setIsLoading(false);
          return;
        }

        // Transform Supabase data to match our Transaction interface
        const formattedTransactions: Transaction[] = (transactionsData || []).map((tx: any) => {
          // Ensure date is always populated - use date, posted_at, or created_at as fallback
          // Check for both null/undefined AND empty strings
          const transactionDate = (tx.date && tx.date.trim()) 
            || (tx.posted_at && tx.posted_at.trim()) 
            || (tx.created_at && tx.created_at.trim()) 
            || new Date().toISOString().split('T')[0];
          
          return {
            id: tx.id,
            date: transactionDate,
            description: tx.description || tx.memo || tx.merchant_name || 'Unknown',
            category: tx.category || tx.category_name || 'Uncategorized',
            amount: tx.amount,
            type: tx.type === 'income' || tx.type === 'Credit' ? 'income' : 'expense',
            merchant: tx.merchant || tx.merchant_name,
            location: tx.location,
            confidence: tx.confidence || 0.9,
            aiInsights: tx.ai_insights || [],
            receipt_url: tx.receipt_url,
            document_id: tx.document_id || null,
            source_type: tx.source_type || tx.categorization_source || null,
            notes: tx.notes || undefined
          };
        });

        setTransactions(formattedTransactions);
        setFilteredTransactions(formattedTransactions);

        // Generate AI insights based on real data
        const insights: AIInsight[] = [];
        
        if (formattedTransactions.length === 0) {
          insights.push({
            id: '1',
            type: 'tip',
            title: 'No Transactions Yet',
            description: 'Upload receipts or connect bank accounts to start tracking your finances.'
          });
        } else {
          // Analyze spending patterns
          const totalExpenses = formattedTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
          
          const totalIncome = formattedTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

          if (totalExpenses > 0) {
            insights.push({
        id: '1',
              type: 'pattern',
              title: 'Spending Analysis',
              description: `Total expenses: $${totalExpenses.toFixed(2)} across ${formattedTransactions.filter(t => t.type === 'expense').length} transactions.`
            });
          }

          if (totalIncome > 0) {
            insights.push({
        id: '2',
        type: 'tip',
              title: 'Income Tracking',
              description: `Total income: $${totalIncome.toFixed(2)}. Consider setting up automatic savings.`
            });
          }

          // Check for frequent merchants
          const merchantCounts = formattedTransactions
            .filter(t => t.merchant)
            .reduce((acc: Record<string, number>, t) => {
              acc[t.merchant!] = (acc[t.merchant!] || 0) + 1;
              return acc;
            }, {});

          const frequentMerchant = Object.entries(merchantCounts)
            .find(([_, count]) => count >= 3);

          if (frequentMerchant) {
            insights.push({
        id: '3',
        type: 'pattern',
              title: 'Frequent Merchant',
              description: `You shop at ${frequentMerchant[0]} frequently (${frequentMerchant[1]} times). Consider loyalty programs.`
            });
          }
        }

        setAiInsights(insights);
        setIsLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Set empty arrays to prevent crashes
      setTransactions([]);
      setFilteredTransactions([]);
      setAiInsights([]);
      toast.error('Failed to load transactions');
      setIsLoading(false);
    }
  };

  // Fetch transactions on component mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Listen for document upload events to refresh transactions
  useEffect(() => {
    const handleDocumentUpload = () => {
      console.log('Document uploaded, refreshing transactions...');
      fetchTransactions();
    };

    const handleTransactionsImported = () => {
      console.log('Transactions imported, refreshing transactions list...');
      fetchTransactions();
    };

    window.addEventListener('documentUploaded', handleDocumentUpload);
    window.addEventListener('transactionsImported', handleTransactionsImported);
    
    return () => {
      window.removeEventListener('documentUploaded', handleDocumentUpload);
      window.removeEventListener('transactionsImported', handleTransactionsImported);
    };
  }, []);

  // Filter transactions
  useEffect(() => {
    let filtered = transactions;

    // Apply period filter (date range)
    if (selectedPeriod !== 'all-time') {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      let startDate: Date;
      let endDate: Date = new Date();

      if (selectedPeriod === 'this-month') {
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
      } else if (selectedPeriod === 'last-month') {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59, 999);
      } else {
        // this-year
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      }

      filtered = filtered.filter(t => {
        const txDate = t.date ? new Date(t.date) : null;
        if (!txDate || isNaN(txDate.getTime())) {
          return false; // Exclude transactions with invalid dates
        }
        return txDate >= startDate && txDate <= endDate;
      });
    }

    // Apply viewMode filter
    if (viewMode === 'spend') {
      filtered = filtered.filter(t => t.type === 'expense');
    } else if (viewMode === 'income') {
      filtered = filtered.filter(t => t.type === 'income');
    } else if (viewMode === 'docs') {
      filtered = filtered.filter(t => t.document_id || t.receipt_url);
    }
    // 'all' shows everything, no filter needed

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.merchant && t.merchant.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, viewMode, selectedCategory, selectedPeriod]);

  // Compute totals from transactions
  const totals = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return { income: 0, expenses: 0, net: 0 };
    }

    return transactions.reduce(
      (acc, tx) => {
        const amount = Number(tx.amount) || 0;
        const absAmount = Math.abs(amount);
        
        // Determine if transaction is income
        // Check the formatted type field first, then fallback to raw data checks
        const isIncome = tx.type === 'income';

        if (isIncome) {
          acc.income += absAmount;
        } else {
          acc.expenses += absAmount;
        }

        acc.net = acc.income - acc.expenses;
        return acc;
      },
      { income: 0, expenses: 0, net: 0 }
    );
  }, [transactions]);

  const handleTransactionClick = async (transaction: Transaction) => {
    console.log('Transaction clicked:', transaction);
    
    // Set transaction and open panel immediately (before any async operations)
    setSelectedTransaction(transaction);
    setDetailPanelOpen(true);
    setSelectedDocument(null); // Reset document state
    
    // Scroll detail panel into view on mobile after a short delay to allow render
    setTimeout(() => {
      if (detailPanelRef.current) {
        detailPanelRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }
    }, 100);
    
    if (!supabase) {
      console.error('Supabase client not available');
      toast.error('Database connection not available');
      // Panel is already open, just return without fetching document
      return;
    }
    
    // If no document_id and no receipt_url, show panel without document
    if (!transaction.document_id && !transaction.receipt_url) {
      console.log('No document_id or receipt_url for transaction:', transaction.id);
      // Panel is already open, just return without fetching document
      return;
    }
    
    try {

      // Try to fetch associated document
      let mappedDocument: any = null;

      // 1) If this transaction came from a bank statement / PDF,
      //    it should have a document_id → look in user_documents first.
      if (transaction.document_id) {
        try {
          const { data: docData, error: docError } = await supabase
            .from('user_documents')
            .select('*')
            .eq('id', transaction.document_id)
            .maybeSingle();

          if (docError) {
            console.error('Error fetching user_document:', docError);
            // Continue to try receipts table
          } else if (docData) {
            // Map user_documents to DocumentViewerModal format
            const bucket = 'original_docs'; // Try original_docs first
            let imageUrl = null;
            
            if (docData.storage_path) {
              try {
                const { data: urlData } = supabase.storage
                  .from(bucket)
                  .getPublicUrl(docData.storage_path);
                imageUrl = urlData?.publicUrl || null;
              } catch (urlError) {
                console.warn('Failed to get public URL, trying redacted_docs:', urlError);
                // Try redacted_docs bucket as fallback
                try {
                  const { data: urlData2 } = supabase.storage
                    .from('redacted_docs')
                    .getPublicUrl(docData.storage_path);
                  imageUrl = urlData2?.publicUrl || null;
                } catch (urlError2) {
                  console.warn('Failed to get URL from redacted_docs:', urlError2);
                }
              }
            }
            
            mappedDocument = {
              id: docData.id,
              imageUrl: imageUrl || docData.storage_path || null,
              originalFilename: docData.original_name || docData.file_name || 'Document',
              extractedData: docData.extracted_data || null,
              processingStatus: docData.status || 'unknown',
              createdAt: docData.created_at,
              ocrText: docData.ocr_text || null,
              redactedText: docData.redacted_text || null,
              redactionSummary: docData.redaction_summary || null,
              ocrEngine: docData.ocr_engine || null,
              ocrConfidence: docData.ocr_confidence || null
            };
            
            setSelectedDocument(mappedDocument);
            // Panel is already open, document is set, we're done
            return;
          }
        } catch (err) {
          console.error('Exception fetching user_document:', err);
          // Continue to try receipts table
        }
      }

      // 2) If there's no document_id or it failed, try the receipts table
      //    (good for single-photo receipts).
      if (transaction.receipt_url || !transaction.document_id) {
        try {
          let receiptData = null;
          
          // Try by transaction ID first
          if (transaction.id) {
            const { data: receiptDataById, error: receiptErrorById } = await supabase
              .from('receipts')
              .select('*')
              .eq('id', transaction.id)
              .maybeSingle();

            if (receiptErrorById && receiptErrorById.code !== 'PGRST116') {
              console.error('Error fetching receipt by id:', receiptErrorById);
            } else {
              receiptData = receiptDataById;
            }
          }

          // Fallback: look up by receipt_url if we have it
          if (!receiptData && transaction.receipt_url) {
            const { data: receiptDataByUrl, error: receiptErrorByUrl } = await supabase
              .from('receipts')
              .select('*')
              .eq('image_url', transaction.receipt_url)
              .maybeSingle();

            if (receiptErrorByUrl && receiptErrorByUrl.code !== 'PGRST116') {
              console.error('Error fetching receipt by image_url:', receiptErrorByUrl);
            } else {
              receiptData = receiptDataByUrl;
            }
          }

          if (receiptData) {
            // Map receipts table to DocumentViewerModal format
            mappedDocument = {
              id: receiptData.id,
              imageUrl: receiptData.image_url || receiptData.url || null,
              originalFilename: receiptData.filename || receiptData.original_filename || 'Receipt',
              extractedData: receiptData.extracted_data || receiptData.data || null,
              processingStatus: receiptData.status || 'completed',
              createdAt: receiptData.created_at || receiptData.uploaded_at,
              ocrText: receiptData.ocr_text || null,
              ocrEngine: receiptData.ocr_engine || null,
              ocrConfidence: receiptData.confidence || null
            };
            
            setSelectedDocument(mappedDocument);
            // Panel is already open, document is set, we're done
            return;
          }
        } catch (err) {
          console.error('Exception fetching receipt:', err);
        }
      }

      // If we still don't have any linked doc, keep panel open without document
      // Panel is already open from the start of the function
      console.log('No document found for transaction:', transaction.id);
      setSelectedDocument(null);
    } catch (error) {
      console.error('Error handling transaction click:', error);
      // Don't show toast for missing documents - it's expected
      if (error instanceof Error && !error.message.includes('PGRST116')) {
        toast.error('Failed to load document');
      }
      setSelectedDocument(null);
    }
  };

  // Handle category update
  const handleUpdateCategory = async (transactionId: string, newCategory: string) => {
    if (!transactionId || !newCategory) {
      return;
    }


    try {
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";
      const userId = TEST_USER_ID;

      // Update transaction in Supabase
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ category: newCategory })
        .eq('id', transactionId)
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update category');
      }

      // Update local state - update the transaction in the transactions array
      setTransactions(prevTransactions =>
        prevTransactions.map(tx =>
          tx.id === transactionId
            ? { ...tx, category: newCategory }
            : tx
        )
      );

      // Update selectedTransaction state so the panel shows the new category
      setSelectedTransaction(prev =>
        prev && prev.id === transactionId ? { ...prev, category: newCategory } : prev
      );
      
      // Queue category feedback for Tag AI learning
      // Get the transaction BEFORE the category was updated (so we have the old category)
      const transactionBeforeUpdate = transactions.find(tx => tx.id === transactionId);
      if (transactionBeforeUpdate && userId) {
        // Call async function but don't await - let it run in background
        queueCategoryFeedbackForTag(transactionBeforeUpdate, newCategory, userId).catch(err => {
          console.error('[Tag Learning] Background feedback failed:', err);
        });
      }

      // TODO: Phase 2 - Call Tag tool directly for learning
      // When Tag tool infrastructure is available from frontend, we can call:
      // tag_update_transaction_category({
      //   transactionId: transactionId,
      //   merchantName: transactionBeforeUpdate?.merchant || null,
      //   oldCategory: transactionBeforeUpdate?.category || null,
      //   newCategory: newCategory,
      //   reason: 'Manual edit from transactions page'
      // })
      // This ensures Tag learns from every correction, not just via chat.
      
    } catch (error) {
      console.error('Error updating category:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update category';
      throw new Error(errorMessage);
    }
  };

  const handleUpdateTransaction = async (
    transactionId: string,
    updates: { description?: string; merchant?: string; category?: string; amount?: number; notes?: string }
  ) => {
    if (!transactionId || !updates) {
      return;
    }

    try {
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";
      const userId = TEST_USER_ID;

      // Prepare update payload
      const updatePayload: any = {};
      if (updates.description !== undefined) updatePayload.description = updates.description;
      if (updates.merchant !== undefined) updatePayload.merchant = updates.merchant || null;
      if (updates.category !== undefined) updatePayload.category = updates.category;
      if (updates.amount !== undefined) {
        updatePayload.amount = updates.amount;
        // Also update type based on amount sign
        updatePayload.type = updates.amount >= 0 ? 'income' : 'expense';
      }
      // Notes field is now supported in Supabase
      if (updates.notes !== undefined) updatePayload.notes = updates.notes || null;

      // Update transaction in Supabase
      const { error: updateError } = await supabase
        .from('transactions')
        .update(updatePayload)
        .eq('id', transactionId)
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(updateError.message || 'Failed to update transaction');
      }

      // Update local state
      setTransactions(prevTransactions =>
        prevTransactions.map(tx => {
          if (tx.id === transactionId) {
            return {
              ...tx,
              ...updates,
              type: updates.amount !== undefined ? (updates.amount >= 0 ? 'income' : 'expense') : tx.type,
            };
          }
          return tx;
        })
      );

      // Update selectedTransaction if it's the one being edited
      if (selectedTransaction && selectedTransaction.id === transactionId) {
        setSelectedTransaction(prev => {
          if (!prev) return null;
          return {
            ...prev,
            ...updates,
            type: updates.amount !== undefined ? (updates.amount >= 0 ? 'income' : 'expense') : prev.type,
          };
        });
      }

      toast.success('Transaction updated successfully');
    } catch (error) {
      console.error('Error updating transaction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update transaction';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleAddTransaction = async () => {
    if (isAddingTransaction) {
      return;
    }

    // Validation
    if (!newTransactionForm.description.trim()) {
      toast.error('Description is required');
      return;
    }

    const amount = parseFloat(newTransactionForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Amount must be a positive number');
      return;
    }

    if (!newTransactionForm.date) {
      toast.error('Date is required');
      return;
    }

    setIsAddingTransaction(true);

    try {
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";
      const userId = TEST_USER_ID;

      // Prepare transaction payload
      const transactionAmount = newTransactionForm.type === 'expense' ? -amount : amount;
      const transactionDate = newTransactionForm.date;

      // Insert new transaction into Supabase
      const { data: newTransaction, error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          description: newTransactionForm.description.trim(),
          merchant: newTransactionForm.merchant.trim() || null,
          category: newTransactionForm.category,
          amount: transactionAmount,
          type: newTransactionForm.type,
          date: transactionDate,
          posted_at: transactionDate,
          source_type: 'manual',
          notes: null, // Notes can be added later via edit
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message || 'Failed to create transaction');
      }

      // Transform to match Transaction interface
      const formattedTransaction: Transaction = {
        id: newTransaction.id,
        date: newTransaction.date || newTransaction.posted_at || new Date().toISOString().split('T')[0],
        description: newTransaction.description || 'Unknown',
        merchant: newTransaction.merchant || newTransaction.merchant_name || undefined,
        category: newTransaction.category || 'Uncategorized',
        amount: transactionAmount,
        type: newTransaction.type === 'income' || newTransaction.type === 'Credit' ? 'income' : 'expense',
        location: newTransaction.location,
        confidence: newTransaction.confidence,
        aiInsights: newTransaction.ai_insights || [],
        receipt_url: newTransaction.receipt_url,
        document_id: newTransaction.document_id || null,
        source_type: newTransaction.source_type || 'manual',
        notes: newTransaction.notes || undefined,
      };

      // Prepend to transactions array (newest first)
      setTransactions(prevTransactions => [formattedTransaction, ...prevTransactions]);

      // Reset form and close modal with default type based on current view mode
      setNewTransactionForm({
        date: new Date().toISOString().split('T')[0],
        description: '',
        merchant: '',
        category: 'Uncategorized',
        amount: '',
        type: viewMode === 'income' ? 'income' : viewMode === 'spend' ? 'expense' : 'expense',
      });
      setIsAddModalOpen(false);

      toast.success('Transaction added successfully');
    } catch (error) {
      console.error('Error adding transaction:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add transaction';
      toast.error(errorMessage);
    } finally {
      setIsAddingTransaction(false);
    }
  };


  const handleCrystalQuestion = (question: string) => {
    setCrystalInput(question);
    handleCrystalSubmit();
  };

  const handleQuickQuestion = (question: string) => {
    setCrystalInput(question);
    if (!crystalOpen) {
      setCrystalOpen(true);
    }
    handleCrystalSubmit();
  };

  const handleCrystalSubmit = () => {
    if (!crystalInput.trim()) return;
    
    const newMessage = { type: 'user' as const, text: crystalInput };
    setCrystalMessages(prev => [...prev, newMessage]);
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = { type: 'ai' as const, text: `I can help you analyze your transaction: "${crystalInput}". Based on your spending patterns, I recommend...` };
      setCrystalMessages(prev => [...prev, aiResponse]);
    }, 1000);
    
    setCrystalInput('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-24 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-white/70">Crystal is analyzing your transactions...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="w-full pt-24 px-4 sm:px-6 lg:px-8">
          {/* Page Title */}
          <MobilePageTitle 
            title="FinTech Entertainment Platform" 
            subtitle="Welcome back, John! Here's your financial overview"
          />
          
          {/* Header Section */}
          <div
            className="mb-8"
          >
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Main Content */}
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    {/* Page title is handled by DashboardHeader - no duplicate title here */}
                    <p className="text-white/70 mb-4">
                      View and manage your financial transactions. Click on any transaction to see the full document.
                    </p>
                  </div>
                  <button
                    onClick={() => openChat({
                      initialEmployeeSlug: 'tag-ai',
                      context: {
                        page: 'transactions',
                        filters: { period: selectedPeriod, category: selectedCategory }
                      },
                      initialQuestion: 'Help me understand and clean up my recent transactions.'
                    })}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-colors"
                  >
                    <span>🏷️</span>
                    <span className="hidden sm:inline">Ask Tag</span>
                  </button>
                </div>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {(() => {
                    // Calculate stats from real data
                    const totalTransactions = transactions.length;
                    
                    const documentIds = new Set(
                      transactions
                        .map((t) => t.document_id as string | null)
                        .filter((id) => !!id)
                    );
                    const documentCount = documentIds.size;
                    
                    const aiProcessedCount = transactions.filter((t) => {
                      const source = (t.source_type as string | null) || "";
                      // treat anything not 'manual' and not empty as AI processed
                      return source !== "" && source !== "manual";
                    }).length;
                    
                    return (
                      <>
                        <div
                          onClick={() => setViewMode('all')}
                          className={`bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm border rounded-xl p-6 cursor-pointer transition-all duration-200 ${
                            viewMode === 'all'
                              ? 'border-green-500/60 shadow-lg shadow-green-500/20'
                              : 'border-green-500/20 hover:border-green-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white/70 text-sm font-medium">Total Transactions</p>
                              <p className="text-white font-bold text-2xl mt-1">{totalTransactions}</p>
                              <p className="text-green-400 text-xs mt-1">All processed</p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                              <DollarSign className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        </div>
                        
                        <div
                          onClick={() => setViewMode('docs')}
                          className={`bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm border rounded-xl p-6 cursor-pointer transition-all duration-200 ${
                            viewMode === 'docs'
                              ? 'border-blue-500/60 shadow-lg shadow-blue-500/20'
                              : 'border-blue-500/20 hover:border-blue-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white/70 text-sm font-medium">Receipts & Documents</p>
                              <p className="text-white font-bold text-2xl mt-1">{documentCount}</p>
                              <p className="text-blue-400 text-xs mt-1">With receipts</p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        </div>
                        
                        <div
                          className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white/70 text-sm font-medium">AI Processed</p>
                              <p className="text-white font-bold text-2xl mt-1">{aiProcessedCount}</p>
                              <p className="text-purple-400 text-xs mt-1">Smart analysis</p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                              <Brain className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <p className="text-xs text-white/40 mt-2">
                  Click a card to switch views – All, Spending, Income, or Documents.
                </p>
                
                {/* Totals Bar */}
                {transactions.length > 0 && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-green-500/20 rounded-xl p-4">
                      <p className="text-white/70 text-xs font-medium mb-1">Total Income</p>
                      <p className="text-green-400 font-bold text-xl">${totals.income.toFixed(2)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 backdrop-blur-sm border border-red-500/20 rounded-xl p-4">
                      <p className="text-white/70 text-xs font-medium mb-1">Total Expenses</p>
                      <p className="text-red-400 font-bold text-xl">${totals.expenses.toFixed(2)}</p>
                    </div>
                    <div className={`bg-gradient-to-br backdrop-blur-sm border rounded-xl p-4 ${
                      totals.net >= 0 
                        ? 'from-green-500/10 to-emerald-500/10 border-green-500/20' 
                        : 'from-red-500/10 to-orange-500/10 border-red-500/20'
                    }`}>
                      <p className="text-white/70 text-xs font-medium mb-1">Net</p>
                      <p className={`font-bold text-xl ${
                        totals.net >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {totals.net >= 0 ? '+' : ''}${totals.net.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Crystal AI Sidebar */}
              <div className="lg:w-80">
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
            <div>
                      <h3 className="text-white font-semibold">Crystal AI</h3>
                      <p className="text-white/70 text-sm">Your financial assistant</p>
                    </div>
            </div>
          
                  {/* Crystal's Summary */}
                  {transactions.length > 0 && (
                    <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-400 text-sm font-medium">Crystal's Summary</span>
                      </div>
                      <p className="text-white/80 text-xs">
                        {(() => {
                          if (viewMode === 'spend') {
                            const expenses = transactions.filter(t => t.type === 'expense');
                            const totalSpending = expenses.reduce((sum, t) => sum + t.amount, 0);
                            return expenses.length === 1
                              ? "I've analyzed 1 expense for you. Click below to get detailed insights!"
                              : `I've analyzed ${expenses.length} expenses. Your total spending is $${totalSpending.toFixed(2)}.`;
                          } else if (viewMode === 'income') {
                            const income = transactions.filter(t => t.type === 'income');
                            const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
                            return income.length === 1
                              ? "I've analyzed 1 income transaction for you. Click below to get detailed insights!"
                              : `I've analyzed ${income.length} income transactions. Your total income is $${totalIncome.toFixed(2)}.`;
                          } else {
                            return transactions.length === 1 
                              ? "I've analyzed 1 transaction for you. Click below to get detailed insights!"
                              : `I've analyzed ${transactions.length} transactions. Your total spending is $${transactions.reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : 0), 0).toFixed(2)}.`;
                          }
                        })()}
                      </p>
                    </div>
                  )}
                  
                  <p className="text-white/80 text-sm mb-4">
                    Ask me anything about your transactions, spending patterns, or get insights on your financial data.
                  </p>
                  
          <button
            onClick={() => setCrystalOpen(!crystalOpen)}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200"
          >
            <Brain className="w-4 h-4" />
                    {crystalOpen ? 'Hide Chat' : 'Ask Crystal'}
            {crystalMessages.length > 0 && (
              <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {crystalMessages.length}
              </div>
            )}
          </button>
                  
                  {/* Quick Questions */}
                  <div className="mt-4 space-y-2">
                    <p className="text-white/70 text-xs font-medium">Quick Questions:</p>
                    {[
                      "What are my top spending categories?",
                      "Show me recent transactions",
                      "Analyze my spending patterns",
                      "View document summaries"
                    ].map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickQuestion(question)}
                        className="w-full text-left text-white/80 text-xs p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        </div>

        {/* Add Transaction Button */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex-1"></div>
          <button
            onClick={() => {
              setNewTransactionForm({
                date: new Date().toISOString().split('T')[0],
                description: '',
                merchant: '',
                category: 'Uncategorized',
                amount: '',
                type: viewMode === 'income' ? 'income' : viewMode === 'spend' ? 'expense' : 'expense',
              });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-green-500/30"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </button>
        </div>

        {/* Period Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-white/70 mb-2">Period</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedPeriod('all-time')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPeriod === 'all-time'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setSelectedPeriod('this-month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPeriod === 'this-month'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setSelectedPeriod('last-month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPeriod === 'last-month'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setSelectedPeriod('this-year')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPeriod === 'this-year'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              This Year
            </button>
          </div>
        </div>

        {/* View Mode Cards */}
        <div className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setViewMode('all')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                viewMode === 'all'
                  ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/50 ring-2 ring-purple-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-left">
                <p className={`text-sm font-medium ${viewMode === 'all' ? 'text-white' : 'text-white/70'}`}>
                  All
                </p>
                <p className="text-xs text-white/50 mt-1">{transactions.length} transactions</p>
              </div>
            </button>

            <button
              onClick={() => setViewMode('spend')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                viewMode === 'spend'
                  ? 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/50 ring-2 ring-red-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-left">
                <p className={`text-sm font-medium ${viewMode === 'spend' ? 'text-white' : 'text-white/70'}`}>
                  Spending
                </p>
                <p className="text-xs text-white/50 mt-1">
                  {transactions.filter(t => t.type === 'expense').length} expenses
                </p>
              </div>
            </button>

            <button
              onClick={() => setViewMode('income')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                viewMode === 'income'
                  ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50 ring-2 ring-green-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-left">
                <p className={`text-sm font-medium ${viewMode === 'income' ? 'text-white' : 'text-white/70'}`}>
                  Income
                </p>
                <p className="text-xs text-white/50 mt-1">
                  {transactions.filter(t => t.type === 'income').length} credits
                </p>
              </div>
            </button>

            <button
              onClick={() => setViewMode('docs')}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                viewMode === 'docs'
                  ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/50 ring-2 ring-blue-500/30'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="text-left">
                <p className={`text-sm font-medium ${viewMode === 'docs' ? 'text-white' : 'text-white/70'}`}>
                  Receipts
                </p>
                <p className="text-xs text-white/50 mt-1">
                  {transactions.filter(t => t.document_id || t.receipt_url).length} documents
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Search and Actions Bar */}
        <div
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="flex-shrink-0">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-48 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '40px'
                }}
              >
                <option value="" className="bg-slate-800 text-white">All Categories</option>
                {Array.from(new Set(transactions.map(t => t.category).filter(Boolean))).sort().map((category) => (
                  <option key={category} value={category} className="bg-slate-800 text-white">
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Add Transaction Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-200 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Transaction
            </button>

            {/* Quick Upload Button */}
            <button
              onClick={() => navigate('/dashboard/smart-import-ai')}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-200 whitespace-nowrap"
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          </div>
        </div>

        {/* Transactions Header */}
        <div
          className="mb-6"
        >
          <h2 className="text-xl font-semibold text-white mb-4">
            Your Transactions ({filteredTransactions.length})
          </h2>
          
          {/* Empty State */}
          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-white/80 text-xl mb-3">No transactions yet</h3>
              <p className="text-white/60 text-sm mb-6 max-w-md mx-auto">
                Upload your first document to get started with AI-powered transaction analysis and insights
              </p>
              <button
                onClick={() => navigate('/dashboard/smart-import-ai')}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-4 rounded-xl flex items-center gap-3 mx-auto transition-all duration-200 text-lg font-semibold"
              >
                <Upload className="w-5 h-5" />
                Upload Your First Document
              </button>
            </div>
          )}
        </div>

        {/* AI Insights Section */}
        {aiInsights.length > 0 && (
        <div
            className="mb-6"
          >
            <h2 className="text-lg font-semibold text-white mb-3">AI Insights</h2>
            <div className="grid gap-3">
              {aiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    insight.type === 'warning'
                      ? 'bg-red-500/10 border-red-500 text-red-200'
                      : insight.type === 'tip'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-200'
                      : insight.type === 'pattern'
                      ? 'bg-green-500/10 border-green-500 text-green-200'
                      : 'bg-purple-500/10 border-purple-500 text-purple-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {insight.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                      {insight.type === 'tip' && <CheckCircle className="w-5 h-5" />}
                      {insight.type === 'pattern' && <TrendingUp className="w-5 h-5" />}
                      {insight.type === 'prediction' && <Brain className="w-5 h-5" />}
          </div>
              <div>
                      <h3 className="font-semibold mb-1">{insight.title}</h3>
                      <p className="text-sm opacity-90">{insight.description}</p>
              </div>
            </div>
          </div>
              ))}
          </div>
        </div>
        )}

        {/* Transactions List with Detail Panel */}
        {filteredTransactions.length > 0 && (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left: Transaction List */}
            <div className={`space-y-4 ${detailPanelOpen ? 'lg:w-2/3' : 'w-full'}`}>
              {filteredTransactions.map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => handleTransactionClick(tx)}
                  className="w-full text-left focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded-xl transition-all"
                  aria-label={`View details for ${tx.description}`}
                >
                  <TransactionCard
                    transaction={tx}
                    isSelected={selectedTransaction?.id === tx.id}
                  />
                </button>
              ))}
            </div>

            {/* Right: Detail Panel */}
            {detailPanelOpen && selectedTransaction && (
              <div 
                ref={detailPanelRef}
                className="lg:w-1/3 w-full lg:sticky lg:top-24 lg:self-start"
              >
                <TransactionDetailPanel
                  transaction={selectedTransaction}
                  onClose={() => {
                    setDetailPanelOpen(false);
                    setSelectedTransaction(null);
                    setSelectedDocument(null);
                  }}
                  onUpdateCategory={handleUpdateCategory}
                  onUpdateTransaction={handleUpdateTransaction}
                  onViewDocument={() => setDocumentViewerOpen(true)}
                  hasDocument={!!selectedDocument}
                  selectedDocument={selectedDocument}
                  onAskCrystal={() => handleAskCrystalAboutTransaction(selectedTransaction)}
                  onAskTag={() => handleAskTagAboutTransaction(selectedTransaction)}
                />
              </div>
            )}
          </div>
        )}

        {/* Crystal AI Assistant Modal */}
        
          {crystalOpen && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setCrystalOpen(false)}
            >
              <div
                className="bg-gradient-to-br from-purple-900 to-pink-900 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Crystal AI</h3>
                      <p className="text-sm text-white/70">Your financial assistant</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCrystalOpen(false)}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Document Previews */}
                  {transactions.filter(t => t.receipt_url).length > 0 && (
                    <div className="bg-white/10 rounded-lg p-4">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Your Documents ({transactions.filter(t => t.receipt_url).length})
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {transactions.filter(t => t.receipt_url).slice(0, 3).map((transaction) => (
                          <div key={transaction.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                              <FileText className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{transaction.description}</p>
                              <p className="text-white/60 text-xs">${transaction.amount.toFixed(2)} • {transaction.date}</p>
                            </div>
                            <button
                              onClick={() => handleTransactionClick(transaction)}
                              className="text-blue-400 hover:text-blue-300 text-xs"
                            >
                              View
                            </button>
                          </div>
                        ))}
                        {transactions.filter(t => t.receipt_url).length > 3 && (
                          <p className="text-white/60 text-xs text-center">
                            +{transactions.filter(t => t.receipt_url).length - 3} more documents
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-2">Quick Questions</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleCrystalQuestion("What are my biggest expenses this month?")}
                        className="w-full text-left text-sm text-white/80 hover:text-white hover:bg-white/10 p-2 rounded transition-colors"
                      >
                        What are my biggest expenses this month?
                      </button>
                      <button
                        onClick={() => handleCrystalQuestion("Show me my spending patterns")}
                        className="w-full text-left text-sm text-white/80 hover:text-white hover:bg-white/10 p-2 rounded transition-colors"
                      >
                        Show me my spending patterns
                      </button>
                      <button
                        onClick={() => handleCrystalQuestion("Analyze my uploaded documents")}
                        className="w-full text-left text-sm text-white/80 hover:text-white hover:bg-white/10 p-2 rounded transition-colors"
                      >
                        Analyze my uploaded documents
                      </button>
                      <button
                        onClick={() => handleCrystalQuestion("How can I save more money?")}
                        className="w-full text-left text-sm text-white/80 hover:text-white hover:bg-white/10 p-2 rounded transition-colors"
                      >
                        How can I save more money?
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <h4 className="font-semibold text-white mb-2">Conversation</h4>
                    {crystalMessages.length === 0 ? (
                      <p className="text-sm text-white/70">Ask me anything about your finances!</p>
                    ) : (
                      <div className="space-y-2">
                        {crystalMessages.map((message, index) => (
                          <div key={index} className={`p-2 rounded ${
                            message.type === 'user' 
                              ? 'bg-blue-500/20 text-blue-200' 
                              : 'bg-white/10 text-white'
                          }`}>
                            <p className="text-sm">{message.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={crystalInput}
                      onChange={(e) => setCrystalInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCrystalSubmit()}
                      placeholder="Ask Crystal anything..."
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={handleCrystalSubmit}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg transition-all duration-200"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        
    </div>
    
    {/* Document Viewer Modal */}
    {selectedDocument && (
      <DocumentViewerModal
        isOpen={documentViewerOpen}
        onClose={() => setDocumentViewerOpen(false)}
        documentData={selectedDocument}
      />
    )}

    {/* Add Transaction Modal */}
    {isAddModalOpen && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Add Transaction</h2>
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                setNewTransactionForm({
                  date: new Date().toISOString().split('T')[0],
                  description: '',
                  merchant: '',
                  category: 'Uncategorized',
                  amount: '',
                  type: viewMode === 'income' ? 'income' : viewMode === 'spend' ? 'expense' : 'expense',
                });
              }}
              className="text-white/60 hover:text-white transition-colors"
              disabled={isAddingTransaction}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Date</label>
              <input
                type="date"
                value={newTransactionForm.date}
                onChange={(e) => setNewTransactionForm({ ...newTransactionForm, date: e.target.value })}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isAddingTransaction}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Description</label>
              <input
                type="text"
                value={newTransactionForm.description}
                onChange={(e) => setNewTransactionForm({ ...newTransactionForm, description: e.target.value })}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter transaction description"
                disabled={isAddingTransaction}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Merchant (optional)</label>
              <input
                type="text"
                value={newTransactionForm.merchant}
                onChange={(e) => setNewTransactionForm({ ...newTransactionForm, merchant: e.target.value })}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Merchant name"
                disabled={isAddingTransaction}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Type</label>
              <select
                value={newTransactionForm.type}
                onChange={(e) => setNewTransactionForm({ ...newTransactionForm, type: e.target.value as 'income' | 'expense' })}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isAddingTransaction}
              >
                <option value="expense" className="bg-slate-800 text-white">Expense</option>
                <option value="income" className="bg-slate-800 text-white">Income</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Category</label>
              <select
                value={newTransactionForm.category}
                onChange={(e) => setNewTransactionForm({ ...newTransactionForm, category: e.target.value })}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isAddingTransaction}
              >
                {VALID_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-slate-800 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newTransactionForm.amount}
                onChange={(e) => setNewTransactionForm({ ...newTransactionForm, amount: e.target.value })}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0.00"
                disabled={isAddingTransaction}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAddTransaction}
                disabled={isAddingTransaction}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingTransaction ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Transaction
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setNewTransactionForm({
                    date: new Date().toISOString().split('T')[0],
                    description: '',
                    merchant: '',
                    category: 'Uncategorized',
                    amount: '',
                    type: viewMode === 'income' ? 'income' : viewMode === 'spend' ? 'expense' : 'expense',
                  });
                }}
                disabled={isAddingTransaction}
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white py-3 rounded-lg font-medium hover:bg-white/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
};

export default DashboardTransactionsPage;