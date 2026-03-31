const fs = require('fs');
const fc = 'src/pages/CategoriesV2/TagCopilotPanel.tsx';
let cc = fs.readFileSync(fc, 'utf8');

// Fix 1: bump message font from 13 to 15 to match Transactions Tag
cc = cc.replace(
  'fontSize: 13,\n                  lineHeight: 1.6,',
  'fontSize: 15,\n                  lineHeight: 1.7,'
);
// Also fix greeting text size
cc = cc.replace(
  '{ fontSize: 14, color: THEME.text, lineHeight: 1.7, padding: "12px 14px"',
  '{ fontSize: 15, color: THEME.text, lineHeight: 1.7, padding: "12px 14px"'
);

// Fix 2: smarter category-focused greeting
cc = cc.replace(
  `    const hi = firstName ? \`Hey \${firstName}\` : 'Hey';
    const sorted = [...(topCategories || [])].sort((a, b) => b.total - a.total);
    const flagged = flaggedCount || 0;
    let text = '';
    if (flagged > 0) {
      text = \`\${hi} — \${flagged} transaction\${flagged > 1 ? 's' : ''} still need a category. Want me to sort those out? I've got \${categorizedCount} of \${count} organized.\`;
    } else if (sorted.length > 0 && totalSpent && totalSpent > 0) {
      const top = sorted[0];
      const pct = Math.round((top.total / totalSpent) * 100);
      text = \`\${hi} — books are clean ✓ \${top.category} is your biggest spend at \${pct}% (\${top.total.toLocaleString('en-CA', {maximumFractionDigits:0})}). Is that typical for your business?\`;
    } else {
      text = \`\${hi} — all \${count} transactions categorized and looking clean. Ask me anything about your spending.\`;
    }
    setGreetingText(text);`,
  `    const hi = firstName ? \`Hey \${firstName}\` : 'Hey';
    const sorted = [...(topCategories || [])].sort((a, b) => b.total - a.total);
    const overBudget = (topCategories || []).filter(c => c.budget && c.budget > 0 && c.total > c.budget);
    const flagged = flaggedCount || 0;
    let text = '';

    if (overBudget.length > 0) {
      // Budget alert takes priority
      const worst = overBudget.sort((a, b) => (b.total - b.budget!) - (a.total - a.budget!))[0];
      const pct = Math.round((worst.total / (worst.budget || 1)) * 100);
      text = \`\${hi} — \${overBudget.length} categor\${overBudget.length > 1 ? 'ies are' : 'y is'} over budget. **\${worst.category}** is at \${pct}% of budget ($\${worst.total.toLocaleString('en-CA', {maximumFractionDigits:0})} / $\${worst.budget?.toLocaleString('en-CA', {maximumFractionDigits:0})}). Want me to break that down?\`;
    } else if (flagged > 0) {
      text = \`\${hi} — \${flagged} transaction\${flagged > 1 ? 's' : ''} still need a category. Want me to sort those out?\`;
    } else if (sorted.length > 0 && totalSpent && totalSpent > 0) {
      const top = sorted[0];
      const second = sorted[1];
      const pct = Math.round((top.total / totalSpent) * 100);
      const tip = top.category === 'Transfers' && second
        ? \`**\${second.category}** is your biggest real expense at \${Math.round((second.total / totalSpent) * 100)}% — typical for your business?\`
        : \`**\${top.category}** is \${pct}% of total spend. Is that expected for your work?\`;
      text = \`\${hi} — books look clean ✓ \${tip}\`;
    } else {
      text = \`\${hi} — all \${count} transactions categorized. Ask me anything about your categories, budgets, or what's deductible.\`;
    }
    setGreetingText(text);`
);

fs.writeFileSync(fc, cc, 'utf8');
console.log('Categories Tag font + greeting updated');
