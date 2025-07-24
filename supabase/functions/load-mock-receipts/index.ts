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
    
    // Generate mock receipts data
    const receipts = generateMockReceipts(userId);

    return new Response(
      JSON.stringify(receipts),
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

function generateMockReceipts(userId: string) {
  // Sample merchants with realistic data
  const merchants = [
    { name: 'Walmart', categories: ['Groceries', 'Household'], minAmount: 30, maxAmount: 150 },
    { name: 'Target', categories: ['Household', 'Shopping'], minAmount: 25, maxAmount: 120 },
    { name: 'Costco', categories: ['Groceries', 'Household'], minAmount: 80, maxAmount: 250 },
    { name: 'Starbucks', categories: ['Dining', 'Coffee'], minAmount: 5, maxAmount: 25 },
    { name: 'Shell', categories: ['Fuel', 'Transportation'], minAmount: 30, maxAmount: 80 },
    { name: 'Amazon', categories: ['Shopping', 'Entertainment'], minAmount: 15, maxAmount: 200 },
    { name: 'Home Depot', categories: ['Home Improvement'], minAmount: 40, maxAmount: 300 },
    { name: 'CVS Pharmacy', categories: ['Healthcare', 'Personal Care'], minAmount: 10, maxAmount: 60 },
    { name: 'Chipotle', categories: ['Dining', 'Food'], minAmount: 10, maxAmount: 40 },
    { name: 'Netflix', categories: ['Entertainment', 'Subscriptions'], minAmount: 10, maxAmount: 20 }
  ];
  
  // Processing statuses with weighted distribution
  const statuses = [
    { status: 'completed', weight: 70 },
    { status: 'pending', weight: 15 },
    { status: 'processing', weight: 10 },
    { status: 'failed', weight: 5 }
  ];
  
  // Generate 10 receipts
  const receipts = [];
  const now = new Date();
  
  for (let i = 0; i < 10; i++) {
    // Random merchant
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    
    // Random amount within merchant range
    const amount = parseFloat((Math.random() * (merchant.maxAmount - merchant.minAmount) + merchant.minAmount).toFixed(2));
    
    // Random date within last 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    
    // Random category from merchant's categories
    const category = merchant.categories[Math.floor(Math.random() * merchant.categories.length)];
    
    // Random status based on weighted distribution
    const statusRoll = Math.random() * 100;
    let cumulativeWeight = 0;
    let status = 'pending';
    
    for (const statusOption of statuses) {
      cumulativeWeight += statusOption.weight;
      if (statusRoll <= cumulativeWeight) {
        status = statusOption.status;
        break;
      }
    }
    
    // Generate extracted data for completed receipts
    let extractedData = null;
    if (status === 'completed') {
      extractedData = {
        vendor: merchant.name,
        date: date.toISOString().split('T')[0],
        total: amount,
        category: category,
        items: generateRandomItems(amount),
        confidence: 0.8 + (Math.random() * 0.2) // 0.8-1.0 confidence
      };
    }
    
    // Create receipt object
    const receipt = {
      id: `rct_${(i + 1).toString().padStart(3, '0')}`,
      user_id: userId,
      image_url: `https://placehold.co/400x600?text=Receipt+${merchant.name}`,
      original_filename: `${merchant.name.toLowerCase().replace(/\s+/g, '_')}_receipt_${date.toISOString().split('T')[0]}.jpg`,
      upload_date: date.toISOString(),
      processing_status: status,
      extracted_data: extractedData,
      transaction_id: status === 'completed' && Math.random() > 0.3 ? `tx_${(i + 1).toString().padStart(3, '0')}` : null,
      created_at: date.toISOString()
    };
    
    receipts.push(receipt);
  }
  
  // Sort by upload date (newest first)
  receipts.sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime());
  
  return receipts;
}

// Helper function to generate random receipt items
function generateRandomItems(totalAmount: number) {
  const items = [];
  let remainingAmount = totalAmount;
  const itemCount = Math.floor(Math.random() * 5) + 1; // 1-5 items
  
  for (let i = 0; i < itemCount; i++) {
    // Last item gets remaining amount, otherwise random portion
    const isLastItem = i === itemCount - 1;
    let itemAmount;
    
    if (isLastItem) {
      itemAmount = parseFloat(remainingAmount.toFixed(2));
    } else {
      // Random amount between 10-70% of remaining
      const portion = 0.1 + (Math.random() * 0.6);
      itemAmount = parseFloat((remainingAmount * portion).toFixed(2));
      remainingAmount -= itemAmount;
    }
    
    items.push({
      description: getRandomItemDescription(),
      amount: itemAmount
    });
  }
  
  return items;
}

// Helper function to generate random item descriptions
function getRandomItemDescription() {
  const items = [
    'Grocery Items', 'Produce', 'Dairy Products', 'Meat', 'Bakery Items',
    'Household Supplies', 'Personal Care', 'Electronics', 'Clothing',
    'Office Supplies', 'Snacks', 'Beverages', 'Frozen Foods',
    'Pet Supplies', 'Baby Products', 'Health Items', 'Automotive',
    'Home Decor', 'Kitchenware', 'Cleaning Supplies'
  ];
  
  return items[Math.floor(Math.random() * items.length)];
}