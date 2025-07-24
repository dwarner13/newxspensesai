import Papa from 'papaparse';
import { Transaction } from '../types/database.types';
import { generateTransactionHash } from './hashGenerator';

interface RawCSVRow {
  [key: string]: string;
}

export const parseCSV = (file: File): Promise<Partial<Transaction>[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const transactions = processCSVResults(results.data as RawCSVRow[]);
          resolve(transactions);
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
  
  // Try to detect the CSV format based on headers
  const headers = Object.keys(data[0]);
  const dateField = findField(headers, ['date', 'transaction date', 'posted date']);
  const descriptionField = findField(headers, ['description', 'narrative', 'details', 'transaction']);
  const amountField = findField(headers, ['amount', 'value', 'transaction amount']);
  const typeField = findField(headers, ['type', 'transaction type', 'credit/debit']);

  if (!dateField || !descriptionField || !amountField) {
    throw new Error('Could not detect required fields in CSV. Please ensure your CSV contains date, description, and amount columns.');
  }

  return data.map(row => {
    // Parse amount and determine transaction type
    let amount = parseFloat(row[amountField].replace(/[^-0-9.]/g, ''));
    let type: 'Credit' | 'Debit' = 'Debit';
    
    // Handle different bank formats
    if (typeField && row[typeField]) {
      // If a type field exists, use it
      const typeValue = row[typeField].toLowerCase();
      type = typeValue.includes('credit') || typeValue.includes('deposit') || typeValue === 'cr' 
        ? 'Credit' 
        : 'Debit';
    } else {
      // If no type field, infer from amount sign
      if (amount < 0) {
        type = 'Debit';
        amount = Math.abs(amount);
      } else {
        type = 'Credit';
      }
      
      // Some banks use separate credit/debit columns
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
    
    // Try to standardize date format to YYYY-MM-DD
    const dateObj = new Date(date);
    if (!isNaN(dateObj.getTime())) {
      date = dateObj.toISOString().split('T')[0];
    }

    const transaction: Partial<Transaction> = {
      date,
      description: row[descriptionField],
      amount,
      type,
    };

    return transaction;
  });
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