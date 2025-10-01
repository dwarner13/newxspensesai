import Papa from 'papaparse';
import { Transaction } from '../types/database.types';
import { generateTransactionHash } from './hashGenerator';
import { aiCategorizer } from './aiCategorizer';
import { smartCategorizer } from './smartCategorizer';

interface RawCSVRow {
  [key: string]: string;
}

interface ParseOptions {
  useAI?: boolean;
  batchSize?: number;
  onProgress?: (progress: number, message: string) => void;
}

export const parseCSVWithAI = async (
  file: File, 
  options: ParseOptions = {}
): Promise<Partial<Transaction>[]> => {
  const { useAI = true, batchSize = 20, onProgress } = options;

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          onProgress?.(10, 'Parsing CSV structure...');
          
          const rawTransactions = processCSVResults(results.data as RawCSVRow[]);
          
          if (useAI && rawTransactions.length > 0) {
            onProgress?.(30, 'Preparing for AI categorization...');
            
            const categorizedTransactions = await categorizeWithAI(
              rawTransactions, 
              batchSize,
              onProgress
            );
            
            onProgress?.(100, 'Categorization complete!');
            resolve(categorizedTransactions);
          } else {
            onProgress?.(100, 'CSV parsing complete!');
            resolve(rawTransactions);
          }
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

const processCSVResults = (data: RawCSVRow[]): Partial<Transaction>[] => {
  if (data.length === 0) {
    throw new Error('CSV file contains no data');
  }
  
  const headers = Object.keys(data[0]);
  const dateField = findField(headers, ['date', 'transaction date', 'posted date']);
  const descriptionField = findField(headers, ['description', 'narrative', 'details', 'transaction']);
  const amountField = findField(headers, ['amount', 'value', 'transaction amount']);
  const typeField = findField(headers, ['type', 'transaction type', 'credit/debit']);

  if (!dateField || !descriptionField || !amountField) {
    throw new Error('Could not detect required fields in CSV. Please ensure your CSV contains date, description, and amount columns.');
  }

  return data.map(row => {
    let amount = parseFloat(row[amountField].replace(/[^-0-9.]/g, ''));
    let type: 'Credit' | 'Debit' = 'Debit';
    
    // Handle different bank formats
    if (typeField && row[typeField]) {
      const typeValue = row[typeField].toLowerCase();
      type = typeValue.includes('credit') || typeValue.includes('deposit') || typeValue === 'cr' 
        ? 'Credit' 
        : 'Debit';
    } else {
      if (amount < 0) {
        type = 'Debit';
        amount = Math.abs(amount);
      } else {
        type = 'Credit';
      }
      
      // Check for separate credit/debit columns
      const creditField = findField(headers, ['credit', 'deposit']);
      const debitField = findField(headers, ['debit', 'withdrawal']);
      
      if (creditField && debitField) {
        const creditAmount = parseFloat(row[creditField].replace(/[^-0-9.]/g, '') || '0');
        const debitAmount = parseFloat(row[debitField].replace(/[^-0-9.]/g, '') || '0');
        
        if (creditAmount > 0) {
          type = 'Credit';
          amount = creditAmount;
        } else if (debitAmount > 0) {
          type = 'Debit';
          amount = debitAmount;
        }
      }
    }

    // Parse date
    let date = row[dateField];
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) {
      date = dateObj.toISOString().split('T')[0];
    }

    return {
      date,
      description: row[descriptionField],
      amount,
      type,
      category: 'Uncategorized', // Will be updated by AI
      categorization_source: 'default'
    };
  });
};

const categorizeWithAI = async (
  transactions: Partial<Transaction>[],
  batchSize: number,
  onProgress?: (progress: number, message: string) => void
): Promise<Partial<Transaction>[]> => {
  const categorizedTransactions: Partial<Transaction>[] = [];
  
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    const progress = 30 + ((i / transactions.length) * 60); // 30-90% for AI processing
    
    onProgress?.(progress, `Categorizing transactions ${i + 1}-${Math.min(i + batchSize, transactions.length)}...`);
    
    try {
      // Prepare batch for AI
      const batchText = batch
        .map(t => `${t.date}    ${t.description}    $${t.amount}`)
        .join('\n');
      
      const aiResults = await aiCategorizer.categorizeTransactions(batchText);
      
      // Merge AI results with original transactions
      for (let j = 0; j < batch.length; j++) {
        const original = batch[j];
        const aiResult = aiResults[j];
        
        if (aiResult) {
          categorizedTransactions.push({
            ...original,
            category: aiResult.category,
            categorization_source: 'ai'
          });
        } else {
          // Fallback to smart categorizer
          const smartResult = await smartCategorizer.categorizeWithMemory(original.description || '');
          categorizedTransactions.push({
            ...original,
            category: smartResult.category,
            subcategory: smartResult.subcategory,
            categorization_source: smartResult.source});
        }
      }
      
      // Small delay between batches
      if (i + batchSize < transactions.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error(`Error categorizing batch ${i}-${i + batchSize}:`, error);
      
      // Fallback to smart categorizer for this batch
      for (const transaction of batch) {
        try {
          const smartResult = await smartCategorizer.categorizeWithMemory(transaction.description || '');
          categorizedTransactions.push({
            ...transaction,
            category: smartResult.category,
            subcategory: smartResult.subcategory,
            categorization_source: smartResult.source});
        } catch (fallbackError) {
          // Ultimate fallback
          categorizedTransactions.push({
            ...transaction,
            category: 'Uncategorized',
            categorization_source: 'default'
          });
        }
      }
    }
  }
  
  onProgress?.(95, 'Learning vendor patterns...');
  
  return categorizedTransactions;
};

const findField = (headers: string[], possibleNames: string[]): string | undefined => {
  const normalizedHeaders = headers.map(h => h.toLowerCase());
  
  for (const name of possibleNames) {
    const index = normalizedHeaders.findIndex(h => h.includes(name));
    if (index >= 0) {
      return headers[index];
    }
  }
  
  return undefined;
};