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
    // Parse request body if it exists
    let timeframe = 'month';
    if (req.method === "POST") {
      try {
        const body = await req.json();
        timeframe = body.timeframe || 'month';
      } catch (e) {
        // If parsing fails, use default timeframe
        console.error("Failed to parse request body:", e);
      }
    }
    
    // Generate mock data
    const mockData = generateMockData(timeframe);

    return new Response(
      JSON.stringify(mockData),
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

function generateMockData(timeframe = 'month') {
  // Generate different amounts of data based on timeframe
  const transactionCount = timeframe === 'month' ? 15 : 
                          timeframe === 'year' ? 50 : 30;
  
  // Categories with realistic amounts
  const categories = [
    { name: 'Groceries', minAmount: 20, maxAmount: 200 },
    { name: 'Dining', minAmount: 15, maxAmount: 100 },
    { name: 'Fuel', minAmount: 30, maxAmount: 80 },
    { name: 'Utilities', minAmount: 50, maxAmount: 300 },
    { name: 'Entertainment', minAmount: 10, maxAmount: 50 },
    { name: 'Shopping', minAmount: 20, maxAmount: 150 },
    { name: 'Healthcare', minAmount: 15, maxAmount: 200 },
    { name: 'Travel', minAmount: 50, maxAmount: 500 },
    { name: 'Subscriptions', minAmount: 5, maxAmount: 30 },
    { name: 'Income', minAmount: 1000, maxAmount: 5000 }
  ];
  
  // Vendors for each category
  const vendors = {
    'Groceries': ['Costco', 'Walmart', 'Safeway', 'Trader Joe\'s', 'Whole Foods'],
    'Dining': ['Starbucks', 'Chipotle', 'Olive Garden', 'McDonald\'s', 'Local Restaurant'],
    'Fuel': ['Shell', 'Chevron', 'Exxon', 'BP', 'Costco Gas'],
    'Utilities': ['Electric Company', 'Water Service', 'Gas Company', 'Internet Provider', 'Phone Company'],
    'Entertainment': ['Netflix', 'Movie Theater', 'Concert Tickets', 'Spotify', 'Amazon Prime'],
    'Shopping': ['Amazon', 'Target', 'Best Buy', 'Home Depot', 'Macy\'s'],
    'Healthcare': ['Pharmacy', 'Doctor\'s Office', 'Dental Clinic', 'Vision Center', 'Health Insurance'],
    'Travel': ['Airline', 'Hotel', 'Airbnb', 'Car Rental', 'Uber'],
    'Subscriptions': ['Netflix', 'Spotify', 'Adobe', 'Gym Membership', 'New York Times'],
    'Income': ['Payroll', 'Freelance Payment', 'Dividend', 'Interest', 'Refund']
  };
  
  // Generate transactions
  const transactions = [];
  const totals_by_category = {};
  let highestAmount = 0;
  let highestVendor = '';
  let highestCategory = '';
  let monthlyTotal = 0;
  let incomeTotal = 0;
  
  // Current date for reference
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Date range based on timeframe
  let startDate = new Date();
  if (timeframe === 'month') {
    startDate = new Date(currentYear, currentMonth, 1);
  } else if (timeframe === 'year') {
    startDate = new Date(currentYear, 0, 1);
  } else {
    // Default to 6 months
    startDate = new Date(currentYear, currentMonth - 6, 1);
  }
  
  for (let i = 0; i < transactionCount; i++) {
    // Random category
    const categoryIndex = Math.floor(Math.random() * categories.length);
    const category = categories[categoryIndex].name;
    
    // Random vendor from that category
    const vendorList = vendors[category] || vendors['Shopping'];
    const vendor = vendorList[Math.floor(Math.random() * vendorList.length)];
    
    // Random amount within category range
    const minAmount = categories[categoryIndex].minAmount;
    const maxAmount = categories[categoryIndex].maxAmount;
    const amount = parseFloat((Math.random() * (maxAmount - minAmount) + minAmount).toFixed(2));
    
    // Random date within timeframe
    const daysRange = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const randomDaysAgo = Math.floor(Math.random() * daysRange);
    const date = new Date(now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);
    const formattedDate = date.toISOString().split('T')[0];
    
    // Transaction type
    const type = category === 'Income' ? 'Credit' : 'Debit';
    
    // Create transaction
    const transaction = {
      id: `tx${i.toString().padStart(3, '0')}`,
      date: formattedDate,
      description: vendor,
      amount: amount,
      type: type,
      category: category,
      subcategory: null,
      file_name: 'Mock Data',
      hash_id: `mock-${i}`,
      created_at: formattedDate
    };
    
    transactions.push(transaction);
    
    // Update category totals
    if (!totals_by_category[category]) {
      totals_by_category[category] = 0;
    }
    totals_by_category[category] += amount;
    
    // Track highest amount for insights
    if (category !== 'Income' && amount > highestAmount) {
      highestAmount = amount;
      highestVendor = vendor;
      highestCategory = category;
    }
    
    // Update monthly total
    if (category !== 'Income') {
      monthlyTotal += amount;
    } else {
      incomeTotal += amount;
    }
  }
  
  // Find top category (excluding income)
  let topCategory = '';
  let topCategoryAmount = 0;
  
  Object.entries(totals_by_category).forEach(([category, amount]) => {
    if (category !== 'Income' && amount > topCategoryAmount) {
      topCategoryAmount = amount;
      topCategory = category;
    }
  });
  
  // Generate goals
  const goals = [];
  
  // Add goals for top categories
  Object.entries(totals_by_category)
    .filter(([category]) => category !== 'Income')
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 3)
    .forEach(([category, amount]) => {
      const target = Math.round(Number(amount) * (Math.random() * 0.5 + 1.2) / 10) * 10; // 20% to 70% more than current
      goals.push({
        category_tracked: category,
        target_amount: target,
        current_total: Number(amount),
        status: Number(amount) / target < 0.8 ? 'On Track' : Number(amount) > target ? 'Exceeded' : 'Near Limit'
      });
    });
  
  return {
    transactions,
    categories: Object.keys(totals_by_category),
    stats: {
      income: incomeTotal,
      expenses: monthlyTotal,
      net: incomeTotal - monthlyTotal,
      trend: Math.floor(Math.random() * 20) - 10 // Random trend between -10 and 10
    },
    totals_by_category,
    goals,
    insights: {
      top_category: topCategory,
      most_spent: `${highestVendor} - $${highestAmount.toFixed(2)}`,
      monthly_total: monthlyTotal.toFixed(2)
    },
    loading_complete: true
  };
}