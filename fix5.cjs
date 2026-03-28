const fs = require('fs');

// Fix 1: TransactionInsightDrawer layout — move tax badge below confidence line
const f = 'C:/dev/project-bolt-fixed/src/components/transactions/TransactionInsightDrawer.tsx';
let c = fs.readFileSync(f, 'utf8');

// Move tax badge out of the flex header row, into its own div below confidence text
// Current: badge is after the closing </div> of the text block, inside the flex row
// New: badge sits inside the text div, on its own line below confidence
c = c.replace(
  `</div>
              {TAX_INFO[localCategory] && (
                <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: TAX_INFO[localCategory].bg, border: \`1px solid \${TAX_INFO[localCategory].border}\`, fontSize: 10, fontWeight: 700, color: TAX_INFO[localCategory].color, letterSpacing: '0.03em' }}>
                  {TAX_INFO[localCategory].label}
                </div>
              )}
              {tagInsight?.isAmountAnomaly && (`,
  `              {TAX_INFO[localCategory] && (
                <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 6, background: TAX_INFO[localCategory].bg, border: \`1px solid \${TAX_INFO[localCategory].border}\`, fontSize: 10, fontWeight: 700, color: TAX_INFO[localCategory].color, letterSpacing: '0.03em' }}>
                  {TAX_INFO[localCategory].label}
                </div>
              )}
              </div>
              {tagInsight?.isAmountAnomaly && (`
);

fs.writeFileSync(f, c, 'utf8');
console.log('drawer layout done');

// Fix 2: tag-insight function — strip corrupted diamond chars from message output
const f2 = 'C:/dev/project-bolt-fixed/netlify/functions/tag-insight.ts';
if (require('fs').existsSync(f2)) {
  let c2 = fs.readFileSync(f2, 'utf8');
  // Strip diamond/bullet corruption before returning message
  c2 = c2.replace(
    /return \{[\s\S]*?statusCode: 200[\s\S]*?body: JSON\.stringify\(\{/,
    (match) => match
  );
  // Add sanitize step before the return — find where message/proactiveInsights are assembled
  c2 = c2.replace(
    'return {\n    statusCode: 200,',
    `// Sanitize any corrupted unicode from LLM output
  const sanitize = (s: string) => s.replace(/[\\u25C6\\u25A0\\u2022\\u00A0]/g, '—').trim();
  if (result.message) result.message = sanitize(result.message);
  if (result.proactiveInsights) result.proactiveInsights = result.proactiveInsights.map(sanitize);

  return {\n    statusCode: 200,`
  );
  fs.writeFileSync(f2, c2, 'utf8');
  console.log('tag-insight sanitize done');
} else {
  console.log('tag-insight.ts not found — check path');
}
