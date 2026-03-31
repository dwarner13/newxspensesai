const fs = require('fs');

// ══ Fix 1: CategoryDetailDrawer — raise above Tag panel ══════════════════════
const fd = 'src/pages/CategoriesV2/CategoryDetailDrawer.tsx';
let cd = fs.readFileSync(fd, 'utf8');
cd = cd.replace('zIndex: 60,', 'zIndex: 1000,');
cd = cd.replace('zIndex: 61,', 'zIndex: 1001,');
fs.writeFileSync(fd, cd, 'utf8');
console.log('Fix 1 done - drawer zIndex');

// ══ Fix 2: Transactions TagCopilotPanel — replace typewriter with CSS anim ═══
const ft = 'src/components/transactions/TagCopilotPanel.tsx';
let ct = fs.readFileSync(ft, 'utf8');

// Remove typewriter hook calls — keep lastTagIndex for animation targeting
ct = ct.replace(
  `const lastTagText = lastTagIndex >= 0 ? localMessages[lastTagIndex]?.text ?? '' : '';
  const [typewriterText, typewriterDone] = useTypewriter(lastTagText ?? '', 18, 0);`,
  ``
);

// In render: use m.text directly + animate last bubble
ct = ct.replace(
  `            const isLastTag = m.role === 'tag' && i === lastTagIndex;
            const displayText = isLastTag ? typewriterText : m.text;
            return (
              <div key={i} style={{ display:'flex', gap:8, justifyContent: m.role==='user' ? 'flex-end' : 'flex-start' }}>`,
  `            const isLastTag = m.role === 'tag' && i === lastTagIndex;
            return (
              <div key={i} style={{ display:'flex', gap:8, justifyContent: m.role==='user' ? 'flex-end' : 'flex-start', animation: isLastTag ? 'tagMsgIn 0.18s ease forwards' : 'none' }}>
              <style>{'@keyframes tagMsgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}'}</style>`
);

// Replace displayText usage with m.text
ct = ct.replace(
  `                    {(displayText ?? '').split('**').map((part, j) => j % 2 === 1 ? <strong key={j} style={{color:'#22d3ee'}}>{part}</strong> : <span key={j}>{part}</span>)}`,
  `                    {(m.text ?? '').split('**').map((part, j) => j % 2 === 1 ? <strong key={j} style={{color:'#22d3ee'}}>{part}</strong> : <span key={j}>{part}</span>)}`
);

// Fix busy indicator — remove typewriterDone dependency
ct = ct.replace(
  `{busy && typewriterDone && (`,
  `{busy && (`
);

fs.writeFileSync(ft, ct, 'utf8');
console.log('Fix 2 done - transactions typewriter replaced');

// ══ Fix 3: CategoriesV2 TagCopilotPanel — CSS anim + stable greeting ═════════
const fc = 'src/pages/CategoriesV2/TagCopilotPanel.tsx';
let cc = fs.readFileSync(fc, 'utf8');

// Replace chat reply typewriter with CSS animation
cc = cc.replace(
  `  const lastAssistantIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  }, [messages]);
  const lastAssistantText = lastAssistantIdx >= 0 ? messages[lastAssistantIdx]?.content ?? '' : '';
  const [replyTyped, replyDone] = useTypewriter(lastAssistantText ?? '', 18, 150);`,
  `  const lastAssistantIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  }, [messages]);`
);

// Replace replyTyped in chat message render with msg.content + CSS anim
cc = cc.replace(
  `            const isLastAssistant = msg.role === 'assistant' && i === lastAssistantIdx;
            const displayContent = isLastAssistant ? replyTyped : msg.content;
            return (
              <div key={i} style={{ display: "flex", gap: 10, marginTop: 16, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>`,
  `            const isLastAssistant = msg.role === 'assistant' && i === lastAssistantIdx;
            return (
              <div key={i} style={{ display: "flex", gap: 10, marginTop: 16, flexDirection: msg.role === "user" ? "row-reverse" : "row", animation: isLastAssistant ? 'catMsgIn 0.18s ease forwards' : 'none' }}>
              <style>{'@keyframes catMsgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}'}</style>`
);

// Replace displayContent with msg.content
cc = cc.replace(
  `                  {msg.role === "assistant" ? renderMarkdown(displayContent ?? '') : msg.content}
                  {isLastAssistant && !replyDone && (
                    <span style={{ color: CYAN, marginLeft: 2 }}>{"\u2588"}</span>
                  )}`,
  `                  {msg.role === "assistant" ? renderMarkdown(msg.content ?? '') : msg.content}`
);

// Fix greeting: only compute statusText when data has loaded (txCount > 0)
// Wrap the typewriter greeting text in a stable memo that waits for real data
cc = cc.replace(
  `  const statusText = (() => {`,
  `  // Compute once when real data arrives — prevents typewriter restart mid-type
  const statusText = (() => {`
);

// Replace the typewriter for the greeting with instant mode when data not loaded
cc = cc.replace(
  `  const [typed, typeDone] = useTypewriter(statusText, 14, 0, !hasRestoredHistory);`,
  `  // Use instant mode until real data loads to avoid mid-type restarts
  const greetingReady = (txCount || 0) > 0 || (totalCount || 0) === 0;
  const [typed, typeDone] = useTypewriter(statusText, 14, 0, !hasRestoredHistory && greetingReady);`
);

fs.writeFileSync(fc, cc, 'utf8');
console.log('Fix 3 done - categories typewriter replaced + greeting stable');
