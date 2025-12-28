/**
 * Bank Statement Parsers
 * 
 * Day 16: Supercharged Intelligence Layer
 * 
 * Parses CSV bank statements and ensures unique rows.
 */

export interface BankRow {
  date: string;
  description: string;
  amount: number;
}

export interface ParseResult {
  rows: BankRow[];
  uniqueCount: number;
}

/**
 * Parse CSV bank statement text
 * Expected format: Date,Description,Amount
 */
export function parseBank(csvText: string): ParseResult {
  const lines = (csvText || '').split(/\r?\n/).filter(l => l.trim());
  
  if (lines.length < 2) {
    return { rows: [], uniqueCount: 0 };
  }
  
  // Skip header row
  const dataLines = lines.slice(1);
  
  const rows = dataLines
    .map(l => {
      // Simple CSV parsing (handles quoted values)
      const parts = l.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      const [date, desc, amt] = parts;
      
      if (!date || !desc || !amt) {
        return null;
      }
      
      // Normalize date: YYYY/MM/DD or YYYY-MM-DD -> YYYY-MM-DD
      const normalizedDate = date.replace(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/, '$1-$2-$3');
      
      // Parse amount: remove currency symbols, parse number
      const amount = Number((amt || '').replace(/[^\d\.\-]/g, '') || 0);
      
      return {
        date: normalizedDate,
        description: desc,
        amount
      } as BankRow;
    })
    .filter((r): r is BankRow => r !== null && r.date && r.description && r.amount !== 0);
  
  return ensureUnique(rows);
}

/**
 * Ensure unique rows by deduplicating based on date, description, and amount
 */
export function ensureUnique(rows: BankRow[]): ParseResult {
  const seen = new Set<string>();
  const out: BankRow[] = [];
  
  for (const r of rows) {
    const key = `${r.date}::${r.description}::${r.amount}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(r);
    }
  }
  
  return {
    rows: out,
    uniqueCount: out.length
  };
}







