const fs = require('fs');
const fc = 'src/pages/CategoriesV2/TagCopilotPanel.tsx';
let cc = fs.readFileSync(fc, 'utf8');

// Fix 1: remove unused useTypewriter import
cc = cc.replace(
  'import { useTypewriter } from "../PrimeChatV2/useTypewriter";\n',
  ''
);

// Fix 2: remove the entire UNUSED_statusText IIFE block
cc = cc.replace(
  `  const UNUSED_statusText = (() => {
    const isNewUser = totalCount === 0;
    const hasUncategorized = flaggedCount > 0;
    const name = firstName || '';
    const hi = name ? \`Hey \${name}! \` : 'Hey! ';

    if (isNewUser) {
      return \`\${hi}I'm Tag \\u2014 I handle your categories. Upload a statement and I'll start making sense of your spending. What kind of expenses do you track most?\`;
    }
    if (hasUncategorized) {
      return \`\${hi}\${flaggedCount} transaction\${flaggedCount > 1 ? 's' : ''} need a category \\u2014 want me to sort those out now? I've got \${categorizedCount} of \${totalCount} organized so far.\`;
    }
    const sorted = [...(topCategories || [])].sort((a, b) => b.total - a.total);
    if (sorted.length > 0 && totalSpent && totalSpent > 0) {
      const top = sorted[0];
      const pct = Math.round((top.total / totalSpent) * 100);
      return \`\${hi}Your categories are looking clean. \${top.category} is your biggest bucket at \${pct}% \\u2014 is that typical for your business?\`;
    }
    return \`\${hi}All \${totalCount} transactions categorized and looking clean. What do you want to dig into?\`;
  })();`,
  ''
);

// Fix 3: remove typed/typeDone from useEffect deps — they dont exist
cc = cc.replace(
  '  }, [typed, typeDone, messages]);',
  '  }, [messages]);'
);

fs.writeFileSync(fc, cc, 'utf8');
console.log('All three fixes applied');
