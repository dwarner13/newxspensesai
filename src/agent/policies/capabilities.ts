import { Result, Ok } from '../../types/result';

export const CAPABILITY_MATRIX = {
  tax: 'unsupported',
  legal: 'unsupported',
  medical: 'unsupported',
  financial_advice: 'unsupported',
  pricing: 'supported',
  receipts: 'supported',
  data_management: 'supported',
  general_help: 'supported',
} as const;

export type Topic = keyof typeof CAPABILITY_MATRIX;
export type SupportLevel = 'supported' | 'unsupported' | 'partial';

interface ScopeResult {
  topic: Topic;
  level: SupportLevel;
  confidence: number;
}

export function scopeGate(message: string): Result<ScopeResult> {
  const lowered = message.toLowerCase();
  
  // Keyword mapping with confidence scores
  const patterns: Array<[RegExp, Topic, number]> = [
    [/\b(tax|irs|deduction|1099|w-?2|capital gain)\b/i, 'tax', 0.9],
    [/\b(legal|lawsuit|contract|liability|copyright|patent)\b/i, 'legal', 0.9],
    [/\b(diagnos|symptom|medicat|disease|treatment|doctor)\b/i, 'medical', 0.95],
    [/\b(invest|stock|portfolio|trading|dividend)\b/i, 'financial_advice', 0.85],
    [/\b(price|cost|pricing|quote|estimate|fee)\b/i, 'pricing', 0.8],
    [/\b(receipt|invoice|bill|expense|purchase)\b/i, 'receipts', 0.85],
    [/\b(delete|export|download|backup|data|gdpr)\b/i, 'data_management', 0.8],
  ];
  
  let bestMatch: ScopeResult = {
    topic: 'general_help',
    level: 'supported',
    confidence: 0.5,
  };
  
  for (const [pattern, topic, confidence] of patterns) {
    if (pattern.test(lowered)) {
      const level = CAPABILITY_MATRIX[topic] as SupportLevel;
      if (confidence > bestMatch.confidence) {
        bestMatch = { topic, level, confidence };
      }
    }
  }
  
  return Ok(bestMatch);
}

// Inline tests
if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;
  
  it('detects tax topics', () => {
    const result = scopeGate('How do I file my 1099?');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.topic).toBe('tax');
      expect(result.value.level).toBe('unsupported');
    }
  });
  
  it('detects supported topics', () => {
    const result = scopeGate('Can you export my data?');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.topic).toBe('data_management');
      expect(result.value.level).toBe('supported');
    }
  });
}
