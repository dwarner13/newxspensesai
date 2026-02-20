import type { PrimeUploadProgressStages } from '../PrimeUploadProgressBlock';

export type UploadTimelinePhase =
  | 'upload_received'
  | 'extracting'
  | 'normalizing'
  | 'categorizing'
  | 'saving'
  | 'summary_ready'
  | 'error';

export type UploadTimelineTruth = {
  phase: UploadTimelinePhase;
  status?: string | null;
  summaryReady?: boolean;
  transactionCount?: number | null;
  needsReviewCount?: number | null;
  tagRan?: boolean | null;
  uncertainVendors?: string[];
};

export type RouterStatusPayload = {
  status?: string | null;
  details?: any;
  sync?: any;
  finalize?: any;
  ready?: boolean;
  summary?: any;
  meta?: any;
  error?: any;
};

export function shouldShowEmployeeNames(): boolean {
  return String(import.meta.env.VITE_SHOW_EMPLOYEE_NAMES || '0') === '1';
}

export function getUploadActorLabels(showEmployeeNames = shouldShowEmployeeNames()): {
  reader: string;
  categorizer: string;
  coordinator: string;
} {
  if (showEmployeeNames) {
    return {
      reader: 'Byte',
      categorizer: 'Tag',
      coordinator: 'Prime',
    };
  }
  return {
    reader: 'Document reader',
    categorizer: 'Categorizer',
    coordinator: 'Prime',
  };
}

export function buildUploadTimelineTruthFromRouterStatus(
  payload: RouterStatusPayload | null | undefined
): UploadTimelineTruth {
  const status = String(payload?.status || '').toLowerCase();
  const transactionCountRaw =
    payload?.sync?.transactionCount ??
    payload?.summary?.transactions_processed ??
    payload?.summary?.transactionCount ??
    payload?.meta?.transactionCount;
  const transactionCount = Number(transactionCountRaw);
  const parsedTransactionCount = Number.isFinite(transactionCount) ? transactionCount : null;
  const isError = status === 'error' || status === 'failed' || Boolean(payload?.error);
  if (isError) {
    return {
      phase: 'error',
      status: status || 'error',
    };
  }

  const summaryReady = payload?.ready === true || Boolean(payload?.summary);
  const needsReviewCount = Number(payload?.meta?.needsReviewCount ?? payload?.summary?.needs_review_count ?? 0);
  if (summaryReady) {
    return {
      phase: 'summary_ready',
      status: status || 'complete',
      summaryReady: true,
      transactionCount: parsedTransactionCount,
      needsReviewCount: Number.isFinite(needsReviewCount) ? needsReviewCount : 0,
      tagRan: payload?.meta?.tagRan ?? null,
    };
  }

  if (status === 'complete' || status === 'completed' || status === 'done') {
    // Router status complete means OCR/sync/finalize path finished; summary lane may still be preparing.
    return {
      phase: 'saving',
      status: status || 'complete',
      summaryReady: false,
      transactionCount: parsedTransactionCount,
      needsReviewCount: Number.isFinite(needsReviewCount) ? needsReviewCount : null,
      tagRan: payload?.meta?.tagRan ?? null,
    };
  }

  if (status === 'running') {
    return {
      phase: 'extracting',
      status: 'running',
      summaryReady: false,
    };
  }

  return {
    phase: 'normalizing',
    status: status || null,
    summaryReady: false,
    transactionCount: parsedTransactionCount,
    needsReviewCount: Number.isFinite(needsReviewCount) ? needsReviewCount : null,
    tagRan: payload?.meta?.tagRan ?? null,
  };
}

export function buildProgressStagesFromTruth(truth: UploadTimelineTruth | null | undefined): PrimeUploadProgressStages {
  if (!truth) {
    return { byte: 'pending', tag: 'pending', saving: 'pending' };
  }
  if (truth.phase === 'error') {
    return { byte: 'error', tag: 'pending', saving: 'pending' };
  }
  if (truth.phase === 'summary_ready') {
    return { byte: 'done', tag: 'done', saving: 'done' };
  }
  if (truth.phase === 'saving') {
    return { byte: 'done', tag: 'done', saving: 'active' };
  }
  if (truth.phase === 'categorizing') {
    return { byte: 'done', tag: 'active', saving: 'pending' };
  }
  if (truth.phase === 'extracting' || truth.phase === 'normalizing') {
    return { byte: 'active', tag: 'pending', saving: 'pending' };
  }
  return { byte: 'pending', tag: 'pending', saving: 'pending' };
}

export function buildProgressStagesFromRouterStatus(
  payload: RouterStatusPayload | null | undefined
): PrimeUploadProgressStages {
  const truth = buildUploadTimelineTruthFromRouterStatus(payload);
  return buildProgressStagesFromTruth(truth);
}

function parseUncertainVendors(summaryText: string): string[] {
  const text = String(summaryText || '');
  const lineMatch = text.match(/top vendors needing review:\s*([^\n]+)/i);
  if (!lineMatch?.[1]) return [];
  const parsed = lineMatch[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/\(\d+\)\s*$/g, '').trim())
    .filter(Boolean);
  return Array.from(new Set(parsed)).slice(0, 5);
}

export function buildUnifiedRecapFromTruth(
  truth: UploadTimelineTruth | null | undefined,
  opts?: { showEmployeeNames?: boolean; summaryText?: string }
): { recapText: string; showClarificationPack: boolean; uncertainVendors: string[]; questions: string[] } {
  const showNames = Boolean(opts?.showEmployeeNames);
  const actors = getUploadActorLabels(showNames);
  const recapText = showNames
    ? `✅ ${actors.reader} read the document, ${actors.categorizer} categorized transactions, and ${actors.coordinator} prepared your summary.`
    : '✅ Your document was read, transactions were categorized, and your summary is ready.';
  const needsReviewCount = Number(truth?.needsReviewCount || 0);
  const uncertainVendors = parseUncertainVendors(String(opts?.summaryText || ''));
  const showClarificationPack = needsReviewCount > 0;
  const questions = showClarificationPack
    ? [
        'Can you confirm category choices for the uncertain items?',
        'Any merchants you want me to remember for next time?',
      ]
    : [];
  return {
    recapText,
    showClarificationPack,
    uncertainVendors,
    questions,
  };
}
