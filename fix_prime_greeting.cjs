const fs = require('fs');
const fp = 'src/pages/PrimeChatV2/PrimeChatV2.tsx';
let cc = fs.readFileSync(fp, 'utf8');

// Add auto-greeting: fires once when data loads, sends hidden prompt to Prime
// Prime responds with a 2-sentence briefing + ONE question
cc = cc.replace(
  '  const [isDragging, setIsDragging] = useState(false);',
  `  const [isDragging, setIsDragging] = useState(false);
  const autoGreetFired = { current: false };

  // Auto-greeting: fires once when financial data loads
  // Sends a hidden message so only Prime's response shows
  useEffect(() => {
    if (autoGreetFired.current) return;
    if (data.loading) return;
    if (data.transactionCount === 0) return;
    autoGreetFired.current = true;

    const topCat = data.categoryBreakdown[0];
    const uncatNote = data.uncategorizedCount > 0
      ? \`\${data.uncategorizedCount} transactions still need a category.\`
      : 'All transactions are categorized.';
    const topNote = topCat
      ? \`\${topCat.label} is the biggest spend at $\${topCat.amount.toLocaleString('en-CA', { maximumFractionDigits: 0 })}.\`
      : '';

    const prompt = \`BRIEFING MODE: Give Darrell a 2-sentence status on his books, then ask him ONE specific question. Be direct and conversational.

His finances: \${data.transactionCount} transactions across \${data.statementCount} statements. Total spent: \$\${data.totalSpent.toLocaleString('en-CA', { maximumFractionDigits: 0 })}. Total income: \$\${data.totalIncome.toLocaleString('en-CA', { maximumFractionDigits: 0 })}. \${topNote} \${uncatNote}

Ask about the most important thing: uncategorized items if any exist, or the biggest spend category, or the income vs expense gap.\`;

    // Small delay so the UI is ready
    setTimeout(() => {
      void sendMessage(prompt, { hidden: true });
    }, 800);
  }, [data.loading, data.transactionCount]);`
);

fs.writeFileSync(fp, cc, 'utf8');
console.log('Auto-greeting wired');
