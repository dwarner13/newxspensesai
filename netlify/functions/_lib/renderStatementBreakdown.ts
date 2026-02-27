type StatementBreakdownLike = Record<string, any>;

function pickFirstString(source: any, paths: string[]): string | null {
  for (const path of paths) {
    const value = path.split('.').reduce<any>((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), source);
    if (value !== null && typeof value === 'object') continue;
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return null;
}

function pickFirstNumber(source: any, paths: string[]): number | null {
  for (const path of paths) {
    const value = path.split('.').reduce<any>((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), source);
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function formatSignedMoney(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'Not provided';
  const sign = value < 0 ? '-' : '';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function normalizeDate(value: unknown): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const iso = raw.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeTransactions(source: StatementBreakdownLike): Array<Record<string, any>> {
  const tx = source?.transactions;
  return Array.isArray(tx) ? tx.filter((row) => row && typeof row === 'object') : [];
}

function summarizeFxInfo(tx: Record<string, any>): string | null {
  const direct = pickFirstString(tx, ['fx_info', 'fx', 'foreign', 'foreign_currency_text']);
  if (direct) return direct;
  const fxAmount = pickFirstNumber(tx, ['fx.amount', 'foreign_amount', 'amount_foreign']);
  const fxCurrency = pickFirstString(tx, ['fx.currency', 'foreign_currency', 'currency_foreign']);
  const fxRate = pickFirstNumber(tx, ['fx.rate', 'exchange_rate']);
  const parts: string[] = [];
  if (fxAmount !== null && fxCurrency) parts.push(`${fxAmount.toFixed(2)} ${fxCurrency}`);
  if (fxRate !== null) parts.push(`rate ${fxRate}`);
  return parts.length > 0 ? parts.join(', ') : null;
}

export function renderStatementBreakdownMarkdown(
  breakdown: any,
  opts?: { includeNextActions?: boolean }
): string {
  const b = (breakdown || {}) as StatementBreakdownLike;
  const lines: string[] = [];
  const includeNextActions = opts?.includeNextActions !== false;

  const institution = pickFirstString(b, ['statement_meta.issuer', 'statement_meta.institution', 'institution', 'issuer']);
  const accountLast4 = pickFirstString(b, ['statement_meta.account_last4', 'account_last4', 'account.last4']);
  const periodStart = normalizeDate(pickFirstString(b, ['statement_meta.period_start', 'period_start', 'statement_period_start']));
  const periodEnd = normalizeDate(pickFirstString(b, ['statement_meta.period_end', 'period_end', 'statement_period_end']));
  const previousBalance = pickFirstNumber(b, ['previous_balance', 'statement_math.previous_balance', 'account_summary.previous_balance']);
  const newBalance = pickFirstNumber(b, ['new_balance', 'statement_math.new_balance', 'account_summary.new_balance']);
  const minPayment = pickFirstNumber(b, ['minimum_payment_due', 'minimum_payment', 'account_summary.minimum_payment_due']);
  const dueDate = pickFirstString(b, ['due_date', 'payment_due_date', 'account_summary.due_date']);
  const creditLimit = pickFirstNumber(b, ['credit_limit', 'account_summary.credit_limit']);
  const availableCredit = pickFirstNumber(b, ['available_credit', 'account_summary.available_credit']);

  lines.push('## Statement overview');
  if (institution) lines.push(`- Institution: ${institution}`);
  if (accountLast4) lines.push(`- Account/Card last-4: ${accountLast4}`);
  if (periodStart || periodEnd) lines.push(`- Statement period: ${periodStart || 'UNKNOWN'} to ${periodEnd || 'UNKNOWN'}`);
  if (previousBalance !== null) lines.push(`- Previous balance: ${formatSignedMoney(previousBalance)}`);
  if (newBalance !== null) lines.push(`- New balance: ${formatSignedMoney(newBalance)}`);
  if (minPayment !== null) lines.push(`- Minimum payment: ${formatSignedMoney(minPayment)}`);
  if (dueDate) lines.push(`- Due date: ${dueDate}`);
  if (creditLimit !== null) lines.push(`- Credit limit: ${formatSignedMoney(creditLimit)}`);
  if (availableCredit !== null) lines.push(`- Available credit: ${formatSignedMoney(availableCredit)}`);
  if (lines[lines.length - 1] === '## Statement overview') {
    lines.push('- Not provided on this statement.');
  }
  lines.push('');

  const math = {
    previousBalance: pickFirstNumber(b, ['statement_math.previous_balance', 'previous_balance', 'account_summary.previous_balance']),
    paymentsCredits: pickFirstNumber(b, ['statement_math.payments_credits', 'payments_credits', 'payments', 'totals.total_credits']),
    purchasesDebits: pickFirstNumber(b, ['statement_math.purchases_debits', 'purchases_debits', 'debits', 'totals.total_debits']),
    cashAdvances: pickFirstNumber(b, ['statement_math.cash_advances', 'cash_advances']),
    interest: pickFirstNumber(b, ['statement_math.interest', 'interest']),
    fees: pickFirstNumber(b, ['statement_math.fees', 'fees']),
    newBalance: pickFirstNumber(b, ['statement_math.new_balance', 'new_balance', 'account_summary.new_balance']),
  };

  lines.push('## How the bank calculated your new balance');
  const hasFullMath = Object.values(math).every((v) => v !== null);
  if (hasFullMath) {
    lines.push(`- Previous balance: ${formatSignedMoney(math.previousBalance)}`);
    lines.push(`- Payments & credits: ${formatSignedMoney(math.paymentsCredits)}`);
    lines.push(`- Purchases & debits: ${formatSignedMoney(math.purchasesDebits)}`);
    lines.push(`- Cash advances: ${formatSignedMoney(math.cashAdvances)}`);
    lines.push(`- Interest: ${formatSignedMoney(math.interest)}`);
    lines.push(`- Fees: ${formatSignedMoney(math.fees)}`);
    lines.push(`- = New balance: ${formatSignedMoney(math.newBalance)}`);
  } else {
    lines.push('- Not provided on this statement.');
  }
  lines.push('');

  const rewardsFields = {
    previous: pickFirstNumber(b, ['rewards.previous_points', 'rewards.points_previous', 'points.previous']),
    earned: pickFirstNumber(b, ['rewards.points_earned', 'rewards.earned_points', 'points.earned']),
    bonus: pickFirstNumber(b, ['rewards.bonus_points', 'points.bonus']),
    newTotal: pickFirstNumber(b, ['rewards.new_points_balance', 'rewards.points_new_balance', 'points.new_balance']),
  };
  const hasRewards = Object.values(rewardsFields).some((v) => v !== null);
  if (hasRewards) {
    lines.push('## Rewards');
    if (rewardsFields.previous !== null) lines.push(`- Previous points: ${Math.round(rewardsFields.previous)}`);
    if (rewardsFields.earned !== null) lines.push(`- Points earned: ${Math.round(rewardsFields.earned)}`);
    if (rewardsFields.bonus !== null) lines.push(`- Bonus points: ${Math.round(rewardsFields.bonus)}`);
    if (rewardsFields.newTotal !== null) lines.push(`- New points balance: ${Math.round(rewardsFields.newTotal)}`);
    lines.push('');
  }

  const rates = {
    purchaseApr: pickFirstNumber(b, ['rates.purchase_apr', 'interest_rates.purchase_apr', 'apr.purchases']),
    cashApr: pickFirstNumber(b, ['rates.cash_advance_apr', 'interest_rates.cash_advance_apr', 'apr.cash_advances']),
    interestAmount: pickFirstNumber(b, ['statement_math.interest', 'interest', 'totals.interest']),
    feesAmount: pickFirstNumber(b, ['statement_math.fees', 'fees', 'totals.fees']),
  };
  const hasRates = Object.values(rates).some((v) => v !== null);
  if (hasRates) {
    lines.push('## Interest rates and fees');
    if (rates.purchaseApr !== null) lines.push(`- Purchases APR: ${rates.purchaseApr.toFixed(2)}%`);
    if (rates.cashApr !== null) lines.push(`- Cash advances APR: ${rates.cashApr.toFixed(2)}%`);
    if (rates.interestAmount !== null) lines.push(`- Interest charged: ${formatSignedMoney(rates.interestAmount)}`);
    if (rates.feesAmount !== null) lines.push(`- Fees charged: ${formatSignedMoney(rates.feesAmount)}`);
    lines.push('');
  }

  const txRows = normalizeTransactions(b);
  lines.push('## Transactions');
  if (txRows.length === 0) {
    lines.push('- Not provided in breakdown payload.');
  } else {
    for (let idx = 0; idx < txRows.length; idx += 1) {
      const tx = txRows[idx];
      const activityDate = normalizeDate(tx.activity_date || tx.transaction_date || tx.date) || 'UNKNOWN-DATE';
      const postedDate = normalizeDate(tx.posted_date || tx.posting_date || tx.posted_at);
      const merchant = pickFirstString(tx, ['merchant', 'description', 'payee', 'memo']) || 'UNKNOWN-MERCHANT';
      const amount = pickFirstNumber(tx, ['amount', 'signed_amount']) || 0;
      const fx = summarizeFxInfo(tx);
      const postedPart = postedDate ? ` (posted ${postedDate})` : '';
      const fxPart = fx ? ` | FX: ${fx}` : '';
      lines.push(`${idx + 1}. ${activityDate}${postedPart} | ${merchant} | ${formatSignedMoney(amount)} CAD${fxPart}`);
    }
  }
  lines.push('');

  let purchasesTotal = pickFirstNumber(b, ['totals.total_debits']);
  let creditsTotal = pickFirstNumber(b, ['totals.total_credits']);
  let endingBalance = newBalance !== null ? newBalance : pickFirstNumber(b, ['totals.net']);
  if ((purchasesTotal === null || creditsTotal === null) && txRows.length > 0) {
    let purchases = 0;
    let creditsSigned = 0;
    for (const tx of txRows) {
      const amount = pickFirstNumber(tx, ['amount', 'signed_amount']) || 0;
      if (amount >= 0) purchases += amount;
      else creditsSigned += amount;
    }
    if (purchasesTotal === null) purchasesTotal = purchases;
    if (creditsTotal === null) creditsTotal = creditsSigned;
  }
  if (creditsTotal !== null && creditsTotal > 0) {
    creditsTotal = -Math.abs(creditsTotal);
  }
  lines.push('## Quick totals');
  lines.push(`- Purchases/debits total: ${purchasesTotal !== null ? formatSignedMoney(purchasesTotal) : 'Not provided'}`);
  lines.push(`- Payments/credits total: ${creditsTotal !== null ? formatSignedMoney(creditsTotal) : 'Not provided'}`);
  lines.push(`- Ending balance: ${endingBalance !== null ? formatSignedMoney(endingBalance) : 'Not provided'}`);
  lines.push('');

  lines.push('## Important notes');
  const notes: string[] = [];
  const warningCandidates = [
    ...(Array.isArray(b?.notes) ? b.notes : []),
    ...(Array.isArray(b?.warnings) ? b.warnings : []),
    ...(Array.isArray(b?.important_notes) ? b.important_notes : []),
  ];
  for (const item of warningCandidates) {
    const text = String(item || '').trim();
    if (text) notes.push(`- ${text}`);
  }
  if (Number(b?.flags?.needs_review_count || 0) > 0) notes.push(`- ${Number(b.flags.needs_review_count)} transaction(s) need review.`);
  if (String(b?.read_completeness?.status || '') === 'partial') {
    const pagesRead = Number(b?.read_completeness?.pages_read || 0);
    const pagesDetected = Number(b?.read_completeness?.pages_detected || 0);
    notes.push(`- Read completeness is partial${pagesDetected > 0 ? ` (${pagesRead}/${pagesDetected} pages)` : ''}.`);
  }
  if (Number(b?.confidence?.transaction_match_rate ?? 1) < 0.95) {
    const pct = Number(b?.confidence?.transaction_match_rate || 0) * 100;
    notes.push(`- Statement reconciliation is ${pct.toFixed(1)}%; verify lines before finalizing.`);
  }
  if (notes.length === 0) {
    lines.push('- No special warnings were detected from structured data.');
  } else {
    lines.push(...notes);
  }
  lines.push('');

  if (includeNextActions) {
    lines.push('## Next actions');
    lines.push('- Categorize transactions');
    lines.push('- Export CSV');
    lines.push('- Show subscription totals');
    lines.push('- Show top merchants');
    lines.push('- Build monthly summary');
    lines.push('- Review flagged or uncertain lines');
  }

  return lines.join('\n');
}

