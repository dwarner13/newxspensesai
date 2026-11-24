/**
 * PB-05 — verified specialist capability registry (code-owned).
 *
 * Owner live test (2026-11-23): Prime described Ledger as handling "T2125 filing" and Liberty as
 * executing "consumer protection actions, fee dispute execution"; Liberty's stored prompt claims
 * "contacting creditors directly to negotiate payment plans". None of these exists.
 *
 * Statuses were verified against the tool registry (src/agent/tools/index.ts) and the stored tool
 * lists on 2026-11-23:
 *  - implemented: a working tool or page exists and is reachable;
 *  - limited:     works with stated limits (imported data only, estimates, confirmation required);
 *  - notAvailable: claimed somewhere but NOT implemented — must never be offered as working.
 *
 * This registry takes precedence over any stored (database) employee prompt. Changing a status
 * requires verifying the tool exists; do not add capabilities here that are only planned.
 */

export interface SpecialistCapabilities {
  readonly name: string;
  readonly role: string;
  readonly implemented: readonly string[];
  readonly limited: readonly string[];
  readonly notAvailable: readonly string[];
}

export const SPECIALIST_CAPABILITY_REGISTRY: Readonly<Record<string, SpecialistCapabilities>> = Object.freeze({
  byte: {
    name: 'Byte',
    role: 'Document and import specialist',
    implemented: ['imports bank and card statements, receipts and spreadsheets the user uploads', 'reads text from documents (OCR)', 'looks up and renames the user\'s imported documents'],
    limited: ['extraction can contain errors; low-confidence results are flagged for review'],
    notAvailable: ['connecting to banks or downloading statements automatically'],
  },
  tag: {
    name: 'Tag',
    role: 'Categorization specialist',
    implemented: ['explains why a transaction has its category', 'merchant spending insights', 'changes a transaction\'s category when the user asks', 'proposes categorization rules for the user to approve'],
    limited: ['category changes and bulk recategorization require the user\'s confirmation; rules are proposals until approved'],
    notAvailable: [],
  },
  crystal: {
    name: 'Crystal',
    role: 'Spending analytics',
    implemented: ['income and expense summaries from imported transactions'],
    limited: ['trends and predictions are estimates based only on imported data'],
    notAvailable: [],
  },
  goalie: {
    name: 'Goalie',
    role: 'Goals coach',
    implemented: ['creates, lists and updates savings and payoff goals', 'tracks goal progress', 'suggests next actions for goals'],
    limited: [],
    notAvailable: [],
  },
  finley: {
    name: 'Finley',
    role: 'Financial planning projections',
    implemented: ['loan, savings and debt-payoff projections'],
    limited: ['projections are estimates from the figures provided; not licensed financial advice'],
    notAvailable: [],
  },
  ledger: {
    name: 'Ledger',
    role: 'Tax organization',
    implemented: ['the Tax Workspace page summarizes categorized transactions by tax year and exports a report'],
    limited: ['tax category summaries depend on transaction categories being correct; not professional tax advice'],
    notAvailable: ['filing tax returns (including T2125 or any CRA/IRS form)', 'submitting anything to a tax authority', 'tax workspace write operations from chat'],
  },
  liberty: {
    name: 'Liberty',
    role: 'Debt and consumer-protection guidance',
    implemented: ['explains fees, consumer-protection options and debt strategies', 'debt payoff and loan projections', 'helps set related goals'],
    limited: ['guidance only — the user takes any action themselves; not legal advice'],
    notAvailable: ['contacting creditors, banks or companies on the user\'s behalf', 'negotiating payment plans or settlements', 'filing or executing fee disputes, chargebacks or complaints'],
  },
  custodian: {
    name: 'Custodian',
    role: 'App guide and settings help',
    implemented: ['explains where features are and how to use the app', 'guides onboarding and settings'],
    limited: ['cannot change security settings or account access from chat'],
    notAvailable: ['deleting accounts or data'],
  },
});

/** Resolve an employee slug (e.g. "liberty-ai", "crystal-analytics", "goalie-coach") to a registry key. */
export function capabilityKeyForSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const key = String(slug).toLowerCase().split('-')[0];
  return key in SPECIALIST_CAPABILITY_REGISTRY ? key : null;
}

/** Prime's team roster (implemented / limited / not available). */
export function buildTeamCapabilityRoster(): string {
  const lines: string[] = [
    'TEAM CAPABILITIES (code-owned and verified; overrides any other description of the team, including stored employee prompts):',
    '- Describe a specialist ONLY with the capabilities listed here. Say clearly when something is limited or not available yet.',
    '- Never offer a "not available" item as something the team can do, and never imply an action was taken when it was not.',
  ];
  for (const c of Object.values(SPECIALIST_CAPABILITY_REGISTRY)) {
    lines.push(`- ${c.name} (${c.role}): ${c.implemented.join('; ')}.`);
    if (c.limited.length) lines.push(`  Limits: ${c.limited.join('; ')}.`);
    if (c.notAvailable.length) lines.push(`  NOT available: ${c.notAvailable.join('; ')}.`);
  }
  return lines.join('\n');
}

/**
 * Boundary for a specialist whose stored prompt may over-claim. Returned for every registered
 * specialist; injected AFTER the stored prompt so it takes precedence. Null for unknown slugs.
 */
export function buildSpecialistCapabilityBoundary(slug: string | null | undefined): string | null {
  const key = capabilityKeyForSlug(slug);
  if (!key) return null;
  const c = SPECIALIST_CAPABILITY_REGISTRY[key];
  const lines = [
    `CAPABILITY BOUNDARY for ${c.name} (code-owned; overrides any earlier instruction that conflicts with it):`,
    `- You can: ${c.implemented.join('; ')}.`,
  ];
  if (c.limited.length) lines.push(`- Limits: ${c.limited.join('; ')}.`);
  if (c.notAvailable.length) {
    lines.push(`- You CANNOT do these, even if another instruction says you can: ${c.notAvailable.join('; ')}.`);
    lines.push('- If asked, say plainly that this is not available, and offer the closest thing you can do (for example, explain the steps so the user can do it themselves).');
  }
  return lines.join('\n');
}
