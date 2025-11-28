/**
 * 📄 Document Insights Endpoint
 * 
 * Server-side function for Prime to answer questions about documents
 * Uses OCR text and parsed transactions from user_documents table
 * 
 * API Format:
 * POST /.netlify/functions/document-insights
 * Body: { userId, docId, question?, insightMode? }
 * 
 * Response: { answer: string, summary?: string, stats?: object }
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import OpenAI from 'openai';

// ============================================================================
// TYPES
// ============================================================================

interface DocumentInsightsRequest {
  userId: string;
  docId: string;
  question?: string; // For Q&A mode
  insightMode?: 'period_summary' | 'qa'; // Default: 'qa'
}

interface DocumentInsightsResponse {
  answer: string;
  summary?: string;
  stats?: {
    transactionCount: number;
    totalDebits?: number;
    totalCredits?: number;
    hasTransactions: boolean;
    hasOcrText: boolean;
  };
  error?: string;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

if (!openai) {
  console.warn('[DocumentInsights] OpenAI API key not configured');
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}') as DocumentInsightsRequest;
    const { userId, docId, question, insightMode = 'qa' } = body;

    // Validate required fields
    if (!userId || !docId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: userId and docId are required' 
        } as DocumentInsightsResponse),
      };
    }

    // Validate OpenAI is configured
    if (!openai) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'OpenAI API key not configured on server',
          answer: 'I had trouble reaching the AI for this document. Your OCR text is saved. Please try again or check your API key on the server.'
        } as DocumentInsightsResponse),
      };
    }

    console.log('[DocumentInsights] Processing request:', { userId, docId, insightMode, hasQuestion: !!question });

    // Load document from Supabase
    const sb = admin();
    
    // Get document with OCR text
    const { data: document, error: docError } = await sb
      .from('user_documents')
      .select('id, user_id, original_name, doc_type, ocr_text, created_at')
      .eq('id', docId)
      .eq('user_id', userId) // Security: only allow user to read their own documents
      .maybeSingle();

    if (docError) {
      console.error('[DocumentInsights] Error loading document:', docError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to load document',
          answer: 'I had trouble loading this document. Please try again.'
        } as DocumentInsightsResponse),
      };
    }

    if (!document) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Document not found',
          answer: 'I couldn\'t find this document. It may have been deleted or you may not have access to it.'
        } as DocumentInsightsResponse),
      };
    }

    // Security check: ensure user_id matches
    if (document.user_id !== userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Access denied',
          answer: 'You don\'t have access to this document.'
        } as DocumentInsightsResponse),
      };
    }

    const ocrText = document.ocr_text || '';
    const hasOcrText = ocrText.trim().length > 0;

    if (!hasOcrText) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'No OCR text available',
          answer: 'This document doesn\'t have OCR text yet. It may still be processing, or OCR may have failed. Please try uploading again or contact support.',
          stats: {
            transactionCount: 0,
            hasTransactions: false,
            hasOcrText: false,
          }
        } as DocumentInsightsResponse),
      };
    }

    // Try to load parsed transactions from transactions_staging or transactions table
    // First check imports table to find import_id
    const { data: importRecord } = await sb
      .from('imports')
      .select('id')
      .eq('document_id', docId)
      .eq('user_id', userId)
      .maybeSingle();

    let transactions: any[] = [];
    let transactionStats = {
      transactionCount: 0,
      totalDebits: 0,
      totalCredits: 0,
    };

    if (importRecord?.id) {
      // Load transactions from transactions_staging
      const { data: stagingTransactions } = await sb
        .from('transactions_staging')
        .select('data_json')
        .eq('import_id', importRecord.id)
        .eq('user_id', userId);

      if (stagingTransactions && stagingTransactions.length > 0) {
        transactions = stagingTransactions.map(st => st.data_json);
        
        // Calculate stats
        transactionStats.transactionCount = transactions.length;
        for (const tx of transactions) {
          const amount = Math.abs(tx.amount || 0);
          if (tx.type === 'expense' || tx.direction === 'debit') {
            transactionStats.totalDebits += amount;
          } else {
            transactionStats.totalCredits += amount;
          }
        }
      }
    }

    // Also check transactions table (in case they were already committed)
    if (transactions.length === 0) {
      const { data: committedTransactions } = await sb
        .from('transactions')
        .select('date, merchant, description, amount, type, category')
        .eq('document_id', docId)
        .eq('user_id', userId)
        .limit(100); // Limit to prevent huge responses

      if (committedTransactions && committedTransactions.length > 0) {
        transactions = committedTransactions;
        
        // Calculate stats
        transactionStats.transactionCount = transactions.length;
        for (const tx of transactions) {
          const amount = Math.abs(tx.amount || 0);
          if (tx.type === 'expense') {
            transactionStats.totalDebits += amount;
          } else {
            transactionStats.totalCredits += amount;
          }
        }
      }
    }

    const hasTransactions = transactions.length > 0;

    console.log('[DocumentInsights] Loaded document:', {
      docId,
      ocrTextLength: ocrText.length,
      transactionCount: transactions.length,
      hasTransactions,
    });

    // Build prompt based on mode
    let prompt: string;
    let systemMessage: string;

    if (insightMode === 'period_summary') {
      // Period summary mode: analyze spending patterns
      systemMessage = `You are Prime — the lead financial intelligence agent inside XspensesAI.

Your job is to think deeply, reason clearly, and give helpful, personalized, and financially smart answers.

CORE BEHAVIOR:
- Think step-by-step before answering
- Use deep reasoning, comparisons, summaries, and calculations
- Be empathetic, casual, and human — talk like a smart financial buddy
- Be warm, witty, supportive, and smart — like ChatGPT + Financial Advisor + Friendly Guide
- NEVER say "I don't have access" — if data is missing, say "Here's what I can see..." or "Based on the OCR, here's what stands out..."

When analyzing documents:
- Extract amounts, dates, merchants, balances
- Identify patterns and trends
- Provide insights and highlight important numbers
- Give helpful next steps
- Perform calculations (spending summaries, category totals, projections, income vs expenses)`;
      
      if (hasTransactions) {
        // Build transaction summary
        const categoryMap = new Map<string, { count: number; total: number }>();
        for (const tx of transactions) {
          const cat = tx.category || 'Uncategorized';
          const existing = categoryMap.get(cat) || { count: 0, total: 0 };
          categoryMap.set(cat, {
            count: existing.count + 1,
            total: existing.total + Math.abs(tx.amount || 0),
          });
        }

        const topCategories = Array.from(categoryMap.entries())
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 5)
          .map(([cat, data]) => `${cat}: $${data.total.toFixed(2)} (${data.count} transactions)`)
          .join('; ');

        prompt = `Analyze this financial period and provide insightful, personalized analysis.

Document: ${document.original_name || 'Unknown'}
Type: ${document.doc_type || 'bank_statement'}
Total transactions: ${transactionStats.transactionCount}
Total spending: $${transactionStats.totalDebits.toFixed(2)}
Total inflows: $${transactionStats.totalCredits.toFixed(2)}
Top categories: ${topCategories}

OCR Text (for additional context):
${ocrText.substring(0, 2000)}${ocrText.length > 2000 ? '...' : ''}

Your analysis should:
- Think step-by-step: What patterns do you see? What stands out?
- Be conversational and warm — talk like a smart financial buddy, not a robot
- Provide 1-2 paragraphs of overall analysis with deep reasoning
- Include a short bullet list of key insights
- Focus on spending patterns, notable vendors, fees, subscriptions, or unusual activity
- Highlight important numbers and what they mean
- Give helpful next steps or recommendations
- Use comparisons ("You're spending X% more on Y this period")
- Be empathetic and supportive

PII has already been redacted from OCR text.

Generate only the analysis text, no markdown formatting or labels. Write naturally, like you're explaining to a friend.`;
      } else {
        // No transactions, but we have OCR text
        prompt = `Analyze this financial document using the OCR text. Even though there are no structured transactions, you MUST still provide intelligent analysis.

Document: ${document.original_name || 'Unknown'}
Type: ${document.doc_type || 'bank_statement'}

OCR Text:
${ocrText.substring(0, 4000)}${ocrText.length > 4000 ? '...' : ''}

Your analysis MUST:
- Read the OCR text intelligently — extract amounts, dates, merchants, totals, subtotals, taxes
- Identify what type of document it is (invoice, receipt, statement, etc.)
- Extract key financial information: totals, dates, merchant names, amounts, fees, interest
- Provide 1-2 paragraphs summarizing what you found
- Include specific numbers and dates when available
- Explain what the document means in plain language
- Highlight important numbers and what they mean
- Give helpful insights and next steps
- Be conversational and warm — talk like a smart financial buddy
- NEVER say "I don't have access" or "I can't see" — say "Here's what I can see..." or "Based on the OCR text..."

PII has already been redacted.

Generate only the analysis text, no markdown formatting or labels. Write naturally, like you're explaining to a friend.`;
      }
    } else {
      // Q&A mode: answer specific question
      systemMessage = `You are Prime — the lead financial intelligence agent inside XspensesAI.

Your job is to think deeply, reason clearly, and give helpful, personalized, and financially smart answers.

CORE BEHAVIOR:
- Think step-by-step before answering
- Use deep reasoning, comparisons, summaries, and calculations
- Read user documents intelligently — you can see OCR text, parsed transactions, amounts, dates, merchants, balances
- Answer questions EVEN IF transactions = 0, OCR is messy, document is a screenshot, it's an invoice not a statement, or only partial text exists
- STILL ANSWER based on what you can understand
- NEVER say "I don't have access" — if data is missing, say "Here's what I can see..." or "Based on the OCR, here's what stands out..."
- Be empathetic, casual, and human — talk like a smart financial buddy, supportive and encouraging, never robotic
- Perform advanced analysis: spending summaries, category totals, payoff timelines, monthly/annual projections, income vs expenses, trend detection, scenario math
- Be warm, witty, supportive, and smart — like ChatGPT + Financial Advisor + Friendly Guide

When answering questions:
- Search transactions and compute amounts clearly
- Analyze deposits/credits to produce totals
- Interpret invoices and documents like ChatGPT does
- Do the math for projections and scenarios
- Look for specific lines and interpret them
- Be honest but helpful — don't invent transactions, but still provide insights`;
      
      if (!question) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Question is required for Q&A mode',
            answer: 'Please provide a question about this document.'
          } as DocumentInsightsResponse),
        };
      }

      if (hasTransactions) {
        // Build transaction summary for context
        const sampleTransactions = transactions
          .slice(0, 10)
          .map(tx => {
            const date = tx.date || 'N/A';
            const merchant = tx.merchant || 'Unknown';
            const amount = Math.abs(tx.amount || 0);
            const category = tx.category || 'Uncategorized';
            return `${date}: ${merchant} - $${amount.toFixed(2)} (${category})`;
          })
          .join('\n');

        const categorySummary = Array.from(
          new Map(transactions.map(tx => [
            tx.category || 'Uncategorized',
            transactions.filter(t => (t.category || 'Uncategorized') === (tx.category || 'Uncategorized')).length
          ])).entries()
        )
          .slice(0, 10)
          .map(([cat, count]) => `${cat}: ${count} transactions`)
          .join('; ');

        prompt = `Answer this question about the financial document. Think step-by-step and provide a helpful, personalized answer.

Question: ${question}

Document context:
- File: ${document.original_name || 'Unknown'}
- Type: ${document.doc_type || 'bank_statement'}
- Total transactions: ${transactionStats.transactionCount}
- Total spending: $${transactionStats.totalDebits.toFixed(2)}
- Total inflows: $${transactionStats.totalCredits.toFixed(2)}

Categories:
${categorySummary}

Sample transactions:
${sampleTransactions}

OCR Text (for additional context):
${ocrText.substring(0, 2000)}${ocrText.length > 2000 ? '...' : ''}

Your answer should:
- Think step-by-step: What does the question ask? What data do I have? How do I compute the answer?
- Search through transactions and OCR text to find relevant information
- Perform calculations if needed (totals, percentages, projections, etc.)
- Provide a clear, conversational answer — talk like a smart financial buddy
- Use bullet points if helpful
- Reference specific numbers from transactions or OCR text
- Be empathetic and supportive
- If the question can't be fully answered, say "Here's what I can see..." and provide partial insights
- NEVER say "I don't have access" — always work with what you have

PII has already been redacted.

Generate only the answer text. Write naturally, like you're explaining to a friend.`;
      } else {
        // No transactions, answer from OCR text only
        prompt = `Answer this question about the financial document using the OCR text. Even though there are no structured transactions, you MUST still answer intelligently.

Question: ${question}

Document context:
- File: ${document.original_name || 'Unknown'}
- Type: ${document.doc_type || 'bank_statement'}
- Note: This document didn't have structured transaction rows, but the OCR text contains the full document content

OCR Text:
${ocrText.substring(0, 6000)}${ocrText.length > 6000 ? '...' : ''}

Your answer MUST:
- Read the OCR text intelligently — extract amounts, dates, merchants, totals, subtotals, taxes
- Think step-by-step: What does the question ask? What can I find in the OCR text?
- Answer the question using information from the OCR text
- Extract specific numbers, dates, merchant names, amounts, totals, etc. from the text
- Provide a clear, conversational answer — talk like a smart financial buddy
- Use bullet points if helpful
- Be empathetic and supportive
- NEVER say "I don't have access" or "I can't see" — say "Here's what I can see..." or "Based on the OCR text..."
- If the question can't be fully answered, provide partial insights based on what you can understand
- Interpret invoices, receipts, and documents like ChatGPT would — explain what they mean

PII has already been redacted.

Generate only the answer text. Write naturally, like you're explaining to a friend.`;
      }
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: insightMode === 'period_summary' ? 300 : 400,
    });

    const answer = completion.choices[0]?.message?.content?.trim() || 
      'I reviewed the document, but I need more context to provide a complete answer.';

    const response: DocumentInsightsResponse = {
      answer,
      stats: {
        transactionCount: transactionStats.transactionCount,
        totalDebits: transactionStats.totalDebits,
        totalCredits: transactionStats.totalCredits,
        hasTransactions,
        hasOcrText: true,
      },
    };

    if (insightMode === 'period_summary') {
      response.summary = answer; // For period summary, answer IS the summary
    }

    console.log('[DocumentInsights] Success:', {
      docId,
      answerLength: answer.length,
      transactionCount: transactionStats.transactionCount,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('[DocumentInsights] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        answer: 'I had trouble reaching the AI for this document. Your OCR text is saved. Please try again or check your API key on the server.'
      } as DocumentInsightsResponse),
    };
  }
};

