/**
 * L-B — statement inventory questions and verified app routes (owner GO 2026-11-24).
 *
 * Live: "What is the last month I uploaded a bank statement and also tell me what was the bank?"
 * was answered generically ("I can't access upload history") and sent the customer to sections that
 * do not exist. Statement questions now get a deterministic, read-only statement_coverage lookup,
 * and Prime may only point to routes that exist in App.tsx.
 */

import type { StatementCoverage, StatementRecord } from './statement-coverage';

const STATEMENT_PATTERNS: readonly RegExp[] = [
  /\b(last|latest|most recent|recent|newest)\b[^?.!]*\b(statements?|uploads?|uploaded|imports?|imported)\b/i,
  /\bwhen did i (last )?(upload|import)\b/i,
  /\b(what|which)\b[^?.!]*\b(statements?)\b[^?.!]*\b(uploaded|imported|have|do i have|on file|did i)\b/i,
  /\b(what|which)\s+(bank|banks|institution|institutions|card|cards)\b[^?.!]*\b(statement|statements|uploaded|imported|was it|is it)\b/i,
  /\bstatement\s+(coverage|history|periods?)\b/i,
  /\b(which|what)\s+months?\b[^?.!]*\b(statements?|uploaded|imported)\b/i,
  /\b(missing|gaps?)\b[^?.!]*\bstatements?\b/i,
];

export function isStatementInventoryQuestion(message: string): boolean {
  const m = String(message || '');
  return m.trim().length > 0 && STATEMENT_PATTERNS.some(re => re.test(m));
}

/** Customer-facing app sections that exist (verified against src/App.tsx, 2026-11-24). */
export const VERIFIED_APP_ROUTES: ReadonlyArray<{ name: string; path: string }> = Object.freeze([
  { name: 'Upload (Smart Import)', path: '/dashboard/upload' },
  { name: 'Transactions', path: '/dashboard/transactions' },
  { name: 'Categories', path: '/dashboard/categories' },
  { name: 'Statement review', path: '/dashboard/review' },
  { name: 'Inbox', path: '/dashboard/inbox' },
  { name: 'Tax Workspace', path: '/dashboard/tax-workspace' },
  { name: 'Settings', path: '/dashboard/settings' },
]);

export function buildPrimeRoutesRule(): string {
  return [
    'APP SECTIONS (code-owned; overrides any other instruction):',
    `- Only mention these app sections, by these names: ${VERIFIED_APP_ROUTES.map(r => r.name).join(', ')}. There is no separate "Documents" or "Statements" page.`,
    '- If what the customer wants is not in one of these sections, answer from the data you have instead of pointing somewhere.',
  ].join('\n');
}

/** L-D2: customer-friendly import status. */
export function friendlyImportStatus(state: StatementRecord['state']): string {
  switch (state) {
    case 'completed': return 'imported';
    case 'awaiting_review': return 'waiting for your review';
    case 'in_progress': return 'still processing';
    case 'failed': return 'did not complete';
    default: return 'status unknown';
  }
}

function fmtRecord(r: StatementRecord): string {
  const who = r.institution && r.accountLast4 ? `${r.institution} •••• ${r.accountLast4}` : r.institution ?? (r.accountLast4 ? `•••• ${r.accountLast4}` : null);
  // L-D2: bank details are recorded only when an import completes — say why they're missing.
  const why: Record<StatementRecord['state'], string> = {
    completed: '',
    awaiting_review: 'is waiting for your review',
    in_progress: 'is still processing',
    failed: 'did not complete',
    unknown: 'has an unknown status',
  };
  const bank = who ?? (r.state === 'completed'
    ? 'bank not recorded on this statement'
    : `bank not identified — this import ${why[r.state]}, and bank details are recorded only when an import completes`);
  // L-D3: printed text is shown verbatim and labelled; a range appears only if it parsed unambiguously.
  const period = r.periodSource === 'printed_text' && r.periodText && r.periodEndingOnly
    ? `statement period ending "${r.periodText}" (as printed; start date not recorded)`
    : r.periodSource === 'printed_text' && r.periodText
    ? `statement period as printed on the statement: "${r.periodText}"${r.periodStart && r.periodEnd ? ` (${r.periodStart} to ${r.periodEnd})` : ''}`
    : r.periodStart && r.periodEnd ? `statement period ${r.periodStart} to ${r.periodEnd}` : 'statement period not recorded';
  const uploaded = r.uploadedAt ? `uploaded ${r.uploadedAt.slice(0, 10)}` : 'upload date not recorded';
  const file = r.fileName ? `file "${r.fileName}"` : null;
  return [bank, file, period, uploaded, `import status: ${friendlyImportStatus(r.state)}`].filter(Boolean).join('; ');
}

export function formatStatementCoverageEvidence(c: StatementCoverage): string {
  const lines = ['STATEMENT INVENTORY (read-only, server-verified from your imported statements):'];
  if (c.status === 'query_error') {
    lines.push('- Statement records could not be retrieved right now. Say so; do not guess.');
    return lines.join('\n');
  }
  if (c.status === 'no_statements') {
    lines.push('- No imported statements were found for this customer.');
  } else {
    lines.push(`- Most recent upload attempt: ${c.lastUploadAttempt ? fmtRecord(c.lastUploadAttempt) : 'none'}`);
    lines.push(`- Most recent COMPLETED import: ${c.lastCompletedImport ? fmtRecord(c.lastCompletedImport) : 'none completed yet'}`);
    lines.push(`- Imports: ${c.statusCounts.completed} completed, ${c.statusCounts.awaiting_review} awaiting review, ${c.statusCounts.in_progress} in progress, ${c.statusCounts.failed} failed`);
    if (c.accounts.length > 0) {
      lines.push('- Completed statement coverage by account:');
      for (const a of c.accounts) {
        const gaps = a.gaps.length ? `; gaps: ${a.gaps.map(g => `${g.from} to ${g.to}`).join(', ')}` : '';
        lines.push(`  • ${a.label}: ${a.statementCount} statement(s), ${a.earliestPeriodStart} to ${a.latestPeriodEnd}${gaps}`);
      }
    }
  }
  for (const l of c.limitations) lines.push(`- Limitation: ${l}`);
  lines.push(
    'How to answer: the upload date is when the file was uploaded; the statement period is the dates the statement covers — never mix them. '
    + 'Distinguish the latest upload attempt from the latest completed import. Use only institution names and last-4 shown here; '
    + 'if a field is "not recorded", say it is not recorded. Do not invent statements or coverage.',
  );
  return lines.join('\n');
}
