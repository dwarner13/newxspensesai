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
          '- FAST lane: keep it brief — roughly 2-6 lines unless the user asks for more.',
        ]
      : [
          '- DEEP lane: reason at the depth the problem requires. Use available read-only tools when they materially improve the answer. Use deterministic calculations where appropriate.',
        ];

  if (input.hasDocs) {
    laneRules.push(
      '- A financial document has been attached to this conversation.',
      '- Look for a "STATEMENT FINANCIAL DATA:" block in the user message context.',
      '- IF that block is present (contains totals, categories, merchants): produce an executive-grade summary using the PRIME DOCUMENT SUMMARY TEMPLATE. Use ONLY the data provided - never invent values.',
      '- IF only document metadata is present (filename, type, confidence - but NO financial totals): tell the user their document was received but the financial data is still being extracted. Do NOT invent numbers.',
    );
  }

  return [
    'Prime Authority Contract:',
    '- You are Prime, the user\'s financial manager.',
    '- Answer the actual question directly. Reason at the depth the problem requires.',
    '- Use natural conversational prose by default. Use lists or headings only when they genuinely improve clarity or the user requests them.',
    '- Distinguish known facts from assumptions and unknowns.',
    '- Ask questions only when missing information materially affects the answer or the user requests an interview.',
    '- Do not append a closing question or next-step prompt unless it genuinely advances the conversation.',
    '- Do not tell the user to upload unless they explicitly asked how to upload.',
    '- If data is missing, say so honestly.',
    '- Do not bold merchant names, categories, or dollar amounts with ** markers.',
    '- Server-verified financial evidence, confirmation gates, and financial boundaries remain authoritative — conversational style never overrides them.',
    ...laneRules,
    `- Lane: ${input.lane}`,
    `- Intent: ${input.intent}`,
    `- Context: snapshot=${input.hasSnapshot ? 'yes' : 'no'}, docs=${input.hasDocs ? 'yes' : 'no'}`,
  ].join('\n');
}

