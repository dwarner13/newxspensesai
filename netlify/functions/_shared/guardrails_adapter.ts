/**
 * 🔄 Guardrails Compatibility Adapter
 * 
 * Bridges old guardrails-production API to new unified guardrails.ts API
 * 
 * This adapter maintains backward compatibility while migrating to canonical guardrails.ts
 * 
 * @module guardrails_adapter
 */

import { applyGuardrails, GUARDRAIL_PRESETS, type GuardrailPreset, type GuardrailOutcome } from './guardrails';
import { supabaseAdmin } from './supabase';

/**
 * Guardrail configuration (legacy format from guardrails-production)
 */
export type GuardrailConfig = {
  preset: GuardrailPreset;
  jailbreakThreshold: number;
  moderationBlock: boolean;
  piiEntities: string[];
  ingestion: { pii: boolean; moderation: boolean };
  chat: { pii: boolean; moderation: boolean; jailbreak: boolean };
};

/**
 * Request context for guardrails compatibility check
 */
export type GuardrailRequestContext = {
  /** Masked text (already PII-redacted) */
  text: string;
  /** User ID */
  userId: string;
  /** Stage: 'chat', 'ingestion_email', or 'ingestion_ocr' */
  stage?: 'chat' | 'ingestion_email' | 'ingestion_ocr';
  /** Optional guardrail config (will load from DB if not provided) */
  config?: GuardrailConfig;
};

/**
 * Guardrails compatibility result
 */
export type GuardrailCompatResult = {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Reason for blocking (if allowed=false) */
  reason?: string;
  /** Original guardrails outcome (for detailed logging) */
  outcome?: {
    ok: boolean;
    text: string;
    reasons: string[];
    block_message?: string;
    signals: any;
  };
};

/**
 * Get guardrail config from database (tenant_guardrail_settings table)
 * Falls back to strict preset if not found
 */
export async function getGuardrailConfig(userId: string, tenantId?: string): Promise<GuardrailConfig> {
  try {
    if (!supabaseAdmin) {
      console.warn('Supabase admin not available, using default strict config');
      return getDefaultConfig('strict');
    }
    
    // Load from tenant_guardrail_settings (authoritative)
    const { data } = await supabaseAdmin
      .from('tenant_guardrail_settings')
      .select('*')
      .eq('user_id', tenantId || userId)
      .maybeSingle();

    const preset: GuardrailPreset = (data?.preset ?? 'strict') as GuardrailPreset;
    const jailbreakThreshold = data?.jailbreak_threshold ?? 75;
    const moderationBlock = !!(data?.moderation_block ?? true);
    const piiEntities = (data?.pii_entities as string[]) ?? [];

    // Derive settings based on preset
    if (preset === 'strict') {
      return {
        preset,
        jailbreakThreshold,
        moderationBlock: true,
        piiEntities,
        ingestion: { pii: true, moderation: true },
        chat: { pii: true, moderation: true, jailbreak: true }
      };
    }
    
    if (preset === 'balanced') {
      return {
        preset,
        jailbreakThreshold,
        moderationBlock: false, // Flag but don't block
        piiEntities,
        ingestion: { pii: true, moderation: true },
        chat: { pii: true, moderation: true, jailbreak: true }
      };
    }
    
    // creative preset
    return {
      preset,
      jailbreakThreshold,
      moderationBlock: false,
      piiEntities,
      ingestion: { pii: true, moderation: false },
      chat: { pii: true, moderation: false, jailbreak: false }
    };
  } catch (error) {
    console.error('Failed to load guardrail config, using defaults:', error);
    return getDefaultConfig('strict');
  }
}

function getDefaultConfig(preset: GuardrailPreset): GuardrailConfig {
  return {
    preset,
    jailbreakThreshold: 70,
    moderationBlock: preset === 'strict',
    piiEntities: [],
    ingestion: { pii: true, moderation: true },
    chat: { pii: true, moderation: true, jailbreak: true }
  };
}

/**
 * Run guardrails check with compatibility adapter
 * 
 * Maps old runGuardrails() API to new applyGuardrails() API
 */
export async function runGuardrails(
  input: string,
  userId: string,
  stage: 'ingestion_email' | 'ingestion_ocr' | 'chat',
  config: GuardrailConfig
): Promise<{
  ok: boolean;
  text: string;
  reasons: string[];
  block_message?: string;
  signals: any;
}> {
  // Map stage to new format
  const stageMap: Record<string, 'ingestion' | 'chat' | 'ocr'> = {
    'ingestion_email': 'ingestion',
    'ingestion_ocr': 'ocr',
    'chat': 'chat'
  };
  
  // Convert config to options
  const isIngestion = stage.startsWith('ingestion');
  const options = {
    preset: config.preset,
    pii: isIngestion ? config.ingestion.pii : config.chat.pii,
    moderation: isIngestion ? config.ingestion.moderation : config.chat.moderation,
    jailbreak: isIngestion ? false : config.chat.jailbreak,
    strict: config.preset === 'strict',
    stage: stageMap[stage] || 'chat',
    log: true
  };
  
  // Apply guardrails
  const outcome = await applyGuardrails(input, options, userId);
  
  // Map outcome to old format
  return {
    ok: outcome.ok,
    text: outcome.redacted || input,
    reasons: outcome.reasons || [],
    block_message: outcome.ok ? undefined : (outcome.reasons?.join('; ') || 'Request blocked'),
    signals: outcome.signals || {}
  };
}

/**
 * Run guardrails check with v3-compatible output format
 */
export async function runGuardrailsCompat(
  reqCtx: GuardrailRequestContext
): Promise<GuardrailCompatResult> {
  const { text, userId, stage = 'chat', config } = reqCtx;

  // Load config if not provided
  let guardrailConfig: GuardrailConfig;
  if (config) {
    guardrailConfig = config;
  } else {
    guardrailConfig = await getGuardrailConfig(userId);
  }

  // Run guardrails using unified API
  const outcome = await runGuardrails(text, userId, stage, guardrailConfig);

  // Normalize to v3 format
  return {
    allowed: outcome.ok,
    reason: outcome.ok ? undefined : (outcome.block_message || outcome.reasons.join('; ')),
    outcome: {
      ok: outcome.ok,
      text: outcome.text,
      reasons: outcome.reasons,
      block_message: outcome.block_message,
      signals: outcome.signals
    }
  };
}


