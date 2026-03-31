const fs = require('fs');
const fc = 'netlify/functions/chat.ts';
let cc = fs.readFileSync(fc, 'utf8');

// Find the exact location — insert BEFORE the CEO persona block
const insertBefore = `      // CEO PERSONA INJECTION`;
const teamIntelligence = `      // ── Full Team Intelligence Feed ───────────────────────────────────────
      try {
        const { data: rules } = await sb.from('category_rules')
          .select('merchant_pattern, category, subcategory, updated_at')
          .eq('user_id', userId).eq('is_active', true)
          .order('updated_at', { ascending: false }).limit(20);
        if (rules && rules.length > 0) {
          primeContextMessage += '\\nTag category rules saved:\\n' +
            rules.map((r: any) => \`- "\${r.merchant_pattern}" → \${r.category}\${r.subcategory ? ' / ' + r.subcategory : ''}\`).join('\\n') + '\\n';
        }
      } catch { /* non-blocking */ }

      try {
        const { data: tagConvs } = await sb.from('tag_conversations')
          .select('merchant_name, messages, last_active')
          .eq('user_id', userId).order('last_active', { ascending: false }).limit(10);
        if (tagConvs && tagConvs.length > 0) {
          primeContextMessage += '\\nTag merchant conversations:\\n';
          for (const conv of tagConvs) {
            const msgs = Array.isArray(conv.messages) ? conv.messages : [];
            const last = [...msgs].reverse().find((m: any) => m.role === 'assistant' || m.role === 'tag');
            if (last) primeContextMessage += \`- \${conv.merchant_name}: "\${String(last.content || last.text || '').slice(0, 80)}"\\n\`;
          }
        }
      } catch { /* non-blocking */ }

      try {
        const { data: imports } = await sb.from('imports')
          .select('id, file_url, status, created_at, issuer')
          .eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
        if (imports && imports.length > 0) {
          primeContextMessage += '\\nStatements Byte processed:\\n';
          for (const imp of imports) {
            const filename = decodeURIComponent(String(imp.file_url || '').split('/').pop() || 'Unknown');
            const date = imp.created_at ? new Date(imp.created_at).toLocaleDateString('en-CA') : '?';
            const { count } = await sb.from('transactions').select('id', { count: 'exact', head: true }).eq('import_id', imp.id);
            primeContextMessage += \`- \${filename} (\${date}) — \${imp.status}, \${count || 0} txns\\n\`;
          }
        }
      } catch { /* non-blocking */ }

      try {
        const { data: txCats } = await sb.from('transactions')
          .select('category, subcategory, amount, type').eq('user_id', userId).limit(2000);
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
          primeContextMessage += \`\\nReal-time financials:\\n- Income: $\${totalInc.toLocaleString('en-CA',{maximumFractionDigits:0})}\\n- Expenses: $\${totalExp.toLocaleString('en-CA',{maximumFractionDigits:0})}\\n- Net: $\${(totalInc-totalExp).toLocaleString('en-CA',{maximumFractionDigits:0})}\\n- Uncategorized: \${uncatCount}\\n- Categories: \${sorted.map(([c,a])=>\`\${c} $\${a.toLocaleString('en-CA',{maximumFractionDigits:0})}\`).join(', ')}\\n\`;
        }
      } catch { /* non-blocking */ }

      try {
        const { data: notifs } = await sb.from('user_notifications')
          .select('title, message, employee_slug, created_at')
          .eq('user_id', userId).order('created_at', { ascending: false }).limit(5);
        if (notifs && notifs.length > 0) {
          primeContextMessage += '\\nRecent Inbox notifications:\\n' +
            notifs.map((n: any) => \`- [\${n.employee_slug}] \${n.title}\`).join('\\n') + '\\n';
        }
      } catch { /* non-blocking */ }

`;

if (cc.includes(insertBefore)) {
  cc = cc.replace(insertBefore, teamIntelligence + insertBefore);
  console.log('Team intelligence queries inserted');
} else {
  console.log('ERROR: CEO PERSONA block not found');
}

fs.writeFileSync(fc, cc, 'utf8');

// Verify
const hasRules = cc.includes("category_rules");
console.log('category_rules present:', hasRules);
