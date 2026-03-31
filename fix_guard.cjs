const fs = require('fs');
const fc = 'src/pages/CategoriesV2/TagCopilotPanel.tsx';
let cc = fs.readFileSync(fc, 'utf8');

// Fix: replace broken plain-object ref with proper guard using greetingText itself
cc = cc.replace(
  `  const [greetingText, setGreetingText] = useState('');
  const greetingSet = { current: false };
  useEffect(() => {
    if (greetingSet.current) return;
    const count = txCount || totalCount || 0;
    if (count === 0 && (topCategories || []).length === 0) return; // wait for data
    greetingSet.current = true;`,
  `  const [greetingText, setGreetingText] = useState('');
  useEffect(() => {
    if (greetingText) return; // already set — don't restart
    const count = txCount || totalCount || 0;
    if (count === 0 && (topCategories || []).length === 0) return; // wait for data`
);

fs.writeFileSync(fc, cc, 'utf8');
console.log('Greeting guard fixed');
