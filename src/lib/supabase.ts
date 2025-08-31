// Initialize Supabase client
let supabase: any = null;

const initializeSupabase = async () => {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Check if environment variables are properly configured
    if (supabaseUrl && supabaseAnonKey && 
        supabaseUrl !== 'https://auth.xspensesai.com' && 
        supabaseAnonKey !== 'placeholder-key') {
      supabase = createClient(supabaseUrl, supabaseAnonKey);
      console.log("✅ Supabase initialized successfully");
    } else {
      console.warn("⚠️ Supabase not configured - using mock data");
      supabase = null; // Ensure it's null for bypass logic
    }
  } catch (error) {
    console.error("❌ Error initializing Supabase:", error);
    supabase = null; // Ensure it's null on error
  }
};

// Initialize immediately
initializeSupabase();

// Export both default and named export for compatibility
export default supabase;
export { supabase };

// Mock functions for development mode
export const getCurrentUser = async () => {
  if (!supabase) {
    return { id: 'dev-user', email: 'dev@example.com', name: 'Developer' };
  }
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getProfile = async (userId: string) => {
  if (!supabase) {
    return { 
      id: userId, 
      display_name: 'Developer Test',
      avatar_url: 'https://ui-avatars.com/api/?name=Developer+Test',
      updated_at: new Date().toISOString(),
      role: 'admin',
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
};

export const updateProfile = async (userId: string, updates: any) => {
  if (!supabase) {
    return { id: userId, ...updates };
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
};

export const uploadAvatar = async (userId: string, file: File) => {
  if (!supabase) {
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
};

export const deleteAvatar = async (userId: string) => {
  if (!supabase) {
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
  }
};

export const uploadReceipt = async (userId: string, file: File) => {
  if (!supabase) {
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
};

export const saveReceiptRecord = async (receiptData: any) => {
  if (!supabase) {
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
};

export const getReceipts = async (userId: string) => {
  if (!supabase) {
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
};

export const uploadFile = async (file: File, path: string) => {
  if (!supabase) {
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

    return data.path;
  } catch (error) {
    console.error('Error in uploadFile function:', error);
    throw error;
  }
};

export const getFileUrl = async (path: string) => {
  if (!supabase) {
    return 'https://mock-file-url.com/file.pdf';
  }
  try {
    const { data } = await supabase.storage
      .from('bank-statements')
      .createSignedUrl(path, 3600);
      
    return data?.signedUrl;
  } catch (error) {
    console.error('Error in getFileUrl function:', error);
    return null;
  }
};

export const getUploadedFiles = async () => {
  if (!supabase) {
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
};

export const saveTransaction = async (transaction: any) => {
  if (!supabase) {
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
};

export const saveTransactions = async (transactions: any[]) => {
  if (!supabase) {
    return transactions.map((t: any, i: number) => ({ id: `mock-transaction-${i}`, ...t }));
  }
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactions)
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
};

export const getTransactions = async (filters: any = {}) => {
  if (!supabase) {
    return [{ id: 'mock-transaction-id', amount: 100, type: 'Credit', category: 'Mock', date: new Date().toISOString() }];
  }
  try {
    let query = supabase
      .from('transactions')
      .select('id, date, description, amount, type, category, subcategory, file_name, receipt_url')
      .order('date', { ascending: false })
      .limit(20);
    
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
};

export const updateTransaction = async (id: string, updates: any) => {
  if (!supabase) {
    return { id, ...updates };
  }
  try {
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
};

export const deleteTransaction = async (id: string) => {
  if (!supabase) {
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
};

export const getCategories = async () => {
  if (!supabase) {
    return ['Mock Category'];
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
    
    const categories = new Set(data.map((t: any) => t.category));
    return Array.from(categories).filter(Boolean) as string[];
  } catch (error) {
    console.error('Error in getCategories function:', error);
    return [];
  }
};

export const getCategoryRules = async () => {
  if (!supabase) {
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
};

export const saveCategorizationRule = async (rule: any) => {
  if (!supabase) {
    return { id: 'mock-rule-id', ...rule };
  }
  try {
    const { data, error } = await supabase
      .from('categorization_rules')
      .upsert(rule, {
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
};