/**
 * Shared Financial Data Layer
 * 
 * This is the unified data store that all AI employees access.
 * Each employee gets the SAME data but views it through their specialized expertise lens.
 */

export interface FinancialData {
  transactions: Transaction[];
  accounts: Account[];
  goals: Goal[];
  budgets: Budget[];
  investments: Investment[];
  debts: Debt[];
  income: Income[];
  categories: Category[];
  user: UserProfile;
}

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  description: string;
  amount: number;
  type: 'Credit' | 'Debit';
  category: string | null;
  subcategory?: string;
  merchant?: string;
  account_id?: string;
  file_name?: string;
  hash_id?: string;
  categorization_source?: 'ai' | 'manual' | 'memory';
  created_at?: string;
  updated_at?: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'investment' | 'loan';
  balance: number;
  currency: string;
  is_active: boolean;
  created_at?: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: 'savings' | 'debt_payoff' | 'investment' | 'emergency_fund' | 'other';
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  budgeted_amount: number;
  spent_amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface Investment {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  shares: number;
  current_price: number;
  total_value: number;
  purchase_date: string;
  account_type: '401k' | 'ira' | 'brokerage' | 'crypto' | 'other';
  created_at?: string;
  updated_at?: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  type: 'credit_card' | 'loan' | 'mortgage' | 'student_loan' | 'personal_loan' | 'other';
  balance: number;
  interest_rate: number;
  minimum_payment: number;
  due_date: string;
  status: 'active' | 'paid_off' | 'defaulted';
  created_at?: string;
  updated_at?: string;
}

export interface Income {
  id: string;
  user_id: string;
  source: string;
  amount: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'one_time';
  next_payment_date: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  parent_category?: string;
  color?: string;
  icon?: string;
  is_default: boolean;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  timezone?: string;
  currency?: string;
  financial_goals?: string[];
  risk_tolerance?: 'conservative' | 'moderate' | 'aggressive';
  created_at?: string;
  updated_at?: string;
}

/**
 * Central Financial Data Store
 * This is the single source of truth that all AI employees access
 */
export class SharedFinancialDataStore {
  private data: FinancialData | null = null;
  private lastUpdated: Date | null = null;
  private updateCallbacks: Array<(data: FinancialData) => void> = [];

  constructor() {
    // Initialize with empty data structure
    this.data = this.getEmptyDataStructure();
  }

  /**
   * Get the complete financial data
   * All AI employees access this same data
   */
  getData(): FinancialData {
    if (!this.data) {
      this.data = this.getEmptyDataStructure();
    }
    return this.data;
  }

  /**
   * Update the financial data
   * This triggers updates for all AI employees
   */
  async updateData(newData: Partial<FinancialData>): Promise<void> {
    if (!this.data) {
      this.data = this.getEmptyDataStructure();
    }

    // Merge new data with existing data
    this.data = {
      ...this.data,
      ...newData
    };

    this.lastUpdated = new Date();

    // Notify all subscribers
    this.updateCallbacks.forEach(callback => {
      try {
        callback(this.data);
      } catch (error) {
        console.error('Error in data update callback:', error);
      }
    });
  }

  /**
   * Subscribe to data updates
   * AI employees can subscribe to get notified when data changes
   */
  subscribe(callback: (data: FinancialData) => void): () => void {
    this.updateCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.updateCallbacks.indexOf(callback);
      if (index > -1) {
        this.updateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get data freshness info
   */
  getDataInfo(): { lastUpdated: Date | null; isStale: boolean } {
    const isStale = !this.lastUpdated || 
      (Date.now() - this.lastUpdated.getTime()) > 5 * 60 * 1000; // 5 minutes
    
    return {
      lastUpdated: this.lastUpdated,
      isStale
    };
  }

  /**
   * Create empty data structure
   */
  private getEmptyDataStructure(): FinancialData {
    return {
      transactions: [],
      accounts: [],
      goals: [],
      budgets: [],
      investments: [],
      debts: [],
      income: [],
      categories: [],
      user: {
        id: '',
        email: '',
        name: '',
        timezone: 'UTC',
        currency: 'USD',
        financial_goals: [],
        risk_tolerance: 'moderate'
      }
    };
  }

  /**
   * Load data from Supabase
   * This is where we fetch real user data
   */
  async loadFromSupabase(userId: string): Promise<void> {
    try {
      // Import supabase client
      const { supabase } = await import('./supabase');
      
      // Fetch all financial data in parallel
      const [
        transactionsResult,
        accountsResult,
        goalsResult,
        budgetsResult,
        investmentsResult,
        debtsResult,
        incomeResult,
        categoriesResult,
        userResult
      ] = await Promise.allSettled([
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('accounts').select('*').eq('user_id', userId),
        supabase.from('goals').select('*').eq('user_id', userId),
        supabase.from('budgets').select('*').eq('user_id', userId),
        supabase.from('investments').select('*').eq('user_id', userId),
        supabase.from('debts').select('*').eq('user_id', userId),
        supabase.from('income').select('*').eq('user_id', userId),
        supabase.from('categories').select('*').eq('user_id', userId),
        supabase.from('profiles').select('*').eq('id', userId).single()
      ]);

      // Process results and update data
      const newData: Partial<FinancialData> = {};

      if (transactionsResult.status === 'fulfilled') {
        newData.transactions = transactionsResult.value.data || [];
      }

      if (accountsResult.status === 'fulfilled') {
        newData.accounts = accountsResult.value.data || [];
      }

      if (goalsResult.status === 'fulfilled') {
        newData.goals = goalsResult.value.data || [];
      }

      if (budgetsResult.status === 'fulfilled') {
        newData.budgets = budgetsResult.value.data || [];
      }

      if (investmentsResult.status === 'fulfilled') {
        newData.investments = investmentsResult.value.data || [];
      }

      if (debtsResult.status === 'fulfilled') {
        newData.debts = debtsResult.value.data || [];
      }

      if (incomeResult.status === 'fulfilled') {
        newData.income = incomeResult.value.data || [];
      }

      if (categoriesResult.status === 'fulfilled') {
        newData.categories = categoriesResult.value.data || [];
      }

      if (userResult.status === 'fulfilled') {
        newData.user = userResult.value.data || newData.user;
      }

      await this.updateData(newData);
      
    } catch (error) {
      console.error('Error loading data from Supabase:', error);
      throw error;
    }
  }
}

// Global instance - single source of truth
export const sharedFinancialData = new SharedFinancialDataStore();
