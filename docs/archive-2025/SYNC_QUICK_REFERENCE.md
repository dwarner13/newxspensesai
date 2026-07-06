# 🔄 SYNC SCRIPT — QUICK REFERENCE

**File:** `scripts/sync-employee-prompt.ts`  
**Purpose:** Zero-downtime persona updates via CLI  
**Time:** ~2 minutes per sync  

---

## ⚡ ULTRA-QUICK START

```bash
# 1. Set environment
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-key"

# 2. Sync Crystal
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md

# 3. Done! Changes live immediately ✅
```

---

## 📋 COMMANDS

### Sync Crystal (Financial Intelligence)
```bash
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
```

### Sync Prime (CEO)
```bash
ts-node scripts/sync-employee-prompt.ts prime-boss ./docs/PRIME_CEO_PERSONA.md
```

### Sync Byte (Documents)
```bash
ts-node scripts/sync-employee-prompt.ts byte-docs ./docs/BYTE_PERSONA.md
```

### Sync Tag (Categorization)
```bash
ts-node scripts/sync-employee-prompt.ts tag-categorizer ./docs/TAG_PERSONA.md
```

### Sync Ledger (Tax)
```bash
ts-node scripts/sync-employee-prompt.ts ledger-tax ./docs/LEDGER_PERSONA.md
```

### Sync Goalie (Goals)
```bash
ts-node scripts/sync-employee-prompt.ts goalie-agent ./docs/GOALIE_PERSONA.md
```

---

## 🔐 ENVIRONMENT SETUP

### Option 1: Export Variables (Linux/macOS)
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sbp_..."
```

### Option 2: Windows PowerShell
```powershell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "sbp_..."
```

### Option 3: .env.local File
```bash
cat > .env.local << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sbp_...
EOF
```

### Option 4: Inline (One Command)
```bash
SUPABASE_URL="https://xxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="sbp_..." \
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
```

---

## ✅ VERIFICATION

### Check Database
```sql
select slug, updated_at, char_length(system_prompt) as len
from employee_profiles
where slug = 'crystal-analytics';
```

### Test API
```bash
curl -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1' \
  -H 'content-type: application/json' \
  -d '{"userId":"test","message":"Hi Crystal"}'
```

### Check Logs
```bash
tail -f logs/*.log | grep "Using DB persona"
```

---

## 🎯 COMMON WORKFLOWS

### Iterate on Persona
```bash
# 1. Edit
vim docs/CRYSTAL_2.0_SYSTEM_PROMPT.md

# 2. Sync
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md

# 3. Test
curl ... # or test in browser

# 4. Repeat
```

### A/B Test Two Versions
```bash
# Test version 1
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./personas/crystal-v1.md
# test...

# Test version 2
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./personas/crystal-v2.md
# test...

# Keep winner
git add docs/CRYSTAL_2.0_SYSTEM_PROMPT.md && git commit -m "winner"
```

### Batch Update All
```bash
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
ts-node scripts/sync-employee-prompt.ts prime-boss ./docs/PRIME_CEO_PERSONA.md
ts-node scripts/sync-employee-prompt.ts byte-docs ./docs/BYTE_PERSONA.md
echo "✅ All synced!"
```

### Rollback to Previous
```bash
# Find previous version
git log --oneline docs/CRYSTAL_2.0_SYSTEM_PROMPT.md | head -5

# Restore and sync
git show HEAD~1:docs/CRYSTAL_2.0_SYSTEM_PROMPT.md > /tmp/prev.md
ts-node scripts/sync-employee-prompt.ts crystal-analytics /tmp/prev.md
```

---

## 🚨 TROUBLESHOOTING

| Problem | Fix |
|---------|-----|
| "File not found" | Use `./docs/file.md` (with `./`) |
| "Missing SUPABASE_URL" | Export or set in `.env.local` |
| "Permission denied" | Check SERVICE ROLE KEY (not anon key) |
| Changes not live | Wait for next request or restart server |
| Sync errors | Check Supabase dashboard for table/permissions |

---

## 📝 SUPPORTED EMPLOYEES

| Slug | Use Case |
|------|----------|
| `crystal-analytics` | Financial intelligence & analysis |
| `prime-boss` | CEO orchestration |
| `byte-docs` | Document processing |
| `tag-categorizer` | Transaction tagging |
| `ledger-tax` | Tax & compliance |
| `goalie-agent` | Goals & reminders |

---

## 💡 TIPS

✅ Keep personas in git (`docs/`)  
✅ Review with `git diff` before syncing  
✅ Test in staging first  
✅ Monitor logs after sync  
✅ Keep service key in `.env.local` (never commit)  
✅ Easy rollback via git history  

❌ Don't hardcode keys  
❌ Don't sync untrusted files  
❌ Don't assume sync succeeded (verify)  

---

## 🔗 REFERENCES

- Full guide: `SYNC_EMPLOYEE_PROMPT_GUIDE.md`
- Script: `scripts/sync-employee-prompt.ts`
- Database function: `upsert_employee_prompt()`

---

**Status:** ✅ Ready  
**Complexity:** ⭐ Easy  
**Time:** ~2 minutes  

🚀 Happy syncing!






