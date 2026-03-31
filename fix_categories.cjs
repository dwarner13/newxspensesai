const fs = require('fs');

const f1 = 'src/pages/CategoriesV2/TagCopilotPanel.tsx';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(
  'const [typed, typeDone] = useTypewriter(statusText, 14, 500, !hasRestoredHistory);',
  'const [typed, typeDone] = useTypewriter(statusText, 14, 0, !hasRestoredHistory);'
);
c1 = c1.replace(
  'if (initialMessage && initialMessage.trim() && messages.length === 0) {',
  'if (initialMessage && initialMessage.trim()) {'
);
fs.writeFileSync(f1, c1, 'utf8');
console.log('Fix 1 done');

const f2 = 'src/pages/CategoriesV2/CategoriesPageV2.tsx';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(
  '<TagCopilotPanel initialMessage={copilotInitialMessage}',
  '<TagCopilotPanel key={copilotInitialMessage || "default"} initialMessage={copilotInitialMessage}'
);
c2 = c2.replace(
  'onClose={() => setCopilotOpen(false)}',
  'onClose={() => { setCopilotOpen(false); setCopilotInitialMessage(""); }}'
);
fs.writeFileSync(f2, c2, 'utf8');
console.log('Fix 2 done');
