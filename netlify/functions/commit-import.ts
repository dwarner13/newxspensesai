/**
 * Commit Import Netlify Function
 * 
 * Moves transactions from transactions_staging to transactions table.
 * Links transactions to user_documents via document_id.
 * 
 * SECURITY: Uses x-user-id header for authentication (not from request body).
 * This prevents users from importing other users' staging data.
 * 
 * Flow:
 * 1. Validates importId from request body
 * 2. Gets userId from x-user-id header (secure auth)
 * 3. Verifies import exists and belongs to user
 * 4. Checks import status is 'parsed' (ready to commit)
 * 5. Reads staging rows from transactions_staging WHERE import_id = :importId AND user_id = :userId
 * 6. Maps data_json to transactions table format
 * 7. Categorizes uncategorized transactions using Tag learning
 * 8. Inserts into transactions table
 * 9. Updates imports row: status='committed', committed_at=now(), committed_count=N
 * 10. Returns success with inserted transaction count
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { safeLog } from './_shared/safeLog.js';
import { categorizeTransactionWithLearning } from './_shared/categorize.js';
import { detectAndUpsertRecurringObligations, type RecurringCandidate } from './_shared/recurringDetection.js';
import { queueUpcomingPaymentNotifications } from './_shared/chimeNotifications.js';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { importId } = body;

    // SECURITY: Get userId from header, not from client body
    // This prevents users from importing other users' staging data
    const userId = event.headers['x-user-id'] || event.headers['X-User-Id'];
    
    if (!importId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Missing importId in request body' }),
      };
    }

    if (!userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ ok: false, error: 'Unauthorized: Missing x-user-id header' }),
      };
    }

    const sb = admin();

    console.log('[CommitImport] Starting commit process', { importId, userId: userId?.substring(0, 8) + '...' });

    // 1. Get import record and verify it exists and is ready to commit
    const { data: importRecord, error: importError } = await sb
      .from('imports')
      .select('id, user_id, document_id, file_url, file_type, status, created_at')
      .eq('id', importId)
      .eq('user_id', userId)
      .maybeSingle();
    
    console.log('[CommitImport] Import record fetched', { 
      found: !!importRecord, 
      status: importRecord?.status,
      fileType: importRecord?.file_type 
    });

    if (importError) {
      console.error('[CommitImport] Error fetching import:', importError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'db_error',
          message: `Failed to fetch import: ${importError.message}` 
        }),
      };
    }

    if (!importRecord) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'no_import_found',
          message: 'Import not found for this user' 
        }),
      };
    }

    // Verify import status is 'parsed' (ready to commit)
    if (importRecord.status !== 'parsed') {
      if (importRecord.status === 'committed') {
        // Double-click protection: return 409 Conflict for already committed imports
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ 
            ok: false,
            success: false,
            error: 'already_committed',
            message: 'This import has already been committed',
            importId,
            insertedCount: 0,
            committed: 0,
          }),
        };
      }
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false,
          success: false,
          error: 'import_not_ready',
          message: `Import status is '${importRecord.status}', expected 'parsed'` 
        }),
      };
    }

    // 2. If no document_id in import, try to find/create user_documents record
    let documentId = importRecord.document_id;
    
    if (!documentId && importRecord.file_url) {
      // Try to find existing user_documents by storage_path
      const { data: existingDoc } = await sb
        .from('user_documents')
        .select('id')
        .eq('user_id', userId)
        .eq('storage_path', importRecord.file_url)
        .maybeSingle();

      if (existingDoc) {
        documentId = existingDoc.id;
        // Update import record with document_id
        await sb
          .from('imports')
          .update({ document_id: documentId })
          .eq('id', importId);
      } else {
        // Create user_documents record if it doesn't exist
        const { data: newDoc, error: docError } = await sb
          .from('user_documents')
          .insert({
            user_id: userId,
            source: 'upload',
            original_name: importRecord.file_url.split('/').pop() || 'Document',
            mime_type: importRecord.file_type || 'application/pdf',
            storage_path: importRecord.file_url,
            status: 'ready',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (!docError && newDoc) {
          documentId = newDoc.id;
          // Update import record with document_id
          await sb
            .from('imports')
            .update({ document_id: documentId })
            .eq('id', importId);
        }
      }
    }

    // 3. Read staged transactions for this import
    // SECURITY: Always filter by user_id from auth header to prevent cross-user access
    console.log('[CommitImport] Fetching staged transactions', { importId });
    const { data: stagedRows, error: stagingError } = await sb
      .from('transactions_staging')
      .select('*')
      .eq('import_id', importId)
      .eq('user_id', userId) // Critical: Use userId from auth header, not from client
      .order('parsed_at', { ascending: true });
    
    console.log('[CommitImport] Staged transactions fetched', { 
      count: stagedRows?.length || 0,
      hasError: !!stagingError 
    });

    if (stagingError) {
      console.error('[CommitImport] Error fetching staged transactions:', stagingError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: 'db_error',
          message: `Failed to fetch staged transactions: ${stagingError.message}` 
        }),
      };
    }

    if (!stagedRows || stagedRows.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          ok: true, 
          committed: 0, 
          error: 'no_transactions_in_staging',
          message: 'No staged transactions found for this import' 
        }),
      };
    }

    // 4. Transform and categorize transactions
    // Use Tag learning to categorize transactions that don't have a category yet
    console.log('[CommitImport] Transforming and categorizing transactions', { count: stagedRows.length });
    const transactionsToInsert = await Promise.all(
      stagedRows.map(async (row) => {
        const tx = row.data_json || {};
        
        // Determine transaction type (income vs expense)
        const amount = Number(tx.amount) || 0;
        const isIncome = tx.type === 'income' || 
                        tx.type === 'Credit' || 
                        tx.direction === 'in' || 
                        tx.is_credit === true ||
                        amount < 0; // Negative amounts might be credits
        
        // If transaction doesn't have a category, use Tag learning to categorize it
        let category = tx.category || tx.category_suggested;
        let confidence = tx.confidence || tx.category_confidence;
        let categorySource: string | null = null;
        
        if (!category || category === 'Uncategorized') {
          try {
            const categorizationResult = await categorizeTransactionWithLearning({
              userId: userId,
              merchant: tx.merchant || tx.vendor || tx.vendor_normalized || null,
              description: tx.description || tx.memo || tx.merchant || tx.vendor || 'Transaction',
              amount: Math.abs(amount)
            });
            
            category = categorizationResult.category;
            confidence = categorizationResult.confidence;
            categorySource = categorizationResult.source; // 'learned' or 'ai'
          } catch (error) {
            console.error('[CommitImport] Categorization error:', error);
            // Fallback to Uncategorized if categorization fails
            category = category || 'Uncategorized';
            confidence = confidence || 0.5;
          }
        }
        
        return {
          user_id: userId,
          document_id: documentId || null,
          import_id: importId,
          date: tx.date || tx.posted_at || tx.occurred_at || new Date().toISOString().split('T')[0],
          posted_at: tx.posted_at || tx.occurred_at || tx.date || new Date().toISOString(),
          amount: Math.abs(amount),
          type: isIncome ? 'income' : 'expense',
          merchant: tx.merchant || tx.vendor || tx.vendor_normalized || null,
          description: tx.description || tx.memo || tx.merchant || tx.vendor || 'Transaction',
          category: category || 'Uncategorized',
          confidence: confidence || null,
          category_source: categorySource,
          source_type: 'smart_import', // Use 'smart_import' to distinguish from manual entries
          source: 'bank_statement', // Legacy field for compatibility
          receipt_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      })
    );

    // 5. Bulk insert transactions (with conflict handling)
    // Use insert instead of upsert to prevent duplicates on double-click
    // The unique constraint on transactions table will prevent duplicates
    console.log('[CommitImport] Inserting transactions into final table', { count: transactionsToInsert.length });
    const { data: insertedTransactions, error: insertError } = await sb
      .from('transactions')
      .insert(transactionsToInsert)
      .select('id');
    
    console.log('[CommitImport] Transactions inserted', { 
      insertedCount: insertedTransactions?.length || 0,
      hasError: !!insertError,
      errorCode: insertError?.code 
    });

    if (insertError) {
      // Check if error is due to duplicate (unique constraint violation)
      // This can happen if user clicks Import All twice quickly
      const isDuplicateError = insertError.code === '23505' || 
                               insertError.message?.includes('duplicate') ||
                               insertError.message?.includes('unique constraint');
      
      if (isDuplicateError) {
        console.warn('[CommitImport] Duplicate transactions detected - import may have already been committed');
        // Check if import is already committed
        const { data: checkImport } = await sb
          .from('imports')
          .select('status, committed_count')
          .eq('id', importId)
          .eq('user_id', userId)
          .maybeSingle();
        
        if (checkImport?.status === 'committed') {
          // Import was already committed - return 409 Conflict
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({
              ok: false,
              success: false,
              error: 'already_committed',
              message: 'This import has already been committed',
              importId,
              insertedCount: checkImport.committed_count || 0,
              committed: checkImport.committed_count || 0,
            }),
          };
        }
        
        // If not committed yet, continue to update status (partial success)
        // Some transactions may have been inserted before the duplicate error
      } else {
        console.error('[CommitImport] Error inserting transactions:', insertError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            ok: false,
            success: false,
            error: 'db_error',
            message: `Failed to insert transactions: ${insertError.message}` 
          }),
        };
      }
    }

    // 6. Mark import as committed with timestamp and count
    const now = new Date().toISOString();
    const committedCount = insertedTransactions?.length || transactionsToInsert.length;
    
    console.log('[CommitImport] Updating import status to committed', { 
      importId, 
      committedCount,
      timestamp: now 
    });
    
    const { error: updateError } = await sb
      .from('imports')
      .update({ 
        status: 'committed',
        updated_at: now,
        committed_at: now,
        committed_count: committedCount,
      })
      .eq('id', importId)
      .eq('user_id', userId); // SECURITY: Always filter by user_id from auth
    
    if (updateError) {
      console.error('[CommitImport] Error updating import status:', updateError);
      // Don't fail the whole operation - transactions are already inserted
      // But log the error for debugging
    } else {
      console.log('[CommitImport] Import status updated successfully', { 
        importId, 
        status: 'committed',
        committedCount 
      });
    }

    safeLog('commit-import.success', { 
      importId, 
      userId, 
      documentId, 
      transactionCount: committedCount 
    });

    // 7. Detect recurring obligations from newly committed transactions
    // This runs synchronously but doesn't block the response
    try {
      // Fetch newly committed transactions for this import
      const { data: newTransactions, error: txError } = await sb
        .from('transactions')
        .select('id, date, posted_at, amount, merchant, description, category, type')
        .eq('import_id', importId)
        .eq('user_id', userId)
        .eq('type', 'expense') // Only expenses can be recurring obligations
        .order('date', { ascending: true });

      if (!txError && newTransactions && newTransactions.length > 0) {
        // Group transactions by merchant + category to form candidates
        const merchantGroups = new Map<string, RecurringCandidate>();

        for (const tx of newTransactions) {
          const merchant = tx.merchant || tx.description || 'Unknown';
          const category = tx.category || undefined;
          const key = `${merchant}|${category || ''}`;

          if (!merchantGroups.has(key)) {
            merchantGroups.set(key, {
              userId,
              merchantName: merchant,
              category,
              transactions: [],
            });
          }

          merchantGroups.get(key)!.transactions.push({
            id: tx.id,
            date: tx.date || tx.posted_at || new Date().toISOString(),
            amount: Math.abs(Number(tx.amount) || 0),
          });
        }

        // Convert to array and detect patterns
        const candidates = Array.from(merchantGroups.values());
        const detectionResults = await detectAndUpsertRecurringObligations(candidates);

        const obligationsCreated = detectionResults.filter(r => r.isNew).length;
        const obligationsUpdated = detectionResults.filter(r => !r.isNew).length;

        safeLog('[Chime] Recurring detection complete', {
          userId: userId.substring(0, 8) + '...',
          importId: importId.substring(0, 8) + '...',
          candidatesAnalyzed: candidates.length,
          obligationsCreated,
          obligationsUpdated,
        });

        // Queue notifications for upcoming payments (async, don't wait)
        queueUpcomingPaymentNotifications({
          userId,
          horizonDays: 14, // Look ahead 14 days
        }).catch(err => {
          // Silently fail - notification queuing is not critical
          safeLog('[Chime] Failed to queue notifications', {
            userId: userId.substring(0, 8) + '...',
            error: err?.message || String(err),
          });
        });
      }
    } catch (err: any) {
      // Silently fail - detection is not critical for import success
      safeLog('[Chime] Error in recurring detection', {
        userId: userId.substring(0, 8) + '...',
        error: err?.message || String(err),
      });
    }

    // 8. Compute summary and detect issues from committed transactions
    const { data: committedTransactions, error: summaryError } = await sb
      .from('transactions')
      .select('id, date, posted_at, amount, type, merchant, description, category')
      .eq('import_id', importId)
      .eq('user_id', userId)
      .order('posted_at', { ascending: true });

    let summary: any = null;
    let issues: any = null;

    if (!summaryError && committedTransactions && committedTransactions.length > 0) {
      console.log('[CommitImport] Computing summary and detecting issues', { 
        transactionCount: committedTransactions.length 
      });
      
      // Compute summary
      const totalTransactions = committedTransactions.length;
      let totalCredits = 0;
      let totalDebits = 0;
      let uncategorizedCount = 0;
      const categoryMap = new Map<string, { total: number; count: number }>();
      
      // Track date range
      let minDate: string | null = null;
      let maxDate: string | null = null;

      committedTransactions.forEach(tx => {
        const amount = Number(tx.amount) || 0;
        if (tx.type === 'income') {
          totalCredits += amount;
        } else {
          totalDebits += amount;
        }

        const category = tx.category || 'Uncategorized';
        if (category === 'Uncategorized' || !category) {
          uncategorizedCount++;
        }

        if (!categoryMap.has(category)) {
          categoryMap.set(category, { total: 0, count: 0 });
        }
        const catStats = categoryMap.get(category)!;
        catStats.total += amount;
        catStats.count++;
        
        // Track date range
        const txDate = tx.date || tx.posted_at || '';
        if (txDate) {
          const dateStr = txDate.split('T')[0]; // Just the date part
          if (!minDate || dateStr < minDate) minDate = dateStr;
          if (!maxDate || dateStr > maxDate) maxDate = dateStr;
        }
      });

      // Top 5 categories by total amount
      const topCategories = Array.from(categoryMap.entries())
        .map(([category, stats]) => ({
          category,
          total: Math.round(stats.total * 100) / 100,
          count: stats.count,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      summary = {
        totalTransactions,
        totalCredits: Math.round(totalCredits * 100) / 100,
        totalDebits: Math.round(totalDebits * 100) / 100,
        uncategorizedCount,
        topCategories,
        dateRange: minDate && maxDate ? {
          startDate: minDate,
          endDate: maxDate,
        } : null,
      };
      
      console.log('[CommitImport] Summary computed', {
        totalTransactions,
        totalCredits: summary.totalCredits,
        totalDebits: summary.totalDebits,
        uncategorizedCount,
        topCategoriesCount: topCategories.length,
        dateRange: summary.dateRange,
      });

      // Detect fixable issues
      const unassignedCategories: Array<{
        transactionId: string;
        merchant: string;
        amount: number;
        date: string;
      }> = [];

      const possibleDuplicates: Array<{
        transactionIds: string[];
        date: string;
        amount: number;
        description: string;
        similarity: number;
      }> = [];

      // Find unassigned categories
      committedTransactions.forEach(tx => {
        const category = tx.category || '';
        if (category === 'Uncategorized' || !category) {
          unassignedCategories.push({
            transactionId: tx.id,
            merchant: tx.merchant || 'Unknown',
            amount: Math.round((Number(tx.amount) || 0) * 100) / 100,
            date: tx.date || tx.posted_at || '',
          });
        }
      });

      // Detect possible duplicates (same date + same amount + similar description)
      // Simple heuristic: same date, same amount (within $0.01), similar description
      const duplicateMap = new Map<string, string[]>();
      committedTransactions.forEach(tx => {
        const date = tx.date || tx.posted_at || '';
        const amount = Math.round((Number(tx.amount) || 0) * 100) / 100;
        const description = (tx.description || tx.merchant || '').toLowerCase().trim();
        
        // Create a key for potential duplicates
        const dateStr = date.split('T')[0]; // Just the date part
        const key = `${dateStr}_${amount}`;
        
        if (!duplicateMap.has(key)) {
          duplicateMap.set(key, []);
        }
        duplicateMap.get(key)!.push(tx.id);
      });

      // Find groups with multiple transactions (potential duplicates)
      duplicateMap.forEach((transactionIds, key) => {
        if (transactionIds.length > 1) {
          const [dateStr, amountStr] = key.split('_');
          const sampleTx = committedTransactions.find(t => t.id === transactionIds[0]);
          
          // Calculate similarity between descriptions in the group
          const descriptions = transactionIds
            .map(id => {
              const tx = committedTransactions.find(t => t.id === id);
              return (tx?.description || tx?.merchant || '').toLowerCase().trim();
            })
            .filter(Boolean);

          // Simple similarity: if descriptions are similar (contain common words)
          let similarity = 0.5; // Default moderate similarity
          if (descriptions.length >= 2) {
            const words1 = new Set(descriptions[0].split(/\s+/));
            const words2 = new Set(descriptions[1].split(/\s+/));
            const common = [...words1].filter(w => words2.has(w)).length;
            const total = new Set([...words1, ...words2]).size;
            similarity = total > 0 ? common / total : 0.5;
          }

          possibleDuplicates.push({
            transactionIds,
            date: dateStr,
            amount: parseFloat(amountStr),
            description: sampleTx?.description || sampleTx?.merchant || 'Transaction',
            similarity: Math.round(similarity * 100) / 100,
          });
        }
      });

      issues = {
        unassignedCategories: unassignedCategories.slice(0, 10), // Limit to 10 for UI
        possibleDuplicates: possibleDuplicates.slice(0, 10), // Limit to 10 for UI
      };
      
      console.log('[CommitImport] Issues detected', {
        unassignedCategoriesCount: issues.unassignedCategories.length,
        possibleDuplicatesCount: issues.possibleDuplicates.length,
      });
    } else if (summaryError) {
      console.error('[CommitImport] Failed to compute summary', { error: summaryError.message });
    }

    // Return success response with inserted transaction details, summary, and issues
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        ok: true, // Keep for backward compatibility
        importId,
        insertedCount: committedCount,
        committed: committedCount, // Keep for backward compatibility
        documentId: documentId || null,
        transactions: insertedTransactions?.map(t => ({ id: t.id })) || [],
        message: `Successfully committed ${committedCount} transaction${committedCount !== 1 ? 's' : ''}`,
        summary: summary || undefined,
        issues: issues || undefined,
      }),
    };

  } catch (error: any) {
    console.error('[CommitImport] Unexpected error:', error);
    safeLog('commit-import.error', { error: error?.message, stack: error?.stack });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'internal_error',
        message: error?.message || 'Unknown error',
      }),
    };
  }
};


