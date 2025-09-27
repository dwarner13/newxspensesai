import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'merchant_lookup';

export const inputSchema = z.object({
  vendor: z.string(),
  autoEnrich: z.boolean().default(true),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  merchant: z.object({
    normalizedName: z.string(),
    displayName: z.string(),
    category: z.string().optional(),
    logoUrl: z.string().optional(),
    website: z.string().optional(),
    mccCode: z.string().optional(),
    verified: z.boolean(),
  }).optional(),
  suggestions: z.array(z.string()).optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { vendor, autoEnrich } = input;
    
    const client = getSupabaseServerClient();
    
    // Normalize vendor name
    const normalizedName = normalizeVendor(vendor);
    
    // Look up existing merchant
    const { data: existingMerchant } = await client
      .from('merchant_data')
      .select('*')
      .eq('normalized_name', normalizedName)
      .single();
    
    if (existingMerchant) {
      return Ok({
        ok: true,
        merchant: {
          normalizedName: existingMerchant.normalized_name,
          displayName: existingMerchant.display_name,
          category: existingMerchant.category,
          logoUrl: existingMerchant.logo_url,
          website: existingMerchant.website,
          mccCode: existingMerchant.mcc_code,
          verified: existingMerchant.verified,
        },
      });
    }
    
    // If not found and auto-enrich is enabled, try to enrich
    if (autoEnrich) {
      const enrichedData = await enrichMerchantData(vendor, normalizedName);
      
      if (enrichedData) {
        // Save to database
        const { data: newMerchant, error } = await client
          .from('merchant_data')
          .insert({
            normalized_name: normalizedName,
            display_name: enrichedData.displayName,
            category: enrichedData.category,
            logo_url: enrichedData.logoUrl,
            website: enrichedData.website,
            mcc_code: enrichedData.mccCode,
            verified: false,
            metadata: enrichedData.metadata,
          })
          .select()
          .single();
        
        if (error) {
          console.error('Failed to save merchant data:', error);
        } else {
          return Ok({
            ok: true,
            merchant: {
              normalizedName: newMerchant.normalized_name,
              displayName: newMerchant.display_name,
              category: newMerchant.category,
              logoUrl: newMerchant.logo_url,
              website: newMerchant.website,
              mccCode: newMerchant.mcc_code,
              verified: newMerchant.verified,
            },
          });
        }
      }
    }
    
    // Generate suggestions for manual categorization
    const suggestions = generateCategorySuggestions(vendor);
    
    return Ok({
      ok: true,
      suggestions,
    });
    
  } catch (error) {
    return Err(error as Error);
  }
}

function normalizeVendor(vendor: string): string {
  return vendor.toLowerCase()
    .replace(/\s+(inc|ltd|llc|corp|co|store|#\d+).*$/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

async function enrichMerchantData(vendor: string, normalizedName: string): Promise<any> {
  // Mock implementation - in production, integrate with:
  // - Google Places API
  // - Foursquare API
  // - Merchant databases
  // - Web scraping
  
  const category = categorizeByPattern(vendor);
  const mccCode = getMCCByCategory(category);
  
  return {
    displayName: vendor,
    category,
    mccCode,
    metadata: {
      source: 'pattern_matching',
      confidence: 0.7,
    },
  };
}

function categorizeByPattern(vendor: string): string {
  const patterns = [
    { pattern: /grocery|supermarket|walmart|metro|loblaws|sobeys/i, category: 'Groceries' },
    { pattern: /gas|fuel|petro|shell|esso|chevron|bp/i, category: 'Transportation' },
    { pattern: /restaurant|cafe|coffee|tim hortons|starbucks|mcdonalds|burger/i, category: 'Dining' },
    { pattern: /pharmacy|drugs|shoppers|rexall|walgreens/i, category: 'Healthcare' },
    { pattern: /amazon|ebay|shopify|retail|store/i, category: 'Shopping' },
    { pattern: /hydro|electric|gas bill|utility|telus|rogers/i, category: 'Utilities' },
    { pattern: /rent|mortgage|property|real estate/i, category: 'Housing' },
    { pattern: /bank|credit|financial|investment/i, category: 'Financial' },
    { pattern: /insurance|car insurance|home insurance/i, category: 'Insurance' },
    { pattern: /gym|fitness|sport|recreation/i, category: 'Recreation' },
  ];
  
  const vendorLower = vendor.toLowerCase();
  
  for (const { pattern, category } of patterns) {
    if (pattern.test(vendorLower)) {
      return category;
    }
  }
  
  return 'Other';
}

function getMCCByCategory(category: string): string {
  const mccMap: Record<string, string> = {
    'Groceries': '5411',
    'Transportation': '5541',
    'Dining': '5812',
    'Healthcare': '5912',
    'Shopping': '5999',
    'Utilities': '4900',
    'Housing': '6513',
    'Financial': '6011',
    'Insurance': '6300',
    'Recreation': '7991',
    'Other': '5999',
  };
  
  return mccMap[category] || '5999';
}

function generateCategorySuggestions(vendor: string): string[] {
  const suggestions: string[] = [];
  
  // Analyze vendor name for common patterns
  const vendorLower = vendor.toLowerCase();
  
  if (vendorLower.includes('coffee') || vendorLower.includes('cafe')) {
    suggestions.push('Dining - Coffee Shop');
  }
  
  if (vendorLower.includes('gas') || vendorLower.includes('fuel')) {
    suggestions.push('Transportation - Gas Station');
  }
  
  if (vendorLower.includes('pharmacy') || vendorLower.includes('drug')) {
    suggestions.push('Healthcare - Pharmacy');
  }
  
  if (vendorLower.includes('grocery') || vendorLower.includes('market')) {
    suggestions.push('Groceries - Supermarket');
  }
  
  if (vendorLower.includes('restaurant') || vendorLower.includes('food')) {
    suggestions.push('Dining - Restaurant');
  }
  
  if (vendorLower.includes('store') || vendorLower.includes('shop')) {
    suggestions.push('Shopping - Retail Store');
  }
  
  // Add generic suggestions if no specific patterns found
  if (suggestions.length === 0) {
    suggestions.push('Shopping - General');
    suggestions.push('Other - Uncategorized');
  }
  
  return suggestions;
}

export const metadata = {
  name: 'Merchant Lookup',
  description: 'Look up and enrich merchant information for better categorization',
  requiresConfirmation: false,
  dangerous: false,
  category: 'data_management',
};
