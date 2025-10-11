import { SupabaseStorage, SupabaseDatabase } from '../supabase.js';
import { OCRProcessor } from '../ocr/index.js';
import { DocumentProcessor } from '../pdf/index.js';
import { RedactionProcessor } from '../redaction/patterns.js';
import { ParsingProcessor } from '../parse/bank.js';
import { CategorizationProcessor } from '../categorize/index.js';
import { config } from '../config.js';

// Document processing interfaces
export interface DocumentProcessingOptions {
  userId: string;
  documentId?: string;
  fileUrl?: string;
  docType: 'receipt' | 'bank_statement';
  redact: boolean;
  onProgress?: (progress: number, message: string) => void;
}

export interface DocumentProcessingResult {
  documentId: string;
  transactionCount: number;
  processingTime: number;
  redactedUrl?: string | undefined;
  error?: string;
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
    
    try {
      // Step 1: Download document (10%)
      options.onProgress?.(10, 'Downloading document...');
      const documentBuffer = await this.downloadDocument(options);
      
      // Step 2: Process document structure (20%)
      options.onProgress?.(20, 'Processing document structure...');
      const documentInfo = await this.documentProcessor.processDocument(
        documentBuffer,
        options.fileUrl || 'unknown',
        'application/pdf'
      );
      
      // Step 3: OCR processing if needed (40%)
      let extractedText = documentInfo.text;
      if (documentInfo.isScanned || documentInfo.text.trim().length < 100) {
        options.onProgress?.(40, 'Performing OCR...');
        // OCR processor now handles PDF to image conversion automatically
        const ocrResult = await this.ocrProcessor.processImage(documentBuffer, options.fileUrl || 'unknown');
        extractedText = ocrResult.text;
      }
      
      // Step 4: Redaction (60%)
      let redactedBuffer: Buffer | undefined;
      if (options.redact) {
        options.onProgress?.(60, 'Redacting sensitive information...');
        const redactionResult = await this.redactionProcessor.redactDocument(
          documentBuffer,
          options.fileUrl || 'unknown',
          extractedText
        );
        
        redactedBuffer = redactionResult.redactedBuffer;
        extractedText = redactionResult.redactedText;
      }
      
      // Step 5: Parse transactions (80%)
      options.onProgress?.(80, 'Parsing transactions...');
      const parsingResult = await this.parsingProcessor.parseDocument(extractedText, options.docType);
      
      // Step 6: Categorize transactions (90%)
      options.onProgress?.(90, 'Categorizing transactions...');
      const categorizationResult = await this.categorizationProcessor.categorizeTransactions(
        parsingResult.transactions,
        options.userId
      );
      
      // Step 7: Store results (100%)
      options.onProgress?.(100, 'Storing results...');
      const finalResult = await this.storeResults(
        options,
        categorizationResult.transactions,
        redactedBuffer,
        documentId
      );
      
      const processingTime = Date.now() - startTime;
      
      console.log(`Document processing completed in ${processingTime}ms`);
      
      return {
        documentId: finalResult.documentId,
        transactionCount: categorizationResult.transactions.length,
        processingTime,
        redactedUrl: finalResult.redactedUrl,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.log(`Document processing failed after ${processingTime}ms`);
      
      // Update document status to failed
      if (documentId) {
        await SupabaseDatabase.updateDocumentStatus(documentId, 'failed', errorMessage);
      }
      
      throw new Error(`Document processing failed: ${errorMessage}`);
    }
  }
  
  private async downloadDocument(options: DocumentProcessingOptions): Promise<Buffer> {
    try {
      if (options.fileUrl) {
        // Download from URL
        const response = await fetch(options.fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
        }
        return Buffer.from(await response.arrayBuffer());
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
  
  private async storeResults(
    options: DocumentProcessingOptions,
    transactions: any[],
    redactedBuffer?: Buffer,
    documentId?: string
  ): Promise<{
    documentId: string;
    redactedUrl?: string | undefined;
  }> {
    try {
      let finalDocumentId = documentId;
      let redactedUrl: string | undefined;
      
      // Create document record if not exists
      if (!finalDocumentId) {
        const document = await SupabaseDatabase.createDocument({
          user_id: options.userId,
          type: options.docType,
          status: 'processing',
        });
        finalDocumentId = document.id;
      }
      
      // Upload redacted document if available
      if (redactedBuffer && options.redact) {
        const filename = `redacted_${Date.now()}_${options.userId}.pdf`;
        redactedUrl = await SupabaseStorage.uploadFile(
          config.supabase.buckets.redacted,
          filename,
          redactedBuffer,
          'application/pdf'
        );
      }
      
      // Insert transactions
      if (transactions.length > 0) {
        const transactionData = transactions.map(transaction => ({
          document_id: finalDocumentId!,
          user_id: options.userId,
          txn_date: transaction.date,
          merchant: transaction.merchant,
          description: transaction.description,
          amount: transaction.amount,
          direction: transaction.direction,
          category: transaction.category || 'Uncategorized',
          subcategory: transaction.subcategory,
        }));
        
        await SupabaseDatabase.insertTransactions(transactionData);
      }
      
      // Update document status
      await SupabaseDatabase.updateDocumentStatus(
        finalDocumentId!,
        'completed',
        undefined
      );
      
      // Delete original file if configured
      if (config.security.deleteOriginalOnSuccess && options.fileUrl) {
        try {
          const url = new URL(options.fileUrl);
          const path = url.pathname.split('/').pop();
          if (path) {
            await SupabaseStorage.deleteFile(config.supabase.buckets.originals, path);
          }
        } catch (deleteError) {
          // Log but don't fail the entire process
          console.warn('Failed to delete original file:', deleteError);
        }
      }
      
      return {
        documentId: finalDocumentId!,
        redactedUrl,
      };
    } catch (error) {
      throw new Error(`Failed to store results: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Main processing function
export async function processDocument(options: DocumentProcessingOptions): Promise<DocumentProcessingResult> {
  const workflow = new DocumentProcessingWorkflow();
  return await workflow.processDocument(options);
}






