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
    
    // Generate mock reports data
    const reports = generateMockReports(params);

    return new Response(
      JSON.stringify(reports),
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

function generateMockReports(params = {}) {
  // Generate reports for the last 6 months
  const reports = [];
  const currentDate = new Date();
  
  for (let i = 0; i < 6; i++) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);
    
    const monthName = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    
    // Generate random but realistic financial data
    const baseIncome = 6000 + Math.random() * 1000;
    const baseExpenses = 4500 + Math.random() * 800;
    
    // Add some variance to make the data look more realistic
    const variance = (Math.random() - 0.5) * 0.2; // -10% to +10%
    
    const totalIncome = Math.round(baseIncome * (1 + variance) * 100) / 100;
    const totalExpenses = Math.round(baseExpenses * (1 + variance) * 100) / 100;
    const netSavings = Math.round((totalIncome - totalExpenses) * 100) / 100;
    
    // Generate top spending categories
    const topCategories = [
      { 
        category: "Rent", 
        amount: Math.round(totalExpenses * 0.38 * 100) / 100 
      },
      { 
        category: "Groceries", 
        amount: Math.round(totalExpenses * 0.15 * 100) / 100 
      },
      { 
        category: "Transportation", 
        amount: Math.round(totalExpenses * 0.10 * 100) / 100 
      },
      { 
        category: "Dining", 
        amount: Math.round(totalExpenses * 0.09 * 100) / 100 
      },
      { 
        category: "Utilities", 
        amount: Math.round(totalExpenses * 0.08 * 100) / 100 
      }
    ];
    
    // Add some randomness to category order and amounts
    topCategories.sort(() => Math.random() - 0.5);
    topCategories.forEach(category => {
      category.amount = Math.round(category.amount * (0.9 + Math.random() * 0.2) * 100) / 100;
    });
    
    // Sort by amount (highest first)
    topCategories.sort((a, b) => b.amount - a.amount);
    
    reports.push({
      month: `${monthName} ${year}`,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_savings: netSavings,
      top_categories: topCategories,
      savings_rate: Math.round((netSavings / totalIncome) * 100 * 10) / 10, // To 1 decimal place
      transaction_count: Math.floor(30 + Math.random() * 50)
    });
  }
  
  return reports;
}