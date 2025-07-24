import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { getDefaultStore } from 'jotai';
import { mockModeAtom, mockUserProfile } from '../utils/mockState';

// Supabase setup with better error handling
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://auth.xspensesai.com';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdXhpZ210ZHBqemt5YWZvc3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0ODM4MjQsImV4cCI6MjA2NTA1OTgyNH0.j2qETzVRu2rj1EOqxxh5caiPu-tvjYUnrRA4SU2G-_Y';

// More detailed error checking
if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY is missing from environment variables');
  console.error('Available env vars:', Object.keys(import.meta.env));
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration. Please check your environment variables.');
  console.error('Expected: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  
  // Show user-friendly error only in production
  if (import.meta.env.PROD) {
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
      <div style="
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%; 
        background: #fee2e2; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        z-index: 9999;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <div style="
          background: white; 
          padding: 2rem; 
          border-radius: 8px; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          max-width: 500px;
          text-align: center;
        ">
          <h2 style="color: #dc2626; margin-bottom: 1rem;">⚠️ Configuration Error</h2>
          <p style="color: #374151; margin-bottom: 1rem;">
            Supabase environment variables are missing. Please check the Netlify environment variables configuration.
          </p>
          <p style="color: #6b7280; font-size: 0.875rem;">
            This usually happens when environment variables aren't properly set in the deployment.
          </p>
          <div style="margin-top: 1.5rem;">
            <a href="mailto:support@xspensesai.com" style="
              background: #dc2626; 
              color: white; 
              padding: 0.5rem 1rem; 
              border-radius: 4px; 
              text-decoration: none;
              display: inline-block;
            ">Contact Support</a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(errorDiv);
  }
}

console.log('🔍 Creating Supabase client with URL:', supabaseUrl);
console.log('🔍 VITE_SUPABASE_ANON_KEY present:', !!supabaseAnonKey);

export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey || 'placeholder-key', 
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      // Set the redirect URL for authentication callbacks
      redirectTo: import.meta.env.PROD 
        ? 'https://xspensesai.com/auth/callback'
        : `${window.location.origin}/auth/callback`
    }
  }
);

const store = getDefaultStore();

// User management
export async function getCurrentUser() {
  if (store.get(mockModeAtom)) {
    return { id: 'mock-user-id', ...mockUserProfile };
  }
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Profile functions
export async function getProfile(userId: string) {
  // Check if we're in development mode with fake user
  if (import.meta.env.DEV && userId === 'dev-user-123') {
    return { 
      id: userId, 
      display_name: 'Developer Test',
      avatar_url: 'https://ui-avatars.com/api/?name=Developer+Test',
      updated_at: new Date().toISOString(),
      role: 'admin' as const,
      last_login_at: new Date().toISOString(),
      transaction_count: 157,
      total_uploaded: 12450.75,
      account_created_at: '2025-01-01T10:00:00Z',
      xp: 1250,
      level: 12,
      streak: 7,
      last_activity_date: new Date().toISOString().split('T')[0],
      email_notifications: true,
      stripe_customer_id: null,
      subscription_id: null,
      subscription_status: null,
      current_period_end: null,
      user_source: 'development',
      referrer_name: null,
      account_name: 'Development Workspace',
      time_zone: 'America/Edmonton',
      date_locale: 'en-US',
      currency: 'USD',
      tax_included: 'excluded',
      tax_system: 'default',
      commitment_level: 'committed',
      marketing_consent: true,
      accepted_ai_terms: true,
      onboarding_completed: true,
      onboarding_completed_at: '2025-01-16T00:00:00Z'
    };
  }
  
  if (store.get(mockModeAtom)) {
    return { id: userId, ...mockUserProfile };
  }
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getProfile function:', error);
    return null;
  }
}

export async function updateProfile(userId: string, updates: {
  display_name?: string;
  avatar_url?: string;
  last_login_at?: string;
}) {
  if (store.get(mockModeAtom)) {
    return { id: userId, ...mockUserProfile, ...updates };
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...updates,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in updateProfile function:', error);
    return null;
  }
}

export async function uploadAvatar(userId: string, file: File) {
  if (store.get(mockModeAtom)) {
    return 'https://ui-avatars.com/api/?name=Mock+User';
  }
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { 
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadAvatar function:', error);
    throw error;
  }
}

export async function deleteAvatar(userId: string) {
  if (store.get(mockModeAtom)) {
    return { success: true };
  }
  try {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.jpeg`]);

    if (error) {
      console.error('Error deleting avatar:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteAvatar function:', error);
    // Don't throw, just log the error
  }
}

// Receipt functions
export async function uploadReceipt(userId: string, file: File) {
  if (store.get(mockModeAtom)) {
    return { url: 'https://mock-receipt-url.com/receipt.png' };
  }
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${userId}/${timestamp}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading receipt:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('receipts')
      .getPublicUrl(fileName);

    return {
      filePath: fileName,
      publicUrl: data.publicUrl
    };
  } catch (error) {
    console.error('Error in uploadReceipt function:', error);
    throw error;
  }
}

export async function saveReceiptRecord(receiptData: {
  user_id: string;
  image_url: string;
  original_filename: string;
  processing_status?: string;
  extracted_data?: any;
}) {
  if (store.get(mockModeAtom)) {
    return { id: 'mock-receipt-id', ...receiptData };
  }
  try {
    const { data, error } = await supabase
      .from('receipts')
      .insert([receiptData])
      .select()
      .single();

    if (error) {
      console.error('Error saving receipt record:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in saveReceiptRecord function:', error);
    throw error;
  }
}

export async function getReceipts(userId: string) {
  if (store.get(mockModeAtom)) {
    return [{ id: 'mock-receipt-id', user_id: userId, image_url: 'https://mock-receipt-url.com/receipt.png', original_filename: 'mock.pdf', processing_status: 'processed', extracted_data: {} }];
  }
  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', userId)
      .order('upload_date', { ascending: false });

    if (error) {
      console.error('Error fetching receipts:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getReceipts function:', error);
    return [];
  }
}

// File storage functions
export async function uploadFile(file: File, path: string) {
  if (store.get(mockModeAtom)) {
    return { path, url: 'https://mock-file-url.com/file.pdf' };
  }
  try {
    const { data, error } = await supabase.storage
      .from('bank-statements')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      
    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }

    // Save metadata to database
    const { error: dbError } = await supabase
      .from('files')
      .insert({
        user_id: (await getCurrentUser())?.id,
        file_name: file.name,
        original_type: file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'PDF',
        file_path: path
      });

    if (dbError) {
      console.error('Error saving file metadata:', dbError);
      throw dbError;
    }
    
    return data.path;
  } catch (error) {
    console.error('Error in uploadFile function:', error);
    throw error;
  }
}

export async function getFileUrl(path: string) {
  if (store.get(mockModeAtom)) {
    return 'https://mock-file-url.com/file.pdf';
  }
  try {
    const { data } = await supabase.storage
      .from('bank-statements')
      .createSignedUrl(path, 3600); // 1 hour expiry
      
    return data?.signedUrl;
  } catch (error) {
    console.error('Error in getFileUrl function:', error);
    return null;
  }
}

export async function getUploadedFiles() {
  if (store.get(mockModeAtom)) {
    return [{ id: 'mock-file-id', file_name: 'mock.pdf', file_path: '/mock.pdf', uploaded_at: new Date().toISOString() }];
  }
  try {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .order('upload_date', { ascending: false });
      
    if (error) {
      console.error('Error listing files:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getUploadedFiles function:', error);
    return [];
  }
}

// Transaction functions
export async function saveTransaction(transaction: any) {
  if (store.get(mockModeAtom)) {
    return { id: 'mock-transaction-id', ...transaction };
  }
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select();
      
    if (error) {
      console.error('Error saving transaction:', error);
      throw error;
    }
    
    return data?.[0];
  } catch (error) {
    console.error('Error in saveTransaction function:', error);
    throw error;
  }
}

export async function saveTransactions(transactions: any[]) {
  if (store.get(mockModeAtom)) {
    return transactions.map((t, i) => ({ id: `mock-transaction-${i}`, ...t }));
  }
  try {
    // First, try to find matching rules for categorization
    const rules = await getCategoryRules();
    const user = await getCurrentUser();
    
    // Process transactions with memory rules and AI categorization
    const categorizedTransactions = await Promise.all(transactions.map(async transaction => {
      // Check memory rules first
      const matchingRule = findMatchingRule(transaction.description, rules);
      if (matchingRule) {
        // Update rule match count
        await supabase
          .from('categorization_rules')
          .update({ 
            match_count: matchingRule.match_count + 1,
            last_matched: new Date().toISOString()
          })
          .eq('id', matchingRule.id);

        return {
          ...transaction,
          category: matchingRule.category,
          subcategory: matchingRule.subcategory,
          categorization_source: 'memory'
        };
      }

      // If no memory match, use AI categorization
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/categorize`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'x-user-id': user?.id || '',
          },
          body: JSON.stringify({ description: transaction.description }),
        });

        if (!response.ok) {
          throw new Error('AI categorization failed');
        }

        const { category, subcategory } = await response.json();
        
        return {
          ...transaction,
          category,
          subcategory,
          categorization_source: 'ai'
        };
      } catch (error) {
        console.error('AI categorization error:', error);
        return {
          ...transaction,
          category: 'Uncategorized',
          subcategory: null,
          categorization_source: 'default'
        };
      }
    }));

    const { data, error } = await supabase
      .from('transactions')
      .insert(categorizedTransactions)
      .select();
      
    if (error) {
      console.error('Error saving transactions:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in saveTransactions function:', error);
    throw error;
  }
}

export async function getTransactions(filters: {
  startDate?: string;
  endDate?: string;
  category?: string;
  sourceFile?: string;
} = {}) {
  if (store.get(mockModeAtom)) {
    return [{ id: 'mock-transaction-id', amount: 100, type: 'Credit', category: 'Mock', date: new Date().toISOString() }];
  }
  try {
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      console.error('No authenticated user found');
      return [];
    }

    // Start building the query
    let query = supabase
      .from('transactions')
      .select('id, date, description, amount, type, category, subcategory, file_name, receipt_url')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(20);
    
    // Apply filters if provided
    if (filters.startDate) {
      query = query.gte('date', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.lte('date', filters.endDate);
    }
    
    if (filters.category && filters.category !== 'All') {
      query = query.eq('category', filters.category);
    }
    
    if (filters.sourceFile) {
      query = query.eq('file_name', filters.sourceFile);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getTransactions function:', error);
    return [];
  }
}

export async function updateTransaction(id: string, updates: any) {
  if (store.get(mockModeAtom)) {
    return { id, ...updates };
  }
  try {
    // If category is being updated, create a rule
    if (updates.category) {
      const { data: transaction } = await supabase
        .from('transactions')
        .select('description')
        .eq('id', id)
        .single();
        
      if (transaction) {
        await saveCategorizationRule({
          keyword: extractKeywords(transaction.description),
          category: updates.category,
          subcategory: updates.subcategory
        });
      }
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select();
      
    if (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
    
    return data?.[0];
  } catch (error) {
    console.error('Error in updateTransaction function:', error);
    throw error;
  }
}

export async function deleteTransaction(id: string) {
  if (store.get(mockModeAtom)) {
    return { success: true };
  }
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteTransaction function:', error);
    throw error;
  }
}

export async function getCategories() {
  if (store.get(mockModeAtom)) {
    return [{ id: 'mock-category-id', name: 'Mock Category' }];
  }
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('category')
      .not('category', 'is', null);
      
    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
    
    const categories = new Set(data.map(t => t.category));
    return Array.from(categories).filter(Boolean) as string[];
  } catch (error) {
    console.error('Error in getCategories function:', error);
    return [];
  }
}

// Categorization rules functions
export async function getCategoryRules() {
  if (store.get(mockModeAtom)) {
    return [{ id: 'mock-rule-id', keyword: 'mock', category: 'Mock Category' }];
  }
  try {
    const { data, error } = await supabase
      .from('categorization_rules')
      .select('*')
      .order('match_count', { ascending: false });
      
    if (error) {
      console.error('Error fetching category rules:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getCategoryRules function:', error);
    return [];
  }
}

export async function saveCategorizationRule({ keyword, category, subcategory }: {
  keyword: string;
  category: string;
  subcategory?: string;
}) {
  if (store.get(mockModeAtom)) {
    return { id: 'mock-rule-id', keyword, category, subcategory };
  }
  try {
    const { data, error } = await supabase
      .from('categorization_rules')
      .upsert({
        user_id: (await getCurrentUser())?.id,
        keyword,
        category,
        subcategory,
        match_count: 1,
        last_matched: new Date().toISOString()
      }, {
        onConflict: 'user_id,keyword',
        ignoreDuplicates: false
      })
      .select();
      
    if (error) {
      console.error('Error saving categorization rule:', error);
      throw error;
    }
    
    return data?.[0];
  } catch (error) {
    console.error('Error in saveCategorizationRule function:', error);
    throw error;
  }
}

// Helper functions
function findMatchingRule(description: string, rules: any[]) {
  const normalizedDescription = description.toLowerCase();
  return rules.find(rule => normalizedDescription.includes(rule.keyword.toLowerCase()));
}

function extractKeywords(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .slice(0, 2)
    .join(' ');
}