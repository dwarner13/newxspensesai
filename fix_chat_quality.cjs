const fs = require('fs');

// Fix 1: CategoriesPageV2 — remove key prop that causes remount + duplicate send
const fp = 'src/pages/CategoriesV2/CategoriesPageV2.tsx';
let cp = fs.readFileSync(fp, 'utf8');
cp = cp.replace(
  '<TagCopilotPanel key={copilotInitialMessage || "default"} initialMessage={copilotInitialMessage}',
  '<TagCopilotPanel key="tag-copilot-stable" initialMessage={copilotInitialMessage}'
);
// When initialMessage changes on already-mounted panel, send it via ref approach
// Also reset initialMessage after it fires so it doesnt resend on re-render  
cp = cp.replace(
  'onClose={() => { setCopilotOpen(false); setCopilotInitialMessage(""); }}',
  'onClose={() => { setCopilotOpen(false); setTimeout(() => setCopilotInitialMessage(""), 300); }}'
);
fs.writeFileSync(fp, cp, 'utf8');
console.log('Fix 1: duplicate message prevented');

// Fix 2: Tag-copilot system prompt — much stricter chat rules
const fc = 'src/pages/CategoriesV2/TagCopilotPanel.tsx';
let cc = fs.readFileSync(fc, 'utf8');

cc = cc.replace(
  '"You are Tag — XspensesAI\'s categorization expert on the CATEGORIES PAGE.\\n\\nCRITICAL RULES:\\n- Max 3 sentences per reply\\n- Ask ONE question at a time, never a list of questions\\n- Be direct and conversational, not a report\\n- No bullet lists unless asked\\n- Wait for user response before asking another question\\n\\nUSER\'S FINANCIAL DATA (real, current):\\n- Total spent: "',
  '"STRICT CHAT RULES — violating these breaks the experience:\\n1. Max 2 sentences. Hard limit. No exceptions.\\n2. Ask ONE question then STOP. Never ask multiple questions.\\n3. Zero bullet points. Zero numbered lists. Zero headers. Plain conversational sentences only.\\n4. Never write analysis, breakdowns, or math. Just talk.\\n5. You already have the financial data — reference it naturally, don\'t explain it back.\\n\\nYou are Tag — XspensesAI\'s categorization expert. You\'re having a focused chat, not writing a report.\\n\\nUSER\'S FINANCIAL DATA:\\n- Total spent: "'
);

// Also handle the case where old prompt text exists without the CRITICAL RULES prefix
cc = cc.replace(
  '"You are Tag -- XspensesAI\'s categorization expert on the CATEGORIES PAGE.\\n\\nUSER\'S FINANCIAL DATA (real, current):\\n- Total spent: "',
  '"STRICT CHAT RULES — violating these breaks the experience:\\n1. Max 2 sentences. Hard limit. No exceptions.\\n2. Ask ONE question then STOP.\\n3. Zero bullet points, lists, or headers. Plain sentences only.\\n4. Never write breakdowns or math unprompted.\\n5. You have the data — reference it naturally.\\n\\nYou are Tag — XspensesAI\'s categorization expert in a focused chat.\\n\\nUSER FINANCES:\\n- Total spent: "'
);

// Fix 3: CategoriesTagCopilotPanel useEffect for new initialMessage on stable component
// When initialMessage prop changes, auto-send it (since key is now stable)
cc = cc.replace(
  '  // Auto-send initialMessage after panel opens (skip if history was rehydrated)\n  useEffect(() => {\n    if (initialMessage && initialMessage.trim()) {\n      const timer = setTimeout(() => handleSend(initialMessage.trim()), 800);\n      return () => clearTimeout(timer);\n    }\n  }, []);',
  `  // Auto-send initialMessage when it changes (stable component, no remount)
  const lastSentMsg = { current: '' };
  useEffect(() => {
    if (initialMessage && initialMessage.trim() && initialMessage !== lastSentMsg.current) {
      lastSentMsg.current = initialMessage;
      const timer = setTimeout(() => handleSend(initialMessage.trim()), 400);
      return () => clearTimeout(timer);
    }
  }, [initialMessage]);`
);

fs.writeFileSync(fc, cc, 'utf8');
console.log('Fix 2+3: verbosity + initialMessage');
