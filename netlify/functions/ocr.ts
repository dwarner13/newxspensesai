/**
 * OCR Handler Endpoint
 * 
 * Day 8: OCR & Ingestion Phase 1
 * 
 * Accepts: multipart/form-data (field file) OR { url }
 * Returns: OCRResult with extracted text and parsed JSON
 */

import { Handler } from '@netlify/functions';
import { maskPII } from './_shared/pii';
import { bestEffortOCR } from './_shared/ocr_providers';
import { parseInvoiceLike, parseReceiptLike, parseBankStatementLike, normalizeParsed, ParsedDoc } from './_shared/ocr_parsers';
import { admin } from './_shared/supabase';
import { toTransactions, categorize, NormalizedTransaction } from './_shared/ocr_normalize';
import { insertTransaction, insertItems, linkToDocument } from './_shared/transactions_store';
import { applyGuardrails } from './_shared/guardrails';
import { matchVendor, reinforceVendor, rememberCategory } from './_shared/ocr_memory';
import { awardXP, XP_AWARDS } from './_shared/xp';
import crypto from 'crypto';

// Reuse buildResponseHeaders from chat.ts
function buildResponseHeaders(params: {
  guardrailsActive: boolean;
  piiMaskEnabled: boolean;
  memoryHitTopScore: number | null;
  memoryHitCount: number;
  summaryPresent: boolean;
  summaryWritten: boolean | 'async';
  employee: string;
  routeConfidence: number;
  ocrProvider?: string;
  ocrParse?: string;
  transactionsSaved?: number;
  categorizer?: string;
  vendorMatched?: boolean;
  xpAwarded?: number;
}): Record<string, string> {
  const {
    guardrailsActive,
    piiMaskEnabled,
    memoryHitTopScore,
    memoryHitCount,
    summaryPresent,
    summaryWritten,
    employee,
    routeConfidence,
    ocrProvider,
    ocrParse,
    transactionsSaved,
    categorizer,
    vendorMatched,
    xpAwarded
  } = params;
  
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Chat-Backend': 'v2',
    'X-Guardrails': guardrailsActive ? 'active' : 'inactive',
    'X-PII-Mask': piiMaskEnabled ? 'enabled' : 'disabled',
    'X-Memory-Hit': memoryHitTopScore?.toFixed(2) ?? '0',
    'X-Memory-Count': String(memoryHitCount),
    'X-Session-Summary': summaryPresent ? 'present' : 'absent',
    'X-Session-Summarized': summaryWritten === true ? 'yes' : summaryWritten === false ? 'no' : 'async',
    'X-Employee': employee,
    'X-Route-Confidence': routeConfidence.toFixed(2),
    ...(ocrProvider && { 'X-OCR-Provider': ocrProvider }),
    ...(ocrParse && { 'X-OCR-Parse': ocrParse }),
    ...(transactionsSaved !== undefined && { 'X-Transactions-Saved': String(transactionsSaved) }),
    ...(categorizer && { 'X-Categorizer': categorizer }),
    ...(vendorMatched !== undefined && { 'X-Vendor-Matched': vendorMatched ? 'yes' : 'no' }),
    ...(xpAwarded !== undefined && { 'X-XP-Awarded': String(xpAwarded) })
  };
}

export interface OCRResult {
  source: 'upload' | 'url';
  mime: string;
  bytes: number;
  text: string; // raw extracted text (masked for PII v1)
  pages?: Array<{ index: number; text: string }>;
  meta: {
    width?: number;
    height?: number;
    ocr: 'local' | 'ocrspace' | 'vision' | 'none';
    duration_ms: number;
  };
  parsed: ParsedDoc | null; // normalized JSON
  warnings?: string[];
}

export const handler: Handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: buildResponseHeaders({
        guardrailsActive: true,
        piiMaskEnabled: true,
        memoryHitTopScore: null,
        memoryHitCount: 0,
        summaryPresent: false,
        summaryWritten: false,
        employee: 'byte',
        routeConfidence: 1.0
      }),
      body: JSON.stringify({ ok: false, error: 'Method not allowed' })
    };
  }
  
  try {
    const contentType = event.headers['content-type'] || '';
    let fileBytes: Buffer | undefined;
    let url: string | undefined;
    let mime = 'application/octet-stream';
    let userId = event.headers['x-user-id'] || 'anonymous';
    let convoId = event.headers['x-convo-id'] || `ocr-${Date.now()}`;
    
    // ========================================================================
    // INPUT VALIDATION (Guardrails - Pre-OCR)
    // ========================================================================
    
    // Parse input
    if (contentType.includes('multipart/form-data')) {
      // Parse multipart form data
      const boundary = contentType.split('boundary=')[1];
      if (!boundary) {
        throw new Error('Invalid multipart form data');
      }
      
      const parts = event.body?.split(`--${boundary}`) || [];
      for (const part of parts) {
        if (part.includes('Content-Disposition: form-data; name="file"')) {
          const filePart = part.split('\r\n\r\n')[1];
          if (filePart) {
            fileBytes = Buffer.from(filePart, 'base64');
            
            // Extract mime type from Content-Type header
            const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);
            if (contentTypeMatch) {
              mime = contentTypeMatch[1].trim();
            }
          }
        }
      }
      
      if (!fileBytes) {
        throw new Error('No file provided in multipart form data');
      }
      
      // Validate file size (max 15 MB)
      const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
      if (fileBytes.length > MAX_SIZE) {
        return {
          statusCode: 413,
          headers: buildResponseHeaders({
            guardrailsActive: true,
            piiMaskEnabled: true,
            memoryHitTopScore: null,
            memoryHitCount: 0,
            summaryPresent: false,
            summaryWritten: false,
            employee: 'byte',
            routeConfidence: 1.0,
            ocrProvider: 'none',
            ocrParse: 'none'
          }),
          body: JSON.stringify({
            ok: false,
            error: 'File too large. Maximum size is 15 MB.'
          })
        };
      }
      
      // Validate MIME type
      const ALLOWED_MIMES = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/tiff'
      ];
      
      // MIME validation: check declared type and magic bytes
      let isValidMime = false;
      
      // Check declared MIME
      if (ALLOWED_MIMES.includes(mime.toLowerCase())) {
        isValidMime = true;
      }
      
      // Validate magic bytes
      if (fileBytes.length >= 4) {
        const header = fileBytes.slice(0, 4);
        
        // PDF: %PDF
        if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
          if (mime.toLowerCase() === 'application/pdf') {
            isValidMime = true;
          } else {
            mime = 'application/pdf'; // Correct MIME
            isValidMime = true;
          }
        }
        // PNG: \x89PNG
        else if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
          if (mime.toLowerCase().startsWith('image/')) {
            isValidMime = true;
            mime = 'image/png';
          }
        }
        // JPEG: FF D8 FF
        else if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
          if (mime.toLowerCase().startsWith('image/')) {
            isValidMime = true;
            mime = 'image/jpeg';
          }
        }
      }
      
      if (!isValidMime) {
        return {
          statusCode: 400,
          headers: buildResponseHeaders({
            guardrailsActive: true,
            piiMaskEnabled: true,
            memoryHitTopScore: null,
            memoryHitCount: 0,
            summaryPresent: false,
            summaryWritten: false,
            employee: 'byte',
            routeConfidence: 1.0,
            ocrProvider: 'none',
            ocrParse: 'none'
          }),
          body: JSON.stringify({
            ok: false,
            error: 'Invalid file type. Allowed: PDF, PNG, JPEG, WebP, TIFF.'
          })
        };
      }
    } else if (contentType.includes('application/json')) {
      // Parse JSON body
      const body = JSON.parse(event.body || '{}');
      url = body.url;
      
      if (!url) {
        throw new Error('No url provided in JSON body');
      }
      
      userId = body.userId || userId;
      convoId = body.convoId || convoId;
      mime = body.mime || 'application/octet-stream';
    } else {
      throw new Error('Unsupported content type. Use multipart/form-data or application/json');
    }
    
    // Perform OCR
    const ocrStartTime = Date.now();
    const ocrResult = await bestEffortOCR({
      bytes: fileBytes,
      url: url
    });
    
    if (!ocrResult.result) {
      return {
        statusCode: 200,
        headers: buildResponseHeaders({
          guardrailsActive: true,
          piiMaskEnabled: true,
          memoryHitTopScore: null,
          memoryHitCount: 0,
          summaryPresent: false,
          summaryWritten: false,
          employee: 'byte',
          routeConfidence: 1.0,
          ocrProvider: 'none',
          ocrParse: 'none'
        }),
        body: JSON.stringify({
          ok: false,
          error: 'OCR failed',
          warnings: ocrResult.warnings
        } as OCRResult)
      };
    }
    
    // ========================================================================
    // GUARDRAILS ON EXTRACTED TEXT (Post-OCR)
    // ========================================================================
    
    const rawText = ocrResult.result.text;
    
    // Apply guardrails (moderation + PII masking)
    const guardrailOutcome = await applyGuardrails(
      rawText,
      {
        preset: 'strict', // OCR uses strict preset
        moderation: true,
        pii: true,
        stage: 'ocr',
        log: true
      },
      userId
    );
    
    // Check if blocked
    if (!guardrailOutcome.ok) {
      // Log blocking event (non-blocking)
      try {
        const inputHash = crypto
          .createHash('sha256')
          .update(rawText.slice(0, 256))
          .digest('hex')
          .slice(0, 24);
        
        const sb = admin();
        await sb.from('guardrail_events').insert({
          user_id: userId,
          convo_id: convoId,
          stage: 'ocr',
          rule_type: 'moderation_block',
          action: 'blocked',
          severity: 3,
          content_hash: inputHash,
          provider: ocrResult.provider,
          blocked: true,
          meta: {
            reasons: guardrailOutcome.reasons || [],
            signals: guardrailOutcome.signals || {}
          },
          created_at: new Date().toISOString()
        }).catch(() => {
          // Non-blocking: ignore logging errors
        });
      } catch (logErr) {
        console.warn('[OCR] Guardrail logging failed (non-blocking):', logErr);
      }
      
      return {
        statusCode: 422,
        headers: {
          ...buildResponseHeaders({
            guardrailsActive: true,
            piiMaskEnabled: true,
            memoryHitTopScore: null,
            memoryHitCount: 0,
            summaryPresent: false,
            summaryWritten: false,
            employee: 'byte',
            routeConfidence: 1.0,
            ocrProvider: ocrResult.provider,
            ocrParse: 'none'
          }),
          'X-Guardrails': 'blocked'
        },
        body: JSON.stringify({
          ok: false,
          error: 'Guardrails: blocked',
          reasons: guardrailOutcome.reasons || []
        })
      };
    }
    
    // Use redacted text (already PII-masked by guardrails)
    const maskedText = guardrailOutcome.redacted || rawText;
    
    // Log guardrail event (non-blocking)
    try {
      const inputHash = crypto
        .createHash('sha256')
        .update(rawText.slice(0, 256))
        .digest('hex')
        .slice(0, 24);
      
      const sb = admin();
      await sb.from('guardrail_events').insert({
        user_id: userId,
        convo_id: convoId,
        stage: 'ocr',
        rule_type: 'guardrails_check',
        action: 'allowed',
        severity: 1,
        content_hash: inputHash,
        provider: ocrResult.provider,
        blocked: false,
        meta: {
          reasons: guardrailOutcome.reasons || [],
          signals: guardrailOutcome.signals || {},
          pii_found: guardrailOutcome.signals?.piiFound || false
        },
        created_at: new Date().toISOString()
      }).catch(() => {
        // Non-blocking: ignore logging errors
      });
    } catch (logErr) {
      console.warn('[OCR] Guardrail logging failed (non-blocking):', logErr);
    }
    
    // Parse text into structured JSON
    let parsed: ParsedDoc | null = null;
    let parseKind: string = 'none';
    
    try {
      // Try parsing as invoice
      const invoiceData = parseInvoiceLike(rawText);
      if (invoiceData.vendor || invoiceData.invoice_no || invoiceData.total) {
        parsed = normalizeParsed(invoiceData);
        parseKind = parsed.kind;
      } else {
        // Try parsing as receipt
        const receiptData = parseReceiptLike(rawText);
        if (receiptData.merchant || receiptData.items || receiptData.total) {
          parsed = normalizeParsed(receiptData);
          parseKind = parsed.kind;
        } else {
          // Try parsing as bank statement
          const bankData = parseBankStatementLike(rawText);
          parsed = normalizeParsed(bankData);
          parseKind = parsed.kind;
        }
      }
    } catch (parseErr) {
      console.warn('[OCR] Parse error:', parseErr);
      parseKind = 'none';
    }
    
    // Day 9: Normalize and store transactions
    // Day 10: Add vendor matching, memory reinforcement, and XP
    let transactionsSaved = 0;
    let categorizerMethod = 'none';
    let vendorMatched = false;
    let totalXPAwarded = 0;
    const savedTransactions: Array<{ id: number; category: string; subcategory?: string; confidence: number }> = [];
    
    if (parsed) {
      try {
        // Normalize parsed document to transactions
        const normalized = toTransactions(userId, parsed);
        
        // Categorize and store each transaction
        for (const normTx of normalized) {
          try {
            // Day 10: Match vendor to canonical name
            let matchedMerchant = normTx.merchant || '';
            if (matchedMerchant) {
              const vendorMatch = await matchVendor({
                userId,
                merchant: matchedMerchant
              });
              
              if (vendorMatch.source !== 'none' && vendorMatch.canonical !== matchedMerchant) {
                matchedMerchant = vendorMatch.canonical;
                vendorMatched = true;
                
                // Reinforce vendor alias
                await reinforceVendor({
                  userId,
                  merchant: normTx.merchant || '',
                  canonical: vendorMatch.canonical
                });
              }
            }
            
            // Categorize transaction
            const catResult = await categorize({
              ...normTx,
              merchant: matchedMerchant
            });
            categorizerMethod = catResult.method; // Track method used
            
            // Insert transaction (with matched merchant)
            const txId = await insertTransaction({
              ...normTx,
              merchant: matchedMerchant,
              category: catResult.category,
              subcategory: catResult.subcategory,
              docId: undefined // Will be set after document is stored
            });
            
            if (txId) {
              // Insert items if present
              if (normTx.items && normTx.items.length > 0) {
                await insertItems(txId, normTx.items);
              }
              
              // Day 10: Remember vendor→category fact
              if (catResult.category) {
                await rememberCategory({
                  userId,
                  merchant: matchedMerchant,
                  category: catResult.category,
                  subcategory: catResult.subcategory,
                  convoId
                });
              }
              
              // Day 10: Award XP
              // ocr.scan.success (+5)
              const scanXP = await awardXP({
                userId,
                action: 'ocr.scan.success',
                points: XP_AWARDS['ocr.scan.success'],
                meta: {
                  transaction_id: txId,
                  merchant: matchedMerchant
                }
              });
              if (scanXP) totalXPAwarded += XP_AWARDS['ocr.scan.success'];
              
              // ocr.categorize.auto (+2) if auto-categorized
              if (catResult.method === 'rules' || catResult.method === 'tag') {
                const catXP = await awardXP({
                  userId,
                  action: 'ocr.categorize.auto',
                  points: XP_AWARDS['ocr.categorize.auto'],
                  meta: {
                    transaction_id: txId,
                    merchant: matchedMerchant,
                    category: catResult.category,
                    method: catResult.method
                  }
                });
                if (catXP) totalXPAwarded += XP_AWARDS['ocr.categorize.auto'];
              }
              
              savedTransactions.push({
                id: txId,
                category: catResult.category,
                subcategory: catResult.subcategory,
                confidence: catResult.confidence
              });
              transactionsSaved++;
            }
          } catch (txErr) {
            console.warn('[OCR] Transaction save failed (non-blocking):', txErr);
            // Continue with next transaction
          }
        }
      } catch (normalizeErr) {
        console.warn('[OCR] Normalization failed (non-blocking):', normalizeErr);
        // Continue without blocking response
      }
    }
    
    // Get document ID if stored (for linking transactions)
    let docId: string | undefined;
    if (fileBytes && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const sb = admin();
        const { data: docRow } = await sb
          .from('documents')
          .select('id')
          .eq('user_id', userId)
          .eq('convo_id', convoId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (docRow) {
          docId = docRow.id;
          
          // Link saved transactions to document
          for (const savedTx of savedTransactions) {
            await linkToDocument(savedTx.id, docId);
          }
        }
      } catch (linkErr) {
        console.warn('[OCR] Document linking failed (non-blocking):', linkErr);
      }
    }
    
    // Build result
    const result: OCRResult = {
      source: fileBytes ? 'upload' : 'url',
      mime,
      bytes: fileBytes?.length || 0,
      text: maskedText,
      pages: ocrResult.result.pages,
      meta: {
        ...ocrResult.result.meta,
        duration_ms: Date.now() - ocrStartTime,
        saved_count: transactionsSaved,
        doc_id: docId
      },
      parsed,
      warnings: ocrResult.warnings.length > 0 ? ocrResult.warnings : undefined
    };
    
    // Store to Supabase storage (optional, non-blocking)
    if (fileBytes && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const sb = admin();
        const storagePath = `ocr/${userId}/${convoId}/${Date.now()}.${mime.split('/')[1] || 'bin'}`;
        
        // Upload to storage bucket (if bucket exists)
        // Note: This is a stub - actual storage upload requires Supabase storage client
        // TODO: Implement actual storage upload
        
        // Log document row (idempotent)
        await sb.from('documents').insert({
          user_id: userId,
          convo_id: convoId,
          source: result.source,
          mime_type: mime,
          bytes: result.bytes,
          storage_path: storagePath,
          created_at: new Date().toISOString()
        }).catch(() => {
          // Non-blocking: ignore if table doesn't exist or insert fails
        });
      } catch (storageErr) {
        console.warn('[OCR] Storage failed (non-blocking):', storageErr);
      }
    }
    
    // Check if client wants SSE
    const acceptHeader = event.headers['accept'] || '';
    if (acceptHeader.includes('text/event-stream')) {
      // Return SSE response
      const encoder = new TextEncoder();
      const sseData = `data: ${JSON.stringify({ ok: true, ...result })}\n\n`;
      
      return {
        statusCode: 200,
        headers: {
          ...buildResponseHeaders({
            guardrailsActive: guardrailOutcome.ok,
            piiMaskEnabled: true,
            memoryHitTopScore: null,
            memoryHitCount: 0,
            summaryPresent: false,
            summaryWritten: false,
            employee: 'byte',
            routeConfidence: 1.0,
            ocrProvider: ocrResult.provider,
            ocrParse: parseKind,
            transactionsSaved: transactionsSaved,
            categorizer: categorizerMethod !== 'none' ? categorizerMethod : undefined,
            vendorMatched: vendorMatched,
            xpAwarded: totalXPAwarded
          }),
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive'
        },
        body: sseData
      };
    }
    
    // Return JSON response
    return {
      statusCode: 200,
      headers: buildResponseHeaders({
        guardrailsActive: guardrailOutcome.ok,
        piiMaskEnabled: true,
        memoryHitTopScore: null,
        memoryHitCount: 0,
        summaryPresent: false,
        summaryWritten: false,
        employee: 'byte',
        routeConfidence: 1.0,
        ocrProvider: ocrResult.provider,
        ocrParse: parseKind,
        transactionsSaved: transactionsSaved,
        categorizer: categorizerMethod !== 'none' ? categorizerMethod : undefined
      }),
      body: JSON.stringify({ ok: true, ...result })
    };
  } catch (error: any) {
    console.error('[OCR] Error:', error);
    return {
      statusCode: 500,
      headers: buildResponseHeaders({
        guardrailsActive: false, // Error state
        piiMaskEnabled: true,
        memoryHitTopScore: null,
        memoryHitCount: 0,
        summaryPresent: false,
        summaryWritten: false,
        employee: 'byte',
        routeConfidence: 1.0,
        ocrProvider: 'none',
        ocrParse: 'none'
      }),
      body: JSON.stringify({ ok: false, error: error.message || 'OCR processing failed' })
    };
  }
};

