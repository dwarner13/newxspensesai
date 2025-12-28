/**
 * Smart Import AI Conversation & Memory Service
 * Manages conversation context and document memory for Smart Import AI workspace
 */

import { supabase } from '../lib/supabase';
import { DEMO_USER_ID, getUserId } from '../constants/demoUser';

export interface SmartImportDocument {
  id: string;
  fileName: string;
  docType: 'bank_statement' | 'receipt' | 'csv' | 'generic_document';
  transactionCount: number;
  summary: string | null;
  totalDebits: number;
  totalCredits: number;
  periodStart: string | null;
  periodEnd: string | null;
  uploadedAt: string;
}

export interface ConversationContext {
  conversationId: string;
  recentDocuments: SmartImportDocument[];
  hasHistory: boolean;
}

/**
 * Map employee ID to canonical employee slug
 */
function mapEmployeeIdToSlug(employeeId: string): string {
  const mapping: Record<string, string> = {
    'prime': 'prime-boss',
    'byte': 'byte-docs',
    'crystal': 'crystal-ai',
    'tag': 'tag-ai',
    'ledger': 'ledger-tax',
    'goalie': 'goalie-coach',
    'blitz': 'blitz-debt',
  };
  return mapping[employeeId.toLowerCase()] || 'prime-boss';
}

/**
 * Get or create a Smart Import AI conversation for the user and employee
 */
export async function getOrCreateSmartImportConversation(
  userId: string,
  employeeId: string = 'prime'
): Promise<string> {
  try {
    if (!supabase) {
      console.error('[SmartImportConversation] Supabase client not available');
      const finalUserId = getUserId(userId);
      const employeeSlug = mapEmployeeIdToSlug(employeeId);
      return `temp-${finalUserId}-${employeeSlug}-${Date.now()}`;
    }
    
    // Ensure userId is UUID (use demo UUID if needed)
    const finalUserId = getUserId(userId);
    const employeeSlug = mapEmployeeIdToSlug(employeeId);
    
    // Try to find the most recent Smart Import AI conversation for this employee
    const { data: existing, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', finalUserId)
      .eq('employee_slug', employeeSlug)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && !fetchError) {
      return existing.id;
    }

    // Create new conversation/session
    const { data: newSession, error: createError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: finalUserId,
        employee_slug: employeeSlug,
        title: `Smart Import AI - ${employeeId}`,
        context: { workspace: 'smart_import_ai', employee: employeeId },
        message_count: 0,
      })
      .select('id')
      .single();

    if (createError) {
      console.error('[SmartImportConversation] Failed to create session:', createError);
      // Fallback: generate a temporary session ID
      return `temp-${finalUserId}-${employeeSlug}-${Date.now()}`;
    }

    return newSession.id;
  } catch (error) {
    console.error('[SmartImportConversation] Error getting/creating conversation:', error);
    // Fallback: generate a temporary session ID
    const finalUserId = getUserId(userId);
    const employeeSlug = mapEmployeeIdToSlug(employeeId);
    return `temp-${finalUserId}-${employeeSlug}-${Date.now()}`;
  }
}

/**
 * Load messages from a chat session
 */
export async function loadSessionMessages(sessionId: string): Promise<any[]> {
  try {
    if (!supabase) {
      console.warn('[SmartImportConversation] Supabase client not available, cannot load messages');
      return [];
    }
    
    // Try chat_messages table first (newer schema)
    const { data: chatMessages, error: chatError } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (!chatError && chatMessages) {
      return chatMessages.map(msg => ({
        id: msg.id,
        type: msg.role === 'user' ? 'user' : msg.employee_slug || 'prime',
        content: msg.content,
        timestamp: msg.created_at || msg.timestamp,
      }));
    }

    // Fallback to messages table (older schema)
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', sessionId)
      .order('created_at', { ascending: true });

    if (!messagesError && messages) {
      return messages.map(msg => ({
        id: msg.id,
        type: msg.role === 'user' ? 'user' : 'prime',
        content: msg.content,
        timestamp: msg.created_at,
      }));
    }

    return [];
  } catch (error) {
    console.error('[SmartImportConversation] Error loading messages:', error);
    return [];
  }
}

/**
 * Get recent Smart Import AI documents for a user
 */
export async function getRecentSmartImportDocuments(
  userId: string,
  limit: number = 3
): Promise<SmartImportDocument[]> {
  try {
    if (!supabase) {
      console.warn('[SmartImportConversation] Supabase client not available');
      return [];
    }
    
    const finalUserId = getUserId(userId);
    
    const { data, error } = await supabase
      .from('user_documents')
      .select('id, original_name, doc_type, transaction_count, summary, total_debits, total_credits, period_start, period_end, created_at')
      .eq('user_id', finalUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[SmartImportConversation] Failed to fetch recent documents:', error);
      return [];
    }

    return (data || []).map((doc: any) => ({
      id: doc.id,
      fileName: doc.original_name || 'Unknown',
      docType: doc.doc_type || 'generic_document',
      transactionCount: doc.transaction_count || 0,
      summary: doc.summary || null,
      totalDebits: doc.total_debits || 0,
      totalCredits: doc.total_credits || 0,
      periodStart: doc.period_start || null,
      periodEnd: doc.period_end || null,
      uploadedAt: doc.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[SmartImportConversation] Error fetching recent documents:', error);
    return [];
  }
}

/**
 * Build context message from recent documents for Prime
 */
export function buildDocumentContextMessage(documents: SmartImportDocument[]): string {
  if (documents.length === 0) {
    return '';
  }

  const docSummaries = documents.map((doc, idx) => {
    const period = doc.periodStart && doc.periodEnd
      ? ` (${doc.periodStart} to ${doc.periodEnd})`
      : '';
    return `${idx + 1}. **${doc.fileName}** – ${doc.docType} – ${doc.transactionCount} transactions${period}`;
  }).join('\n');

  return `Context: The user's most recent Smart Import AI documents:\n\n${docSummaries}\n\nUse this context when answering questions about their financial documents.`;
}

/**
 * Build welcome message from recent documents
 */
export function buildWelcomeMessage(documents: SmartImportDocument[]): string {
  if (documents.length === 0) {
    return "Welcome to Smart Import AI! I'm Prime, your AI assistant for processing financial documents.\n\nUpload a bank statement, receipt, or CSV file to get started, and I'll help you extract and categorize transactions.";
  }

  const totalTransactions = documents.reduce((sum, doc) => sum + doc.transactionCount, 0);
  const fileList = documents.map(doc => `**${doc.fileName}**`).join(' and ');

  return `Welcome back to Smart Import AI!\n\nLast time we imported ${fileList}, with a total of **${totalTransactions} transactions**.\n\nWould you like to continue analyzing those documents or upload something new?`;
}

/**
 * Save document summary as a memory for future recall
 */
export async function saveDocumentMemory(params: {
  userId: string;
  conversationId: string;
  documentId: string;
  fileName: string;
  docType: string;
  transactionCount: number;
  totalDebits: number;
  totalCredits: number;
  periodStart: string | null;
  periodEnd: string | null;
  summary: string | null;
  topCategories?: string[];
}): Promise<void> {
  try {
    const {
      userId,
      conversationId,
      documentId,
      fileName,
      docType,
      transactionCount,
      totalDebits,
      totalCredits,
      periodStart,
      periodEnd,
      summary,
      topCategories = [],
    } = params;

    // Build memory text
    const period = periodStart && periodEnd
      ? `\n- Period: ${periodStart} to ${periodEnd}`
      : '';
    const categories = topCategories.length > 0
      ? `\n- Key categories: ${topCategories.join(', ')}`
      : '';

    const memoryText = `Smart Import AI document summary:
- Type: ${docType}
- File: ${fileName}
${period}
- Transactions: ${transactionCount}
- Total spending: $${totalDebits.toFixed(2)}
- Total inflows: $${totalCredits.toFixed(2)}${categories}
${summary ? `- Summary: ${summary}` : ''}`;

    if (!supabase) {
      console.warn('[SmartImportConversation] Supabase client not available, cannot save memory');
      return;
    }
    
    // Save to user_memory_facts with workspace scope
    const { error: factError } = await supabase
      .from('user_memory_facts')
      .upsert({
        user_id: getUserId(userId),
        source: 'smart_import_ai',
        fact: memoryText,
        fact_hash: `smart_import_${documentId}`,
        confidence: 90,
        metadata: {
          workspace: 'smart_import_ai',
          conversation_id: conversationId,
          document_id: documentId,
          doc_type: docType,
        },
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,fact_hash',
      });

    if (factError) {
      console.warn('[SmartImportConversation] Failed to save document memory:', factError);
      // Non-fatal - continue
    }

    // Also save to memory_embeddings for RAG search
    try {
      if (!supabase) {
        console.warn('[SmartImportConversation] Supabase client not available, cannot save embedding');
        return;
      }
      
      // Note: In production, you'd generate an embedding here
      // For now, we'll just store the text for future embedding generation
      const { error: embedError } = await supabase
        .from('memory_embeddings')
        .insert({
          user_id: getUserId(userId),
          message_id: documentId, // Using documentId as source
          text: memoryText,
          content_redacted: memoryText, // Already redacted
          session_id: conversationId,
          metadata: {
            workspace: 'smart_import_ai',
            source_type: 'document_summary',
            document_id: documentId,
          },
          created_at: new Date().toISOString(),
        });

      if (embedError) {
        console.warn('[SmartImportConversation] Failed to save memory embedding:', embedError);
        // Non-fatal - continue
      }
    } catch (embedErr) {
      console.warn('[SmartImportConversation] Error saving memory embedding:', embedErr);
      // Non-fatal - continue
    }
  } catch (error) {
    console.error('[SmartImportConversation] Error saving document memory:', error);
    // Non-fatal - don't throw
  }
}

/**
 * Update conversation's updated_at timestamp
 */
export async function updateConversationTimestamp(conversationId: string): Promise<void> {
  try {
    if (!supabase) {
      console.warn('[SmartImportConversation] Supabase client not available, cannot update timestamp');
      return;
    }
    
    await supabase
      .from('chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  } catch (error) {
    console.warn('[SmartImportConversation] Failed to update conversation timestamp:', error);
    // Non-fatal
  }
}

