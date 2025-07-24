import { supabase } from '../lib/supabase';

interface ReceiptInput {
  receipt_text: string;
  user_memory?: {
    vendor_name: string;
    actual_category: string;
  }[];
  user_goals?: {
    category_tracked: string;
    target_amount: number;
    current_total: number;
  }[];
}

interface ReceiptOutput {
  vendor: string;
  amount: number;
  category: string;
  reason: string;
  flag_for_review: boolean;
  goal_alert?: string;
}

/**
 * Smart receipt categorizer that uses AI, memory, and personalization
 */
export const categorizeReceipt = async (input: ReceiptInput): Promise<ReceiptOutput> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch user's categorization rules from database
    let userMemory = input.user_memory || [];
    
    if (user && !input.user_memory) {
      const { data: rules } = await supabase
        .from('categorization_rules')
        .select('keyword, category, subcategory')
        .eq('user_id', user.id);
        
      if (rules) {
        userMemory = rules.map(rule => ({
          vendor_name: rule.keyword,
          actual_category: rule.category
        }));
      }
    }
    
    // Fetch user's goals from database
    let userGoals = input.user_goals || [];
    
    if (user && !input.user_goals) {
      const { data: goals } = await supabase
        .from('savings_goals')
        .select('category, target_amount, current_amount')
        .eq('user_id', user.id)
        .eq('completed', false);
        
      if (goals) {
        userGoals = goals.map(goal => ({
          category_tracked: goal.category,
          target_amount: goal.target_amount,
          current_total: goal.current_amount
        }));
      }
    }
    
    // Call the edge function
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/receipt-smart-categorizer`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'x-user-id': user?.id || '',
      },
      body: JSON.stringify({
        receipt_text: input.receipt_text,
        user_memory: userMemory,
        user_goals: userGoals
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to categorize receipt');
    }

    const result = await response.json();
    
    // If we have a user and the categorization was successful, update any relevant goals
    if (user && result.category && !result.flag_for_review) {
      updateGoalsIfNeeded(user.id, result.category, result.amount);
    }
    
    return result;
  } catch (error) {
    console.error('Receipt categorization error:', error);
    
    // Fallback categorization if the service fails
    return {
      vendor: extractVendorFallback(input.receipt_text),
      amount: extractAmountFallback(input.receipt_text),
      category: 'Other',
      reason: 'Categorization service unavailable. Please categorize manually.',
      flag_for_review: true
    };
  }
};

/**
 * Update user goals if the transaction affects them
 */
async function updateGoalsIfNeeded(userId: string, category: string, amount: number) {
  try {
    // Find goals that match this category
    const { data: goals } = await supabase
      .from('savings_goals')
      .select('id, category, target_amount, current_amount')
      .eq('user_id', userId)
      .eq('category', category)
      .eq('completed', false);
      
    if (goals && goals.length > 0) {
      // Update the goal progress
      for (const goal of goals) {
        const newAmount = goal.current_amount + amount;
        const completed = newAmount >= goal.target_amount;
        
        await supabase
          .from('savings_goals')
          .update({ 
            current_amount: newAmount,
            completed
          })
          .eq('id', goal.id);
          
        // If goal was completed, award XP
        if (completed) {
          await supabase
            .from('xp_activities')
            .insert({
              user_id: userId,
              activity_type: 'goal_completed',
              xp_earned: 25,
              description: `Completed ${category} goal`
            });
        }
      }
    }
  } catch (error) {
    console.error('Error updating goals:', error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Fallback vendor extraction for client-side use when the service is unavailable
 */
function extractVendorFallback(text: string): string {
  const lines = text.split('\n').map(line => line.trim());
  
  // Try to find a vendor name in the first few lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    if (line && !line.match(/^(date|time|receipt|transaction|tel|phone|address|#)/i)) {
      return line;
    }
  }
  
  return "Unknown Vendor";
}

/**
 * Fallback amount extraction for client-side use when the service is unavailable
 */
function extractAmountFallback(text: string): number {
  const lines = text.split('\n');
  
  // Common patterns for total amount
  const totalPatterns = [
    /total:?\s*\$?(\d+\.\d{2})/i,
    /amount:?\s*\$?(\d+\.\d{2})/i,
    /sum:?\s*\$?(\d+\.\d{2})/i,
    /\btotal\b.*\$?(\d+\.\d{2})/i,
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
  
  // Last resort - look for any dollar amount
  const dollarPattern = /\$(\d+\.\d{2})/;
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(dollarPattern);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
  }
  
  return 0;
}