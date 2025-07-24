import { supabase } from '../../lib/supabase';
import { Transaction } from '../../types/database.types';

// OpenAI client setup
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Transaction categories
const TRANSACTION_CATEGORIES = [
  'Meals & Dining',
  'Groceries',
  'Travel & Transportation',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Education',
  'Bills & Services',
  'Home & Garden',
  'Personal Care',
  'Gifts & Donations',
  'Income',
  'Fees & Charges',
  'Investments',
  'Insurance',
  'Uncategorized'
];

interface VendorMemory {
  id?: string;
  vendor: string;
  category: string;
  user_id: string;
  created_at?: string;
  match_count?: number;
}

// Normalize vendor names for better matching
function normalizeVendor(vendor: string): string {
  return vendor
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// Extract vendor name from transaction description
function extractVendor(description: string): string {
  // Common patterns for vendor extraction
  // Remove transaction IDs, dates, and common suffixes
  let vendor = description
    .replace(/\b\d{4,}\b/g, '') // Remove long numbers (transaction IDs)
    .replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, '') // Remove dates
    .replace(/(DEBIT|CREDIT|POS|PURCHASE|PAYMENT|ONLINE)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Take first few words as vendor (usually vendor name comes first)
  const words = vendor.split(' ').filter(word => word.length > 1);
  return words.slice(0, 3).join(' ');
}

// Get vendor memory from database
async function getVendorMemory(vendor: string, userId: string): Promise<VendorMemory | null> {
  try {
    const normalizedVendor = normalizeVendor(vendor);
    
    // Check if vendor_memory table exists in Supabase
    // If not, we'll use the memory table with keyword matching
    const { data, error } = await supabase
      .from('memory')
      .select('*')
      .eq('user_id', userId)
      .eq('keyword', normalizedVendor)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') { // Not found is ok
        console.error('Error fetching vendor memory:', error);
      }
      return null;
    }
    
    return data ? {
      id: data.id,
      vendor: data.keyword,
      category: data.category,
      user_id: data.user_id
    } : null;
  } catch (error) {
    console.error('Error in getVendorMemory:', error);
    return null;
  }
}

// Save vendor memory to database
async function saveVendorMemory(vendor: string, category: string, userId: string): Promise<void> {
  try {
    const normalizedVendor = normalizeVendor(vendor);
    
    // Save to memory table (using it as vendor memory)
    const { error } = await supabase
      .from('memory')
      .upsert({
        user_id: userId,
        keyword: normalizedVendor,
        category: category,
        subcategory: null
      }, {
        onConflict: 'user_id,keyword'
      });
    
    if (error) {
      console.error('Error saving vendor memory:', error);
    } else {
      console.log(`✅ Saved vendor memory: ${vendor} -> ${category}`);
    }
  } catch (error) {
    console.error('Error in saveVendorMemory:', error);
  }
}

// Call OpenAI API to categorize transaction
async function categorizeWithOpenAI(transaction: Transaction): Promise<string> {
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API key not configured');
    return 'Uncategorized';
  }

  try {
    const prompt = `Categorize this transaction into one of these categories: ${TRANSACTION_CATEGORIES.join(', ')}.

Transaction:
- Description: ${transaction.description}
- Amount: $${Math.abs(transaction.amount)}
- Type: ${transaction.type}

Respond with ONLY the category name, nothing else.`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a financial transaction categorizer. Respond only with the category name.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      return 'Uncategorized';
    }

    const data = await response.json();
    const category = data.choices[0]?.message?.content?.trim() || 'Uncategorized';
    
    // Validate category
    if (TRANSACTION_CATEGORIES.includes(category)) {
      return category;
    } else {
      console.warn(`Invalid category from OpenAI: ${category}`);
      return 'Uncategorized';
    }
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    return 'Uncategorized';
  }
}

// Update transaction category in database
async function updateTransactionCategory(transactionId: string, category: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('transactions')
      .update({ 
        category,
        categorization_source: 'ai'
      })
      .eq('id', transactionId);
    
    if (error) {
      console.error('Error updating transaction category:', error);
    } else {
      console.log(`✅ Updated transaction ${transactionId} with category: ${category}`);
    }
  } catch (error) {
    console.error('Error in updateTransactionCategory:', error);
  }
}

// Main function to categorize uncategorized transactions
export async function categorizeUncategorizedTransactions(userId?: string): Promise<{
  processed: number;
  categorized: number;
  errors: number;
}> {
  console.log('🚀 Starting transaction categorization...');
  
  const stats = {
    processed: 0,
    categorized: 0,
    errors: 0
  };

  try {
    // Get current user if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return stats;
      }
      userId = user.id;
    }

    // Fetch uncategorized transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .or('category.is.null,category.eq.Uncategorized')
      .order('date', { ascending: false })
      .limit(100); // Process in batches

    if (error) {
      console.error('Error fetching uncategorized transactions:', error);
      return stats;
    }

    if (!transactions || transactions.length === 0) {
      console.log('No uncategorized transactions found');
      return stats;
    }

    console.log(`Found ${transactions.length} uncategorized transactions`);

    // Process each transaction
    for (const transaction of transactions) {
      stats.processed++;
      
      try {
        // Extract vendor from description
        const vendor = extractVendor(transaction.description);
        console.log(`Processing: ${transaction.description} (vendor: ${vendor})`);

        // Check vendor memory first
        const vendorMemory = await getVendorMemory(vendor, userId);
        
        let category: string;
        
        if (vendorMemory) {
          // Use stored category from memory
          category = vendorMemory.category;
          console.log(`  Found in memory: ${category}`);
        } else {
          // Call OpenAI to categorize
          console.log(`  Calling OpenAI...`);
          category = await categorizeWithOpenAI(transaction);
          
          // Save to vendor memory for future use
          if (category !== 'Uncategorized') {
            await saveVendorMemory(vendor, category, userId);
          }
        }

        // Update transaction with category
        if (category !== 'Uncategorized') {
          await updateTransactionCategory(transaction.id, category);
          stats.categorized++;
        }
        
      } catch (error) {
        console.error(`Error processing transaction ${transaction.id}:`, error);
        stats.errors++;
      }
    }

    console.log(`✨ Categorization complete:
    - Processed: ${stats.processed}
    - Categorized: ${stats.categorized}
    - Errors: ${stats.errors}`);

    return stats;
    
  } catch (error) {
    console.error('Fatal error in categorizeUncategorizedTransactions:', error);
    return stats;
  }
}

// Export individual functions for testing
export {
  normalizeVendor,
  extractVendor,
  getVendorMemory,
  saveVendorMemory,
  categorizeWithOpenAI,
  updateTransactionCategory
}; 