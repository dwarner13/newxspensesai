type MerchantAliasRule = {
  pattern: RegExp;
  label: string;
  itemHint?: string;
};

export type MerchantAliasMatch = {
  label: string;
  itemHint?: string;
};

const MERCHANT_ALIAS_RULES: MerchantAliasRule[] = [
  { pattern: /\b(APL|APPLE|ITUNES|APP STORE|APPLE COM)\b/i, label: 'Apple Store' },
  { pattern: /\b(AMZN|AMAZON)\b/i, label: 'Amazon' },
  { pattern: /\b(TIM HORTONS|TIMHORTONS)\b/i, label: 'Tim Hortons' },
  { pattern: /\b(STARBUCKS|STARBUCK)\b/i, label: 'Starbucks' },
  { pattern: /\b(7 ?ELEVEN|7ELEVEN)\b/i, label: '7-Eleven' },
  { pattern: /\b(PETRO ?CANADA|PETROCANADA)\b/i, label: 'Petro-Canada' },
  { pattern: /\b(SHELL CANADA|SHELL)\b/i, label: 'Shell' },
  { pattern: /\b(ESSO|EXXON)\b/i, label: 'Esso' },
  { pattern: /\b(UBER ?EATS|UBER)\b/i, label: 'Uber' },
  { pattern: /\b(LYFT)\b/i, label: 'Lyft' },
  { pattern: /\b(COSTCO)\b/i, label: 'Costco' },
  { pattern: /\b(WALMART|WM SUPERCENTER)\b/i, label: 'Walmart' },
  { pattern: /\b(INTERAC E ?TRANSFER|INTERAC)\b/i, label: 'Interac e-Transfer' },
];

function normalizeMerchantText(value: string): string {
  return value
    .toUpperCase()
    .replace(/[*_./\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveMerchantAlias(value: string): MerchantAliasMatch | null {
  if (!value) return null;
  const normalized = normalizeMerchantText(value);
  if (!normalized) return null;
  for (const rule of MERCHANT_ALIAS_RULES) {
    if (rule.pattern.test(normalized)) {
      return {
        label: rule.label,
        itemHint: rule.itemHint,
      };
    }
  }
  return null;
}

