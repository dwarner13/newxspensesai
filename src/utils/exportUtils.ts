import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Transaction } from '../types/database.types';
import { formatDate, formatCurrency } from './formatters';

export const exportToPDF = (
  transactions: Transaction[],
  stats: {
    income: number;
    expenses: number;
    net: number;
  },
  categoryTotals: Record<string, number>
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Add header
  doc.setFontSize(20);
  doc.text('Financial Summary', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });

  // Add summary section
  doc.setFontSize(14);
  doc.text('Summary', 20, 45);
  doc.setFontSize(12);
  doc.text(`Total Income: ${formatCurrency(stats.income)}`, 20, 55);
  doc.text(`Total Expenses: ${formatCurrency(stats.expenses)}`, 20, 65);
  doc.text(`Net Difference: ${formatCurrency(stats.net)}`, 20, 75);

  // Add category breakdown
  doc.setFontSize(14);
  doc.text('Category Breakdown', 20, 95);
  const categoryData = Object.entries(categoryTotals).map(([category, amount]) => [
    category,
    formatCurrency(amount)
  ]);
  
  doc.autoTable({
    startY: 100,
    head: [['Category', 'Amount']],
    body: categoryData,
    margin: { left: 20 },
    theme: 'striped'
  });

  // Add transactions table
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Transaction Details', 20, 20);

  const transactionData = transactions.map(t => [
    formatDate(t.date),
    t.description,
    t.category,
    t.subcategory || '',
    formatCurrency(t.amount)
  ]);

  doc.autoTable({
    startY: 30,
    head: [['Date', 'Description', 'Category', 'Subcategory', 'Amount']],
    body: transactionData,
    margin: { left: 20 },
    theme: 'striped',
    styles: { overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 60 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 25 }
    }
  });

  // Save the PDF
  doc.save(`financial-summary-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToCSV = (transactions: Transaction[]) => {
  const csvContent = [
    ['Date', 'Description', 'Amount', 'Type', 'Category', 'Subcategory', 'Source File'],
    ...transactions.map(t => [
      formatDate(t.date),
      t.description,
      formatCurrency(t.amount),
      t.type,
      t.category,
      t.subcategory || '',
      t.file_name
    ])
  ].map(row => row.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', `transactions-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};