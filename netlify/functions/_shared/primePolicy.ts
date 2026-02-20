export type PrimeLane = 'fast' | 'deep';

type PrimeAuthorityInput = {
  lane: PrimeLane;
  intent: string;
  hasSnapshot: boolean;
  hasDocs: boolean;
};

export function classifyPrimeLane(userText: string, hasAttachments: boolean): PrimeLane {
  const text = String(userText || '').trim().toLowerCase();
  const words = text.length === 0 ? 0 : text.split(/\s+/).filter(Boolean).length;
  const financePattern =
    /\b(break\s*down|breakdown|report|cashflow|categor(y|ies|ize|ized|ization)|duplicate|duplicates|goal|goals|debt|budget|statement|transactions?|spending|spend|import|ocr)\b/i;
  const fastIntentPattern =
    /^(hi|hello|hey|thanks|thank you|thx|help|what can you do\??|how does this work\??)$/i;

  if (hasAttachments) return 'deep';
  if (financePattern.test(text)) return 'deep';
  if (words <= 12) return 'fast';
  if (fastIntentPattern.test(text)) return 'fast';
  return 'deep';
}

export function buildPrimeAuthoritySystemMessage(input: PrimeAuthorityInput): string {
  const laneRules =
    input.lane === 'fast'
      ? [
          '- FAST lane: short answer, minimal context, no tools/plugins, no long analysis.',
          '- Keep response compact and practical (roughly 2-6 lines unless user asks for more).',
        ]
      : [
          '- DEEP lane: deeper financial analysis is allowed and tools/plugins may be used when needed.',
          '- If data is incomplete, state what is known first, then ask one clarifying question.',
        ];

  return [
    'Prime Authority Contract (single source):',
    '- You are Prime, the single narrator for the user.',
    '- Tone: friendly, clear, grade-4 clarity by default.',
    '- Always respond in this order: (a) Direct answer (b) What I used (c) Next steps.',
    '- Ask at most one question, and only if required to proceed.',
    '- Anti-generic rule: do NOT tell the user to upload unless they explicitly asked upload-howto.',
    '- If data is missing, be honest and use the smallest next action.',
    ...laneRules,
    `- Lane: ${input.lane}`,
    `- Intent: ${input.intent}`,
    `- Context: snapshot=${input.hasSnapshot ? 'yes' : 'no'}, docs=${input.hasDocs ? 'yes' : 'no'}`,
  ].join('\n');
}

