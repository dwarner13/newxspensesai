const fs = require('fs');
const fc = 'src/pages/CategoriesV2/TagCopilotPanel.tsx';
let cc = fs.readFileSync(fc, 'utf8');

// Remove useTypewriter import and usage entirely for greeting
// Replace with a stable greeting computed once via useEffect

// Step 1: Remove the typewriter-based greeting state
cc = cc.replace(
  `  const statusText = (() => {`,
  `  // Greeting computed once when data arrives - stable, no restarts
  const [greetingText, setGreetingText] = useState('');
  const greetingSet = { current: false };
  useEffect(() => {
    if (greetingSet.current) return;
    const count = txCount || totalCount || 0;
    if (count === 0 && (topCategories || []).length === 0) return; // wait for data
    greetingSet.current = true;
    const hi = firstName ? \`Hey \${firstName}\` : 'Hey';
    const sorted = [...(topCategories || [])].sort((a, b) => b.total - a.total);
    const flagged = flaggedCount || 0;
    let text = '';
    if (flagged > 0) {
      text = \`\${hi} — \${flagged} transaction\${flagged > 1 ? 's' : ''} still need a category. Want me to sort those out? I've got \${categorizedCount} of \${count} organized.\`;
    } else if (sorted.length > 0 && totalSpent && totalSpent > 0) {
      const top = sorted[0];
      const pct = Math.round((top.total / totalSpent) * 100);
      text = \`\${hi} — books are clean ✓ \${top.category} is your biggest spend at \${pct}% ($\${top.total.toLocaleString('en-CA', {maximumFractionDigits:0})}). Is that typical for your business?\`;
    } else {
      text = \`\${hi} — all \${count} transactions categorized and looking clean. Ask me anything about your spending.\`;
    }
    setGreetingText(text);
  }, [txCount, totalCount, topCategories, totalSpent, flaggedCount]);

  const UNUSED_statusText = (() => {`
);

// Close the IIFE and remove old typewriter call
cc = cc.replace(
  `  const [typed, typeDone] = useTypewriter(statusText, 14, 0, !hasRestoredHistory && greetingReady);`,
  `  // greetingReady no longer needed - using stable greetingText state instead`
);

// Also remove greetingReady line
cc = cc.replace(
  `  // Use instant mode until real data loads to avoid mid-type restarts
  const greetingReady = (txCount || 0) > 0 || (totalCount || 0) === 0;`,
  ``
);

// Step 2: Replace the greeting render block to use greetingText with CSS animation
cc = cc.replace(
  `          {!hasRestoredHistory && <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: \`\${CYAN}20\`, border: \`1.5px solid \${CYAN}44\`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: CYAN }}>T</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: CYAN }}>Tag</span>
                <span style={{ fontSize: 10, color: THEME.textDim }}>just now</span>
              </div>
              <div style={{ fontSize: 14, color: THEME.text, lineHeight: 1.7, padding: "12px 14px", borderRadius: 14, background: \`\${CYAN}06\`, borderLeft: \`3px solid \${CYAN}44\` }}>
                {typed}<span style={{ opacity: !typeDone ? 1 : 0, transition: "opacity 0.3s", color: CYAN }}>{"\\u2588"}</span>
              </div>
            </div>
          </div>}`,
  `          {!hasRestoredHistory && greetingText && (
            <div style={{ display: "flex", gap: 10, marginBottom: 6, animation: 'catMsgIn 0.2s ease forwards' }}>
              <style>{'@keyframes catMsgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}'}</style>
              <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: \`\${CYAN}20\`, border: \`1.5px solid \${CYAN}44\`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: CYAN }}>T</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: CYAN }}>Tag</span>
                  <span style={{ fontSize: 10, color: THEME.textDim }}>just now</span>
                </div>
                <div style={{ fontSize: 14, color: THEME.text, lineHeight: 1.7, padding: "12px 14px", borderRadius: 14, background: \`\${CYAN}06\`, borderLeft: \`3px solid \${CYAN}44\` }}>
                  {greetingText}
                </div>
              </div>
            </div>
          )}`
);

// Fix details toggle to use greetingText instead of typeDone
cc = cc.replace(
  `          {!hasRestoredHistory && typeDone && (`,
  `          {!hasRestoredHistory && greetingText && (`
);
cc = cc.replace(/typeDone && detailsOpen/g, 'greetingText && detailsOpen');
cc = cc.replace(/typeDone && detailsOpen/g, 'greetingText && detailsOpen');

fs.writeFileSync(fc, cc, 'utf8');
console.log('Greeting fixed - stable, smart, no typewriter');
