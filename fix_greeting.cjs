const fs = require('fs');
const f = 'src/components/transactions/TagCopilotPanel.tsx';
let c = fs.readFileSync(f, 'utf8');

// Fix 1: Expire localStorage history after 2 hours so greeting fires fresh on return
c = c.replace(
  `const [localMessages, setLocalMessages] = useState<ChatMsg[]>(() => {
    if (transaction) return [];
    try {
      const saved = localStorage.getItem('tag_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });`,
  `const [localMessages, setLocalMessages] = useState<ChatMsg[]>(() => {
    if (transaction) return [];
    try {
      const saved = localStorage.getItem('tag_chat_history');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      // Expire history older than 2 hours so greeting refreshes on return
      const ts = localStorage.getItem('tag_chat_history_ts');
      const age = ts ? Date.now() - Number(ts) : Infinity;
      if (age > 2 * 60 * 60 * 1000) {
        localStorage.removeItem('tag_chat_history');
        localStorage.removeItem('tag_chat_history_ts');
        return [];
      }
      return parsed;
    } catch { return []; }
  });`
);

// Fix 2: Save timestamp alongside history
c = c.replace(
  `    if (!transaction && localMessages.length > 0) {
      localStorage.setItem('tag_chat_history', JSON.stringify(localMessages.slice(-20)));
    }`,
  `    if (!transaction && localMessages.length > 0) {
      localStorage.setItem('tag_chat_history', JSON.stringify(localMessages.slice(-20)));
      localStorage.setItem('tag_chat_history_ts', String(Date.now()));
    }`
);

// Fix 3: Show instant placeholder before async greeting loads (kills the blank stutter)
c = c.replace(
  `  const fetchProactiveGreeting = useCallback(async () => {
    const hi = firstName ? \`Hey \${firstName}\` : 'Hey';
    try {`,
  `  const fetchProactiveGreeting = useCallback(async () => {
    const hi = firstName ? \`Hey \${firstName}\` : 'Hey';
    // Show instant placeholder so there is no blank gap while fetch runs
    setLocalMessages([{ role: 'tag' as const, text: \`\${hi} — checking your transactions...\` }]);
    try {`
);

// Fix 4: Clear also clears the timestamp
c = c.replace(
  `            localStorage.removeItem('tag_chat_history');
            setMessages([]);`,
  `            localStorage.removeItem('tag_chat_history');
            localStorage.removeItem('tag_chat_history_ts');
            setMessages([]);`
);

// Fix 4b: The transactions TagCopilotPanel uses localMessages not messages for clear
c = c.replace(
  `            localStorage.removeItem('tag_chat_history');
            setLocalMessages([]);`,
  `            localStorage.removeItem('tag_chat_history');
            localStorage.removeItem('tag_chat_history_ts');
            setLocalMessages([]);`
);

// Fix 5: Reduce typewriter reply delay 150->0 to kill the stutter flash
c = c.replace(
  "const [typewriterText, typewriterDone] = useTypewriter(lastTagText ?? '', 18, 150);",
  "const [typewriterText, typewriterDone] = useTypewriter(lastTagText ?? '', 18, 0);"
);

fs.writeFileSync(f, c, 'utf8');
console.log('TagCopilotPanel fixes done');
