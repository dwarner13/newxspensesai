const fs = require('fs');
const fc = 'src/pages/CategoriesV2/TagCopilotPanel.tsx';
let cc = fs.readFileSync(fc, 'utf8');

// Fix 1: replace displayContent with msg.content
cc = cc.replace(
  '{msg.role === "assistant" ? renderMarkdown(displayContent ?? \'\') : msg.content}',
  '{msg.role === "assistant" ? renderMarkdown(msg.content ?? \'\') : msg.content}'
);

// Fix 2: remove the leftover broken cursor span
cc = cc.replace(
  `                  {isLastAssistant && !false && (
                    <span style={{ color: CYAN, marginLeft: 2 }}>{"\\u2588"}</span>
                  )}`,
  ``
);

fs.writeFileSync(fc, cc, 'utf8');
console.log('Fixed - displayContent and cursor span removed');
