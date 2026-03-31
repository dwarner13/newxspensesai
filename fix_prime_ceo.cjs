const fs = require('fs');
const fc = 'netlify/functions/chat.ts';
let cc = fs.readFileSync(fc, 'utf8');

const oldBlock = `      // Prepend Prime context BEFORE orchestration rule (so orchestration can reference context)
      systemMessages.push({ role: 'system', content: primeContextMessage });`;

const newBlock = `      // ── Full Team Intelligence Feed ─────────────────────────────────────────
      // Prime is CEO — he needs to know everything every agent has done

      // 1. Category rules Tag has saved
      try {
        const { data: rules } = await sb
          .from('category_rules')
          .select('merchant_pattern, category, subcategory, match_type, is_active, updated_at')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(20);
        if (rules && rules.length > 0) {
          primeContextMessage += '\\nTag\\'s saved category rules (most recent first):\\n' +
            rules.map((r: any) =>
              \`- "\${r.merchant_pattern}" → \${r.category}\${r.subcategory ? ' / ' + r.subcategory : ''}\`
            ).join('\\n') + '\\n';
        }
      } catch { /* non-blocking */ }

      // 2. Tag conversations — what merchants were discussed and last outcome
      try {
        const { data: tagConvs } = await sb
          .from('tag_conversations')
          .select('merchant_name, messages, last_active')
          .eq('user_id', userId)
          .order('last_active', { ascending: false })
          .limit(10);
        if (tagConvs && tagConvs.length > 0) {
          primeContextMessage += '\\nTag\\'s recent merchant conversations:\\n';
          for (const conv of tagConvs) {
            const msgs = Array.isArray(conv.messages) ? conv.messages : [];
            const lastAssistant = [...msgs].reverse().find((m: any) => m.role === 'assistant' || m.role === 'tag');
            if (lastAssistant) {
              const preview = String(lastAssistant.content || lastAssistant.text || '').slice(0, 100);
              primeContextMessage += \`- \${conv.merchant_name}: "\${preview}"\n\`;
            }
          }
        }
      } catch { /* non-blocking */ }

      // 3. Import history — all statements Byte processed
      try {
        const { data: imports } = await sb
          .from('imports')
          .select('id, file_url, status, created_at, issuer')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        if (imports && imports.length > 0) {
          primeContextMessage += '\\nStatements Byte has processed:\\n';
          for (const imp of imports) {
            const filename = String(imp.file_url || '').split('/').pop() || 'Unknown';
            const date = imp.created_at ? new Date(imp.created_at).toLocaleDateString('en-CA') : '?';
            const { count } = await sb.from('transactions').select('id', { count: 'exact', head: true }).eq('import_id', imp.id);
            primeContextMessage += \`- \${decodeURIComponent(filename)} (\${date}) — \${imp.status}, \${count || 0} transactions\\n\`;
          }
        }
      } catch { /* non-blocking */ }

      // 4. Full category breakdown from real transaction data
      try {
        const { data: txCats } = await sb
          .from('transactions')
          .select('category, subcategory, amount, type')
          .eq('user_id', userId)
          .limit(2000);
        if (txCats && txCats.length > 0) {
          const catMap: Record<string, number> = {};
          let totalInc = 0, totalExp = 0, uncatCount = 0;
          for (const tx of txCats) {
            const amt = Math.abs(Number(tx.amount || 0));
            const isInc = tx.type === 'Credit' || (tx.category || '').toLowerCase() === 'income';
            if (isInc) { totalInc += amt; continue; }
            if (!tx.category || tx.category === 'Needs Review' || tx.category === 'Uncategorized') { uncatCount++; continue; }
            if (tx.category === 'Transfers') continue;
            catMap[tx.category] = (catMap[tx.category] || 0) + amt;
            totalExp += amt;
          }
          const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
          primeContextMessage += \`\\nReal-time financial summary:\\n\`;
          primeContextMessage += \`- Total income: $\${totalInc.toLocaleString('en-CA', {maximumFractionDigits:0})}\\n\`;
          primeContextMessage += \`- Total expenses: $\${totalExp.toLocaleString('en-CA', {maximumFractionDigits:0})}\\n\`;
          primeContextMessage += \`- Net flow: $\${(totalInc - totalExp).toLocaleString('en-CA', {maximumFractionDigits:0})}\\n\`;
          primeContextMessage += \`- Uncategorized: \${uncatCount}\\n\`;
          primeContextMessage += \`- Category breakdown:\\n\` + sorted.map(([cat, amt]) =>
            \`  • \${cat}: $\${amt.toLocaleString('en-CA', {maximumFractionDigits:0})}\`
          ).join('\\n') + '\\n';
        }
      } catch { /* non-blocking */ }

      // 5. Recent Prime notifications sent to Inbox
      try {
        const { data: notifs } = await sb
          .from('user_notifications')
          .select('title, message, type, created_at, employee_slug')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);
        if (notifs && notifs.length > 0) {
          primeContextMessage += '\\nRecent agent notifications sent to Inbox:\\n' +
            notifs.map((n: any) =>
              \`- [\${n.employee_slug}] \${n.title}: "\${String(n.message || '').slice(0, 80)}"\`
            ).join('\\n') + '\\n';
        }
      } catch { /* non-blocking */ }

      // CEO PERSONA INJECTION
      primeContextMessage += \`
PRIME CEO PERSONA — CRITICAL RULES:
You are Prime, the lead financial AI and CEO of the XspensesAI agent team.
Your team: Byte (OCR/imports), Tag (categorization), Crystal (analytics), Goalie (goals), Ledger (tax).
You have full visibility of everything they have done — shown above.

CONVERSATION RULES:
1. Always end with ONE specific question — never more than one.
2. Reference real numbers from the data above — never make up figures.
3. If user asks about something a specific agent did, answer from the data above.
4. If you don't know something, say "let me check with Tag on that" or "Byte would have that detail".
5. Max 3 sentences before your question.
6. Be direct, warm, and CFO-like — not robotic.
7. When surfacing issues, prioritize: uncategorized transactions → budget overruns → income gaps → deductibles.
\`;

      // Prepend Prime context BEFORE orchestration rule (so orchestration can reference context)
      systemMessages.push({ role: 'system', content: primeContextMessage });`;

if (cc.includes(oldBlock)) {
  cc = cc.replace(oldBlock, newBlock);
  console.log('Prime CEO intelligence injected');
} else {
  console.log('ERROR: target block not found - check chat.ts manually');
}

fs.writeFileSync(fc, cc, 'utf8');
