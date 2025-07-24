import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id",
};

interface TransactionInput {
  vendor: string;
  amount: number;
  description: string;
  notes: string;
  userId?: string; // Optional user ID for personalization
}

interface CategoryResponse {
  category: string;
  reason: string;
  flag_for_review: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const input: TransactionInput = await req.json();
    
    // Validate input
    if (!input.vendor && !input.description) {
      throw new Error("Either vendor or description is required");
    }

    // Initialize Supabase client to check for user's previous categorizations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let category = '';
    let reason = '';
    let flag_for_review = false;

    // Check if we have previous categorizations for this vendor
    if (input.userId) {
      const { data: previousCategorizations } = await supabase
        .from('categorization_rules')
        .select('category, subcategory')
        .eq('user_id', input.userId)
        .ilike('keyword', `%${input.vendor.toLowerCase()}%`)
        .limit(1);

      if (previousCategorizations && previousCategorizations.length > 0) {
        category = previousCategorizations[0].category;
        reason = `Based on your previous categorization of transactions from ${input.vendor}.`;
        flag_for_review = false;
        
        // Return early with the user's previous categorization
        return new Response(
          JSON.stringify({ category, reason, flag_for_review }),
          {
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    }

    // If no previous categorization, use AI to categorize
    // For this example, we'll use a rule-based approach
    // In production, you might want to use OpenAI or another AI service
    
    const vendorLower = input.vendor.toLowerCase();
    const descriptionLower = input.description.toLowerCase();
    const combinedText = `${vendorLower} ${descriptionLower} ${input.notes.toLowerCase()}`;
    
    // Transportation
    if (
      combinedText.includes('uber') || 
      combinedText.includes('lyft') || 
      combinedText.includes('taxi') || 
      combinedText.includes('transit') ||
      combinedText.includes('train') ||
      combinedText.includes('bus') ||
      combinedText.includes('subway')
    ) {
      category = 'Transportation';
      reason = `${input.vendor} appears to be a transportation service.`;
    }
    // Fuel
    else if (
      combinedText.includes('gas') || 
      combinedText.includes('shell') || 
      combinedText.includes('exxon') || 
      combinedText.includes('chevron') ||
      combinedText.includes('fuel') ||
      combinedText.includes('petro')
    ) {
      category = 'Fuel';
      reason = `${input.vendor} appears to be a gas station or fuel purchase.`;
    }
    // Groceries
    else if (
      combinedText.includes('grocery') || 
      combinedText.includes('supermarket') || 
      combinedText.includes('food') ||
      combinedText.includes('market') ||
      combinedText.includes('safeway') ||
      combinedText.includes('kroger') ||
      combinedText.includes('walmart') ||
      combinedText.includes('target') ||
      combinedText.includes('costco') ||
      combinedText.includes('trader joe')
    ) {
      category = 'Groceries';
      reason = `${input.vendor} appears to be a grocery store or supermarket.`;
    }
    // Dining
    else if (
      combinedText.includes('restaurant') || 
      combinedText.includes('cafe') || 
      combinedText.includes('coffee') ||
      combinedText.includes('starbucks') ||
      combinedText.includes('mcdonald') ||
      combinedText.includes('burger') ||
      combinedText.includes('pizza') ||
      combinedText.includes('taco') ||
      combinedText.includes('sushi') ||
      combinedText.includes('dining') ||
      combinedText.includes('doordash') ||
      combinedText.includes('ubereats') ||
      combinedText.includes('grubhub')
    ) {
      category = 'Dining';
      reason = `${input.vendor} appears to be a restaurant or food service.`;
    }
    // Utilities
    else if (
      combinedText.includes('electric') || 
      combinedText.includes('water') || 
      combinedText.includes('gas bill') ||
      combinedText.includes('utility') ||
      combinedText.includes('phone') ||
      combinedText.includes('internet') ||
      combinedText.includes('cable') ||
      combinedText.includes('netflix') ||
      combinedText.includes('spotify') ||
      combinedText.includes('subscription')
    ) {
      category = 'Utilities';
      reason = `${input.vendor} appears to be a utility or subscription service.`;
    }
    // Housing
    else if (
      combinedText.includes('rent') || 
      combinedText.includes('mortgage') || 
      combinedText.includes('apartment') ||
      combinedText.includes('housing') ||
      combinedText.includes('property')
    ) {
      category = 'Housing';
      reason = `${input.vendor} appears to be related to housing or property.`;
    }
    // Office Supplies
    else if (
      combinedText.includes('office') || 
      combinedText.includes('staples') || 
      combinedText.includes('supplies') ||
      combinedText.includes('printer') ||
      combinedText.includes('paper') ||
      combinedText.includes('ink')
    ) {
      category = 'Office Supplies';
      reason = `${input.vendor} appears to be related to office supplies.`;
    }
    // Healthcare
    else if (
      combinedText.includes('doctor') || 
      combinedText.includes('hospital') || 
      combinedText.includes('clinic') ||
      combinedText.includes('pharmacy') ||
      combinedText.includes('medical') ||
      combinedText.includes('dental') ||
      combinedText.includes('health')
    ) {
      category = 'Healthcare';
      reason = `${input.vendor} appears to be related to healthcare or medical services.`;
    }
    // Entertainment
    else if (
      combinedText.includes('movie') || 
      combinedText.includes('theater') || 
      combinedText.includes('cinema') ||
      combinedText.includes('concert') ||
      combinedText.includes('event') ||
      combinedText.includes('ticket') ||
      combinedText.includes('entertainment')
    ) {
      category = 'Entertainment';
      reason = `${input.vendor} appears to be related to entertainment.`;
    }
    // Travel
    else if (
      combinedText.includes('hotel') || 
      combinedText.includes('airbnb') || 
      combinedText.includes('flight') ||
      combinedText.includes('airline') ||
      combinedText.includes('travel') ||
      combinedText.includes('booking') ||
      combinedText.includes('vacation')
    ) {
      category = 'Travel';
      reason = `${input.vendor} appears to be related to travel or accommodation.`;
    }
    // Shopping
    else if (
      combinedText.includes('amazon') || 
      combinedText.includes('ebay') || 
      combinedText.includes('store') ||
      combinedText.includes('shop') ||
      combinedText.includes('retail') ||
      combinedText.includes('purchase')
    ) {
      category = 'Shopping';
      reason = `${input.vendor} appears to be a retail store or online shopping.`;
    }
    // Default case
    else {
      category = 'Other';
      reason = `Could not confidently categorize this transaction.`;
      flag_for_review = true;
    }

    // If we have a userId, store this categorization for future reference
    if (input.userId && category !== 'Other') {
      try {
        await supabase
          .from('categorization_rules')
          .upsert({
            user_id: input.userId,
            keyword: input.vendor.toLowerCase(),
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

    const response: CategoryResponse = {
      category,
      reason,
      flag_for_review
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