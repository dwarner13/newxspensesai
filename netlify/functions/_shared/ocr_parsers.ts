/**
 * OCR Parsers Module
 * 
 * Day 8: Parse extracted text into structured JSON
 * 
 * Functions:
 * - parseInvoiceLike: Extract invoice fields
 * - parseReceiptLike: Extract receipt fields
 * - parseBankStatementLike: Extract bank statement fields (stub)
 * - normalizeParsed: Tag parsed document with kind
 */

export interface InvoiceData {
  vendor?: string;
  invoice_no?: string;
  date?: string;
  line_items?: Array<{
    desc: string;
    qty?: number;
    unit?: string;
    price?: number;
  }>;
  subtotal?: number;
  tax?: number;
  total?: number;
  currency?: string;
}

export interface ReceiptData {
  merchant?: string;
  date?: string;
  items?: Array<{
    name: string;
    qty?: number;
    price?: number;
  }>;
  total?: number;
  payment?: {
    method?: string;
    last4?: string;
  };
  taxes?: Array<{
    name: string;
    amount: number;
  }>;
}

export type ParsedDoc =
  | { kind: 'invoice'; data: InvoiceData }
  | { kind: 'receipt'; data: ReceiptData }
  | { kind: 'bank'; data: any };

const HEADER_LINE_SCAN_COUNT = 8;

function getHeaderYear(text: string): number | null {
  const lines = text.split('\n').slice(0, HEADER_LINE_SCAN_COUNT);
  for (const line of lines) {
    const match = line.match(/\b(20\d{2})\b/);
    if (match) {
      const year = Number(match[1]);
      if (!Number.isNaN(year)) {
        return year;
      }
    }
  }
  return null;
}

function normalizeDateWithHeaderYear(dateText: string, headerYear: number | null): string {
  if (!headerYear) {
    return dateText;
  }

  const parts = dateText.split(/[\/\-]/).map((part) => part.trim());
  if (parts.length !== 3) {
    return dateText;
  }

  const yearPart = parts[2];
  const parsedYear = Number(yearPart.length === 2 ? `20${yearPart}` : yearPart);
  if (Number.isNaN(parsedYear)) {
    return dateText;
  }

  if (yearPart.length === 2) {
    return `${parts[0]}/${parts[1]}/${String(headerYear)}`;
  }

  if (Math.abs(parsedYear - headerYear) >= 2) {
    return `${parts[0]}/${parts[1]}/${String(headerYear)}`;
  }

  return dateText;
}

function parseAmount(value: string): number {
  return parseFloat(value.replace(/,/g, ''));
}

function extractAmountFromLine(line: string): number | undefined {
  const match = line.match(/(?:\$|USD|CAD|EUR|GBP|S)?\s*([\d,\s]+\.\d{2})/i);
  if (!match) {
    return undefined;
  }
  const cleaned = match[1].replace(/\s+/g, '');
  return parseAmount(cleaned);
}

function pickLabeledAmount(text: string, labels: RegExp[]): number | undefined {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const label of labels) {
      if (label.test(line)) {
        const onLine = extractAmountFromLine(line);
        if (typeof onLine === 'number') {
          return onLine;
        }
        for (let j = 1; j <= 3 && i + j < lines.length; j += 1) {
          const nextLine = lines[i + j];
          const nextAmount = extractAmountFromLine(nextLine);
          if (typeof nextAmount === 'number') {
            return nextAmount;
          }
        }
      }
    }
  }
  return undefined;
}

/**
 * Parse invoice-like text into structured data
 */
export function parseInvoiceLike(text: string): InvoiceData {
  const result: InvoiceData = {};
  const lower = text.toLowerCase();
  const headerYear = getHeaderYear(text);
  
  // Extract vendor/invoice number
  const vendorMatch = text.match(/(?:from|vendor|supplier|bill\s+from|invoice\s+from)[:\s]+([A-Z][^\n]+)/i);
  if (vendorMatch) {
    result.vendor = vendorMatch[1].trim();
  }
  
  const invoiceNoMatch = text.match(/(?:invoice\s*(?:#|number|no)[:\s]*|inv\s*#\s*)([A-Z0-9-]+)/i);
  if (invoiceNoMatch) {
    result.invoice_no = invoiceNoMatch[1].trim();
  }
  
  // Extract date
  const dateMatch = text.match(/(?:date|invoice\s+date|dated)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  if (dateMatch) {
    result.date = normalizeDateWithHeaderYear(dateMatch[1].trim(), headerYear);
  }
  
  // Extract totals
  const dueTotal = pickLabeledAmount(text, [
    /payment\s+due/i,
    /outstanding\s+balance/i,
    /balance\s+due/i,
    /total\s+amount\s+due/i,
    /amount\s+due/i,
    /total\s+due/i,
  ]);
  if (typeof dueTotal === 'number') {
    result.total = dueTotal;
  }

  if (typeof result.total !== 'number') {
    const totalMatch = text.match(/(?:total|grand\s+total)[:\s]*\$?([\d,]+\.?\d*)/i);
    if (totalMatch) {
      result.total = parseAmount(totalMatch[1]);
    }
  }
  
  const subtotalMatch = text.match(/(?:subtotal|sub-total)[:\s]*\$?([\d,]+\.?\d*)/i);
  if (subtotalMatch) {
    result.subtotal = parseAmount(subtotalMatch[1]);
  }
  
  const taxMatch = text.match(/(?:tax|gst|hst|vat)[:\s]*\$?([\d,]+\.?\d*)/i);
  if (taxMatch) {
    result.tax = parseAmount(taxMatch[1]);
  }
  
  // Extract currency
  const currencyMatch = text.match(/\$|USD|CAD|EUR|GBP/i);
  if (currencyMatch) {
    result.currency = currencyMatch[0].toUpperCase();
  }
  
  // Extract line items (simple heuristic)
  const lineItems: InvoiceData['line_items'] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    // Look for lines with description and price
    const itemMatch = line.match(/(.+?)\s+\$?([\d,]+\.?\d*)/);
    if (itemMatch && !itemMatch[1].match(/(?:total|subtotal|tax|invoice|date)/i)) {
      lineItems.push({
        desc: itemMatch[1].trim(),
        price: parseAmount(itemMatch[2])
      });
    }
  }
  if (lineItems.length > 0) {
    result.line_items = lineItems.slice(0, 20); // Limit to 20 items
  }
  
  return result;
}

/**
 * Parse receipt-like text into structured data
 */
export function parseReceiptLike(text: string): ReceiptData {
  const result: ReceiptData = {};
  const lower = text.toLowerCase();
  const headerYear = getHeaderYear(text);
  
  // Extract merchant
  const merchantMatch = text.match(/(?:from|merchant|store|retailer)[:\s]+([A-Z][^\n]+)/i) ||
                        text.match(/^([A-Z][^\n]{3,30})/m);
  if (merchantMatch) {
    result.merchant = merchantMatch[1].trim();
  }
  
  // Extract date
  const dateMatch = text.match(/(?:date|purchase\s+date|transaction\s+date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  if (dateMatch) {
    result.date = normalizeDateWithHeaderYear(dateMatch[1].trim(), headerYear);
  }
  
  // Extract total
  const dueTotal = pickLabeledAmount(text, [
    /payment\s+due/i,
    /outstanding\s+balance/i,
    /balance\s+due/i,
    /total\s+amount\s+due/i,
    /amount\s+due/i,
    /total\s+due/i,
  ]);
  if (typeof dueTotal === 'number') {
    result.total = dueTotal;
  }

  if (typeof result.total !== 'number') {
    const totalMatch = text.match(/(?:total|amount|paid)[:\s]*\$?([\d,]+\.?\d*)/i);
    if (totalMatch) {
      result.total = parseAmount(totalMatch[1]);
    }
  }
  
  // Extract payment method
  const paymentMatch = text.match(/(?:payment|paid\s+with|card)[:\s]+([A-Z]+(?:\s+[A-Z]+)?)/i);
  if (paymentMatch) {
    result.payment = {
      method: paymentMatch[1].trim()
    };
  }
  
  // Extract last 4 digits
  const last4Match = text.match(/(?:card|ending|xxxx)[:\s]*(\d{4})/i);
  if (last4Match) {
    if (!result.payment) result.payment = {};
    result.payment.last4 = last4Match[1];
  }
  
  // Extract items
  const items: ReceiptData['items'] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    // Look for lines with item name and price
    const itemMatch = line.match(/(.+?)\s+\$?([\d,]+\.?\d*)/);
    if (itemMatch && !itemMatch[1].match(/(?:total|tax|subtotal|payment|card|date)/i)) {
      items.push({
        name: itemMatch[1].trim(),
        price: parseAmount(itemMatch[2])
      });
    }
  }
  if (items.length > 0) {
    result.items = items.slice(0, 30); // Limit to 30 items
  }
  
  // Extract taxes
  const taxes: ReceiptData['taxes'] = [];
  const taxMatches = text.matchAll(/(?:tax|gst|hst|vat)[:\s]*\$?([\d,]+\.?\d*)/gi);
  for (const match of taxMatches) {
    taxes.push({
      name: match[0].split(/[:\s]/)[0] || 'Tax',
      amount: parseAmount(match[1])
    });
  }
  if (taxes.length > 0) {
    result.taxes = taxes;
  }
  
  return result;
}

/**
 * Parse bank statement-like text (stub for future)
 */
export function parseBankStatementLike(text: string): any {
  // Minimal stub - will be enhanced in future phases
  return {
    account: undefined,
    transactions: []
  };
}

/**
 * Normalize parsed document by detecting kind and tagging it
 */
export function normalizeParsed(parsed: InvoiceData | ReceiptData | any): ParsedDoc {
  // Heuristic: Check for invoice-like fields
  if ('invoice_no' in parsed || ('line_items' in parsed && parsed.line_items)) {
    return { kind: 'invoice', data: parsed as InvoiceData };
  }
  
  // Heuristic: Check for receipt-like fields
  if ('merchant' in parsed || ('items' in parsed && parsed.items)) {
    return { kind: 'receipt', data: parsed as ReceiptData };
  }
  
  // Heuristic: Check for bank statement-like fields
  if ('account' in parsed || 'transactions' in parsed) {
    return { kind: 'bank', data: parsed };
  }
  
  // Default: try to detect from parsed fields
  if (parsed.vendor || parsed.invoice_no) {
    return { kind: 'invoice', data: parsed as InvoiceData };
  }
  
  if (parsed.merchant || parsed.items) {
    return { kind: 'receipt', data: parsed as ReceiptData };
  }
  
  // Fallback: treat as receipt if it has total
  if (parsed.total) {
    return { kind: 'receipt', data: parsed as ReceiptData };
  }
  
  // Last resort: invoice
  return { kind: 'invoice', data: parsed as InvoiceData };
}









