const fs = require('fs');

// ── Fix 1: Remove remaining replyTyped reference in CategoriesV2 TagCopilotPanel
const fc = 'src/pages/CategoriesV2/TagCopilotPanel.tsx';
let cc = fs.readFileSync(fc, 'utf8');

// Find and remove any remaining replyTyped/replyDone references
cc = cc.replace(/replyTyped/g, 'msg.content');
cc = cc.replace(/replyDone/g, 'false');

// Clean up any leftover cursor span that used replyDone
cc = cc.replace(
  `{isLastAssistant && !false && (
                    <span style={{ color: CYAN, marginLeft: 2 }}>{"\u2588"}</span>
                  )}`,
  ``
);

fs.writeFileSync(fc, cc, 'utf8');
console.log('Fix 1 done - replyTyped removed');

// ── Fix 2: CategoryDetailDrawer — add Ask Tag to mobile footer ───────────────
const fd = 'src/pages/CategoriesV2/CategoryDetailDrawer.tsx';
let cd = fs.readFileSync(fd, 'utf8');

// The footer currently has View Trends, Re-categorize, Edit Budget
// Add Ask Tag button always visible (not just when subcategoryFilter)
cd = cd.replace(
  `          <button onClick={() => { onClose(); navigate("/dashboard/analytics-ai"); }}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, background: \`\${category.color}15\`, border: \`1px solid \${category.color}30\`, color: category.color, cursor: "pointer" }}>
            View Trends
          </button>
          <button onClick={() => { onAskTag?.("You have " + category.transactionCount + " transactions in " + category.name + ". Want me to go through them and find better categories?"); onClose(); }}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, background: THEME.surfaceLight, border: \`1px solid \${THEME.border}\`, color: THEME.textMuted, cursor: "pointer" }}>
            Re-categorize
          </button>
          {subcategoryFilter && onAskTag && (
            <button onClick={() => { onClose(); onAskTag(\`Help me recategorize \${subcategoryFilter.name} transactions under \${category.name} \uFFFD should they stay or move to a different category?\`); }}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, background: \`\${CYAN}15\`, border: \`1px solid \${CYAN}30\`, color: CYAN, cursor: "pointer" }}>
              Ask Tag
            </button>
          )}
          <button onClick={() => toast("Budget editing coming soon")}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, background: THEME.surfaceLight, border: \`1px solid \${THEME.border}\`, color: THEME.textDim, cursor: "pointer" }}>
            Edit Budget
          </button>`,
  `          <button onClick={() => { onClose(); navigate("/dashboard/analytics-ai"); }}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, background: \`\${category.color}15\`, border: \`1px solid \${category.color}30\`, color: category.color, cursor: "pointer" }}>
            View Trends
          </button>
          {onAskTag && (
            <button onClick={() => { onAskTag(subcategoryFilter
              ? \`Help me with \${subcategoryFilter.name} under \${category.name} — should these transactions stay here or move to a different category?\`
              : \`I have \${category.transactionCount} transactions in \${category.name} totalling $\${category.spent.toLocaleString()}. Can you help me review and optimize this category?\`
            ); onClose(); }}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 700, background: \`\${CYAN}15\`, border: \`1px solid \${CYAN}30\`, color: CYAN, cursor: "pointer" }}>
              Ask Tag
            </button>
          )}
          <button onClick={() => toast("Budget editing coming soon")}
            style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, background: THEME.surfaceLight, border: \`1px solid \${THEME.border}\`, color: THEME.textDim, cursor: "pointer" }}>
            Edit Budget
          </button>`
);

fs.writeFileSync(fd, cd, 'utf8');
console.log('Fix 2 done - Ask Tag always visible in footer');
