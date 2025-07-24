interface TransactionData {
  date: string;
  description: string;
  category: string;
  amount: string;
}

interface CategorizationRequest {
  input: string;
}

export class AIFinancialCategorizer {
  private openAIKey: string;

  constructor() {
    this.openAIKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  }

  async categorizeTransactions(inputText: string): Promise<TransactionData[]> {
    if (!this.openAIKey) {
      throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your environment variables.');
    }

    const prompt = `You are a financial categorization assistant.

For each line of transaction data, extract:
- date: the transaction date (YYYY-MM-DD format)
- description: the vendor/merchant name (clean, no extra characters)
- category: one of [Food, Travel, Utilities, Office, Income, Shopping, Healthcare, Entertainment, Transportation, Housing, Other]
- amount: in numbers only (no currency symbol, positive number)

Return the result as compact JSON array:
[
  { "date": "", "description": "", "category": "", "amount": "" }
]

If a line is invalid, blank, or cannot be parsed, skip it completely.

IMPORTANT: Only return valid JSON. No explanations or additional text.

Input data:
${inputText}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a financial transaction categorization expert. Always return valid JSON arrays only. Never include explanations or additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific OpenAI errors
        if (response.status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your VITE_OPENAI_API_KEY environment variable.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status === 402) {
          throw new Error('OpenAI API quota exceeded. Please check your billing and usage limits.');
        }
        
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response from AI categorizer');
      }

      // Clean the response to ensure it's valid JSON
      const cleanContent = content.trim();
      let transactions: TransactionData[];

      try {
        transactions = JSON.parse(cleanContent);
      } catch (parseError) {
        // Try to extract JSON from the response if it contains extra text
        const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          transactions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Invalid JSON response from AI');
        }
      }
      
      // Validate the response structure
      if (!Array.isArray(transactions)) {
        throw new Error('AI response is not an array');
      }

      // Filter and validate transactions
      const validTransactions = transactions.filter(t => {
        return t && 
               typeof t === 'object' &&
               t.date && 
               t.description && 
               t.category && 
               t.amount &&
               !isNaN(parseFloat(t.amount));
      });

      return validTransactions;

    } catch (error) {
      console.error('AI categorization error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new Error('OpenAI API key is not configured. Please add your API key to continue.');
        } else if (error.message.includes('quota')) {
          throw new Error('OpenAI API quota exceeded. Please check your usage limits.');
        } else if (error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
      }
      
      throw new Error('Failed to categorize transactions with AI. Please try again.');
    }
  }

  async categorizeBatch(rows: string[], batchSize: number = 20): Promise<TransactionData[]> {
    const results: TransactionData[] = [];
    
    // Process in batches to avoid token limits
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const inputText = batch.join('\n');
      
      try {
        const batchResults = await this.categorizeTransactions(inputText);
        results.push(...batchResults);
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < rows.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
        
        // Create fallback entries for failed batch
        const fallbackResults: TransactionData[] = batch.map(row => {
          const parts = row.split(/\s+/);
          return {
            date: new Date().toISOString().split('T')[0],
            description: parts.slice(1, -1).join(' ') || 'Unknown Transaction',
            category: 'Other',
            amount: '0.00'
          };
        });
        
        results.push(...fallbackResults);
      }
    }
    
    return results;
  }

  // Test the AI connection
  async testConnection(): Promise<boolean> {
    try {
      const testResult = await this.categorizeTransactions('2024-01-01 TEST TRANSACTION $10.00');
      return testResult.length > 0;
    } catch (error) {
      console.error('AI connection test failed:', error);
      return false;
    }
  }

  // Get usage statistics
  getUsageStats() {
    return {
      batchSize: 20,
      maxTokens: 2000,
      model: 'gpt-3.5-turbo',
      estimatedCostPer1000Tokens: 0.002 // USD
    };
  }
}

// Singleton instance
export const aiCategorizer = new AIFinancialCategorizer();