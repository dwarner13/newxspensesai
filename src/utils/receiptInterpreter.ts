import { supabase } from '../lib/supabase';

interface ReceiptInput {
  receiptText: string;
}

interface ReceiptResponse {
  vendor: string;
  amount: number;
  category: string;
  reason: string;
}

/**
 * Interprets receipt text using the Supabase Edge Function
 */
export const interpretReceipt = async (receipt: ReceiptInput): Promise<ReceiptResponse> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interpret-receipt`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'x-user-id': user?.id || '',
      },
      body: JSON.stringify({
        receiptText: receipt.receiptText,
        userId: user?.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to interpret receipt');
    }

    return await response.json();
  } catch (error) {
    console.error('Receipt interpretation error:', error);
    
    // Fallback interpretation if the service fails
    return {
      vendor: extractVendorFallback(receipt.receiptText),
      amount: extractAmountFallback(receipt.receiptText),
      category: 'Other',
      reason: 'Interpretation service unavailable. Please categorize manually.'
    };
  }
};

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

/**
 * Test the receipt interpretation service
 */
export const testReceiptInterpreter = async (): Promise<boolean> => {
  try {
    const testReceipt: ReceiptInput = {
      receiptText: "Thank you for shopping at Test Store\nTotal: $10.00"
    };
    
    const response = await interpretReceipt(testReceipt);
    return !!response.vendor && !!response.amount;
  } catch (error) {
    console.error('Receipt interpreter test failed:', error);
    return false;
  }
};