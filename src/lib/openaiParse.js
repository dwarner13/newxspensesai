/**
 * OpenAI Transaction Parsing
 * 
 * Uses OpenAI to parse cleaned OCR text into structured transaction data
 */

const fetch = require('node-fetch');

/**
 * Parse transactions from cleaned OCR text using OpenAI
 * @param {string} ocrText - Cleaned OCR text
 * @param {Object} options - Parsing options
 * @param {string} options.docType - "statement" or "receipt"
 * @param {string} options.currency - Currency code (default: "CAD")
 * @returns {Promise<Object>} - Parsed transaction data
 */
async function parseTransactions(ocrText, options = {}) {
  try {
    const { docType = 'statement', currency = 'CAD' } = options;
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    // Select prompt based on document type
    let systemPrompt, userPrompt;
    
    if (docType === 'receipt') {
      systemPrompt = `You are a financial data parser. Parse receipt OCR text into structured transaction data.`;
      userPrompt = `Document type: RECEIPT
Currency: ${currency}

OCR TEXT:
"""
${ocrText}
"""

Rules:
- Parse merchant name, purchase date, and total paid.
- If line items are present, ignore them; we only need one transaction for the receipt.
- Tip/gratuity should be included in amount if present.

Return ONLY valid JSON:
{
  "transactions": [
    {"date":"YYYY-MM-DD|null","description":"merchant or payee","amount":-TOTAL, "type":"debit","category":"string|null","source_confidence":0-1}
  ],
  "errors": [],
  "stats": {"lines":int, "parsed":int, "skipped":int}
}`;
    } else {
      systemPrompt = `You are a financial data parser. Parse bank/card statement OCR text into structured transaction data.`;
      userPrompt = `Document type: BANK_OR_CARD_STATEMENT
Currency: ${currency}

OCR TEXT (noisy):
"""
${ocrText}
"""

Rules:
- Identify every transaction row with a date + description + amount.
- If amount is shown like "123.45-" treat as debit = -123.45
- If tables are broken into multiple lines, attempt to rejoin logically.
- Exclude running balances and section headers.
- Categories: pick a best-fit simple label (e.g., Meals, Groceries, Fuel, Travel, Utilities, Fees, Income, Transfer). Use null if truly unknown.

Return ONLY valid JSON:
{
  "transactions": [
    {"date":"YYYY-MM-DD|null","description":"string","amount":number,"type":"debit|credit","category":"string|null","source_confidence":0-1}
  ],
  "errors": [],
  "stats": {"lines":int, "parsed":int, "skipped":int}
}`;
    }

    console.log(`🤖 Sending ${docType} to OpenAI for parsing...`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    console.log('📝 Raw OpenAI response:', content.substring(0, 200) + '...');

    // Parse JSON response
    let parsedResult;
    try {
      parsedResult = JSON.parse(content);
    } catch (parseError) {
      console.warn('⚠️ First JSON parse failed, retrying with "Return ONLY valid JSON" prompt...');
      
      // Retry with stricter prompt
      const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            },
            {
              role: 'user',
              content: 'Return ONLY valid JSON'
            }
          ],
          temperature: 0.1,
          max_tokens: 4000
        })
      });

      if (!retryResponse.ok) {
        throw new Error(`OpenAI retry failed: ${retryResponse.status}`);
      }

      const retryResult = await retryResponse.json();
      const retryContent = retryResult.choices?.[0]?.message?.content;
      
      if (!retryContent) {
        throw new Error('No response content from OpenAI retry');
      }

      parsedResult = JSON.parse(retryContent);
    }

    // Validate response structure
    if (!parsedResult.transactions || !Array.isArray(parsedResult.transactions)) {
      throw new Error('Invalid response structure: missing transactions array');
    }

    // Process and validate transactions
    const processedTransactions = parsedResult.transactions.map((tx, index) => {
      // Ensure required fields
      const processed = {
        date: tx.date || null,
        description: tx.description || '',
        amount: parseFloat(tx.amount) || 0,
        type: tx.type || (tx.amount < 0 ? 'debit' : 'credit'),
        category: tx.category || null,
        source_confidence: Math.max(0, Math.min(1, parseFloat(tx.source_confidence) || 0.5))
      };

      // Ensure amount is negative for debits
      if (processed.type === 'debit' && processed.amount > 0) {
        processed.amount = -processed.amount;
      }

      return processed;
    });

    const result = {
      transactions: processedTransactions,
      errors: parsedResult.errors || [],
      stats: {
        lines: parsedResult.stats?.lines || 0,
        parsed: processedTransactions.length,
        skipped: parsedResult.stats?.skipped || 0
      }
    };

    console.log(`✅ OpenAI parsing completed: ${processedTransactions.length} transactions found`);
    
    return result;

  } catch (error) {
    console.error('❌ OpenAI parsing error:', error);
    throw new Error(`AI parsing failed: ${error.message}`);
  }
}

module.exports = {
  parseTransactions
};
