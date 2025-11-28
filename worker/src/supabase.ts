import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { logUtils } from './logging.js';

// Initialize Supabase client with service role key
// auth: { persistSession: false } ensures we don't try to persist auth state in Node.js
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      persistSession: false,
    },
  }
);

// Export supabase client for direct use in workflow
export { supabase as supabaseClient };

// Storage operations
export class SupabaseStorage {
  // Download file from Supabase Storage
  static async downloadFile(bucket: string, path: string): Promise<Buffer> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);
      
      if (error) {
        throw new Error(`Failed to download file: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No data received from storage');
      }
      
      // Convert Blob to Buffer
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      logUtils.logStorageOperation('download', bucket, path, true);
      return buffer;
    } catch (error) {
      logUtils.logStorageOperation('download', bucket, path, false);
      throw error;
    }
  }
  
  // Upload file to Supabase Storage
  static async uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    contentType: string
  ): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType,
          upsert: true,
        });
      
      if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
      
      logUtils.logStorageOperation('upload', bucket, path, true);
      return urlData.publicUrl;
    } catch (error) {
      logUtils.logStorageOperation('upload', bucket, path, false);
      throw error;
    }
  }
  
  // Delete file from Supabase Storage
  static async deleteFile(bucket: string, path: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);
      
      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
      }
      
      logUtils.logStorageOperation('delete', bucket, path, true);
    } catch (error) {
      logUtils.logStorageOperation('delete', bucket, path, false);
      throw error;
    }
  }
  
  // Get signed URL for file access
  static async getSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);
      
      if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
      }
      
      return data.signedUrl;
    } catch (error) {
      throw error;
    }
  }
}

// Database operations
export class SupabaseDatabase {
  // Demo user UUID for consistent use
  private static readonly DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';
  
  // Helper to ensure userId is UUID
  private static ensureUserId(userId: string): string {
    if (!userId || userId === 'default-user' || !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return this.DEMO_USER_ID;
    }
    return userId;
  }
  
  // Create document record (legacy - use DocumentStore instead)
  static async createDocument(documentData: {
    user_id: string;
    original_url?: string;
    redacted_url?: string;
    type: 'receipt' | 'bank_statement';
    status: 'processing' | 'completed' | 'failed';
    error?: string;
  }) {
    try {
      const finalUserId = this.ensureUserId(documentData.user_id);
      
      const { data, error } = await supabase
        .from('user_documents')
        .insert({
          user_id: finalUserId,
          original_name: documentData.original_url?.split('/').pop() || 'unknown',
          doc_type: documentData.type,
          status: documentData.status,
          error_message: documentData.error || null,
          storage_path: documentData.original_url || documentData.redacted_url || '',
          source: 'upload',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create document: ${error.message}`);
      }
      
      logUtils.logDatabaseOperation('insert', 'user_documents', 1, true);
      return data;
    } catch (error) {
      logUtils.logDatabaseOperation('insert', 'user_documents', 1, false);
      throw error;
    }
  }
  
  // Update document status (legacy - use DocumentStore instead)
  static async updateDocumentStatus(
    documentId: string,
    status: 'processing' | 'completed' | 'failed',
    error?: string
  ) {
    try {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString(),
      };
      if (error) {
        updateData.error_message = error;
      }
      
      const { data, error: dbError } = await supabase
        .from('user_documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single();
      
      if (dbError) {
        throw new Error(`Failed to update document: ${dbError.message}`);
      }
      
      logUtils.logDatabaseOperation('update', 'user_documents', 1, true);
      return data;
    } catch (error) {
      logUtils.logDatabaseOperation('update', 'user_documents', 1, false);
      throw error;
    }
  }
  
  // Batch insert transactions
  static async insertTransactions(transactions: Array<{
    document_id: string;
    user_id: string;
    txn_date: string;
    merchant: string;
    description: string;
    amount: number;
    direction: 'debit' | 'credit';
    category: string;
    subcategory?: string;
  }>) {
    try {
      if (transactions.length === 0) {
        return [];
      }
      
      // Ensure all user_ids are UUIDs
      const normalizedTransactions = transactions.map(txn => ({
        ...txn,
        user_id: this.ensureUserId(txn.user_id),
      }));
      
      const { data, error } = await supabase
        .from('transactions')
        .insert(normalizedTransactions)
        .select();
      
      if (error) {
        throw new Error(`Failed to insert transactions: ${error.message}`);
      }
      
      logUtils.logDatabaseOperation('insert', 'transactions', transactions.length, true);
      return data;
    } catch (error) {
      logUtils.logDatabaseOperation('insert', 'transactions', transactions.length, false);
      throw error;
    }
  }
  
  // Get document by ID
  static async getDocument(documentId: string) {
    try {
      const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (error) {
        throw new Error(`Failed to get document: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get transactions by document ID
  static async getTransactionsByDocument(documentId: string) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('document_id', documentId);
      
      if (error) {
        throw new Error(`Failed to get transactions: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get user's categorization rules
  static async getCategorizationRules(userId: string) {
    try {
      const finalUserId = this.ensureUserId(userId);
      
      const { data, error } = await supabase
        .from('categorization_rules')
        .select('*')
        .eq('user_id', finalUserId)
        .order('match_count', { ascending: false });
      
      if (error) {
        // Check if error is due to missing table
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('categorization_rules') || 
            errorMessage.includes('schema cache') ||
            errorMessage.includes('relation') && errorMessage.includes('does not exist') ||
            error.code === 'PGRST204' || // PostgREST table not found
            error.code === '42P01') { // PostgreSQL relation does not exist
          console.warn(`[SupabaseDatabase] Rules table not found, returning empty rules array: ${error.message}`);
          return [];
        }
        // For other errors, throw as before
        throw new Error(`Failed to get categorization rules: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      // Check if the caught error indicates missing table
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (errorMessage.includes('categorization_rules') || 
          errorMessage.includes('schema cache') ||
          errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        console.warn(`[SupabaseDatabase] Rules table not found, returning empty rules array: ${error instanceof Error ? error.message : String(error)}`);
        return [];
      }
      // Re-throw other errors
      throw error;
    }
  }
  
  // Update categorization rule match count
  static async updateRuleMatchCount(ruleId: string) {
    try {
      // First get current count
      const { data: currentRule, error: getError } = await supabase
        .from('categorization_rules')
        .select('match_count')
        .eq('id', ruleId)
        .single();
      
      // If table doesn't exist, silently skip (rules weren't available anyway)
      if (getError) {
        const errorMessage = getError.message.toLowerCase();
        if (errorMessage.includes('categorization_rules') || 
            errorMessage.includes('schema cache') ||
            errorMessage.includes('relation') && errorMessage.includes('does not exist') ||
            getError.code === 'PGRST204' ||
            getError.code === '42P01') {
          console.warn(`[SupabaseDatabase] Rules table not found, skipping match count update`);
          return;
        }
        throw new Error(`Failed to get rule for match count update: ${getError.message}`);
      }
      
      const { error } = await supabase
        .from('categorization_rules')
        .update({
          match_count: (currentRule?.match_count || 0) + 1,
          last_matched: new Date().toISOString(),
        })
        .eq('id', ruleId);
      
      if (error) {
        // If table doesn't exist during update, silently skip
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('categorization_rules') || 
            errorMessage.includes('schema cache') ||
            errorMessage.includes('relation') && errorMessage.includes('does not exist') ||
            error.code === 'PGRST204' ||
            error.code === '42P01') {
          console.warn(`[SupabaseDatabase] Rules table not found, skipping match count update`);
          return;
        }
        throw new Error(`Failed to update rule match count: ${error.message}`);
      }
    } catch (error) {
      // Check if error indicates missing table
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (errorMessage.includes('categorization_rules') || 
          errorMessage.includes('schema cache') ||
          errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        console.warn(`[SupabaseDatabase] Rules table not found, skipping match count update`);
        return;
      }
      // Re-throw other errors
      throw error;
    }
  }
  
  // Create new categorization rule
  static async createCategorizationRule(ruleData: {
    user_id: string;
    keyword: string;
    category: string;
    subcategory?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('categorization_rules')
        .insert(ruleData)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create categorization rule: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }
}




