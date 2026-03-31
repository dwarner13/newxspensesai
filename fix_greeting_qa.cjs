const fs = require('fs');

// Fix auto-greeting to not trigger statement_qa fast lane
const fp = 'src/pages/PrimeChatV2/PrimeChatV2.tsx';
let cc = fs.readFileSync(fp, 'utf8');

cc = cc.replace(
  `const prompt = \`BRIEFING MODE: Give Darrell a 2-sentence status on his books, then ask him ONE specific question. Be direct and conversational.

His finances: \${data.transactionCount} transactions across \${data.statementCount} statements. Total spent: $\${data.totalSpent.toLocaleString('en-CA', { maximumFractionDigits: 0 })}. Total income: $\${data.totalIncome.toLocaleString('en-CA', { maximumFractionDigits: 0 })}. \${topNote} \${uncatNote}

Ask about the most important thing: uncategorized items if any exist, or the biggest spend category, or the income vs expense gap.\`;`,
  `const prompt = \`[PRIME_GREETING] You are opening a conversation with Darrell. Give him 2 sentences about what you see in his finances right now, then ask him ONE specific question. No headers, no lists, just talk.

Context: \${data.transactionCount} transactions, \${data.statementCount} statements, $\${data.totalSpent.toLocaleString('en-CA', { maximumFractionDigits: 0 })} spent, $\${data.totalIncome.toLocaleString('en-CA', { maximumFractionDigits: 0 })} income. \${topNote} \${uncatNote}\`;`
);

fs.writeFileSync(fp, cc, 'utf8');
console.log('Auto-greeting fixed - no longer triggers statement_qa');
