import { aiCategorizer } from './aiCategorizer';
import { supabase } from '../lib/supabase';

interface VendorMemory {
  vendor: string;
  category: string;
  subcategory?: string;
  confidence: number;
}

export class SmartCategorizer {
  private vendorMemory: Map<string, VendorMemory> = new Map();

  constructor() {
    this.loadVendorMemory();
  }

  private async loadVendorMemory() {
    try {
      const { data: rules } = await supabase
        .from('categorization_rules')
        .select('keyword, category, subcategory, match_count');

      if (rules) {
        rules.forEach(rule => {
          this.vendorMemory.set(rule.keyword.toLowerCase(), {
            vendor: rule.keyword,
            category: rule.category,
            subcategory: rule.subcategory,
            confidence: Math.min(rule.match_count / 10, 1) // Normalize to 0-1
          });
        });
      }
    } catch (error) {
      console.error('Error loading vendor memory:', error);
    }
  }

  private findVendorMatch(description: string): VendorMemory | null {
    const normalizedDesc = description.toLowerCase();
    
    // Check for exact matches first
    for (const [vendor, memory] of this.vendorMemory) {
      if (normalizedDesc.includes(vendor)) {
        return memory;
      }
    }
    
    return null;
  }

  async categorizeWithMemory(description: string): Promise<{
    category: string;
    subcategory?: string;
    source: 'memory' | 'ai' | 'default';
    confidence: number;
  }> {
    // First check vendor memory
    const memoryMatch = this.findVendorMatch(description);
    if (memoryMatch && memoryMatch.confidence > 0.7) {
      return {
        category: memoryMatch.category,
        subcategory: memoryMatch.subcategory,
        source: 'memory',
        confidence: memoryMatch.confidence
      };
    }

    // Fall back to AI categorization
    try {
      const aiResult = await aiCategorizer.categorizeTransactions(
        `${new Date().toISOString().split('T')[0]}    ${description}    $0.00`
      );
      
      if (aiResult.length > 0) {
        const result = aiResult[0];
        
        // Store in memory for future use
        await this.storeVendorMemory(description, result.category);
        
        return {
          category: result.category,
          source: 'ai',
          confidence: 0.8
        };
      }
    } catch (error) {
      console.error('AI categorization failed:', error);
    }

    // Default fallback
    return {
      category: 'Other',
      source: 'default',
      confidence: 0.1
    };
  }

  private async storeVendorMemory(description: string, category: string) {
    try {
      const keyword = this.extractKeyword(description);
      
      await supabase
        .from('categorization_rules')
        .upsert({
          keyword,
          category,
          match_count: 1
        }, {
          onConflict: 'user_id,keyword'
        });

      // Update local memory
      this.vendorMemory.set(keyword.toLowerCase(), {
        vendor: keyword,
        category,
        confidence: 0.1
      });
    } catch (error) {
      console.error('Error storing vendor memory:', error);
    }
  }

  private extractKeyword(description: string): string {
    // Extract meaningful keywords from description
    return description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 2)
      .join(' ');
  }
}

export const smartCategorizer = new SmartCategorizer();