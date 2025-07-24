import { Transaction } from '../types/database.types';

export interface MockDashboardData {
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
  netSavings: number;
  mostUsedCategory: string;
  transactions: Transaction[];
  categories: string[];
  categoryTotals: Record<string, number>;
  recentActivity: {
    type: string;
    description: string;
    date: string;
    amount?: number;
  }[];
  goals: {
    name: string;
    target: number;
    current: number;
    category: string;
    dueDate: string;
  }[];
}

export const mockDashboardData: MockDashboardData = {
  totalIncome: 8600,
  totalExpenses: 3975.48,
  savingsRate: 53.7,
  netSavings: 4624.52,
  mostUsedCategory: "Transportation",
  transactions: [
    { 
      id: "tx001", 
      date: "2025-06-10", 
      description: "Uber", 
      amount: 23.65, 
      type: "Debit", 
      category: "Transportation", 
      subcategory: "Rideshare",
      file_name: "June_Statement.csv",
      hash_id: "mock-hash-001",
      created_at: "2025-06-10T14:32:15Z",
      categorization_source: "ai"
    },
    { 
      id: "tx002", 
      date: "2025-06-09", 
      description: "Whole Foods", 
      amount: 112.34, 
      type: "Debit", 
      category: "Groceries", 
      subcategory: null,
      file_name: "June_Statement.csv",
      hash_id: "mock-hash-002",
      created_at: "2025-06-09T09:15:22Z",
      categorization_source: "ai"
    },
    { 
      id: "tx003", 
      date: "2025-06-07", 
      description: "Netflix", 
      amount: 18.99, 
      type: "Debit", 
      category: "Entertainment", 
      subcategory: "Streaming",
      file_name: "June_Statement.csv",
      hash_id: "mock-hash-003",
      created_at: "2025-06-07T00:01:05Z",
      categorization_source: "memory"
    },
    { 
      id: "tx004", 
      date: "2025-06-08", 
      description: "Shell Gas", 
      amount: 68.22, 
      type: "Debit", 
      category: "Transportation", 
      subcategory: "Fuel",
      file_name: "June_Statement.csv",
      hash_id: "mock-hash-004",
      created_at: "2025-06-08T16:42:33Z",
      categorization_source: "ai",
      receipt_url: "https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
    },
    { 
      id: "tx005", 
      date: "2025-06-01", 
      description: "GFS Payout", 
      amount: 2400.00, 
      type: "Credit", 
      category: "Income", 
      subcategory: "Salary",
      file_name: "June_Statement.csv",
      hash_id: "mock-hash-005",
      created_at: "2025-06-01T00:00:15Z",
      categorization_source: "ai"
    },
    { 
      id: "tx006", 
      date: "2025-06-05", 
      description: "Amazon", 
      amount: 129.99, 
      type: "Debit", 
      category: "Shopping", 
      subcategory: "Online",
      file_name: "June_Statement.csv",
      hash_id: "mock-hash-006",
      created_at: "2025-06-05T08:17:45Z",
      categorization_source: "manual",
      receipt_url: "https://images.pexels.com/photos/6770610/pexels-photo-6770610.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
    },
    { 
      id: "tx007", 
      date: "2025-06-03", 
      description: "Starbucks", 
      amount: 8.25, 
      type: "Debit", 
      category: "Food & Drink", 
      subcategory: "Coffee",
      file_name: "June_Statement.csv",
      hash_id: "mock-hash-007",
      created_at: "2025-06-03T09:15:22Z",
      categorization_source: "ai",
      receipt_url: "https://images.pexels.com/photos/1211329/pexels-photo-1211329.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
    }
  ],
  categories: [
    "Transportation", 
    "Groceries", 
    "Entertainment", 
    "Income", 
    "Shopping", 
    "Food & Drink"
  ],
  categoryTotals: {
    "Transportation": 91.87,
    "Groceries": 112.34,
    "Entertainment": 18.99,
    "Income": 2400.00,
    "Shopping": 129.99,
    "Food & Drink": 8.25
  },
  recentActivity: [
    {
      type: "transaction",
      description: "Uploaded June bank statement",
      date: "2025-06-11",
    },
    {
      type: "receipt",
      description: "Scanned Shell Gas receipt",
      date: "2025-06-08",
      amount: 68.22
    },
    {
      type: "badge",
      description: "Earned 'Receipt Master' badge",
      date: "2025-06-07"
    },
    {
      type: "goal",
      description: "Completed 'Reduce dining expenses' goal",
      date: "2025-06-05"
    }
  ],
  goals: [
    {
      name: "Reduce transportation costs",
      target: 200,
      current: 91.87,
      category: "Transportation",
      dueDate: "2025-06-30"
    },
    {
      name: "Grocery budget",
      target: 400,
      current: 112.34,
      category: "Groceries",
      dueDate: "2025-06-30"
    },
    {
      name: "Entertainment limit",
      target: 100,
      current: 18.99,
      category: "Entertainment",
      dueDate: "2025-06-30"
    }
  ]
};

/**
 * Generates mock dashboard data with optional customizations
 * @param options Customization options
 * @returns Mock dashboard data
 */
export function generateMockDashboardData(options?: {
  timeframe?: 'week' | 'month' | 'year';
  includeReceipts?: boolean;
  transactionCount?: number;
}): MockDashboardData {
  const { 
    timeframe = 'month',
    includeReceipts = true,
    transactionCount = 7
  } = options || {};

  // Deep clone the base data
  const data = JSON.parse(JSON.stringify(mockDashboardData)) as MockDashboardData;
  
  // Customize based on options
  if (timeframe === 'week') {
    data.totalIncome = data.totalIncome / 4;
    data.totalExpenses = data.totalExpenses / 4;
    data.netSavings = data.totalIncome - data.totalExpenses;
    data.savingsRate = (data.netSavings / data.totalIncome) * 100;
  } else if (timeframe === 'year') {
    data.totalIncome = data.totalIncome * 12;
    data.totalExpenses = data.totalExpenses * 12;
    data.netSavings = data.totalIncome - data.totalExpenses;
    data.savingsRate = (data.netSavings / data.totalIncome) * 100;
  }
  
  // Limit transactions if needed
  if (transactionCount < data.transactions.length) {
    data.transactions = data.transactions.slice(0, transactionCount);
  }
  
  // Remove receipt URLs if not needed
  if (!includeReceipts) {
    data.transactions = data.transactions.map(tx => ({
      ...tx,
      receipt_url: undefined
    }));
  }
  
  return data;
}

/**
 * Simulates loading dashboard data with a delay
 * @param options Customization options
 * @param delayMs Delay in milliseconds
 * @returns Promise that resolves to mock dashboard data
 */
export async function fetchMockDashboardData(
  options?: Parameters<typeof generateMockDashboardData>[0],
  delayMs = 1000
): Promise<MockDashboardData> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, delayMs));
  
  // Generate and return mock data
  return generateMockDashboardData(options);
}