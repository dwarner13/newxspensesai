import { supabase } from '../lib/supabase';
import { Transaction } from '../types/database.types';
import dayjs from 'dayjs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/** CSV Formatter */
function transactionsToCSV(transactions: Transaction[]): string {
  const header = ['Date', 'Vendor', 'Category', 'Amount'];
  const rows = transactions.map(tx => [
    tx.date,
    tx.description,
    tx.category,
    tx.amount
  ]);
  return [header, ...rows].map(row => row.map(String).join(',')).join('\n');
}

/** PDF Formatter */
async function transactionsToPDF(transactions: Transaction[], userName: string, month: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let y = 760;

  page.drawText(`Transactions for ${userName || 'User'} - ${month || 'All Time'}`, {
    x: 50, y, size: 18, font, color: rgb(0, 0, 0)
  });

  y -= 30;
  page.drawText('Date', { x: 50, y, size: 12, font});
  page.drawText('Vendor', { x: 150, y, size: 12, font});
  page.drawText('Category', { x: 350, y, size: 12, font});
  page.drawText('Amount', { x: 500, y, size: 12, font});

  y -= 20;
  for (const tx of transactions) {
    if (y < 40) break; // prevent overflow
    page.drawText(tx.date, { x: 50, y, size: 10, font});
    page.drawText(tx.description || '', { x: 150, y, size: 10, font});
    page.drawText(tx.category || '', { x: 350, y, size: 10, font});
    page.drawText(String(tx.amount), { x: 500, y, size: 10, font});
    y -= 16;
  }

  return await pdfDoc.save();
}

/** Export as CSV and trigger download */
export function exportTransactionsToCSV(transactions: Transaction[]) {
  const csv = transactionsToCSV(transactions);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transactions.csv';
  link.click();
  URL.revokeObjectURL(url);
}

/** Export as PDF and trigger download */
export async function exportTransactionsToPDF(transactions: Transaction[]) {
  const pdfBytes = await transactionsToPDF(transactions, '', '');
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'transactions.pdf';
  link.click();
  URL.revokeObjectURL(url);
}

/** Google Sheets Export (Stub) */
export async function exportToGoogleSheets(transactions: Transaction[]) {
  // Placeholder: implement your actual API logic here
  console.log('Exporting to Google Sheets...', transactions);
  // Example:
  // await fetch('/api/export-to-sheets', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(transactions)
  // });
  return "Exported to Google Sheets.";
}

/** Master Export Handler (optional entry point) */
export async function exportTransactions() {
  // TODO: Decide which format to use
  return "Transactions exported.";
}
