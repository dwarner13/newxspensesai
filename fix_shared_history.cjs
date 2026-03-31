const fs = require('fs');

// Fix Transactions TagCopilotPanel to normalize localStorage on read
const ft = 'src/components/transactions/TagCopilotPanel.tsx';
let ct = fs.readFileSync(ft, 'utf8');

// Replace the localStorage read in useState initializer
ct = ct.replace(
  `  const [localMessages, setLocalMessages] = useState<ChatMsg[]>(() => {
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
  });`,
  `  const [localMessages, setLocalMessages] = useState<ChatMsg[]>(() => {
    if (transaction) return [];
    try {
      const saved = localStorage.getItem('tag_chat_history');
      if (!saved) return [];
      const ts = localStorage.getItem('tag_chat_history_ts');
      const age = ts ? Date.now() - Number(ts) : Infinity;
      if (age > 2 * 60 * 60 * 1000) {
        localStorage.removeItem('tag_chat_history');
        localStorage.removeItem('tag_chat_history_ts');
        return [];
      }
      const parsed = JSON.parse(saved);
      // Normalize both formats: Categories uses {role:'assistant'|'user', content}
      // Transactions uses {role:'tag'|'user', text}
      return parsed
        .map((m: any) => ({
          role: (m.role === 'assistant' ? 'tag' : m.role === 'user' ? 'user' : m.role) as 'tag' | 'user',
          text: String(m.text || m.content || '').trim(),
        }))
        .filter((m: any) => m.text.length > 0);
    } catch { return []; }
  });`
);

fs.writeFileSync(ft, ct, 'utf8');
console.log('Transactions Tag normalized');

// Also fix hasRestoredHistory in Transactions Tag to handle both formats
ct = fs.readFileSync(ft, 'utf8');
ct = ct.replace(
  `  const [hasRestoredHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('tag_chat_history');
      return saved ? JSON.parse(saved).length > 0 : false;
    } catch { return false; }
  });`,
  `  const [hasRestoredHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('tag_chat_history');
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      return parsed.some((m: any) => (m.text || m.content || '').trim().length > 0);
    } catch { return false; }
  });`
);
fs.writeFileSync(ft, ct, 'utf8');
console.log('Transactions hasRestoredHistory fixed');
