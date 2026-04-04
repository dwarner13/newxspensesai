import type { BrainPack } from './types';
import { PRIME_BRAIN } from './prime';
import { BYTE_BRAIN } from './byte';
import { CRYSTAL_BRAIN } from './crystal';
import { GOALIE_BRAIN } from './goalie';
import { GLOBAL_BRAIN_RULES, PRIME_WATCHER_INTELLIGENCE_MODE } from '../systemPrompts';

const FALLBACK_BRAIN: BrainPack = {
  employee_key: 'generic',
  displayName: 'XspensesAI Employee',
  identity: `You are a helpful AI employee inside XspensesAI.`,
  mission: `Help the user complete the requested task safely and clearly.`,
  tone: {
    vibe: 'Helpful, calm, clear',
    do: ['Be clear', 'Be safe', 'Be concise'],
    dont: [
      'Do not overwhelm',
      'Do not invent data',
      'Do not suggest UI changes unless asked',
    ],
  },
  workflow: {
    whenToAskQuestions: ['If you are missing a detail that blocks safe progress'],
    defaultPlanFormat: [
      '1) What I understand',
      '2) What to do next',
      '3) What I need from you',
    ],
    handoffRules: [
      'If another employee is clearly better, suggest a handoff and state why',
    ],
  },
  output: { default: 'Short bullets, one next step.' },
  buildSystemPrompt: ({ employee_key, ai_fluency_level, preferredName, currency }) => {
    const name = preferredName || 'the user';
    const cur = currency || 'USD';
    const fluency = ai_fluency_level || 'Explorer';
    return [
      `EMPLOYEE BRAIN PACK — FALLBACK`,
      `Employee Key: ${employee_key}`,
      `User: ${name} | Currency: ${cur} | Fluency: ${fluency}`,
      `Rules: Be safe, clear, and helpful. No UI/UX changes unless asked.`,
    ].join('\n');
  },
};

const REGISTRY: Record<string, BrainPack> = {
  prime: PRIME_BRAIN,
  'prime-boss': PRIME_BRAIN,
  'byte-docs': BYTE_BRAIN,
  byte: BYTE_BRAIN,
  'crystal-analytics': CRYSTAL_BRAIN,
  crystal: CRYSTAL_BRAIN,
  'goalie-goals': GOALIE_BRAIN,
  'goalie-ai': GOALIE_BRAIN,
  goalie: GOALIE_BRAIN,
  // custodian: handled by custodian-chat.ts function directly
  // ledger: LEDGER_BRAIN (coming soon)
  // liberty: LIBERTY_BRAIN (coming soon)
};

export function getBrainPack(employee_key: string | null | undefined): BrainPack {
  if (!employee_key) return FALLBACK_BRAIN;
  return REGISTRY[employee_key] || FALLBACK_BRAIN;
}

export function buildEmployeeBrainSystemPrompt(args: {
  employee_key: string | null | undefined;
  ai_fluency_level?: string | null;
  preferredName?: string | null;
  currency?: string | null;
}): string {
  const key = args.employee_key || 'generic';
  const pack = getBrainPack(key);
  const basePrompt = pack.buildSystemPrompt({
    employee_key: key,
    ai_fluency_level: args.ai_fluency_level ?? null,
    preferredName: args.preferredName ?? null,
    currency: args.currency ?? null,
  });
  const isPrime = key === 'prime' || key === 'prime-boss';
  return [
    basePrompt,
    GLOBAL_BRAIN_RULES,
    isPrime ? PRIME_WATCHER_INTELLIGENCE_MODE : null,
  ]
    .filter(Boolean)
    .join('\n\n');
}
