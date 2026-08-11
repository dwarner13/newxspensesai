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
  attestBalances?: {  // user-attested opening/closing from printed statement
    openingBalance: number;
    closingBalance: number;
    importId: string;
  };
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

    // ── Attest-balances path: persist user-supplied opening/closing, then re-run gate ──
    if (body.attestBalances) {
      const { openingBalance, closingBalance, importId: attestImportId } = body.attestBalances;
      if (!attestImportId || !Number.isFinite(openingBalance) || !Number.isFinite(closingBalance)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'attestBalances requires importId, openingBalance, closingBalance (finite numbers)' }) };
      }
      const sb = admin();
      // Read current SBD + status
      const { data: impRow, error: impErr } = await sb
        .from('imports')
        .select('statement_breakdown_json, status')
        .eq('id', attestImportId)
        .eq('user_id', auth.userId)
        .maybeSingle();
      if (impErr) throw impErr;
      if (!impRow) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Import not found' }) };
      }
      const impStatus = String(impRow.status || '');
      if (impStatus !== 'parsed' && impStatus !== 'parsed_unreconciled') {
        return { statusCode: 409, headers, body: JSON.stringify({ error: `Import status is '${impStatus}', attestation only allowed on parsed or parsed_unreconciled imports` }) };
      }
      const existingSbd = impRow.statement_breakdown_json && typeof impRow.statement_breakdown_json === 'object'
        ? impRow.statement_breakdown_json as Record<string, unknown>
        : {};
      // Block attestation when parser-derived totals already exist — attestation is only
      // meaningful when the parser could not read the printed totals.
      const existingTotals = existingSbd.statementTotals;
      if (existingTotals && typeof existingTotals === 'object') {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Statement totals were already extracted by the parser. Attestation is not needed — use the existing reconciliation flow.' }) };
      }
      // Write attestedBalances as sibling key — never merged into statementTotals
      const updatedSbd = {
        ...existingSbd,
        attestedBalances: {
          openingBalance,
          closingBalance,
          source: 'user_attested',
          attestedBy: auth.userId,
          attestedAt: new Date().toISOString(),
        },
      };
      const { error: sbdErr } = await sb
        .from('imports')
        .update({ statement_breakdown_json: updatedSbd, updated_at: new Date().toISOString() })
        .eq('id', attestImportId)
        .eq('user_id', auth.userId);
      if (sbdErr) throw sbdErr;

      // Re-sum ALL staging rows for this import
      const { data: stRows, error: stErr } = await sb
        .from('transactions_staging')
        .select('data_json')
        .eq('import_id', attestImportId)
        .eq('user_id', auth.userId);
      if (stErr) throw stErr;
      let rowDed = 0;
      let rowAdd = 0;
      for (const r of stRows || []) {
        const dj = r?.data_json && typeof r.data_json === 'object' ? r.data_json : {};
        const amt = Number((dj as any).amount);
        if (!Number.isFinite(amt)) continue;
        if (amt < 0) rowDed += Math.abs(amt);
        else if (amt > 0) rowAdd += amt;
      }
      rowDed = round2(rowDed);
      rowAdd = round2(rowAdd);
      // Reconcile: opening - totalDeducted + totalAdded ≈ closing (±$0.05)
      const expectedClosing = round2(openingBalance - rowDed + rowAdd);
      const discrepancy = Math.abs(expectedClosing - closingBalance);
      const TOLERANCE = 0.05;
      const reconciled = discrepancy <= TOLERANCE;
      const newStatus = reconciled ? 'parsed' : 'parsed_unreconciled';
      const { error: sErr } = await sb
        .from('imports')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', attestImportId)
        .eq('user_id', auth.userId);
      if (sErr) throw sErr;
      console.log('[tx-update-amount] Attested balances persisted + gate re-run', {
        importId: attestImportId, openingBalance, closingBalance,
        rowDed, rowAdd, expectedClosing, discrepancy, reconciled, userId: auth.userId,
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          gated: true,
          reconciled,
          status: newStatus,
          reason: reconciled ? 'attested_reconciled' : 'attested_discrepancy',
          bankTotals: { deducted: rowDed, added: rowAdd },
          rowTotals: { deducted: rowDed, added: rowAdd },
          delta: { deducted: round2(discrepancy), added: 0 },
          attestedBalances: { opening: openingBalance, closing: closingBalance },
        }),
      };
    }

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

    // No statementTotals: check for user-attested balances before holding.
    if (!stmtTotals || typeof stmtTotals !== 'object') {
      const attested = sbd && typeof sbd === 'object' ? (sbd as Record<string, unknown>).attestedBalances : null;
      if (attested && typeof attested === 'object') {
        const ab = attested as Record<string, unknown>;
        const opening = Number(ab.openingBalance);
        const closing = Number(ab.closingBalance);
        if (Number.isFinite(opening) && Number.isFinite(closing)) {
          const expectedClosing = round2(opening - rowDeducted + rowAdded);
          const discrepancy = Math.abs(expectedClosing - closing);
          const TOLERANCE = 0.05;
          const reconciled = discrepancy <= TOLERANCE;
          const newStatus = reconciled ? 'parsed' : 'parsed_unreconciled';
          const { error: statusErr } = await sb
            .from('imports')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', importId)
            .eq('user_id', auth.userId);
          if (statusErr) throw statusErr;
          console.log('[tx-update-amount] Attested-balance reconciliation', {
            importId, opening, closing, rowDeducted, rowAdded,
            expectedClosing, discrepancy, reconciled,
          });
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              ok: true,
              gated: true,
              reconciled,
              status: newStatus,
              reason: reconciled ? 'attested_reconciled' : 'attested_discrepancy',
              bankTotals: { deducted: rowDeducted, added: rowAdded },
              rowTotals: { deducted: rowDeducted, added: rowAdded },
              delta: { deducted: round2(discrepancy), added: 0 },
              attestedBalances: { opening, closing },
              updated: { id, amount: newAmount },
            }),
          };
        }
      }
      // No totals and no attested balances — hold the import.
      const { error: statusErr } = await sb
        .from('imports')
        .update({ status: 'parsed_unreconciled', updated_at: new Date().toISOString() })
        .eq('id', importId)
        .eq('user_id', auth.userId);
      if (statusErr) throw statusErr;
      console.warn('[tx-update-amount] HELD — no statementTotals and no attested balances', { importId });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          gated: true,
          reconciled: false,
          status: 'parsed_unreconciled',
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
