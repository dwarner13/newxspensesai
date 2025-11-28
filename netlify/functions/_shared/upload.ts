import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = 'docs';

export function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false }});
}

/**
 * Compute SHA-256 hash of document content
 * @param content - File buffer (Uint8Array/Buffer) or normalized text string
 * @returns Hex-encoded SHA-256 hash
 */
export function computeContentHash(content: Uint8Array | Buffer | string): string {
  const hash = createHash('sha256');
  if (typeof content === 'string') {
    hash.update(content, 'utf8');
  } else {
    hash.update(content);
  }
  return hash.digest('hex');
}

export interface CreateDocumentResult {
  document: any;
  isDuplicate: boolean;
  existingDocumentId?: string;
}

/**
 * Create a user_documents row with duplicate detection
 * @param userId - User ID
 * @param sourceType - Source of the document
 * @param originalName - Original filename
 * @param mime - MIME type
 * @param contentHash - Optional pre-computed hash. If not provided, will compute from content.
 * @param content - Optional content (buffer or text) to compute hash from if contentHash not provided
 * @returns Document data with duplicate detection info
 */
export async function createUserDocumentRow(
  userId: string,
  sourceType: 'upload' | 'chat' | 'gmail',
  originalName: string,
  mime: string,
  contentHash?: string,
  content?: Uint8Array | Buffer | string
): Promise<CreateDocumentResult> {
  const sb = admin();
  
  // Compute hash if not provided
  let finalHash: string | null = null;
  if (contentHash) {
    finalHash = contentHash;
  } else if (content) {
    finalHash = computeContentHash(content);
  }
  
  // Check for duplicate if we have a hash
  if (finalHash) {
    const { data: existingDoc, error: checkError } = await sb
      .from('user_documents')
      .select('id')
      .eq('user_id', userId)
      .eq('content_hash', finalHash)
      .maybeSingle();
    
    if (checkError) {
      console.warn('[createUserDocumentRow] Error checking for duplicates:', checkError);
      // Continue with insert if check fails (don't block upload)
    } else if (existingDoc) {
      // Duplicate found - return existing document info
      return {
        document: existingDoc,
        isDuplicate: true,
        existingDocumentId: existingDoc.id,
      };
    }
  }
  
  // No duplicate found - insert new document
  const { data, error } = await sb.from('user_documents').insert({
    user_id: userId,
    source_type: sourceType,
    original_name: originalName,
    mime_type: mime,
    status: 'pending',
    content_hash: finalHash,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).select('*').single();
  
  if (error) throw error;
  
  return {
    document: data,
    isDuplicate: false,
  };
}

export function storagePathFor(docId: string, ext: string) {
  const cleanExt = ext ? `.${ext.toLowerCase()}` : '';
  return `u/${docId.slice(0,2)}/${docId}/${docId}${cleanExt}`;
}

export async function createSignedUploadUrl(path: string, expiresIn = 600) {
  const sb = admin();
  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path, expiresIn);
  if (error) throw error;
  return { url: data.signedUrl, token: data.token };
}

export async function markDocStatus(docId: string, status: 'ready'|'rejected'|'pending', reason?: string | null) {
  const sb = admin();
  await sb.from('user_documents').update({ 
    status, 
    rejection_reason: reason ?? null,
    updated_at: new Date().toISOString()
  }).eq('id', docId);
}

// --- Upload guard shim (used by ocr-receipt.ts) ---

export type UploadCheckResult = { allowed: boolean; reason?: string; status?: number };

export async function validateUpload(
  req: Request,
  cfg: { maxBytes?: number; allowedMime?: string[] } = {}
): Promise<UploadCheckResult> {
  const max = cfg.maxBytes ?? 10 * 1024 * 1024; // 10MB default
  const ct = req.headers.get('content-type') ?? '';
  const len = Number(req.headers.get('content-length') ?? '0');

  if (len && len > max) return { allowed: false, reason: 'file_too_large', status: 413 };
  if (cfg.allowedMime?.length && !cfg.allowedMime.some(m => ct.includes(m))) {
    return { allowed: false, reason: 'mime_not_allowed', status: 415 };
  }

  // hook to your existing guardrails if you want:
  // const res = await runGuardrails(...); if (!res.allowed) return { allowed:false, reason:res.reason, status:403 };

  return { allowed: true };
}

