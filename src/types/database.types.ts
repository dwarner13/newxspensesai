export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, 'id' | 'created_at'>;
        Update: Partial<Omit<Transaction, 'id' | 'created_at'>>;
      };
      categorization_rules: {
        Row: CategorizationRule;
        Insert: Omit<CategorizationRule, 'id' | 'created_at'>;
        Update: Partial<Omit<CategorizationRule, 'id' | 'created_at'>>;
      };
      memory: {
        Row: Memory;
        Insert: Omit<Memory, 'id'>;
        Update: Partial<Omit<Memory, 'id'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'updated_at'>;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      files: {
        Row: UploadedFile;
        Insert: Omit<UploadedFile, 'id' | 'upload_date'>;
        Update: Partial<Omit<UploadedFile, 'id' | 'upload_date'>>;
      };
      exports: {
        Row: ExportRecord;
        Insert: Omit<ExportRecord, 'id' | 'export_date'>;
        Update: Partial<Omit<ExportRecord, 'id' | 'export_date'>>;
      };
      receipts: {
        Row: Receipt;
        Insert: Omit<Receipt, 'id' | 'created_at'>;
        Update: Partial<Omit<Receipt, 'id' | 'created_at'>>;
      };
      recurring_obligations: {
        Row: RecurringObligation;
        Insert: Omit<RecurringObligation, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<RecurringObligation, 'id' | 'user_id' | 'created_at'>>;
      };
      user_tasks: {
        Row: UserTask;
        Insert: Omit<UserTask, 'id' | 'created_at' | 'updated_at' | 'completed_at'>;
        Update: Partial<Omit<UserTask, 'id' | 'user_id' | 'created_at'>>;
      };
      tool_executions: {
        Row: ToolExecutionRecord;
        Insert: Omit<ToolExecutionRecord, 'id' | 'created_at'>;
        Update: Partial<Omit<ToolExecutionRecord, 'id' | 'user_id' | 'created_at'>>;
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
  };
}

export interface Transaction {
  id: string;
  created_at: string;
  user_id: string;
  date: string;
  description: string;
  amount: number;
  type: 'Credit' | 'Debit';
  category: string;
  subcategory: string | null;
  file_name: string;
  hash_id: string;
  categorization_source?: 'memory' | 'ai' | 'default' | 'manual';
  receipt_url?: string | null; // New field for linking to receipt images/PDFs
  notes?: string | null; // User-added notes for the transaction
}

export interface CategorizationRule {
  id: string;
  created_at: string;
  user_id: string;
  keyword: string;
  category: string;
  subcategory: string | null;
  match_count: number;
  last_matched: string | null;
}

export interface Memory {
  id: string;
  user_id: string;
  keyword: string;
  category: string;
  subcategory: string | null;
}

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  updated_at: string;
  role: 'free' | 'premium' | 'admin';
  last_login_at: string | null;
  transaction_count: number;
  total_uploaded: number;
  account_created_at: string;
  xp: number;
  level: number;
  streak: number;
  last_activity_date: string | null;
  email_notifications: boolean;
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  // Onboarding fields
  user_source: string | null;
  referrer_name: string | null;
  account_name: string | null;
  time_zone: string | null;
  date_locale: string | null;
  currency: string | null;
  tax_included: string | null;
  tax_system: string | null;
  commitment_level: string | null;
  marketing_consent: boolean | null;
  accepted_ai_terms: boolean | null;
  onboarding_completed: boolean | null;
  onboarding_completed_at: string | null;
}

export interface UploadedFile {
  id: string;
  user_id: string;
  file_name: string;
  upload_date: string;
  original_type: 'CSV' | 'PDF';
  file_path: string;
}

export interface ExportRecord {
  id: string;
  user_id: string;
  export_type: string;
  file_url: string | null;
  export_date: string;
}

export interface Receipt {
  id: string;
  user_id: string;
  image_url: string;
  original_filename: string;
  upload_date: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_data: any;
  transaction_id: string | null;
  created_at: string;
}

export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  category?: string;
  sourceFile?: string;
}

// Re-export RecurringObligation from finance types
export type { RecurringObligation } from '../types/finance/recurringObligations';

export interface UserTask {
  id: string;
  user_id: string;
  description: string;
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: number; // 1-5, where 1 is highest priority
  created_from_session: string | null; // UUID reference to chat_sessions
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParsedFileData {
  transactions: Transaction[];
  fileName: string;
  fileType: 'csv' | 'pdf';
}

export interface ToolExecutionRecord {
  id: string;
  user_id: string;
  employee_slug: string;
  tool_id: string;
  mode: 'explain-only' | 'propose-confirm' | 'auto-pilot';
  autonomy_level: number; // 0-3 as defined in AI_TOOLS_AUTONOMY_AUDIT_v1
  input_summary: string | null;
  affected_count: number | null;
  status: 'success' | 'error' | 'skipped' | 'cancelled';
  error_message: string | null;
  created_at: string;
}