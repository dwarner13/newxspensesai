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

export type Employee = 'prime' | 'crystal' | 'tag' | 'byte' | 'goalie' | 'automa' | 'blitz' | 'liberty' | 'chime' | 'roundtable' | 'serenity' | 'harmony' | 'wave' | 'ledger' | 'intelia' | 'dash' | 'custodian';
export type IntentLabel = 'chat' | 'analytics' | 'categorization' | 'code' | 'email' | 'finance' | 'seo' | 'ocr' | 'ingestion' | 'goalie' | 'automa' | 'debt' | 'freedom' | 'bills' | 'podcast' | 'therapist' | 'wellness' | 'spotify' | 'tax' | 'bi' | 'dash' | 'settings' | 'unknown';

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
  
  // Dash: Analytics dashboards, visualizations (check BEFORE Crystal to avoid conflicts)
  const dashKeywords = ['analytics dashboard', 'dash dashboard', 'dashboard visualization', 'visualization', 'visualizations', 'analytics chart', 'chart', 'charts', 'graph'];
  if (dashKeywords.some(kw => lower.includes(kw)) && !lower.includes('crystal') && !lower.includes('intelia')) {
    return 'dash';
  }
  
  // Intelia: Business intelligence, BI, dashboards (enterprise BI) - check BEFORE Crystal
  const inteliaKeywords = ['bi', 'business intelligence', 'enterprise dashboard', 'enterprise report'];
  if (inteliaKeywords.some(kw => lower.includes(kw))) {
    return 'bi';
  }
  
  // Crystal: Analytics, insights, metrics, SEO (general analytics, NOT dashboards)
  // Note: Check AFTER Dash/Intelia to avoid conflicts with dashboard keywords
  const crystalKeywords = [
    'why', 'trend', 'trends', 'summary', 'summarize', 'insights',
    'kpi', 'metrics', 'analytics', 'analysis', 'analyze',
    'session summary', 'rankmath', 'gsc', 'google search console',
    'spending', 'expenses', 'forecast', 'projection', 'budget'
  ];
  if (crystalKeywords.some(kw => lower.includes(kw)) && !lower.includes('dashboard') && !lower.includes('visualization')) {
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
  if (/\b(finance|finances|financial|money|payment|payments|invoice|invoices)\b/.test(lower)) {
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
  
  // Goalie: Goals, reminders, milestones
  const goalieKeywords = ['goal', 'goals', 'reminder', 'reminders', 'milestone', 'milestones', 'track', 'progress'];
  if (goalieKeywords.some(kw => lower.includes(kw))) {
    return 'goalie';
  }
  
  // Automa: Automation, rules, triggers
  const automaKeywords = ['automation', 'automate', 'rule', 'rules', 'trigger', 'workflow', 'auto'];
  if (automaKeywords.some(kw => lower.includes(kw))) {
    return 'automa';
  }
  
  // Blitz: Debt, payoff, credit
  const blitzKeywords = ['debt', 'payoff', 'credit', 'loan', 'owe', 'borrow'];
  if (blitzKeywords.some(kw => lower.includes(kw))) {
    return 'debt';
  }
  
  // Liberty: Financial freedom, independence
  const libertyKeywords = ['freedom', 'independence', 'financial freedom', 'retire', 'retirement'];
  if (libertyKeywords.some(kw => lower.includes(kw))) {
    return 'freedom';
  }
  
  // Chime: Bills, payments, due dates
  const chimeKeywords = ['bill', 'bills', 'pay bill', 'due date', 'invoice due'];
  if (chimeKeywords.some(kw => lower.includes(kw))) {
    return 'bills';
  }
  
  // Roundtable: Podcast, audio
  const roundtableKeywords = ['podcast', 'audio', 'episode', 'record'];
  if (roundtableKeywords.some(kw => lower.includes(kw))) {
    return 'podcast';
  }
  
  // Serenity: Therapist, mental health, stress
  const serenityKeywords = ['therapist', 'therapy', 'stress', 'anxiety', 'mental health', 'counsel'];
  if (serenityKeywords.some(kw => lower.includes(kw))) {
    return 'therapist';
  }
  
  // Harmony: Wellness, health, fitness
  const harmonyKeywords = ['wellness', 'health', 'fitness', 'exercise', 'workout'];
  if (harmonyKeywords.some(kw => lower.includes(kw))) {
    return 'wellness';
  }
  
  // Wave: Spotify, music, playlist
  const waveKeywords = ['spotify', 'music', 'playlist', 'song', 'songs', 'artist'];
  if (waveKeywords.some(kw => lower.includes(kw))) {
    return 'spotify';
  }
  
  // Ledger: Tax, deduction, compliance
  const ledgerKeywords = ['tax', 'taxes', 'deduction', 'deductions', 'irs', 'gst', 'hst', 'compliance'];
  if (ledgerKeywords.some(kw => lower.includes(kw))) {
    return 'tax';
  }
  
  
  // Custodian: Settings, preferences, configuration
  const custodianKeywords = ['settings', 'preferences', 'config', 'configuration', 'setup'];
  if (custodianKeywords.some(kw => lower.includes(kw))) {
    return 'settings';
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
    
    // Day 15½: Additional employees
    case 'goalie':
      employee = 'goalie';
      reason = 'Detected goal/reminder intent';
      confidence = 0.8;
      break;
    
    case 'automa':
      employee = 'automa';
      reason = 'Detected automation/rule intent';
      confidence = 0.8;
      break;
    
    case 'debt':
      employee = 'blitz';
      reason = 'Detected debt/payoff intent';
      confidence = 0.8;
      break;
    
    case 'freedom':
      employee = 'liberty';
      reason = 'Detected financial freedom intent';
      confidence = 0.8;
      break;
    
    case 'bills':
      employee = 'chime';
      reason = 'Detected bill/payment intent';
      confidence = 0.8;
      break;
    
    case 'podcast':
      employee = 'roundtable';
      reason = 'Detected podcast/audio intent';
      confidence = 0.8;
      break;
    
    case 'therapist':
      employee = 'serenity';
      reason = 'Detected therapy/mental health intent';
      confidence = 0.8;
      break;
    
    case 'wellness':
      employee = 'harmony';
      reason = 'Detected wellness/health intent';
      confidence = 0.8;
      break;
    
    case 'spotify':
      employee = 'wave';
      reason = 'Detected music/spotify intent';
      confidence = 0.8;
      break;
    
    case 'tax':
      employee = 'ledger';
      reason = 'Detected tax/deduction intent';
      confidence = 0.8;
      break;
    
    case 'bi':
      employee = 'intelia';
      reason = 'Detected BI/business intelligence intent';
      confidence = 0.8;
      break;
    
    case 'dash':
      employee = 'dash';
      reason = 'Detected analytics dashboard/visualization intent';
      confidence = 0.8;
      break;
    
    case 'settings':
      employee = 'custodian';
      reason = 'Detected settings/preferences intent';
      confidence = 0.8;
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
- Goalie: Goals, reminders, milestones, progress tracking
- Automa: Automation, rules, triggers, workflows
- Blitz: Debt payoff, credit management, loans
- Liberty: Financial freedom, independence, retirement planning
- Chime: Bills, payments, due dates, invoice management
- Roundtable: Podcast, audio content, episodes
- Serenity: Therapy, mental health, stress management
- Harmony: Wellness, health, fitness, exercise
- Wave: Spotify, music, playlists, songs
- Ledger: Tax, deductions, compliance, GST/HST
- Intelia: Business intelligence, BI dashboards, reports
- Dash: Analytics dashboards, visualizations
- Custodian: Settings, preferences, configuration

User request: "${text}"
Detected intent: ${detectedIntent}

Respond with JSON:
{
  "employee": "prime|crystal|tag|byte|goalie|automa|blitz|liberty|chime|roundtable|serenity|harmony|wave|ledger|intelia|dash|custodian",
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

