import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Get user ID from request headers if available
    const userId = req.headers.get('x-user-id') || 'user-123';
    
    // Parse request parameters if any
    let params = {};
    if (req.method === "POST") {
      try {
        params = await req.json();
      } catch (e) {
        // If parsing fails, use default params
        console.error("Failed to parse request body:", e);
      }
    }
    
    // Generate mock transactions
    const transactions = generateMockTransactions(userId, params);

    return new Response(
      JSON.stringify(transactions),
      {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});

function generateMockTransactions(userId: string, params: any = {}) {
  // Create a set of realistic transactions
  const mockTransactions = [
    {
      id: 'txn_001',
      date: '2025-06-20',
      description: 'Starbucks',
      amount: 6.45,
      type: 'Debit',
      category: 'Food & Drink',
      subcategory: 'Coffee',
      file_name: 'June_Statement.csv',
      hash_id: 'mock-hash-001',
      user_id: userId,
      created_at: '2025-06-20T14:32:15Z',
      categorization_source: 'ai'
    },
    {
      id: 'txn_002',
      date: '2025-06-18',
      description: 'Shell Gas',
      amount: 52.89,
      type: 'Debit',
      category: 'Transportation',
      subcategory: 'Fuel',
      file_name: 'June_Statement.csv',
      hash_id: 'mock-hash-002',
      user_id: userId,
      created_at: '2025-06-18T09:15:22Z',
      categorization_source: 'ai'
    },
    {
      id: 'txn_003',
      date: '2025-06-15',
      description: 'Amazon',
      amount: 78.12,
      type: 'Debit',
      category: 'Shopping',
      subcategory: 'Online',
      file_name: 'Credit_Card_June.csv',
      hash_id: 'mock-hash-003',
      user_id: userId,
      created_at: '2025-06-15T00:01:05Z',
      categorization_source: 'memory'
    },
    {
      id: 'txn_004',
      date: '2025-06-10',
      description: 'Gordon Food Service',
      amount: 340.00,
      type: 'Debit',
      category: 'Business Expenses',
      subcategory: 'Supplies',
      file_name: 'Credit_Card_June.csv',
      hash_id: 'mock-hash-004',
      user_id: userId,
      created_at: '2025-06-10T16:42:33Z',
      categorization_source: 'ai'
    },
    {
      id: 'txn_005',
      date: '2025-06-05',
      description: 'Netflix',
      amount: 18.99,
      type: 'Debit',
      category: 'Entertainment',
      subcategory: 'Streaming',
      file_name: 'Credit_Card_June.csv',
      hash_id: 'mock-hash-005',
      user_id: userId,
      created_at: '2025-06-05T08:17:45Z',
      categorization_source: 'manual'
    },
    {
      id: 'txn_006',
      date: '2025-06-01',
      description: 'TD Mortgage',
      amount: 1600.00,
      type: 'Debit',
      category: 'Housing',
      subcategory: 'Mortgage',
      file_name: 'June_Statement.csv',
      hash_id: 'mock-hash-006',
      user_id: userId,
      created_at: '2025-06-01T00:00:15Z',
      categorization_source: 'ai'
    },
    {
      id: 'txn_007',
      date: '2025-05-28',
      description: 'Save-On-Foods',
      amount: 143.22,
      type: 'Debit',
      category: 'Groceries',
      subcategory: null,
      file_name: 'May_Statement.csv',
      hash_id: 'mock-hash-007',
      user_id: userId,
      created_at: '2025-05-28T18:22:33Z',
      categorization_source: 'ai'
    },
    {
      id: 'txn_008',
      date: '2025-05-25',
      description: 'SkipTheDishes',
      amount: 27.75,
      type: 'Debit',
      category: 'Food Delivery',
      subcategory: null,
      file_name: 'May_Statement.csv',
      hash_id: 'mock-hash-008',
      user_id: userId,
      created_at: '2025-05-25T19:45:12Z',
      categorization_source: 'ai'
    },
    {
      id: 'txn_009',
      date: '2025-05-22',
      description: 'CRA Tax Refund',
      amount: 1250.00,
      type: 'Credit',
      category: 'Income',
      subcategory: 'Tax Refund',
      file_name: 'May_Statement.csv',
      hash_id: 'mock-hash-009',
      user_id: userId,
      created_at: '2025-05-22T10:15:00Z',
      categorization_source: 'manual'
    },
    {
      id: 'txn_010',
      date: '2025-05-20',
      description: 'Telus',
      amount: 94.60,
      type: 'Debit',
      category: 'Utilities',
      subcategory: 'Phone',
      file_name: 'May_Statement.csv',
      hash_id: 'mock-hash-010',
      user_id: userId,
      created_at: '2025-05-20T08:30:45Z',
      categorization_source: 'memory'
    },
    {
      id: 'txn_011',
      date: '2025-05-15',
      description: 'Payroll Deposit',
      amount: 3250.00,
      type: 'Credit',
      category: 'Income',
      subcategory: 'Salary',
      file_name: 'May_Statement.csv',
      hash_id: 'mock-hash-011',
      user_id: userId,
      created_at: '2025-05-15T00:01:00Z',
      categorization_source: 'ai'
    },
    {
      id: 'txn_012',
      date: '2025-05-12',
      description: 'Costco',
      amount: 256.78,
      type: 'Debit',
      category: 'Groceries',
      subcategory: 'Bulk',
      file_name: 'May_Statement.csv',
      hash_id: 'mock-hash-012',
      user_id: userId,
      created_at: '2025-05-12T15:22:10Z',
      categorization_source: 'ai'
    },
    {
      id: 'txn_013',
      date: '2025-05-10',
      description: 'Spotify',
      amount: 9.99,
      type: 'Debit',
      category: 'Entertainment',
      subcategory: 'Music',
      file_name: 'May_Statement.csv',
      hash_id: 'mock-hash-013',
      user_id: userId,
      created_at: '2025-05-10T00:01:05Z',
      categorization_source: 'memory'
    },
    {
      id: 'txn_014',
      date: '2025-05-08',
      description: 'Uber',
      amount: 24.50,
      type: 'Debit',
      category: 'Transportation',
      subcategory: 'Rideshare',
      file_name: 'May_Statement.csv',
      hash_id: 'mock-hash-014',
      user_id: userId,
      created_at: '2025-05-08T22:15:30Z',
      categorization_source: 'ai'
    },
    {
      id: 'txn_015',
      date: '2025-05-05',
      description: 'Enmax',
      amount: 142.35,
      type: 'Debit',
      category: 'Utilities',
      subcategory: 'Electricity',
      file_name: 'May_Statement.csv',
      hash_id: 'mock-hash-015',
      user_id: userId,
      created_at: '2025-05-05T10:30:00Z',
      categorization_source: 'ai'
    }
  ];

  // Apply filters if provided
  let filteredTransactions = [...mockTransactions];
  
  if (params.category && params.category !== 'All') {
    filteredTransactions = filteredTransactions.filter(t => 
      t.category.toLowerCase() === params.category.toLowerCase());
  }
  
  if (params.startDate) {
    filteredTransactions = filteredTransactions.filter(t => 
      t.date >= params.startDate);
  }
  
  if (params.endDate) {
    filteredTransactions = filteredTransactions.filter(t => 
      t.date <= params.endDate);
  }
  
  if (params.sourceFile) {
    filteredTransactions = filteredTransactions.filter(t => 
      t.file_name.toLowerCase().includes(params.sourceFile.toLowerCase()));
  }
  
  // Add receipt URLs to some transactions
  filteredTransactions = filteredTransactions.map(t => {
    // Add receipt URL to every other transaction
    if (parseInt(t.id.split('_')[1]) % 2 === 0) {
      return {
        ...t,
        receipt_url: `https://placehold.co/400x600?text=Receipt+for+${t.description}`
      };
    }
    return t;
  });

  return filteredTransactions;
}