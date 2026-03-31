const fs = require('fs');

// Fix 1: PrimeChatV2 greeting - avoid statement_qa trigger
const fp = 'src/pages/PrimeChatV2/PrimeChatV2.tsx';
let pp = fs.readFileSync(fp, 'utf8');
pp = pp.replace(
  `const prompt = \`BRIEFING MODE: Give Darrell a 2-sentence status on his books, then ask him ONE specific question. Be direct and conversational.

His finances: \${data.transactionCount} transactions across \${data.statementCount} statements. Total spent: \$\${data.totalSpent.toLocaleString('en-CA', { maximumFractionDigits: 0 })}. Total income: \$\${data.totalIncome.toLocaleString('en-CA', { maximumFractionDigits: 0 })}. \${topNote} \${uncatNote}

Ask about the most important thing: uncategorized items if any exist, or the biggest spend category, or the income vs expense gap.\``,
  `const prompt = \`[PRIME_GREETING] Open with 2 sentences about Darrell's finances then ask ONE question. No headers or lists — just talk like a CFO. Data: \${data.transactionCount} txns, \${data.statementCount} statements, $\${data.totalSpent.toLocaleString('en-CA',{maximumFractionDigits:0})} spent, $\${data.totalIncome.toLocaleString('en-CA',{maximumFractionDigits:0})} income. \${topNote} \${uncatNote}\``
);
fs.writeFileSync(fp, pp, 'utf8');
console.log('Fix 1 done - greeting');

// Fix 2: chat.ts - bypass statement_qa for PRIME_GREETING
const fc = 'netlify/functions/chat.ts';
let cc = fs.readFileSync(fc, 'utf8');
if (!cc.includes('PRIME_GREETING')) {
  cc = cc.replace(
    'const isStatementQa = (',
    "const isStatementQa = !text.startsWith('[PRIME_GREETING]') && ("
  );
  fs.writeFileSync(fc, cc, 'utf8');
  console.log('Fix 2 done - statement_qa bypass');
} else {
  console.log('Fix 2 already applied');
}

// Verify
const cc2 = fs.readFileSync(fc, 'utf8');
const pp2 = fs.readFileSync(fp, 'utf8');
console.log('statement_qa bypass:', cc2.includes('PRIME_GREETING'));
console.log('greeting fixed:', pp2.includes('PRIME_GREETING'));
