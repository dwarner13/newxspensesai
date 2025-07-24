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
  // Default transactions
  const defaultTransactions = [
    {
      id: "txn-001",
      date: "2025-06-01",
      vendor: "Costco",
      description: "Costco Wholesale",
      amount: 120.99,
      type: "Debit",
      category: "Groceries",
      subcategory: null,
      payment_method: "Visa",
      upload_id: "mock-upload-1",
      file_name: "June_Statement.csv",
      hash_id: "mock-hash-001",
      user_id: userId,
      created_at: "2025-06-01T14:32:15Z",
      categorization_source: "ai"
    },
    {
      id: "txn-002",
      date: "2025-06-03",
      vendor: "Shell Gas",
      description: "Shell Gas Station",
      amount: 65.00,
      type: "Debit",
      category: "Transportation",
      subcategory: "Fuel",
      payment_method: "Mastercard",
      upload_id: "mock-upload-1",
      file_name: "June_Statement.csv",
      hash_id: "mock-hash-002",
      user_id: userId,
      created_at: "2025-06-03T09:15:22Z",
      categorization_source: "ai"
    },
    {
      id: "txn-003",
      date: "2025-06-05",
      vendor: "Netflix",
      description: "Netflix Subscription",
      amount: 19.99,
      type: "Debit",
      category: "Entertainment",
      subcategory: "Streaming",
      payment_method: "Visa",
      upload_id: "mock-upload-2",
      file_name: "Credit_Card_June.csv",
      hash_id: "mock-hash-003",
      user_id: userId,
      created_at: "2025-06-05T00:01:05Z",
      categorization_source: "memory"
    },
    {
      id: "txn-004",
      date: "2025-06-07",
      vendor: "Walmart",
      description: "Walmart Supercenter",
      amount: 47.50,
      type: "Debit",
      category: "Household",
      subcategory: "Supplies",
      payment_method: "Debit",
      upload_id: "mock-upload-2",
      file_name: "Credit_Card_June.csv",
      hash_id: "mock-hash-004",
      user_id: userId,
      created_at: "2025-06-07T16:42:33Z",
      categorization_source: "ai"
    },
    {
      id: "txn-005",
      date: "2025-06-10",
      vendor: "Tim Hortons",
      description: "Tim Hortons #1234",
      amount: 6.25,
      type: "Debit",
      category: "Dining",
      subcategory: "Coffee",
      payment_method: "Visa",
      upload_id: "mock-upload-2",
      file_name: "Credit_Card_June.csv",
      hash_id: "mock-hash-005",
      user_id: userId,
      created_at: "2025-06-10T08:17:45Z",
      categorization_source: "manual"
    }
  ];

  // Apply filters if provided
  let filteredTransactions = [...defaultTransactions];
  
  if (params.category) {
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
  
  if (params.search) {
    const searchTerm = params.search.toLowerCase();
    filteredTransactions = filteredTransactions.filter(t => 
      t.vendor.toLowerCase().includes(searchTerm) || 
      t.description.toLowerCase().includes(searchTerm));
  }
  
  // Add receipt URLs to some transactions
  filteredTransactions = filteredTransactions.map(t => {
    // Add receipt URL to every other transaction
    if (parseInt(t.id.split('-')[1]) % 2 === 0) {
      return {
        ...t,
        receipt_url: `https://placehold.co/400x600?text=Receipt+for+${t.vendor}`
      };
    }
    return t;
  });

  return filteredTransactions;
}