import process from 'node:process';

type JsonMap = Record<string, any>;

const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';
const SUPABASE_JWT = process.env.SUPABASE_JWT || '';

function fail(message: string): never {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

async function postFn(path: string, body: JsonMap): Promise<JsonMap> {
  const res = await fetch(`${BASE_URL}/.netlify/functions/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${SUPABASE_JWT}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    fail(`${path} ${res.status} ${JSON.stringify(json)}`);
  }
  return json;
}

async function main(): Promise<void> {
  if (!SUPABASE_JWT) {
    fail('Missing SUPABASE_JWT');
  }

  const search = await postFn('tx-search', { q: 'amazon', limit: 5 });
  const rows = Array.isArray(search?.rows) ? search.rows : [];
  if (rows.length === 0 || !rows[0]?.id) {
    fail('No tx-search rows found for q=amazon');
  }

  const id = String(rows[0].id);
  const getRes = await postFn('tx-get', { id });
  const originalCategory = String(getRes?.row?.category || 'Uncategorized');

  const updateRes = await postFn('tx-update-category', { id, category: 'Test Category' });
  if (updateRes?.ok !== true) {
    fail('tx-update-category did not return ok=true for test update');
  }

  const revertRes = await postFn('tx-update-category', { id, category: originalCategory });
  if (revertRes?.ok !== true) {
    fail('tx-update-category did not return ok=true for revert update');
  }

  console.log('PASS');
}

main().catch((error: any) => {
  fail(error?.message || String(error));
});

