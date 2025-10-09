import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { logUtils } from './logging.js';

// Initialize Supabase client
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

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
  // Create document record
  static async createDocument(documentData: {
    user_id: string;
    original_url?: string;
    redacted_url?: string;
    type: 'receipt' | 'bank_statement';
    status: 'processing' | 'completed' | 'failed';
    error?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert(documentData)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create document: ${error.message}`);
      }
      
      logUtils.logDatabaseOperation('insert', 'documents', 1, true);
      return data;
    } catch (error) {
      logUtils.logDatabaseOperation('insert', 'documents', 1, false);
      throw error;
    }
  }
  
  // Update document status
  static async updateDocumentStatus(
    documentId: string,
    status: 'processing' | 'completed' | 'failed',
    error?: string
  ) {
    try {
      const updateData: any = { status };
      if (error) {
        updateData.error = error;
      }
      
      const { data, error: dbError } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single();
      
      if (dbError) {
        throw new Error(`Failed to update document: ${dbError.message}`);
      }
      
      logUtils.logDatabaseOperation('update', 'documents', 1, true);
      return data;
    } catch (error) {
      logUtils.logDatabaseOperation('update', 'documents', 1, false);
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
      
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactions)
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
        .from('documents')
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
      const { data, error } = await supabase
        .from('categorization_rules')
        .select('*')
        .eq('user_id', userId)
        .order('match_count', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to get categorization rules: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      throw error;
    }
  }
  
  // Update categorization rule match count
  static async updateRuleMatchCount(ruleId: string) {
    try {
      // First get current count
      const { data: currentRule } = await supabase
        .from('categorization_rules')
        .select('match_count')
        .eq('id', ruleId)
        .single();
      
      const { error } = await supabase
        .from('categorization_rules')
        .update({
          match_count: (currentRule?.match_count || 0) + 1,
          last_matched: new Date().toISOString(),
        })
        .eq('id', ruleId);
      
      if (error) {
        throw new Error(`Failed to update rule match count: ${error.message}`);
      }
    } catch (error) {
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




