import type { OcrPageResult } from './ocrPageImage.js';

export type EarlyStopDecisionReason =
  | 'confidence_and_required_fields'
  | 'statement_table_signal_page_cap';

export function shouldEarlyStopScanning(args: {
  docMode: 'statement' | 'receipt';
  processedPages: number;
  mergedConfidence: number;
  minPagesForEarlyStop: number;
  earlyStopConfidence: number;
  hasDate: boolean;
  hasTotal: boolean;
  tableSignalPages: number;
  statementMaxPages: number;
  lowConfidenceFloor: number;
}): { stop: boolean; reason: EarlyStopDecisionReason | null } {
  const requiredFieldsPresent =
    args.docMode === 'statement'
      ? (args.hasDate && args.hasTotal) || args.tableSignalPages >= 1
      : args.hasDate && args.hasTotal;

  if (
    args.processedPages >= args.minPagesForEarlyStop &&
    args.mergedConfidence >= args.earlyStopConfidence &&
    requiredFieldsPresent
  ) {
    return { stop: true, reason: 'confidence_and_required_fields' };
  }

  if (
    args.docMode === 'statement' &&
    args.tableSignalPages >= 2 &&
    args.processedPages >= args.statementMaxPages &&
    args.mergedConfidence >= args.lowConfidenceFloor
  ) {
    return { stop: true, reason: 'statement_table_signal_page_cap' };
  }

  return { stop: false, reason: null };
}

export function selectWorstPagesForFallback(args: {
  pages: OcrPageResult[];
  maxPages: number;
  pageConfidenceThreshold: number;
}): OcrPageResult[] {
  const cap = Math.max(0, Math.floor(args.maxPages));
  if (cap === 0) return [];
  return args.pages
    .filter((page) => page.confidence < args.pageConfidenceThreshold)
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, cap);
}
