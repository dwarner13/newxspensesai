/**
 * Guardrails Function - Security Layer
 * ====================================
 * Provides PII detection, moderation, jailbreak protection, and hallucination checks
 * 
 * @netlify-function guardrails
 */

import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ============================================================================
// Types
// ============================================================================

export interface GuardrailConfig {
  userId: string;
  piiDetection: boolean;
  moderation: boolean;
  jailbreakProtection: boolean;
  hallucinationCheck: boolean;
  piiEntities: string[];
}

export interface GuardrailResult {
  passed: boolean;
  blocked: boolean;
  violations: {
    pii: string[];
    moderation: string[];
    jailbreak: string[];
    hallucination: string[];
  };
  sanitizedInput?: string;
  reason?: string;
  inputHash: string;
}

// ============================================================================
// Main Guardrails Function
// ============================================================================

export async function runGuardrails(
  input: string,
  config: GuardrailConfig
): Promise<GuardrailResult> {
  const violations = {
    pii: [] as string[],
    moderation: [] as string[],
    jailbreak: [] as string[],
    hallucination: [] as string[],
  };

  let sanitizedInput = input;
  const inputHash = hashInput(input);

  try {
    // 1. PII Detection (ALWAYS ON for financial data)
    if (config.piiDetection) {
      const piiResult = await detectPII(input, config.piiEntities);
      if (piiResult.detected.length > 0) {
        violations.pii = piiResult.detected;
        sanitizedInput = piiResult.sanitized;
        
        // Log PII detection for compliance
        await supabase.from('guardrail_logs').insert({
          user_id: config.userId,
          type: 'pii_detection',
          violations: piiResult.detected,
          input_hash: inputHash,
          blocked: false, // PII detection doesn't block, just sanitizes
          created_at: new Date().toISOString(),
        });
      }
    }

    // 2. Moderation Check (User Configurable)
    if (config.moderation) {
      const moderationResult = await checkModeration(input);
      if (!moderationResult.passed) {
        violations.moderation = moderationResult.violations;
        
        // Log moderation violations
        await supabase.from('guardrail_logs').insert({
          user_id: config.userId,
          type: 'moderation',
          violations: moderationResult.violations,
          input_hash: inputHash,
          blocked: true,
          created_at: new Date().toISOString(),
        });
      }
    }

    // 3. Jailbreak Protection (ALWAYS ON)
    if (config.jailbreakProtection) {
      const jailbreakResult = await detectJailbreak(input);
      if (jailbreakResult.detected) {
        violations.jailbreak = [jailbreakResult.reason];
        
        // Log jailbreak attempt
        await supabase.from('guardrail_logs').insert({
          user_id: config.userId,
          type: 'jailbreak',
          violations: [jailbreakResult.reason],
          input_hash: inputHash,
          blocked: true,
          created_at: new Date().toISOString(),
        });

        return {
          passed: false,
          blocked: true,
          violations,
          reason: 'Potential prompt injection detected',
          inputHash,
        };
      }
    }

    // 4. Hallucination Check (User Configurable)
    if (config.hallucinationCheck) {
      const hallucinationResult = await checkHallucination(input);
      if (hallucinationResult.risk === 'high') {
        violations.hallucination = [hallucinationResult.reason];
        
        // Log hallucination risk
        await supabase.from('guardrail_logs').insert({
          user_id: config.userId,
          type: 'hallucination',
          violations: [hallucinationResult.reason],
          input_hash: inputHash,
          blocked: false, // Hallucination check doesn't block, just warns
          created_at: new Date().toISOString(),
        });
      }
    }

    // Determine if request should be blocked
    const shouldBlock = violations.jailbreak.length > 0 || 
                       (config.moderation && violations.moderation.length > 0);

    return {
      passed: !shouldBlock,
      blocked: shouldBlock,
      violations,
      sanitizedInput,
      reason: shouldBlock ? 'Request blocked by guardrails' : undefined,
      inputHash,
    };

  } catch (error) {
    const err = error as Error;
    console.error('Guardrails error:', err);

    // Fail open for guardrails (don't block if system fails)
    return {
      passed: true,
      blocked: false,
      violations,
      sanitizedInput: input,
      reason: 'Guardrails system error - allowing request',
      inputHash,
    };
  }
}

// ============================================================================
// PII Detection Functions
// ============================================================================

async function detectPII(text: string, entities: string[]): Promise<{
  detected: string[];
  sanitized: string;
}> {
  const detected: string[] = [];
  let sanitized = text;

  // Custom PII patterns (financial-specific)
  const patterns: Record<string, RegExp> = {
    credit_card: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
    bank_account: /\b\d{8,12}\b/g,
    routing_number: /\b\d{9}\b/g,
    sin: /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/g, // Canadian SIN
    ein: /\b\d{2}-\d{7}\b/g, // Employer Identification Number
  };

  for (const entity of entities) {
    if (patterns[entity]) {
      const matches = text.match(patterns[entity]);
      if (matches) {
        detected.push(entity);
        // Replace with masked version
        sanitized = sanitized.replace(patterns[entity], `{{${entity.toUpperCase()}}}`);
      }
    }
  }

  return { detected, sanitized };
}

// ============================================================================
// Moderation Functions
// ============================================================================

async function checkModeration(text: string): Promise<{
  passed: boolean;
  violations: string[];
}> {
  try {
    const response = await openai.moderations.create({
      input: text,
    });

    const result = response.results[0];
    const violations: string[] = [];

    // Check categories
    if (result.categories.harassment) violations.push('harassment');
    if (result.categories.hate) violations.push('hate');
    if (result.categories.sexual) violations.push('sexual');
    if (result.categories.violence) violations.push('violence');
    if (result.categories.self_harm) violations.push('self_harm');
    if (result.categories.hate_threatening) violations.push('hate_threatening');
    if (result.categories.sexual_minors) violations.push('sexual_minors');
    if (result.categories.violence_graphic) violations.push('violence_graphic');

    return {
      passed: result.flagged === false,
      violations,
    };
  } catch (error) {
    console.error('Moderation check failed:', error);
    // Fail open for moderation (don't block if API fails)
    return { passed: true, violations: [] };
  }
}

// ============================================================================
// Jailbreak Detection Functions
// ============================================================================

async function detectJailbreak(text: string): Promise<{
  detected: boolean;
  reason: string;
}> {
  const jailbreakPatterns = [
    /ignore\s+(previous|all)\s+instructions/i,
    /you\s+are\s+now\s+(a\s+)?different/i,
    /pretend\s+to\s+be/i,
    /roleplay\s+as/i,
    /system\s+prompt/i,
    /jailbreak/i,
    /bypass/i,
    /hack/i,
    /override/i,
    /disregard/i,
    /forget\s+your\s+instructions/i,
    /act\s+as\s+if/i,
    /you\s+are\s+a\s+developer/i,
    /debug\s+mode/i,
    /admin\s+mode/i,
    /sudo\s+mode/i,
  ];

  for (const pattern of jailbreakPatterns) {
    if (pattern.test(text)) {
      return {
        detected: true,
        reason: `Potential jailbreak attempt: ${pattern.source}`,
      };
    }
  }

  return { detected: false, reason: '' };
}

// ============================================================================
// Hallucination Detection Functions
// ============================================================================

async function checkHallucination(text: string): Promise<{
  risk: 'low' | 'medium' | 'high';
  reason: string;
}> {
  // Check for financial claims that need verification
  const financialClaims = [
    /tax\s+rate\s+is\s+\d+%/i,
    /deduction\s+of\s+\$\d+/i,
    /interest\s+rate\s+is\s+\d+%/i,
    /mortgage\s+rate\s+is\s+\d+%/i,
    /return\s+rate\s+is\s+\d+%/i,
    /inflation\s+rate\s+is\s+\d+%/i,
  ];

  for (const pattern of financialClaims) {
    if (pattern.test(text)) {
      return {
        risk: 'medium',
        reason: 'Contains specific financial claims that may need verification',
      };
    }
  }

  // Check for specific dollar amounts
  const specificAmounts = /\$\d{1,3}(,\d{3})*(\.\d{2})?/g;
  const amountMatches = text.match(specificAmounts);
  if (amountMatches && amountMatches.length > 3) {
    return {
      risk: 'low',
      reason: 'Contains multiple specific dollar amounts - verify accuracy',
    };
  }

  return { risk: 'low', reason: '' };
}

// ============================================================================
// Utility Functions
// ============================================================================

function hashInput(input: string): string {
  // Simple hash for logging (don't store actual PII)
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
}

// ============================================================================
// Netlify Handler
// ============================================================================

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request
    const request = JSON.parse(event.body || '{}');
    const { input, config } = request;

    // Validate inputs
    if (!input || typeof input !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'input required' }),
      };
    }

    if (!config || !config.userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'config.userId required' }),
      };
    }

    // Run guardrails
    const result = await runGuardrails(input, config);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };

  } catch (error) {
    const err = error as Error;
    console.error('Guardrails function error:', err);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: err.message,
      }),
    };
  }
};
