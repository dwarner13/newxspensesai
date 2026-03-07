/**
 * generate-test-statement.mjs
 *
 * Creates ./uploads/test-statement.pdf — a realistic-looking bank statement
 * with intentionally messy merchant names to exercise the OCR cleaning logic.
 *
 * Uses pdfkit which produces standard PDFs compatible with pdf-parse.
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'uploads');
const outPath = path.join(outDir, 'test-statement.pdf');

fs.mkdirSync(outDir, { recursive: true });

const transactions = [
  // Debits — messy merchant names typical of real statements
  { date: '2026-02-03', raw: 'SQ *GRND4893',           clean: 'Ground Espresso',     amount: -6.75,   type: 'debit'  },
  { date: '2026-02-05', raw: 'AMZN MKTP CA*2K8JD9F2',  clean: 'Amazon Marketplace',  amount: -43.21,  type: 'debit'  },
  { date: '2026-02-08', raw: 'TMU*NETFLIX.COM',         clean: 'Netflix',             amount: -17.99,  type: 'debit'  },
  { date: '2026-02-10', raw: 'PAYPAL *UBER EATS',       clean: 'Uber Eats',           amount: -31.50,  type: 'debit'  },
  { date: '2026-02-12', raw: 'POS#00392 LOBLAWS #1047', clean: 'Loblaws',             amount: -112.38, type: 'debit'  },
  { date: '2026-02-14', raw: 'SPOTIFY P29KQ2',          clean: 'Spotify',             amount: -10.99,  type: 'debit'  },
  { date: '2026-02-17', raw: 'TIM HORTONS #8821 ON',    clean: 'Tim Hortons',         amount: -4.85,   type: 'debit'  },
  { date: '2026-02-19', raw: 'SHELL OIL 0049328201',    clean: 'Shell Gas Station',   amount: -78.40,  type: 'debit'  },
  // Credits
  { date: '2026-02-01', raw: 'PAYROLL DEP ACME CORP',   clean: 'Payroll Deposit',     amount: 3200.00, type: 'credit' },
  { date: '2026-02-15', raw: 'E-TFR CR 9284710',        clean: 'E-Transfer Received', amount: 250.00,  type: 'credit' },
];

const openingBalance = 1842.33;
const totalDebits  = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + Math.abs(t.amount), 0);
const totalCredits = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
const closingBalance = openingBalance - totalDebits + totalCredits;

const fmt = (n) => (n < 0 ? `-$${Math.abs(n).toFixed(2)}` : `$${n.toFixed(2)}`);

// Build PDF using pdfkit
const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

// Header
doc.font('Courier-Bold').fontSize(14).text('BMO BANK OF MONTREAL');
doc.moveDown(0.5);
doc.font('Courier-Bold').fontSize(11).text('PERSONAL CHEQUING ACCOUNT STATEMENT');
doc.font('Courier').fontSize(10)
  .text('Account Number:  0004 - 829 - 471')
  .text('Statement Period: February 1, 2026 - February 28, 2026')
  .text('Customer: Darrell Warner');
doc.moveDown();
doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
doc.moveDown(0.5);

// Summary
doc.font('Courier-Bold').fontSize(10).text('ACCOUNT SUMMARY');
doc.moveDown(0.3);
doc.font('Courier').fontSize(10)
  .text(`Opening Balance:       ${fmt(openingBalance)}`)
  .text(`Total Debits:         -${fmt(totalDebits)}`)
  .text(`Total Credits:        +${fmt(totalCredits)}`)
  ;
doc.font('Courier-Bold').fontSize(10).text(`Closing Balance:       ${fmt(closingBalance)}`);
doc.moveDown();
doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
doc.moveDown(0.5);

// Transactions
doc.font('Courier-Bold').fontSize(10).text('TRANSACTION DETAIL');
doc.moveDown(0.3);
doc.font('Courier-Bold').fontSize(9)
  .text('DATE        DESCRIPTION                              AMOUNT        TYPE');
doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
doc.moveDown(0.3);

for (const tx of transactions) {
  const desc = tx.raw.padEnd(40).slice(0, 40);
  const amt  = fmt(tx.amount).padStart(12);
  const row  = `${tx.date}  ${desc}  ${amt}  ${tx.type.toUpperCase()}`;
  doc.font('Courier').fontSize(9)
    .fillColor(tx.type === 'credit' ? '#006600' : '#000000')
    .text(row);
}

doc.moveDown();
doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
doc.moveDown(0.5);

doc.font('Courier').fontSize(8).fillColor('#888888')
  .text('* Merchant names may include terminal IDs and location codes.')
  .text('  Cleaning logic should strip these before storing.');
doc.moveDown(0.5);
doc.font('Courier').fontSize(8).fillColor('#aa0000')
  .text('This is a SYNTHETIC test statement for OCR pipeline validation only.')
  .text('Not a real financial document.');

doc.end();

await new Promise((resolve, reject) => {
  stream.on('finish', resolve);
  stream.on('error', reject);
});

console.log(`\n✅ Test statement written to: ${outPath}`);
console.log(`   ${transactions.length} transactions  |  Opening: ${fmt(openingBalance)}  |  Closing: ${fmt(closingBalance)}`);
console.log('\nMessy merchant names included:');
transactions.filter(t => t.type === 'debit').forEach(t =>
  console.log(`  • ${t.raw.padEnd(30)}  →  ${t.clean}`)
);
