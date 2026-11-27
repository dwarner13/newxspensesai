/**
 * Server transactions export (Prime HQ financial-export, kind 'rows'; AR-1b item 2).
 * The server reads every row in scope (count-verified) and returns the CSV, or refuses with
 * customer wording. The browser never builds this file. Owner: no silent transaction limits;
 * no incomplete export presented as complete.
 */
import { getSupabase } from '@/lib/supabase';

export interface RowsExportScope { startDate?: string; endDate?: string; importIds?: string[] }

export type RowsExportResult =
  | { status: 'ok'; blob: Blob; filename: string; count: number | null }
  | { status: 'no_data'; message: string }
  | { status: 'refused'; message: string };

const FALLBACK_FAIL = 'The export could not be prepared right now. No file was created. Please try again.';

/** Scope body: dates go together or not at all (none = all time, undated rows kept). */
export function rowsExportBody(scope: RowsExportScope): Record<string, unknown> {
  const body: Record<string, unknown> = { kind: 'rows' };
  if (scope.startDate && scope.endDate) { body.startDate = scope.startDate; body.endDate = scope.endDate; }
  if (scope.importIds && scope.importIds.length) body.importIds = [...scope.importIds];
  return body;
}

export function filenameFromDisposition(header: string | null, fallback: string): string {
  const m = header ? /filename="?([^";]+)"?/i.exec(header) : null;
  const name = m?.[1]?.trim();
  return name && /^[\w.-]+$/.test(name) ? name : fallback;
}

/** Interpret a non-file response (JSON): the server's `error` text is already customer wording. */
export function readRowsRefusal(httpStatus: number, body: unknown): RowsExportResult {
  const b = (body && typeof body === 'object' ? body : {}) as { status?: string; error?: string };
  if (httpStatus === 200 && b.status === 'no_data') return { status: 'no_data', message: b.error || 'There are no transactions to export for this view.' };
  if (httpStatus === 401) return { status: 'refused', message: 'Your sign-in has expired. Please sign in again to export.' };
  return { status: 'refused', message: typeof b.error === 'string' && b.error ? b.error : FALLBACK_FAIL };
}

export async function fetchRowsExport(scope: RowsExportScope): Promise<RowsExportResult> {
  try {
    const sb = getSupabase();
    const token = sb ? (await sb.auth.getSession()).data.session?.access_token : null;
    if (!token) return { status: 'refused', message: 'Your sign-in has expired. Please sign in again to export.' };
    const res = await fetch('/.netlify/functions/financial-export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(rowsExportBody(scope)),
      cache: 'no-store',
    });
    const type = res.headers.get('content-type') || '';
    if (res.ok && type.includes('text/csv')) {
      const blob = await res.blob();
      const countHeader = res.headers.get('X-Transaction-Count');
      return {
        status: 'ok',
        blob,
        filename: filenameFromDisposition(res.headers.get('Content-Disposition'), 'xspensesai-transactions.csv'),
        count: countHeader !== null && /^\d+$/.test(countHeader) ? Number(countHeader) : null,
      };
    }
    const json = await res.json().catch(() => null);
    return readRowsRefusal(res.status, json);
  } catch {
    return { status: 'refused', message: FALLBACK_FAIL };
  }
}

/** Save a blob as a file (the app's own page; a user click starts it). */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
