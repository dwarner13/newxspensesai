import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';

/**
 * tx-update-amount
 *
 * Edits the signed amount of a single held-statement row in transactions_staging,
 * then REPLICATES the reconciliation gate from commit-import.ts (PROTECTED — never
 * imported or edited here) to decide whether the statement now balances against the
 * bank's printed totals. Flips imports.status accordingly:
 *   - gate passes  -> 'parsed'                (Import button unlocks)
 *   - gate fails   -> 'parsed_unreconciled'  (stays held)
 *
 * The existing usePendingTransactions realtime subscription on imports.status picks
 * up the flip and re-renders the Import button's enabled state for free.
 *
 * This function NEVER commits/inserts into `transactions` — that is commit-import.ts's
 * job, triggered by the user pressing Import once the gate clears.
 */

type RequestBody = {
  id?: string;        // transactions_staging row id
  amount?: number;    // new SIGNED amount (negative = deducted, positive = added)
};

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Verbatim copy of round2 from commit-import.ts:117 — the + Number.EPSILON nudge
// matters for values sitting on the 5-cent floating-point boundary. Do not "simplify".
function round2(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed. Use POST.' }) };
  }

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error || 'Unauthorized' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}') as RequestBody;
    const id = String(body.id || '').trim();
    const amountRaw = body.amount;

    if (!id || amountRaw === undefined || amountRaw === null || !Number.isFinite(Number(amountRaw))) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing or invalid required fields: id, amount (signed number)' }),
      };
    }
    const newAmount = Number(amountRaw);

    const sb = admin();

    // --- 1. Load the target staging row (scoped to this user) ---
    const { data: existing, error: existingError } = await sb
      .from('transactions_staging')
      .select('id,user_id,import_id,data_json')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Transaction not found' }) };
    }

    const importId = String(existing.import_id || '').trim();
    if (!importId) {
      return { statusCode: 409, headers, body: JSON.stringify({ error: 'Staging row has no import_id' }) };
    }

    // --- 2. Merge new signed amount into data_json (mirrors tx-update-category write) ---
    const dataJson = existing?.data_json && typeof existing.data_json === 'object'
      ? { ...existing.data_json }
      : {};
    dataJson.amount = newAmount;

    const { error: updateError } = await sb
      .from('transactions_staging')
      .update({ data_json: dataJson })
      .eq('id', id)
      .eq('user_id', auth.userId);
    if (updateError) throw updateError;

    // --- 3. Re-sum ALL staging rows for this import (post-edit) ---
    // Read data_json.amount per row — transactions_staging has no flat `amount` column.
    const { data: rows, error: rowsError } = await sb
      .from('transactions_staging')
      .select('data_json')
      .eq('import_id', importId)
      .eq('user_id', auth.userId);
    if (rowsError) throw rowsError;

    let rowDeducted = 0;
    let rowAdded = 0;
    for (const r of rows || []) {
      const dj = r?.data_json && typeof r.data_json === 'object' ? r.data_json : {};
      const amt = Number((dj as any).amount);
      if (!Number.isFinite(amt)) continue;
      if (amt < 0) rowDeducted += Math.abs(amt);
      else if (amt > 0) rowAdded += amt;
    }
    rowDeducted = round2(rowDeducted);
    rowAdded = round2(rowAdded);

    // --- 4. Read the bank's printed totals (same path as runReconciliationGate) ---
    const { data: importRow, error: importErr } = await sb
      .from('imports')
      .select('statement_breakdown_json,status')
      .eq('id', importId)
      .eq('user_id', auth.userId)
      .maybeSingle();
    if (importErr) throw importErr;
    if (!importRow) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Import not found' }) };
    }

    const sbd = importRow.statement_breakdown_json;
    const stmtTotals =
      sbd && typeof sbd === 'object' ? (sbd as Record<string, unknown>).statementTotals : null;

    // Deliberate non-BMO passthrough: no statementTotals => gate does not apply.
    // Mirror commit-import's gated:false behaviour — treat as ready, do not hold.
    if (!stmtTotals || typeof stmtTotals !== 'object') {
      const { error: statusErr } = await sb
        .from('imports')
        .update({ status: 'parsed', updated_at: new Date().toISOString() })
        .eq('id', importId)
        .eq('user_id', auth.userId);
      if (statusErr) throw statusErr;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          gated: false,
          reconciled: true,
          status: 'parsed',
          reason: 'no_statement_totals',
          rowTotals: { deducted: rowDeducted, added: rowAdded },
        }),
      };
    }

    const totalsObj = stmtTotals as Record<string, unknown>;
    const bankDeducted = Number(totalsObj.totalDeducted);
    const bankAdded = Number(totalsObj.totalAdded);

    // Mirror commit-import.ts:783-798 (invalid_statement_totals). If the bank totals
    // are non-finite (null/garbage), the STATEMENT is the problem, not the rows — so we
    // do NOT touch imports.status. Flipping to 'ready' here would be a silent wrong-unlock
    // (NaN > 0.05 is false, so the gate below would falsely "pass"); flipping to
    // 'parsed_unreconciled' would wrongly imply the user can fix it by editing amounts.
    // The row edit above still persists; status stays as-is and we report the data problem.
    if (!Number.isFinite(bankDeducted) || !Number.isFinite(bankAdded)) {
      console.warn('[tx-update-amount] statementTotals present but non-finite, not gating', { importId });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          gated: true,
          reconciled: false,
          reason: 'invalid_statement_totals',
          status: importRow.status ?? null,
          rowTotals: { deducted: rowDeducted, added: rowAdded },
          updated: { id, amount: newAmount },
        }),
      };
    }

    // --- 5. Replicate the gate comparison (TOLERANCE = 0.05) ---
    const deltaDeducted = Math.abs(rowDeducted - bankDeducted);
    const deltaAdded = Math.abs(rowAdded - bankAdded);
    const TOLERANCE = 0.05;
    const failed = deltaDeducted > TOLERANCE || deltaAdded > TOLERANCE;

    const newStatus = failed ? 'parsed_unreconciled' : 'parsed';

    const { error: statusErr } = await sb
      .from('imports')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', importId)
      .eq('user_id', auth.userId);
    if (statusErr) throw statusErr;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        gated: true,
        reconciled: !failed,
        status: newStatus,
        bankTotals: { deducted: round2(bankDeducted), added: round2(bankAdded) },
        rowTotals: { deducted: rowDeducted, added: rowAdded },
        delta: { deducted: round2(deltaDeducted), added: round2(deltaAdded) },
        updated: { id, amount: newAmount },
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error?.message || 'tx-update-amount failed' }),
    };
  }
};
