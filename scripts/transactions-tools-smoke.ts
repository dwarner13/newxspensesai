import process from 'node:process';

type JsonMap = Record<string, any>;

const baseUrl = process.env.SMOKE_BASE_URL || process.env.NETLIFY_URL || 'http://localhost:8888';
const authToken = process.env.SMOKE_AUTH_TOKEN || '';
const importId = process.env.SMOKE_IMPORT_ID || '';
const committedTxId = process.env.SMOKE_TX_ID || '';
const stagingTxId = process.env.SMOKE_STAGING_TX_ID || '';
const tempCategory = process.env.SMOKE_TEMP_CATEGORY || 'Office Supplies';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function postFunction(path: string, body: JsonMap): Promise<JsonMap> {
  const res = await fetch(`${baseUrl}/.netlify/functions/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${path} failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

function normalizeCategory(value: unknown): string {
  const v = String(value || '').trim();
  return v || 'Uncategorized';
}

async function runTxSearchUncategorized(): Promise<{ rows: JsonMap[] }> {
  const payload: JsonMap = {
    uncategorizedOnly: true,
    includePending: true,
    limit: 50,
  };
  if (importId) payload.importId = importId;
  const res = await postFunction('tx-search', payload);
  assert(Array.isArray(res.rows), 'tx-search rows missing');
  assert(typeof res.totals === 'object', 'tx-search totals missing');
  console.log(`[tx-tools-smoke] tx-search uncategorized PASS rows=${res.rows.length}`);
  return { rows: res.rows as JsonMap[] };
}

async function runCommittedChain(seedRows: JsonMap[]): Promise<void> {
  let targetId = committedTxId;
  if (!targetId) {
    const candidate = seedRows.find((r) => String(r?.id || '').trim().length > 0);
    targetId = String(candidate?.id || '');
  }
  if (!targetId) {
    console.log('[tx-tools-smoke] committed chain SKIP (set SMOKE_TX_ID or provide searchable rows)');
    return;
  }

  const txGet = await postFunction('tx-get', { id: targetId });
  const row = txGet?.row || {};
  assert(String(row.id || '') === targetId, 'tx-get committed returned wrong id');
  const originalCategory = normalizeCategory(row.category);
  const vendor = String(row.merchant || row.description || '').trim() || null;

  const update = await postFunction('tx-update-category', {
    id: targetId,
    category: tempCategory,
  });
  assert(update?.ok === true, 'tx-update-category committed failed');
  assert(String(update?.updated?.category || '') === tempCategory, 'committed category not updated');

  // vendor-rule style path (same category to avoid extra drift)
  if (vendor) {
    const applyVendor = await postFunction('tx-update-category', {
      id: targetId,
      category: tempCategory,
      applyToVendor: true,
      vendor,
    });
    assert(applyVendor?.ok === true, 'tx-update-category applyToVendor failed');
  } else {
    console.log('[tx-tools-smoke] vendor rule SKIP (no vendor found on committed row)');
  }

  // Restore original category to keep state reversible.
  await postFunction('tx-update-category', {
    id: targetId,
    category: originalCategory,
  });
  console.log(`[tx-tools-smoke] committed chain PASS tx=${targetId}`);
}

async function runStagingChain(): Promise<void> {
  if (!stagingTxId) {
    console.log('[tx-tools-smoke] staging chain SKIP (set SMOKE_STAGING_TX_ID)');
    return;
  }

  const txGet = await postFunction('tx-get', { id: stagingTxId, table: 'transactions_staging' });
  const row = txGet?.row || {};
  assert(String(row.id || '') === stagingTxId, 'tx-get staging returned wrong id');
  const originalCategory = normalizeCategory(row.category);

  const update = await postFunction('tx-update-category', {
    id: stagingTxId,
    table: 'transactions_staging',
    category: tempCategory,
  });
  assert(update?.ok === true, 'tx-update-category staging failed');
  assert(String(update?.updated?.table || '') === 'transactions_staging', 'staging table mismatch');

  await postFunction('tx-update-category', {
    id: stagingTxId,
    table: 'transactions_staging',
    category: originalCategory,
  });
  console.log(`[tx-tools-smoke] staging chain PASS tx=${stagingTxId}`);
}

async function main(): Promise<void> {
  if (!authToken) {
    console.log('[tx-tools-smoke] SKIP live checks (set SMOKE_AUTH_TOKEN)');
    return;
  }

  console.log(`[tx-tools-smoke] baseUrl=${baseUrl}`);
  const { rows } = await runTxSearchUncategorized();
  await runCommittedChain(rows);
  await runStagingChain();
  console.log('[tx-tools-smoke] PASS');
}

main().catch((error: any) => {
  console.error('[tx-tools-smoke] FAIL', error?.message || error);
  process.exitCode = 1;
});

