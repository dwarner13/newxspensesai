/**
 * Central Header Builder
 * 
 * Day 15½: Unified header generation for all endpoints
 * 
 * Used by:
 * - chat.ts
 * - ocr.ts  
 * - bank_ingest.ts (if exists)
 * 
 * Provides consistent X-* header telemetry across all routes.
 */

/**
 * Build response headers with consistent X-* prefix formatting
 * 
 * Supports both legacy format (guardrailsActive, piiMaskEnabled) and new format (guardrails, piiMask)
 */
export function buildResponseHeaders(params: {
  guardrailsActive?: boolean;
  piiMaskEnabled?: boolean;
  memoryHitTopScore?: number | null;
  memoryHitCount?: number;
  summaryPresent?: boolean;
  summaryWritten?: boolean | 'async';
  employee?: string;
  routeConfidence?: number;
  streamChunkCount?: number;
  ocrProvider?: string;
  ocrParse?: string;
  transactionsSaved?: number;
  categorizer?: string;
  vendorMatched?: boolean;
  xpAwarded?: number;
  rowCount?: number;
  uniqueRows?: number;
  vendorUnique?: number;
  analysis?: string;
  // New format aliases (optional)
  guardrails?: string | boolean;
  piiMask?: boolean;
  memoryHit?: number;
  memoryCount?: number;
}): Record<string, string> {
  const {
    guardrailsActive = (typeof params.guardrails === 'boolean' ? params.guardrails : (params.guardrails === 'active')),
    piiMaskEnabled = (typeof params.piiMask === 'boolean' ? params.piiMask : (params.piiMask === 'enabled')),
    memoryHitTopScore = params.memoryHit,
    memoryHitCount = params.memoryCount,
    summaryPresent = false,
    summaryWritten = false,
    employee = 'prime',
    routeConfidence = 0.5,
    streamChunkCount,
    ocrProvider,
    ocrParse,
    transactionsSaved,
    categorizer,
    vendorMatched,
    xpAwarded,
    rowCount,
    uniqueRows,
    vendorUnique,
    analysis
  } = params;

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Chat-Backend': 'v2',
    'X-Guardrails': guardrailsActive ? 'active' : 'inactive',
    'X-PII-Mask': piiMaskEnabled ? 'enabled' : 'disabled',
    'X-Memory-Hit': memoryHitTopScore?.toFixed(2) ?? '0',
    'X-Memory-Count': String(memoryHitCount ?? 0),
    'X-Session-Summary': summaryPresent ? 'present' : 'absent',
    'X-Session-Summarized': summaryWritten === true ? 'yes' : summaryWritten === false ? 'no' : (summaryWritten === 'async' ? 'async' : 'no'),
    'X-Employee': employee,
    'X-Route-Confidence': routeConfidence.toFixed(2),
    ...(streamChunkCount !== undefined && { 'X-Stream-Chunk-Count': String(streamChunkCount) }),
    ...(ocrProvider && { 'X-OCR-Provider': ocrProvider }),
    ...(ocrParse && { 'X-OCR-Parse': ocrParse }),
    ...(transactionsSaved !== undefined && { 'X-Transactions-Saved': String(transactionsSaved) }),
    ...(categorizer && { 'X-Categorizer': categorizer }),
    ...(vendorMatched !== undefined && { 'X-Vendor-Matched': vendorMatched ? 'yes' : 'no' }),
    ...(xpAwarded !== undefined && { 'X-XP-Awarded': String(xpAwarded) }),
    ...(rowCount !== undefined && { 'X-Row-Count': String(rowCount) }),
    ...(uniqueRows !== undefined && { 'X-Unique-Rows': String(uniqueRows) }),
    ...(vendorUnique !== undefined && { 'X-Vendor-Unique': String(vendorUnique) }),
    ...(analysis && { 'X-Analysis': analysis })
  };

  return headers;
}

