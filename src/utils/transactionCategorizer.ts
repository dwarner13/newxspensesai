import { supabase } from '../lib/supabase';

interface TransactionInput {
  vendor: string;
  amount: number;
  description: string;
  notes?: string;
}

interface CategoryResponse {
  category: string;
  reason: string;
  flag_for_review: boolean;
}

/**
 * Categorizes a transaction using the Supabase Edge Function
 */
export const categorizeTransaction = async (transaction: TransactionInput): Promise<CategoryResponse> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/categorize-transaction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'x-user-id': user?.id || '',
      },
      body: JSON.stringify({
        ...transaction,
        userId: user?.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to categorize transaction');
    }

    return await response.json();
  } catch (error) {
    console.error('Transaction categorization error:', error);
    
    // Fallback categorization if the service fails
    return {
      category: 'Other',
      reason: 'Categorization service unavailable. Please categorize manually.',
      flag_for_review: true
    };
  }
};

/**
 * Batch categorize multiple transactions
 */
export const categorizeBatch = async (transactions: TransactionInput[]): Promise<CategoryResponse[]> => {
  const results: CategoryResponse[] = [];
  
  // Process in batches to avoid overwhelming the service
  const batchSize = 5;
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchPromises = batch.map(transaction => categorizeTransaction(transaction));
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Handle results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // Add fallback for failed categorizations
        results.push({
          category: 'Other',
          reason: `Categorization failed: ${result.reason}`,
          flag_for_review: true});
      }
    });
    
    // Small delay between batches to avoid rate limits
    if (i + batchSize < transactions.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
};

/**
 * Test the categorization service
 */
export const testCategorizationService = async (): Promise<boolean> => {
  try {
    const testTransaction: TransactionInput = {
      vendor: 'Test Vendor',
      amount: 10.00,
      description: 'Test transaction',
      notes: 'Testing the categorization service'
    };
    
    const response = await categorizeTransaction(testTransaction);
    return !!response.category;
  } catch (error) {
    console.error('Categorization service test failed:', error);
    return false;
  }
};