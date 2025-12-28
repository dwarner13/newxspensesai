export type Employee = {
  key: string;
  name: string;
  emoji?: string;
  icon?: string;
  route: string;
  short: string;
  learnMorePath?: string;
  tags: string[];
};

export const EMPLOYEES: Employee[] = [
  // === BOSS ===
  {
    key: 'prime',
    name: 'Prime',
    emoji: '👑',
    route: '/dashboard',
    short: 'The Boss AI — your first stop for everything. Routes you to the right expert instantly.',
    learnMorePath: '/ai-employees',
    tags: ['boss','help','how to','where','guide','onboarding','tour','troubleshoot','who should i use']
  },

  // === Personal Finance AI ===
  { key: 'finley',  name: 'Finley',  emoji: '💼', route: '/dashboard/ai-financial-assistant', short: 'Your always-on financial sidekick.',           learnMorePath: '/features/ai-assistant',             tags: ['assistant','budget','advice','q&a','overview'] },
  { key: 'byte',    name: 'Byte',    emoji: '📄', route: '/dashboard/smart-import-ai',        short: 'Receipt & document import wizard.',          learnMorePath: '/features/smart-import-ai',          tags: ['import','receipt','ocr','upload','parse'] },
  { key: 'goalie',  name: 'Goalie',  emoji: '🥅', route: '/dashboard/goal-concierge',         short: 'Goal planning and progress tracking.',       learnMorePath: '/features/goal-concierge',           tags: ['goal','plan','save','milestone','target'] },
  { key: 'crystal', name: 'Crystal', emoji: '🔮', route: '/dashboard/spending-predictions',   short: 'Forecasts spending trends.',                 learnMorePath: '/features/spending-predictions',     tags: ['predict','forecast','future','trend'] },
  { key: 'tag',     name: 'Tag',     emoji: '🏷️', route: '/dashboard/ai-categorization',      short: 'Auto-categorizes transactions.',             learnMorePath: '/features/ai-insights',              tags: ['categorize','label','merchant','rules'] },
  { key: 'liberty', name: 'Liberty', emoji: '🕊️', route: '/dashboard/ai-financial-freedom',   short: 'Debt Freedom & Protection Coach — upload ANY loan, credit card, or mortgage screenshot and Liberty will show you how to pay it off faster, save interest, and protect yourself from predatory debt.',                 learnMorePath: '/features/ai-goals',                 tags: ['freedom','fire','independence','debt','loan','mortgage','car loan','credit card','payday','debt payoff','interest','fees','line of credit','loc','student loan','personal loan'] },
  { key: 'blitz',   name: 'Blitz',   emoji: '⚡', route: '/dashboard/blitz',                  short: 'Rapid actions & alerts.',                    learnMorePath: '/features/ai-goals',                 tags: ['actions','checklist','next-steps','alerts'] },
  { key: 'chime',   name: 'Chime',   emoji: '🔔', route: '/dashboard/bill-reminders',         short: 'Smart Debt & Reminder Coach — watches your recurring payments and sends friendly nudges so you stay ahead of your debt and bills.',                         learnMorePath: '/features/automation',               tags: ['reminder','bill','due','notify','alert','nudge','notification','ping','check-in','upcoming bills','payments due'] },

  // === Wellness / Audio ===
  { key: 'harmony', name: 'Harmony', emoji: '💚', route: '/dashboard/financial-therapist',    short: 'Financial wellness and life balance.',        learnMorePath: '/features/ai-therapist',             tags: ['wellness','balance','mindfulness','harmony'] },
  { key: 'roundtable', name: 'The Roundtable', emoji: '🎙️', route: '/dashboard/personal-podcast', short: 'Weekly AI-generated financial podcast.', learnMorePath: '/features/personal-podcast',         tags: ['podcast','audio','story','recap'] },
  { key: 'wave',    name: 'Wave',    emoji: '🌊', route: '/dashboard/spotify-integration',    short: 'Music + focus playlists in your flow.',      learnMorePath: '/features/spotify-integration',      tags: ['music','spotify','focus','player'] },

  // === Business / Tax / Automation / Analytics ===
  { key: 'ledger',  name: 'Ledger',  emoji: '📊', route: '/dashboard/tax-assistant',          short: 'Tax answers and optimization guidance.',     learnMorePath: '/features/freelancer-tax',           tags: ['tax','deduction','cra','irs','optimize'] },
  { key: 'intelia', name: 'Intelia', emoji: '🧠', route: '/dashboard/business-intelligence',  short: 'Trends and insights for growth.',            learnMorePath: '/features/business-expense-intelligence', tags: ['bi','insight','kpi','trend','business'] },
  { key: 'automa',  name: 'Automa',  emoji: '⚙️', route: '/dashboard/smart-automation',       short: 'Automate repetitive tasks.',                 learnMorePath: '/features/smart-automation',         tags: ['automation','workflow','rules','zap'] },
  { key: 'dash',    name: 'Dash',    emoji: '📈', route: '/dashboard/analytics',              short: 'Beautiful charts & analysis.',               learnMorePath: '/features/analytics',                tags: ['analytics','chart','visualize','kpis'] },
  { key: 'prism',   name: 'Prism',   emoji: '💎', route: '/dashboard/reports',                short: 'Crystal-clear reports on demand.',           learnMorePath: '/features/reports',                  tags: ['report','export','pdf','summary'] },
  
  // === Settings & Security ===
  { key: 'custodian', name: 'Custodian', emoji: '🔧', route: '/dashboard/custodian', short: 'Account security, settings, and system diagnostics.', learnMorePath: '/features/custodian', tags: ['settings','security','privacy','account','onboarding','diagnostics','handoff'] },
];

export function findEmployeeByIntent(query: string): Employee | null {
  const q = (query || '').toLowerCase();
  // Direct name/key hit
  const byName = EMPLOYEES.find(e => q.includes(e.name.toLowerCase()) || q.includes(e.key.toLowerCase()));
  if (byName) return byName;
  // Tag scoring
  let best: { e: Employee; score: number } | null = null;
  for (const e of EMPLOYEES) {
    let score = 0;
    for (const t of e.tags) if (q.includes(t.toLowerCase())) score++;
    if (score > 0 && (!best || score > best.score)) best = { e, score };
  }
  return best?.e || null;
}
