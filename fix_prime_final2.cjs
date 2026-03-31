const fs = require('fs');

// Fix 1: PrimeChatV2 - find and replace greeting using indexOf
const fp = 'src/pages/PrimeChatV2/PrimeChatV2.tsx';
let pp = fs.readFileSync(fp, 'utf8');
const greetStart = pp.indexOf('const prompt = `BRIEFING MODE:');
const greetEnd = pp.indexOf('void sendMessage(prompt', greetStart);
if (greetStart !== -1 && greetEnd !== -1) {
  const before = pp.slice(0, greetStart);
  const after = pp.slice(greetEnd);
  const newGreet = `const prompt = \`[PRIME_GREETING] Talk to Darrell like his CFO — 2 sentences on his finances then ONE question. No lists. Data: \${data.transactionCount} txns, \${data.statementCount} statements, spent $\${data.totalSpent.toLocaleString('en-CA',{maximumFractionDigits:0})}, income $\${data.totalIncome.toLocaleString('en-CA',{maximumFractionDigits:0})}. \${topNote} \${uncatNote}\`;\n\n    `;
  pp = before + newGreet + after;
  fs.writeFileSync(fp, pp, 'utf8');
  console.log('Fix 1 done - indexOf replacement worked');
} else {
  console.log('Fix 1 FAILED - greetStart:', greetStart, 'greetEnd:', greetEnd);
}

// Fix 2: chat.ts - bypass statement_qa
const fc = 'netlify/functions/chat.ts';
let cc = fs.readFileSync(fc, 'utf8');
const qaIdx = cc.indexOf('const isStatementQa = (');
if (qaIdx !== -1) {
  cc = cc.slice(0, qaIdx) + 
    "const isStatementQa = !text.startsWith('[PRIME_GREETING]') && (" + 
    cc.slice(qaIdx + 'const isStatementQa = ('.length);
  fs.writeFileSync(fc, cc, 'utf8');
  console.log('Fix 2 done - statement_qa bypass');
} else {
  console.log('Fix 2 FAILED - isStatementQa not found');
}

// Verify
console.log('bypass present:', fs.readFileSync(fc,'utf8').includes('PRIME_GREETING'));
console.log('greeting present:', fs.readFileSync(fp,'utf8').includes('PRIME_GREETING'));
