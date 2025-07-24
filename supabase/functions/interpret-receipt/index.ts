import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
};

interface ReceiptResponse {
  vendor: string;
  amount: number;
  category: string;
  reason: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const { receiptText, userId } = await req.json();
    
    if (!receiptText) {
      throw new Error("Receipt text is required");
    }

    // Initialize Supabase client to check for user's previous categorizations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract vendor
    let vendor = extractVendor(receiptText);
    
    // Extract amount
    const amount = extractAmount(receiptText);
    
    // Determine category
    let category = '';
    let reason = '';

    // Check if we have previous categorizations for this vendor
    if (userId && vendor) {
      const { data: previousCategorizations } = await supabase
        .from('categorization_rules')
        .select('category, subcategory')
        .eq('user_id', userId)
        .ilike('keyword', `%${vendor.toLowerCase()}%`)
        .limit(1);

      if (previousCategorizations && previousCategorizations.length > 0) {
        category = previousCategorizations[0].category;
        reason = `Based on your previous categorization of receipts from ${vendor}.`;
      }
    }

    // If no previous categorization, determine category based on vendor and receipt content
    if (!category) {
      const result = determineCategory(receiptText, vendor);
      category = result.category;
      reason = result.reason;
    }

    // If we have a userId and this is a new vendor, store this categorization for future reference
    if (userId && vendor && category) {
      try {
        await supabase
          .from('categorization_rules')
          .upsert({
            user_id: userId,
            keyword: vendor.toLowerCase(),
            category: category,
            match_count: 1,
            last_matched: new Date().toISOString()
          }, {
            onConflict: 'user_id,keyword'
          });
      } catch (error) {
        console.error('Error saving categorization rule:', error);
        // Continue even if saving fails
      }
    }

    const response: ReceiptResponse = {
      vendor,
      amount,
      category,
      reason
    };

    return new Response(
      JSON.stringify(response),
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
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});

/**
 * Extract vendor name from receipt text
 */
function extractVendor(text: string): string {
  const lines = text.split('\n').map(line => line.trim());
  
  // Common patterns for vendor names
  const vendorPatterns = [
    /thank you for shopping at (.*)/i,
    /welcome to (.*)/i,
    /receipt from (.*)/i,
    /store: (.*)/i,
    /merchant: (.*)/i,
    /vendor: (.*)/i,
  ];
  
  // Try to match patterns first
  for (const line of lines) {
    for (const pattern of vendorPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  }
  
  // If no pattern matches, assume the first non-empty line might be the vendor
  // This is a simplistic approach and might need refinement
  for (const line of lines) {
    if (line && !line.match(/^(date|time|receipt|transaction|tel|phone|address|#)/i)) {
      return line;
    }
  }
  
  return "Unknown Vendor";
}

/**
 * Extract total amount from receipt text
 */
function extractAmount(text: string): number {
  const lines = text.split('\n');
  
  // Common patterns for total amount
  const totalPatterns = [
    /total:?\s*\$?(\d+\.\d{2})/i,
    /amount:?\s*\$?(\d+\.\d{2})/i,
    /sum:?\s*\$?(\d+\.\d{2})/i,
    /\btotal\b.*\$?(\d+\.\d{2})/i,
    /\$\s*(\d+\.\d{2})/,
    /(\d+\.\d{2})/,  // Last resort - any number with 2 decimal places
  ];
  
  // Start from the bottom of the receipt as total is usually at the end
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Look for total patterns
    for (const pattern of totalPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        return parseFloat(match[1]);
      }
    }
  }
  
  return 0;
}

/**
 * Determine category based on receipt content
 */
function determineCategory(text: string, vendor: string): { category: string; reason: string } {
  const lowerText = text.toLowerCase();
  const lowerVendor = vendor.toLowerCase();
  
  // Groceries
  if (
    lowerVendor.includes('grocery') || 
    lowerVendor.includes('market') || 
    lowerVendor.includes('food') ||
    lowerVendor.includes('supermarket') ||
    lowerVendor.includes('walmart') ||
    lowerVendor.includes('target') ||
    lowerVendor.includes('kroger') ||
    lowerVendor.includes('safeway') ||
    lowerVendor.includes('costco') ||
    lowerVendor.includes('trader joe') ||
    lowerText.includes('grocery') ||
    (lowerText.includes('milk') && lowerText.includes('bread'))
  ) {
    return {
      category: 'Groceries',
      reason: `${vendor} appears to be a grocery store or supermarket.`
    };
  }
  
  // Dining
  if (
    lowerVendor.includes('restaurant') || 
    lowerVendor.includes('cafe') || 
    lowerVendor.includes('coffee') ||
    lowerVendor.includes('starbucks') ||
    lowerVendor.includes('mcdonald') ||
    lowerVendor.includes('burger') ||
    lowerVendor.includes('pizza') ||
    lowerVendor.includes('taco') ||
    lowerVendor.includes('sushi') ||
    lowerVendor.includes('dining') ||
    lowerVendor.includes('doordash') ||
    lowerVendor.includes('ubereats') ||
    lowerVendor.includes('grubhub') ||
    lowerText.includes('restaurant') ||
    lowerText.includes('table') && lowerText.includes('server')
  ) {
    return {
      category: 'Dining',
      reason: `${vendor} appears to be a restaurant or food service.`
    };
  }
  
  // Transportation
  if (
    lowerVendor.includes('uber') || 
    lowerVendor.includes('lyft') || 
    lowerVendor.includes('taxi') || 
    lowerVendor.includes('transit') ||
    lowerVendor.includes('train') ||
    lowerVendor.includes('bus') ||
    lowerVendor.includes('subway') ||
    lowerText.includes('ride') ||
    lowerText.includes('fare')
  ) {
    return {
      category: 'Transportation',
      reason: `${vendor} appears to be a transportation service.`
    };
  }
  
  // Fuel
  if (
    lowerVendor.includes('gas') || 
    lowerVendor.includes('shell') || 
    lowerVendor.includes('exxon') || 
    lowerVendor.includes('chevron') ||
    lowerVendor.includes('fuel') ||
    lowerVendor.includes('petro') ||
    lowerText.includes('gallons') ||
    lowerText.includes('fuel')
  ) {
    return {
      category: 'Fuel',
      reason: `${vendor} appears to be a gas station or fuel purchase.`
    };
  }
  
  // Shopping
  if (
    lowerVendor.includes('amazon') || 
    lowerVendor.includes('ebay') || 
    lowerVendor.includes('store') ||
    lowerVendor.includes('shop') ||
    lowerVendor.includes('retail') ||
    lowerVendor.includes('mall') ||
    lowerVendor.includes('outlet') ||
    lowerText.includes('purchase') ||
    lowerText.includes('item') ||
    lowerText.includes('qty')
  ) {
    return {
      category: 'Shopping',
      reason: `${vendor} appears to be a retail store or shopping service.`
    };
  }
  
  // Healthcare
  if (
    lowerVendor.includes('pharmacy') || 
    lowerVendor.includes('drug') || 
    lowerVendor.includes('clinic') ||
    lowerVendor.includes('hospital') ||
    lowerVendor.includes('doctor') ||
    lowerVendor.includes('medical') ||
    lowerVendor.includes('health') ||
    lowerText.includes('prescription') ||
    lowerText.includes('rx')
  ) {
    return {
      category: 'Healthcare',
      reason: `${vendor} appears to be related to healthcare or medical services.`
    };
  }
  
  // Default case
  return {
    category: 'Other',
    reason: `Could not confidently categorize this receipt from ${vendor}.`
  };
}