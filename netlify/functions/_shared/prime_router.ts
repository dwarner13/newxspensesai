/**
 * 🎯 Prime Router Module
 * 
 * Day 6: Route user turns to the right AI employee based on intent detection.
 * 
 * Employees:
 * - Prime: General chat & orchestration (default)
 * - Crystal: Analytics, insights, metrics, SEO
 * - Tag: Categorization, PII, transactions, receipts
 * - Byte: Code, tools, ingestion, OCR, parsing
 * 
 * Functions:
 * - routeTurn: Main routing function with confidence scoring
 * - detectIntent: Intent detection (deterministic + LLM fallback)
 */

import { maskPII } from './pii';
import { admin } from './supabase';

// ============================================================================
// TYPES
// ============================================================================

export type Employee = 'prime' | 'crystal' | 'tag' | 'byte';
export type IntentLabel = 'chat' | 'analytics' | 'categorization' | 'code' | 'email' | 'finance' | 'seo' | 'ocr' | 'ingestion' | 'unknown';

export interface RouteTurnParams {
  text: string;
  convoMeta?: { sessionId?: string; [key: string]: any };
  userId: string;
}

export interface RouteResult {
  employee: Employee;
  reason: string;
  confidence: number;
}

// ============================================================================
// INTENT DETECTION
// ============================================================================

/**
 * Detect intent from user text (deterministic rules first)
 */
export function detectIntent(text: string): IntentLabel {
  const lower = text.toLowerCase();
  
  // Tag: Categorization, PII, transactions, receipts
  const tagKeywords = [
    'category', 'categorize', 'categorization', 'vendor', 'merchant',
    'receipt', 'receipts', 'tax', 'pii', 'mask', 'masking',
    'transaction', 'transactions', 'classify', 'classification',
    'canonical', '404' // Finance categorization context
  ];
  if (tagKeywords.some(kw => lower.includes(kw))) {
    return 'categorization';
  }
  
  // Crystal: Analytics, insights, metrics, SEO
  const crystalKeywords = [
    'why', 'trend', 'trends', 'summary', 'summarize', 'insights',
    'kpi', 'metrics', 'analytics', 'analysis', 'analyze',
    'session summary', 'rankmath', 'gsc', 'google search console',
    'spending', 'expenses', 'forecast', 'projection', 'budget'
  ];
  if (crystalKeywords.some(kw => lower.includes(kw))) {
    return 'analytics';
  }
  
  // Byte: Code, tools, ingestion, OCR
  const byteKeywords = [
    'code', 'function', 'error', 'stack trace', 'parse', 'parsing',
    'ocr', 'pdf', 'pipeline', 'ingestion', 'import', 'export',
    'debug', 'fix', 'bug', 'implementation', 'api', 'endpoint'
  ];
  if (byteKeywords.some(kw => lower.includes(kw))) {
    return 'code';
  }
  
  // Finance (general)
  if (/\b(finance|financial|money|payment|payments|invoice|invoices)\b/.test(lower)) {
    return 'finance';
  }
  
  // Email
  if (/\b(email|emails|mail|send|message|reply)\b/.test(lower)) {
    return 'email';
  }
  
  // OCR/Ingestion
  if (/\b(ocr|scan|extract|import|upload|file|files|document|documents)\b/.test(lower)) {
    return 'ocr';
  }
  
  // SEO
  if (/\b(seo|search|ranking|rank|keywords|content|optimization)\b/.test(lower)) {
    return 'seo';
  }
  
  // Default: chat/unknown
  return 'chat';
}

// ============================================================================
// ROUTING LOGIC
// ============================================================================

/**
 * Route turn to appropriate employee
 * 
 * Uses deterministic rules first, then LLM fallback if confidence < 0.6
 */
export async function routeTurn(params: RouteTurnParams): Promise<RouteResult> {
  const { text, convoMeta, userId } = params;
  
  if (!text || !text.trim()) {
    return {
      employee: 'prime',
      reason: 'Empty input, defaulting to Prime',
      confidence: 0.5
    };
  }
  
  // Mask PII before any processing
  const masked = maskPII(text, 'last4').masked;
  
  // Step 1: Deterministic intent detection
  const intent = detectIntent(masked);
  
  let employee: Employee = 'prime';
  let reason = '';
  let confidence = 0.5;
  
  // Map intent to employee
  switch (intent) {
    case 'categorization':
      employee = 'tag';
      reason = 'Detected categorization/receipt/tax intent';
      confidence = 0.8;
      break;
      
    case 'analytics':
      employee = 'crystal';
      reason = 'Detected analytics/insights/metrics intent';
      confidence = 0.8;
      break;
      
    case 'code':
    case 'ocr':
    case 'ingestion':
      employee = 'byte';
      reason = 'Detected code/tools/OCR/ingestion intent';
      confidence = 0.8;
      break;
      
    case 'finance':
      // Finance can go to Crystal (analytics) or Prime (general)
      // Prefer Crystal if it's analysis-focused
      if (/\b(analyze|analysis|trend|forecast|budget|insight)\b/i.test(masked)) {
        employee = 'crystal';
        reason = 'Detected financial analysis intent';
        confidence = 0.7;
      } else {
        employee = 'prime';
        reason = 'Detected general finance intent';
        confidence = 0.6;
      }
      break;
      
    case 'seo':
      employee = 'crystal';
      reason = 'Detected SEO/ranking intent';
      confidence = 0.7;
      break;
      
    case 'email':
      employee = 'prime';
      reason = 'Detected email intent, defaulting to Prime';
      confidence = 0.6;
      break;
      
    case 'chat':
    case 'unknown':
    default:
      employee = 'prime';
      reason = 'General chat or unclear intent, defaulting to Prime';
      confidence = 0.5;
      break;
  }
  
  // Step 2: LLM fallback if confidence is low
  if (confidence < 0.6) {
    try {
      const llmResult = await routeWithLLM(masked, intent);
      if (llmResult.confidence > confidence) {
        employee = llmResult.employee;
        reason = llmResult.reason;
        confidence = llmResult.confidence;
      }
    } catch (e) {
      console.warn('[prime_router] LLM fallback failed, using deterministic result:', e);
      // Fallback to Prime if LLM fails
      if (confidence < 0.5) {
        employee = 'prime';
        reason = 'LLM fallback failed, defaulting to Prime';
        confidence = 0.5;
      }
    }
  }
  
  // Step 3: Log orchestration event (non-blocking)
  logOrchestrationEvent({
    userId,
    convoId: convoMeta?.sessionId,
    employee,
    confidence,
    reason
  }).catch(e => {
    console.warn('[prime_router] Failed to log orchestration event:', e);
  });
  
  return { employee, reason, confidence };
}

/**
 * LLM-based routing fallback (when confidence < 0.6)
 */
async function routeWithLLM(text: string, detectedIntent: IntentLabel): Promise<RouteResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }
  
  const prompt = `Determine which AI employee should handle this user request:

Employees:
- Prime: General chat, orchestration, planning, coordination
- Crystal: Analytics, insights, metrics, trends, financial analysis, SEO
- Tag: Categorization, transactions, receipts, PII masking, tax classification
- Byte: Code, tools, ingestion, OCR, parsing, debugging, technical implementation

User request: "${text}"
Detected intent: ${detectedIntent}

Respond with JSON:
{
  "employee": "prime|crystal|tag|byte",
  "reason": "brief explanation",
  "confidence": 0.0-1.0
}`;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 150
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '{}';
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        employee: parsed.employee || 'prime',
        reason: parsed.reason || 'LLM routing',
        confidence: Math.min(Math.max(parsed.confidence || 0.5, 0), 1)
      };
    }
    
    throw new Error('Failed to parse LLM response');
  } catch (error: any) {
    console.error('[prime_router] LLM routing error:', error);
    throw error;
  }
}

/**
 * Log orchestration event (non-blocking)
 */
async function logOrchestrationEvent(params: {
  userId: string;
  convoId?: string;
  employee: Employee;
  confidence: number;
  reason: string;
}): Promise<void> {
  const { userId, convoId, employee, confidence, reason } = params;
  
  if (!userId) return;
  
  const sb = admin();
  
  try {
    await sb.from('orchestration_events').insert({
      user_id: userId,
      convo_id: convoId || null,
      employee,
      confidence,
      reason,
      created_at: new Date().toISOString()
    });
  } catch (error: any) {
    // Non-blocking: log error but don't throw
    console.warn('[prime_router] Failed to log orchestration event:', error);
  }
}

