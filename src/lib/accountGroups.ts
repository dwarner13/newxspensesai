/**
 * Account grouping shared by Transactions and Categories (K-d).
 *
 * Moved unchanged from TransactionsPageV2's inline `accounts` memo so both pages
 * define "an account" the same way: committed imports grouped by issuer + type,
 * with the issuer from imports.issuer, else detected from the document name.
 * Display and filtering only; nothing is written.
 */

export type AccountType = 'Credit Card' | 'Chequing';

export interface ImportLike {
  id: string;
  status?: string | null;
  issuer?: string | null;
  docName?: string | null;
  file_name?: string | null;
}

export interface AccountGroup {
  /** "BMO|Chequing" */
  id: string;
  /** "BMO Chequing" / "BMO Credit" */
  name: string;
  type: AccountType;
  importIds: string[];
}

export function detectIssuer(imp: ImportLike): string {
  const fromCol = String(imp?.issuer || '').trim();
  if (fromCol) return fromCol;
  const raw = String(imp?.docName || imp?.file_name || '').toUpperCase();
  if (/\bBMO\b/.test(raw)) return 'BMO';
  if (/\bTD\b/.test(raw)) return 'TD';
  if (/\bRBC\b|ROYAL BANK/.test(raw)) return 'RBC';
  if (/\bCIBC\b/.test(raw)) return 'CIBC';
  if (/SCOTIA/.test(raw)) return 'Scotiabank';
  if (/TANGERINE/.test(raw)) return 'Tangerine';
  if (/AMEX|AMERICAN EXPRESS/.test(raw)) return 'Amex';
  if (/CANADIAN TIRE|TRIANGLE/.test(raw)) return 'Canadian Tire';
  if (/MBNA/.test(raw)) return 'MBNA';
  if (/CAPITAL ONE/.test(raw)) return 'Capital One';
  return 'BMO'; // default for current corpus (unchanged existing behaviour)
}

export function detectType(imp: ImportLike): AccountType {
  const raw = String(imp?.docName || imp?.file_name || '').toLowerCase();
  if (/credit|visa|mastercard|amex|mc\b|cc\b|triangle/.test(raw)) return 'Credit Card';
  return 'Chequing';
}

/** Committed imports grouped into accounts, in first-seen order. */
export function groupImportsIntoAccounts(imports: readonly ImportLike[]): AccountGroup[] {
  const groups = new Map<string, AccountGroup>();
  imports
    .filter(i => i.status === 'committed')
    .forEach(i => {
      const issuer = detectIssuer(i);
      const type = detectType(i);
      const key = `${issuer}|${type}`;
      let g = groups.get(key);
      if (!g) {
        g = { id: key, name: `${issuer} ${type === 'Credit Card' ? 'Credit' : 'Chequing'}`, type, importIds: [] };
        groups.set(key, g);
      }
      g.importIds.push(i.id);
    });
  return Array.from(groups.values());
}

/** Set of import ids for an account id, or null for "all accounts" / unknown account. */
export function importIdsForAccount(groups: readonly AccountGroup[], accountId: string | null | undefined): Set<string> | null {
  if (!accountId || accountId === 'all') return null;
  const g = groups.find(a => a.id === accountId);
  return g ? new Set(g.importIds) : null;
}
