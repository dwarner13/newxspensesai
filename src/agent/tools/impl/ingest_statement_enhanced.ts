import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { OCRService } from '../../../server/ocr/ocrService';
import { FileValidator } from '../../../server/security/fileValidator';
import { getEmbedding } from '../../../server/ai/embeddings';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'ingest_statement_enhanced';

export const inputSchema = z.object({
  fileId: z.string(),
  type: z.enum(['csv', 'pdf', 'image']).optional(),
  deduplication: z.boolean().default(true),
  autoCategorization: z.boolean().default(true),
  confirm: z.boolean().optional(),
});

export const outputSchema = z.object({
  ok: z.boolean(),
  processed: z.number(),
  inserted: z.number(),
  duplicates: z.number(),
  skipped: z.number(),
  errors: z.array(z.string()).optional(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { fileId, type, deduplication, autoCategorization } = input;
    
    // Download file from storage
    const fileBuffer = await downloadFile(fileId);
    
    // Validate file
    const validator = new FileValidator();
    const validation = await validator.validateFile(fileBuffer, '', fileId);
    if (!validation.ok) {
      return Err(new Error(`File validation failed: ${validation.error.message}`));
    }
    
    let transactions: any[] = [];
    
    // Process based on type
    switch (validation.value.fileType) {
      case 'csv':
        const csvResult = await processCSV(fileBuffer);
        if (!csvResult.ok) return Err(csvResult.error);
        transactions = csvResult.value;
        break;
        
      case 'pdf':
        const pdfResult = await processPDF(fileBuffer);
        if (!pdfResult.ok) return Err(pdfResult.error);
        transactions = pdfResult.value;
        break;
        
      case 'image':
        const ocrService = new OCRService();
        const ocrResult = await ocrService.processReceipt(fileBuffer);
        if (ocrResult.ok && ocrResult.value.fields) {
          transactions = [ocrResult.value.fields];
        } else {
          return Err(new Error('OCR processing failed'));
        }
        break;
        
      default:
        return Err(new Error(`Unsupported file type: ${validation.value.fileType}`));
    }
    
    // Deduplication
    let duplicates = 0;
    let inserted = 0;
    const toInsert: any[] = [];
    const errors: string[] = [];
    
    for (const tx of transactions) {
      try {
        if (deduplication) {
          const duplicate = await checkDuplicate(ctx.userId, tx);
          if (duplicate) {
            duplicates++;
            continue;
          }
        }
        
        // Auto-categorization
        if (autoCategorization && !tx.category) {
          tx.category = await categorizeTransaction(tx);
          tx.auto_category = tx.category;
          tx.confidence = 0.85;
        }
        
        // Generate embedding for semantic search
        if (tx.vendor || tx.description) {
          const text = `${tx.vendor || ''} ${tx.description || ''}`;
          tx.embedding = await getEmbedding(text);
        }
        
        // Normalize vendor
        if (tx.vendor) {
          tx.normalized_vendor = normalizeVendor(tx.vendor);
        }
        
        // Add metadata
        tx.user_id = ctx.userId;
        tx.source = validation.value.fileType;
        tx.file_id = fileId;
        
        toInsert.push(tx);
      } catch (error) {
        errors.push(`Failed to process transaction: ${error.message}`);
      }
    }
    
    // Bulk insert
    if (toInsert.length > 0) {
      const result = await bulkInsertTransactions(toInsert);
      if (!result.ok) {
        return Err(result.error);
      }
      inserted = result.value.count;
      
      // Update analytics cache
      await updateAnalyticsCache(ctx.userId, toInsert);
    }
    
    return Ok({
      ok: true,
      processed: transactions.length,
      inserted,
      duplicates,
      skipped: transactions.length - inserted - duplicates,
      errors: errors.length > 0 ? errors : undefined,
    });
    
  } catch (error) {
    return Err(error as Error);
  }
}

async function downloadFile(fileId: string): Promise<Buffer> {
  const client = getSupabaseServerClient();
  
  const { data, error } = await client.storage
    .from('uploads')
    .download(fileId);
  
  if (error) throw new Error(`Failed to download file: ${error.message}`);
  
  return Buffer.from(await data.arrayBuffer());
}

async function processCSV(buffer: Buffer): Promise<Result<any[]>> {
  try {
    const text = buffer.toString('utf8');
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return Err(new Error('CSV must have at least 2 rows'));
    }
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const transactions: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const tx: any = {};
      
      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        
        switch (header) {
          case 'date':
            tx.date = parseDate(value);
            break;
          case 'amount':
          case 'total':
            tx.amount = parseFloat(value?.replace(/[^0-9.-]/g, '') || '0');
            break;
          case 'vendor':
          case 'merchant':
          case 'description':
            tx.vendor = value;
            break;
          case 'category':
            tx.category = value;
            break;
          default:
            tx[header] = value;
        }
      });
      
      if (tx.date && tx.amount) {
        transactions.push(tx);
      }
    }
    
    return Ok(transactions);
  } catch (error) {
    return Err(error as Error);
  }
}

async function processPDF(buffer: Buffer): Promise<Result<any[]>> {
  // Mock implementation - in production, use PDF parsing library
  // For now, return empty array as PDF processing would require OCR
  return Ok([]);
}

function parseDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {}
  
  return new Date().toISOString().split('T')[0];
}

async function checkDuplicate(userId: string, tx: any): Promise<boolean> {
  const client = getSupabaseServerClient();
  
  const { data } = await client
    .rpc('detect_duplicate', {
      p_user_id: userId,
      p_date: tx.date,
      p_amount: tx.amount,
      p_vendor: tx.vendor,
    });
  
  return !!data;
}

async function categorizeTransaction(tx: any): Promise<string> {
  // Rule-based categorization
  const rules = [
    { pattern: /grocery|supermarket|walmart|metro|loblaws/i, category: 'Groceries' },
    { pattern: /gas|fuel|petro|shell|esso|chevron/i, category: 'Transportation' },
    { pattern: /restaurant|cafe|coffee|tim hortons|starbucks|mcdonalds/i, category: 'Dining' },
    { pattern: /netflix|spotify|amazon prime|disney/i, category: 'Subscriptions' },
    { pattern: /pharmacy|drugs|shoppers|rexall/i, category: 'Healthcare' },
    { pattern: /amazon|ebay|shopify/i, category: 'Shopping' },
    { pattern: /hydro|electric|gas bill|utility/i, category: 'Utilities' },
    { pattern: /rent|mortgage|property/i, category: 'Housing' },
  ];
  
  const vendor = (tx.vendor || '').toLowerCase();
  const desc = (tx.description || '').toLowerCase();
  const text = `${vendor} ${desc}`;
  
  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      return rule.category;
    }
  }
  
  return 'Other';
}

function normalizeVendor(vendor: string): string {
  return vendor.toLowerCase()
    .replace(/\s+(inc|ltd|llc|corp|co|store|#\d+).*$/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

async function bulkInsertTransactions(transactions: any[]): Promise<Result<{ count: number }>> {
  const client = getSupabaseServerClient();
  
  const { data, error } = await client
    .from('transactions')
    .insert(transactions)
    .select('id');
  
  if (error) throw error;
  
  return Ok({ count: data?.length || 0 });
}

async function updateAnalyticsCache(userId: string, transactions: any[]): Promise<void> {
  // Group by month and category
  const groups = new Map<string, Map<string, { amount: number; count: number }>>();
  
  for (const tx of transactions) {
    const month = tx.date.substring(0, 7); // YYYY-MM
    const category = tx.category || 'Uncategorized';
    
    if (!groups.has(month)) {
      groups.set(month, new Map());
    }
    
    const monthGroup = groups.get(month)!;
    const existing = monthGroup.get(category) || { amount: 0, count: 0 };
    monthGroup.set(category, {
      amount: existing.amount + tx.amount,
      count: existing.count + 1,
    });
  }
  
  // Update cache
  const client = getSupabaseServerClient();
  for (const [period, categories] of groups) {
    for (const [category, data] of categories) {
      await client
        .from('analytics_cache')
        .upsert({
          user_id: userId,
          period,
          category,
          total_amount: data.amount,
          transaction_count: data.count,
          avg_amount: data.amount / data.count,
        }, {
          onConflict: 'user_id,period,category',
        });
    }
  }
}

export const metadata = {
  name: 'Enhanced Statement Ingestion',
  description: 'Process financial statements with OCR, validation, and intelligent categorization',
  requiresConfirmation: false,
  dangerous: false,
  category: 'data_management',
};
