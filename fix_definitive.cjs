const fs = require('fs');
const fc = 'src/pages/CategoriesV2/TagCopilotPanel.tsx';
let cc = fs.readFileSync(fc, 'utf8');

const normalizeBlock = `  const normalizeStoredMessages = (): ChatMessage[] => {
    try {
      const saved = localStorage.getItem('tag_chat_history');
      if (!saved) return [];
      const raw = JSON.parse(saved);
      return raw
        .map((m: any) => ({
          role: (m.role === 'tag' ? 'assistant' : m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: String(m.content || m.text || '').trim(),
        }))
        .filter((m: ChatMessage) => m.content.length > 0);
    } catch { return []; }
  };
  const [messages, setMessages] = useState<ChatMessage[]>(normalizeStoredMessages);
  const [hasRestoredHistory] = useState(() => normalizeStoredMessages().length > 0);`;

cc = cc.replace(
  `  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('tag_chat_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [hasRestoredHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('tag_chat_history');
      return saved ? JSON.parse(saved).length > 0 : false;
    } catch { return false; }
  });`,
  normalizeBlock
);

cc = cc.replace(
  '{!hasRestoredHistory && greetingText && (',
  '{greetingText && messages.length === 0 && ('
);

fs.writeFileSync(fc, cc, 'utf8');
console.log('Done');
