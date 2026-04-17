const fs = require('fs');
const file = 'netlify/functions/normalize-transactions.ts';
let src = fs.readFileSync(file, 'utf8');

const OLD_MARKER = "pdfBase64: (guardedOcrInputText.length < 500) ? pdfBase64ForVision : null,\n      });\n    }";

if (!src.includes(OLD_MARKER)) {
  console.error('MATCH FAILED - marker not found in file');
  process.exit(1);
}

const OLD = `    if (hasOcrText) {
      const sourceTextPath = transientTextPathActive
        ? 'transient_ocrText'
        : (docTextLength > 0 ? 'persisted_ocr_text' : (hasExtractedData ? 'extracted_data' : 'unknown'));
      normalizedTransactions = await normalizeOcrResult(guardedOcrInputText, userIdText, openaiClient, {
        filename: doc.original_name || '',
        includeAllAccounts: options?.includeAllAccounts,
        sourceTextPath,
        sourceValueType: typeof options?.transientOcrText,
        pdfBase64: (guardedOcrInputText.length < 500) ? pdfBase64ForVision : null,
      });
    }`;

const NEW = `    if (hasOcrText) {
      const sourceTextPath = transientTextPathActive
        ? 'transient_ocrText'
        : (docTextLength > 0 ? 'persisted_ocr_text' : (hasExtractedData ? 'extracted_data' : 'unknown'));

      // CREDIT CARD AI BYPASS: bypasses stale _shared/ocr_normalize.ts BMO-vs-AI comparison
      const preferAiCreditCards = process.env.OCR_PREFER_AI_CREDIT_CARDS === '1';
      const looksLikeCreditCard = /credit.?limit|minimum.?payment|statement.?from|avion|rewards|cashback/i.test(guardedOcrInputText.slice(0, 2000));
      if (preferAiCreditCards && looksLikeCreditCard && pdfBase64ForVision) {
        console.log('[normalize-transactions] Credit card AI bypass active');
        const { aiFallbackParseTransactions } = await import('./_shared/ai_fallback_parser.js');
        const aiDirect = await aiFallbackParseTransactions({
          ocrText: guardedOcrInputText,
          statementType: 'credit_card',
          openaiClient,
          pdfBase64: pdfBase64ForVision,
        });
        if (aiDirect.length > 0) {
          console.log('[normalize-transactions] Credit card AI bypass produced ' + aiDirect.length + ' transactions');
          normalizedTransactions = aiDirect.map(function(tx) { return {
            userId: userIdText,
            kind: 'bank',
            date: tx.date,
            merchant: tx.merchant,
            amount: tx.amount,
            currency: 'CAD',
            statementType: 'credit_card',
            docId: documentId,
          }; });
        }
      }

      if (normalizedTransactions.length === 0) {
        normalizedTransactions = await normalizeOcrResult(guardedOcrInputText, userIdText, openaiClient, {
          filename: doc.original_name || '',
          includeAllAccounts: options?.includeAllAccounts,
          sourceTextPath,
          sourceValueType: typeof options?.transientOcrText,
          pdfBase64: (guardedOcrInputText.length < 500) ? pdfBase64ForVision : null,
        });
      }
    }`;

const patched = src.replace(OLD, NEW);
if (patched === src) {
  console.error('NO CHANGE - exact string not found, trying marker-based approach');
  process.exit(1);
}
fs.writeFileSync(file, patched, 'utf8');
console.log('PATCH OK');
