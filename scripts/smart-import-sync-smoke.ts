import { shouldBlockCachedNoInput, shouldProceedWithNormalize } from '../netlify/functions/smart-import-sync.ts';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function runLiveNormalizeIdempotencySmoke(): Promise<void> {
  const baseUrl = process.env.SMOKE_BASE_URL || process.env.NETLIFY_URL || 'http://localhost:8888';
  const userId = process.env.SMOKE_USER_ID;
  const documentId = process.env.SMOKE_DOCUMENT_ID;

  if (!userId || !documentId) {
    console.log('[smart-import-sync-smoke] LIVE normalize check skipped (set SMOKE_USER_ID + SMOKE_DOCUMENT_ID)');
    return;
  }

  console.log('[smart-import-sync-smoke] LIVE normalize idempotency start');
  const payload = { userId, documentId };
  const endpoint = `${baseUrl}/.netlify/functions/normalize-transactions`;

  const normalize1 = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }).then((res) => res.json() as Promise<any>);

  const normalize2 = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }).then((res) => res.json() as Promise<any>);

  assert(Boolean(normalize2?.skipped), `expected second normalize call to skip; got ${JSON.stringify(normalize2)}`);
  console.log('[smart-import-sync-smoke] PASS: normalize second run skipped');
  if (process.env.SMOKE_VERBOSE === '1') {
    console.log('[smart-import-sync-smoke] normalize payloads', { normalize1, normalize2 });
  }
}

function runUnitGuardsSmoke(): void {
  const readyWithMetrics = shouldProceedWithNormalize({
    ocrStatus: 'ready',
    textHash: 'abc123',
    textLength: 0,
    hasExtractedData: false,
    hasNormalizedJson: false,
    ocrJobDone: false,
  });
  assert(readyWithMetrics, 'expected ready doc with hash metrics to proceed');

  const readyWithLength = shouldProceedWithNormalize({
    ocrStatus: 'ready',
    textHash: null,
    textLength: 42,
    hasExtractedData: false,
    hasNormalizedJson: false,
    ocrJobDone: false,
  });
  assert(readyWithLength, 'expected ready doc with text length to proceed');

  const notReady = shouldProceedWithNormalize({
    ocrStatus: 'processing',
    textHash: 'abc123',
    textLength: 42,
    hasExtractedData: false,
    hasNormalizedJson: false,
    ocrJobDone: false,
  });
  assert(!notReady, 'expected processing doc to wait');

  const cachedNoInputBlocked = shouldBlockCachedNoInput({
    textHash: null,
    textLength: 0,
    hasExtractedData: false,
    hasNormalizedJson: false,
    hasStagingRows: false,
    hasReadyMarker: true,
    hasImportRecord: false,
    ocrJobDone: false,
    readyForNormalize: true,
  });
  assert(cachedNoInputBlocked, 'expected ready_cached + no input to block normalize');

  const cachedWithStructuredNotBlocked = shouldBlockCachedNoInput({
    textHash: null,
    textLength: 0,
    hasExtractedData: true,
    hasNormalizedJson: false,
    hasStagingRows: false,
    hasReadyMarker: true,
    hasImportRecord: false,
    ocrJobDone: false,
    readyForNormalize: true,
  });
  assert(!cachedWithStructuredNotBlocked, 'expected ready_cached + extracted_data to proceed');

  console.log('[smart-import-sync-smoke] PASS (unit guards)');
}

async function main(): Promise<void> {
  runUnitGuardsSmoke();
  await runLiveNormalizeIdempotencySmoke();
  console.log('[smart-import-sync-smoke] PASS');
}

main().catch((error: any) => {
  console.error('[smart-import-sync-smoke] FAIL', error?.message || error);
  process.exitCode = 1;
});

