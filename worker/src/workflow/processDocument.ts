import { SupabaseStorage, SupabaseDatabase, supabaseClient } from '../supabase.js';
import { OCRProcessor } from '../ocr/index.js';
import { DocumentProcessor } from '../pdf/index.js';
import { RedactionProcessor } from '../redaction/patterns.js';
import { ParsingProcessor } from '../parse/bank.js';
import { CategorizationProcessor } from '../categorize/index.js';
import { config } from '../config.js';
import { computeDocumentAnalysis, summarizeDocumentForChat, formatCurrency } from '../analysis/index.js';
import { summarizeOcrDocumentForChat } from '../analysis/ocrSummary.js';
import { storeDocumentAndTransactions } from '../store/documentStore.js';
import type { StoredDocument, StoredTransaction, ProcessDocumentResult, SmartDocType } from '../types/document.js';
import { randomUUID } from 'crypto';
import { detectFileType, detectFileTypeFromBuffer, type FileType } from '../utils/fileType.js';
import { persistSmartImportResults } from '../services/supabaseSmartImport.js';
import { runHybridOCR } from '../ocr/hybridOcr.js';
import { detectLoanSnapshot } from './loanDetection.js';

// Document processing interfaces
export interface DocumentProcessingOptions {
  userId: string;
  documentId?: string;
  fileUrl?: string;
  fileName?: string; // Optional file name for summary generation
  docType: 'receipt' | 'bank_statement';
  redact: boolean;
  onProgress?: (progress: number, message: string) => void;
}

export interface DocumentProcessingResult extends ProcessDocumentResult {
  // Legacy fields for backward compatibility
  documentId?: string;
  transactionCount?: number;
  processingTime?: number;
  redactedUrl?: string;
  analysis?: any;
  summary?: string;
  loanSnapshotId?: string; // ID of detected loan snapshot (if OCR detected mortgage/loan)
}

// Main document processing workflow
export class DocumentProcessingWorkflow {
  private ocrProcessor: OCRProcessor;
  private documentProcessor: DocumentProcessor;
  private redactionProcessor: RedactionProcessor;
  private parsingProcessor: ParsingProcessor;
  private categorizationProcessor: CategorizationProcessor;
  
  constructor() {
    this.ocrProcessor = new OCRProcessor();
    this.documentProcessor = new DocumentProcessor();
    this.redactionProcessor = new RedactionProcessor();
    this.parsingProcessor = new ParsingProcessor();
    this.categorizationProcessor = new CategorizationProcessor();
  }
  
  async processDocument(options: DocumentProcessingOptions): Promise<DocumentProcessingResult> {
    const startTime = Date.now();
    let documentId = options.documentId;
    let effectiveDocumentId: string | undefined = documentId; // Will be used for OCR persistence and normalization
    
    try {
      // Step 1: Download document (10%)
      options.onProgress?.(10, 'Downloading document...');
      const documentBuffer = await this.downloadDocument(options);
      
      // Step 2: Detect file type robustly
      const fileName = options.fileName || options.fileUrl?.split('/').pop()?.split('?')[0] || 'document';
      const fileTypeInfo = detectFileType(fileName);
      const bufferFileType = detectFileTypeFromBuffer(documentBuffer);
      
      // Determine file type: prioritize buffer detection over filename (more reliable)
      // Buffer detection is definitive - if buffer says image, it's an image regardless of filename
      let isPdf = false;
      let isImage = false;
      
      if (bufferFileType === 'image') {
        // Buffer definitively indicates image
        isImage = true;
        isPdf = false;
      } else if (bufferFileType === 'pdf') {
        // Buffer definitively indicates PDF
        isPdf = true;
        isImage = false;
      } else {
        // Buffer detection inconclusive, fall back to filename/extension
        isPdf = fileTypeInfo.type === 'pdf' || fileName.toLowerCase().endsWith('.pdf');
        isImage = fileTypeInfo.type === 'image' || fileName.toLowerCase().match(/\.(png|jpg|jpeg)$/i) !== null;
      }
      
      // Log detection results
      console.log(`[processDocument] File type detection:`, {
        fileName,
        extension: fileTypeInfo.extension,
        filenameType: fileTypeInfo.type,
        bufferType: bufferFileType,
        isPdf,
        isImage,
        finalDecision: isPdf ? 'PDF' : (isImage ? 'IMAGE' : 'UNKNOWN'),
      });
      
      // Step 3: Extract text using Hybrid OCR Pipeline
      // Uses primary parser first (PDF/CSV/text), falls back to OCR if needed
      options.onProgress?.(20, 'Extracting text from document...');
      
      // Validate buffer
      if (!documentBuffer || documentBuffer.length === 0) {
        throw new Error('Document buffer is empty, cannot perform OCR');
      }
      
      console.log(`[HybridOCR] Starting for: ${fileName} (${documentBuffer.length} bytes)`);
      
      let extractedText = '';
      let hybridOcrResult;
      
      try {
        // Run hybrid OCR pipeline
        hybridOcrResult = await runHybridOCR(documentBuffer, {
          fileName: fileName,
          mimeType: isPdf ? 'application/pdf' : (isImage ? fileTypeInfo.mimeType : undefined),
        });
        
        extractedText = hybridOcrResult.fullText;
        
        // Log hybrid OCR results with required format
        if (hybridOcrResult.source === 'primary') {
          console.log(`[HybridOCR] Primary success - method: ${hybridOcrResult.metadata.primaryMethod || 'unknown'}`);
        } else {
          console.log(`[HybridOCR] Fallback triggered - primary: ${hybridOcrResult.metadata.primaryMethod || 'none'}, fallback: ${hybridOcrResult.metadata.fallbackMethod || 'unknown'}`);
        }
        
        console.log(`[HybridOCR] Result summary:`, {
          source: hybridOcrResult.source,
          confidence: `${(hybridOcrResult.confidence * 100).toFixed(1)}%`,
          fileType: hybridOcrResult.metadata.fileType,
          pageCount: hybridOcrResult.pages.length,
          textLength: extractedText.length,
          processingTimeMs: hybridOcrResult.metadata.processingTimeMs,
        });
        
        // Validate extracted text
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error('Hybrid OCR processing failed: no text extracted. The document may be too low quality or in an unsupported format.');
        }
        
      } catch (hybridError: any) {
        const errorMsg = hybridError instanceof Error ? hybridError.message : String(hybridError);
        console.error(`[HybridOCR] Failed: ${errorMsg}`);
        
        // Return user-friendly error message
        throw new Error(`Document processing failed: ${errorMsg}. Please try uploading a clearer document or use a PDF/camera scan app.`);
      }
      
      // Step 4: Redaction (60%)
      let redactedBuffer: Buffer | undefined;
      let detectedPiiTypes: string[] = [];
      if (options.redact) {
        options.onProgress?.(60, 'Redacting sensitive information...');
        const redactionResult = await this.redactionProcessor.redactDocument(
          documentBuffer,
          options.fileUrl || 'unknown',
          extractedText
        );
        
        redactedBuffer = redactionResult.redactedBuffer;
        extractedText = redactionResult.redactedText;
        
        // Extract PII types from redaction map
        detectedPiiTypes = [...new Set(redactionResult.redactionMap.map(r => r.pattern))];
      }
      
      // Step 4.5: Detect loan snapshot from OCR text (if applicable)
      let loanSnapshotId: string | undefined;
      try {
        const loanCandidate = detectLoanSnapshot(extractedText);
        if (loanCandidate) {
          console.log(`[processDocument] Detected loan snapshot: ${loanCandidate.loan_type}, principal=$${loanCandidate.principal}, rate=${loanCandidate.annualRatePct}%, payment=$${loanCandidate.paymentAmount} ${loanCandidate.paymentFrequency}`);
          
          // Insert into loan_snapshots table
          const { data: loanSnapshot, error: loanError } = await supabaseClient
            .from('loan_snapshots')
            .insert({
              user_id: options.userId,
              source_document_id: documentId || null,
              loan_type: loanCandidate.loan_type,
              description: `OCR ${loanCandidate.loan_type} snapshot from ${fileName}`,
              principal_cents: Math.round(loanCandidate.principal * 100),
              annual_rate_pct: loanCandidate.annualRatePct,
              payment_cents: Math.round(loanCandidate.paymentAmount * 100),
              payment_frequency: loanCandidate.paymentFrequency,
              tax_cents: loanCandidate.taxAmount ? Math.round(loanCandidate.taxAmount * 100) : null,
              currency: 'CAD',
            })
            .select('id')
            .single();
          
          if (loanError) {
            console.warn(`[processDocument] Failed to insert loan snapshot: ${loanError.message}`);
          } else if (loanSnapshot) {
            loanSnapshotId = loanSnapshot.id;
            console.log(`[processDocument] Loan snapshot saved with ID: ${loanSnapshotId}`);
          }
        }
      } catch (loanDetectError) {
        console.warn(`[processDocument] Loan detection error (non-fatal): ${loanDetectError}`);
        // Continue processing - loan detection failure is not fatal
      }
      
      // Step 5: Parse transactions (80%)
      options.onProgress?.(80, 'Parsing transactions...');
      const parsingResult = await this.parsingProcessor.parseDocument(extractedText, options.docType);
      
      console.log(`[processDocument] Parsed ${options.docType} text, transactions: ${parsingResult.transactions.length}`);
      
      // Step 6: Categorize transactions (90%)
      const categorizeStartTime = Date.now();
      options.onProgress?.(90, 'Categorizing transactions...');
      const categorizationResult = await this.categorizationProcessor.categorizeTransactions(
        parsingResult.transactions,
        options.userId
      );
      const categorizeTime = Date.now() - categorizeStartTime;
      console.log(`[processDocument] Categorized ${categorizationResult.transactions.length} transactions in ${categorizeTime}ms`);
      
      // Step 7: Compute analysis and generate summary
      // For bank statements, use smart heuristic to determine if validation is reliable
      // Only exclude flagged transactions if validation looks reliable
      let transactionsForAnalysis = categorizationResult.transactions;
      
      if (options.docType === 'bank_statement') {
        const totalCount = categorizationResult.transactions.length;
        const flaggedTransactions = categorizationResult.transactions.filter((tx: any) => tx.needsAmountReview);
        const flaggedCount = flaggedTransactions.length;
        
        // Heuristic: validation is reliable if:
        // - We have flagged transactions (validation ran)
        // - Not all transactions are flagged (some passed validation)
        // - We have at least some transactions
        const validationLooksReliable =
          flaggedCount > 0 &&
          flaggedCount < totalCount &&
          totalCount > 0;
        
        if (validationLooksReliable) {
          // Validation is reliable - exclude flagged transactions from analysis
          transactionsForAnalysis = categorizationResult.transactions.filter((tx: any) => !tx.needsAmountReview);
          console.log(
            `[processDocument] Excluded ${flaggedCount} flagged transaction(s) from analysis (invalid amounts)`
          );
        } else if (flaggedCount === totalCount && totalCount > 0) {
          // All transactions flagged - validation likely unreliable (e.g., insufficient allowedAmounts)
          transactionsForAnalysis = categorizationResult.transactions; // Include all (with flags)
          console.warn(
            `[processDocument] Validation unreliable, including flagged transactions in analysis`,
            {
              totalCount,
              flaggedCount,
              reason: 'All transactions flagged - likely insufficient allowedAmounts',
            }
          );
        }
        // If no flagged transactions, use all (validation either didn't run or all passed)
      }
      
      options.onProgress?.(95, 'Analyzing transactions...');
      const analysis = computeDocumentAnalysis(transactionsForAnalysis);
      
      // Generate summary if OpenAI API key is available
      let summary: string | undefined;
      const summaryFileName = options.fileName || options.fileUrl?.split('/').pop() || 'document';
      
      // Check if any transactions came from invoice fallback
      const hasInvoiceFallback = categorizationResult.transactions.some(
        (tx: any) => tx.source === 'invoice_single_fallback'
      );
      
      if (config.ai.openai.apiKey) {
        try {
          if (categorizationResult.transactions.length > 0) {
            // Generate summary from analysis when transactions exist
            summary = await summarizeDocumentForChat(
              options.docType,
              summaryFileName,
              analysis,
              config.ai.openai.apiKey,
              hasInvoiceFallback ? categorizationResult.transactions.find((tx: any) => tx.source === 'invoice_single_fallback') : undefined
            );
            console.log(`[processDocument] Generated document summary${hasInvoiceFallback ? ' (with invoice fallback note)' : ''}`);
          } else if (extractedText.trim().length > 0) {
            // Generate OCR-based summary when no transactions found
            // Document will still be persisted so Byte can read OCR text
            summary = await summarizeOcrDocumentForChat(
              extractedText,
              summaryFileName,
              options.docType
            );
            console.log(`[processDocument] Generated OCR summary for document with no transactions (document will still be persisted)`);
          }
        } catch (summaryError) {
          console.warn(`[processDocument] Summary generation failed: ${summaryError}`);
          // Continue without summary - not fatal
        }
      } else {
        // Fallback summary when OpenAI not available
        if (categorizationResult.transactions.length === 0 && extractedText.trim().length > 0) {
          summary = `I've finished reviewing your ${options.docType === 'receipt' ? 'receipt' : 'bank statement'}, but I couldn't reliably detect any structured financial transactions. The document has been saved and I can read the OCR text if you have questions about it.`;
        }
      }
      
      // Step 8: Build canonical StoredDocument and StoredTransaction structures
      const docId = documentId || randomUUID();
      const uploadedAt = new Date().toISOString();
      
      // Map worker docType to SmartDocType
      const smartDocType: SmartDocType = options.docType === 'receipt' ? 'receipt' : 'bank_statement';
      
      // Build StoredDocument
      const storedDocument: StoredDocument = {
        id: docId,
        userId: options.userId,
        fileName: summaryFileName,
        docType: smartDocType,
        uploadedAt: uploadedAt,
        summary: summary || null,
        transactionCount: transactionsForAnalysis.length, // Count only valid transactions for bank statements
        totalDebits: analysis.totalDebits,
        totalCredits: analysis.totalCredits,
        periodStart: analysis.period?.startDate || null,
        periodEnd: analysis.period?.endDate || null,
        status: 'completed',
      };
      
      // Build StoredTransaction[] from categorized transactions
      const storedTransactions: StoredTransaction[] = categorizationResult.transactions.map((txn, idx) => ({
        id: txn.id || `${docId}-txn-${idx}`,
        documentId: docId,
        date: txn.date || null,
        vendor: txn.merchant || null,
        description: txn.description || null,
        amount: txn.amount,
        category: txn.category || null,
        subcategory: txn.subcategory || null,
        source: ((txn as any).source || 'parsed') as 'parsed' | 'regex_fallback' | 'ai_inferred',
        direction: txn.direction,
        merchant: txn.merchant || null,
        txn_date: txn.date || null,
      }));
      
      // Step 9: Store document and transactions (persist or simulate)
      options.onProgress?.(100, 'Storing results...');
      let redactedUrl: string | undefined;
      
      // Upload redacted document if available
      if (redactedBuffer && options.redact) {
        try {
          const filename = `redacted_${Date.now()}_${options.userId}.pdf`;
          redactedUrl = await SupabaseStorage.uploadFile(
            config.supabase.buckets.redacted,
            filename,
            redactedBuffer,
            'application/pdf'
          );
          storedDocument.redactedUrl = redactedUrl;
        } catch (uploadError) {
          console.warn('[DocumentStore] Failed to upload redacted document:', uploadError);
        }
      }
      
      // Persist using document store (handles real or simulated persistence)
      // Pass extractedText for duplicate detection (hash computed from normalized OCR text)
      const stored = await storeDocumentAndTransactions(
        storedDocument, 
        storedTransactions,
        undefined, // contentHash - will be computed from extractedText
        extractedText // Use normalized OCR text for hash
      );
      
      const processingTime = Date.now() - startTime;
      
      if (stored.isDuplicate) {
        console.log(`[processDocument] Duplicate document detected - existing ID: ${stored.existingDocumentId}`);
      } else {
        console.log(`[processDocument] Document processing completed in ${processingTime}ms - ${stored.transactions.length} transactions`);
      }
      
      // Step 10: Persist Smart Import results to Supabase Phase 1 schema
      // This populates user_documents.ocr_text, imports, and transactions_staging
      // CRITICAL: Always persist documents if OCR succeeded, even with 0 transactions
      // This ensures Byte can read OCR text and users can see their documents
      console.log(`[processDocument] Step 10: Preparing Smart Import persistence`, {
        hasFileUrl: !!options.fileUrl,
        hasOcrText: extractedText && extractedText.trim().length > 0,
        transactionCount: categorizationResult.transactions.length,
        piiTypesCount: detectedPiiTypes.length,
      });

      // Store importId for attaching to result
      let smartImportImportId: string | undefined;

      // Always persist if we have OCR text (even with 0 transactions)
      // This ensures documents are saved and Byte can read them
      if (options.fileUrl && extractedText && extractedText.trim().length > 0) {
        try {
          console.log(`[processDocument] Calling persistSmartImportResults with:`, {
            userId: options.userId,
            fileUrl: options.fileUrl.substring(0, 100) + '...',
            docType: options.docType,
            ocrTextLength: extractedText.length,
            transactionCount: categorizationResult.transactions.length,
            piiTypes: detectedPiiTypes,
            willPersistDocument: true,
            willPersistTransactions: categorizationResult.transactions.length > 0,
          });

          const persistResult = await persistSmartImportResults({
            userId: options.userId,
            originalFileUrl: options.fileUrl,
            docType: options.docType,
            ocrText: extractedText,
            piiTypes: detectedPiiTypes,
            transactions: categorizationResult.transactions, // May be empty - that's OK
          });

          console.log(`[processDocument] Smart Import persistence completed successfully:`, {
            documentId: persistResult.documentId,
            importId: persistResult.importId,
            stagingCount: persistResult.stagingCount,
            documentPersisted: true,
          });

          // Update effectiveDocumentId for return value
          effectiveDocumentId = persistResult.documentId;
          
          // Store importId for frontend to use for commit-import
          smartImportImportId = persistResult.importId;
        } catch (persistError) {
          // Log error but don't fail the worker result
          // The UI should still show transactions even if persistence fails
          console.error(`[processDocument] Smart Import persistence failed:`, persistError);
          if (persistError instanceof Error) {
            console.error(`[processDocument] Persistence error details:`, {
              message: persistError.message,
              stack: persistError.stack,
            });
          } else {
            console.error(`[processDocument] Persistence error (non-Error):`, persistError);
          }
        }
      } else {
        const skipReasons: string[] = [];
        if (!options.fileUrl) skipReasons.push('no fileUrl');
        if (!extractedText || extractedText.trim().length === 0) skipReasons.push('no OCR text');
        console.log(`[processDocument] Skipping Smart Import persistence: ${skipReasons.join(', ')}`);
        // Note: We no longer skip for "no transactions" - documents are always saved if OCR succeeded
      }
      
      // Return ProcessDocumentResult with canonical structures
      // Include importId if Smart Import persistence succeeded (for commit-import)
      // Attach hybrid OCR result for Prime/Byte access
      const result: ProcessDocumentResult & { importId?: string; hybridOcrResult?: typeof hybridOcrResult } = {
        state: 'completed',
        document: stored.document,
        transactions: stored.transactions,
        redactedText: extractedText,
        // Hybrid OCR result attached for AI employees
        hybridOcrResult: hybridOcrResult ? {
          pages: hybridOcrResult.pages,
          fullText: hybridOcrResult.fullText,
          source: hybridOcrResult.source,
          confidence: hybridOcrResult.confidence,
          hadFallback: hybridOcrResult.hadFallback,
          warnings: hybridOcrResult.warnings,
          metadata: hybridOcrResult.metadata,
        } : undefined,
        // Legacy fields for backward compatibility
        documentId: stored.document.id,
        transactionCount: stored.document.transactionCount,
        loanSnapshotId: loanSnapshotId,
        processingTime,
        redactedUrl: stored.document.redactedUrl || undefined,
        analysis,
        summary: stored.document.summary || undefined,
        // Duplicate detection info
        isDuplicate: stored.isDuplicate,
        existingDocumentId: stored.existingDocumentId,
        // Smart Import Phase 2: include importId for commit-import
        importId: smartImportImportId,
      };
      
      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if this is a "detected as image" error from PDF processing
      if (errorMessage === 'DETECTED_AS_IMAGE_VIA_BUFFER') {
        // Re-process as image
        console.log(`[processDocument] Re-processing as image after PDF detection failure`);
        const fileName = options.fileName || options.fileUrl?.split('/').pop()?.split('?')[0] || 'document';
        const documentBuffer = await this.downloadDocument(options);
        
        try {
          options.onProgress?.(20, 'Processing image file...');
          const ocrResult = await this.ocrProcessor.processImage(documentBuffer, options.fileUrl || fileName);
          const extractedText = ocrResult.text;
          
          if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('OCR processing failed: image quality too low or unsupported format. Please try uploading a clearer image or use a PDF/camera scan app.');
          }
          
          // Continue with rest of pipeline using extractedText
          // We'll need to restart from redaction step
          // For now, throw to be handled by outer catch, but this is a fallback
          throw new Error('Image processing initiated but needs full pipeline restart');
        } catch (imageError) {
          // If image processing also fails, return error
          const imageErrorMsg = imageError instanceof Error ? imageError.message : String(imageError);
          console.error(`[processDocument] Image processing failed: ${imageErrorMsg}`);
          throw new Error(`OCR processing failed: ${imageErrorMsg}. The image may be too low quality or in an unsupported format. Please try uploading a clearer image or use a PDF/camera scan app.`);
        }
      }
      
      console.log(`Document processing failed after ${processingTime}ms`);
      
      // Only try to update document status if documentId exists and error is not about missing table
      if (documentId) {
        const isMissingTableError = errorMessage.toLowerCase().includes('documents') && 
          (errorMessage.toLowerCase().includes('schema cache') ||
           errorMessage.toLowerCase().includes('relation') && errorMessage.toLowerCase().includes('does not exist') ||
           errorMessage.toLowerCase().includes('table') && errorMessage.toLowerCase().includes('not found'));
        
        if (!isMissingTableError) {
          // Only update status if table exists - otherwise skip silently
          try {
            await SupabaseDatabase.updateDocumentStatus(documentId, 'failed', errorMessage);
          } catch (updateError) {
            // If update also fails due to missing table, that's fine - just log
            const updateErrorMsg = updateError instanceof Error ? updateError.message : String(updateError);
            if (!updateErrorMsg.toLowerCase().includes('documents') || 
                !updateErrorMsg.toLowerCase().includes('schema cache')) {
              console.warn('[processDocument] Failed to update document status:', updateError);
            }
          }
        }
      }
      
      // Return failed result
      return {
        state: 'failed',
        document: null,
        transactions: [],
        error: errorMessage,
        // Legacy fields
        documentId: documentId || undefined,
        transactionCount: 0,
        processingTime,
      };
    }
  }
  
  private async downloadDocument(options: DocumentProcessingOptions): Promise<Buffer> {
    try {
      if (options.fileUrl) {
        // Download from URL
        console.log(`[processDocument] Downloading from URL: ${options.fileUrl}`);
        const response = await fetch(options.fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // File type detection happens later - just download the file here
        // Images and PDFs are both valid - routing logic will handle them appropriately
        console.log(`[processDocument] Successfully downloaded file: ${buffer.length} bytes`);
        return buffer;
      } else if (options.documentId) {
        // Download from Supabase Storage
        const document = await SupabaseDatabase.getDocument(options.documentId);
        if (!document.original_url) {
          throw new Error('Document has no original URL');
        }
        
        // Extract path from URL
        const url = new URL(document.original_url);
        const path = url.pathname.split('/').pop();
        if (!path) {
          throw new Error('Invalid document URL');
        }
        
        return await SupabaseStorage.downloadFile(config.supabase.buckets.originals, path);
      } else {
        throw new Error('Either fileUrl or documentId must be provided');
      }
    } catch (error) {
      throw new Error(`Document download failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Main processing function
export async function processDocument(options: DocumentProcessingOptions): Promise<DocumentProcessingResult> {
  const workflow = new DocumentProcessingWorkflow();
  return await workflow.processDocument(options);
}






