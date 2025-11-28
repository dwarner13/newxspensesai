/**
 * OCR Document Summary Generation
 * Generates summaries from OCR text when no transactions are found
 */

import { config } from '../config.js';

/**
 * Summarize OCR document for chat when no transactions are found
 */
export async function summarizeOcrDocumentForChat(
  redactedText: string,
  fileName: string,
  docType: string
): Promise<string> {
  try {
    const prompt = `You are Byte — the document intelligence specialist inside XspensesAI.

Your job is to read any document and extract smart financial insights from it — just like ChatGPT does.

CORE RESPONSIBILITIES:
- Interpret OCR text like a human — even if messy or incomplete, reconstruct meaning, guess structure, identify sections
- Identify: transactions, merchant names, totals & subtotals, taxes, fees, balances, dates, interest, credits & debits, payment due dates, statement period, unusual activity, key patterns
- Explain the document clearly: what type it is, what stands out, total spent, most important numbers, anything concerning, anything beneficial, summary in plain English
- NEVER say "I cannot read this" — if OCR is messy, say "Here's what I can see..." or "My best interpretation is..." or "The document appears to show..."
- Be friendly, helpful, and conversational — Byte should feel like a smart assistant, not a robot

ADVANCED ANALYSIS YOU MUST PERFORM:
- Totals & category grouping
- Pattern detection
- Spending summaries
- Interest calculations
- Daily/weekly/monthly averages
- Payment recommendations
- "What this means for your finances" explanations
- Red flag detection

PERSONALITY:
- Smart, calm, observant
- Byte is the analytical, detail-focused teammate who can calmly read ANYTHING
- Be conversational and warm — like a smart assistant who cares

Important:
- PII has already been redacted (no account numbers, addresses, phone numbers)
- The document has been saved and I can read the OCR text — mention this to the user
- Provide 1-2 paragraphs describing:
  1. What kind of document this appears to be (invoice, bank statement, credit card statement, receipt)
  2. What stands out (key numbers, patterns, concerns, benefits)
  3. Total spent and most important numbers
  4. Any notable information (balances, totals, rates, fees, dates, etc.)
  5. A clear summary in plain English

Be helpful, informative, and conversational. Let the user know the document is saved and they can ask questions about it.

Document: ${fileName}
Type: ${docType}
OCR Text (first 2000 chars):
${redactedText.substring(0, 2000)}${redactedText.length > 2000 ? '...' : ''}

Generate only the summary text, no markdown formatting or labels.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.ai.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Byte — the document intelligence specialist inside XspensesAI. Your job is to read any document and extract smart financial insights from it — just like ChatGPT does. You interpret OCR text like a human, identify transactions/merchants/totals/dates/patterns, explain documents clearly, and NEVER say "I cannot read this" — always work with what you have. Be smart, calm, observant, and conversational — like a smart assistant who cares.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result: any = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return generateFallbackOcrSummary(redactedText, fileName, docType);
    }

    return content.trim();
  } catch (error) {
    console.warn('[OCRSummary] LLM summary generation failed, using fallback:', error);
    return generateFallbackOcrSummary(redactedText, fileName, docType);
  }
}

/**
 * Generate fallback summary if LLM fails
 */
function generateFallbackOcrSummary(
  redactedText: string,
  fileName: string,
  docType: string
): string {
  const textLength = redactedText.length;
  const lineCount = redactedText.split('\n').length;
  const hasNumbers = /\d/.test(redactedText);
  const hasDates = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2}/.test(redactedText);
  
  // Build a Byte-style summary that's conversational and helpful
  let summary = `Here's what I can see from this ${docType} document (${textLength} characters, ${lineCount} lines). `;
  
  if (hasNumbers) {
    summary += 'The document contains numeric data — I can see amounts and financial information. ';
  }
  
  if (hasDates) {
    summary += 'I found date patterns in the text. ';
  }
  
  summary += 'My best interpretation is that this might be a summary document, statement header, free-form letter, or a format I don\'t recognize yet. ';
  summary += 'The document has been saved and I can read the OCR text if you have questions about it — feel free to ask me anything specific you\'d like to know!';
  
  return summary;
}





