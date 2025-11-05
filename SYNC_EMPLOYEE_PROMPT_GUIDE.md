# 🔄 SYNC EMPLOYEE PROMPT GUIDE

**Purpose:** Zero-downtime persona updates directly to database  
**Status:** ✅ Ready  
**Time Required:** ~2 minutes per sync  
**No Code Deployment:** Required (updates via RPC)

---

## 🎯 WHAT THIS DOES

The `sync-employee-prompt.ts` script allows you to:

✅ **Update employee personas** without redeploying code  
✅ **Read from local Markdown files** (version-controlled)  
✅ **Sync directly to database** via Supabase RPC function  
✅ **Go live immediately** (no restart needed)  
✅ **Version control personas** as Markdown documents  
✅ **A/B test different versions** by swapping files  

---

## 📋 PREREQUISITES

### 1. Environment Variables
You need these in your `.env.local` or exported:

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

**Where to find:**
- `SUPABASE_URL`: Supabase Dashboard → Settings → API
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard → Settings → API (with `service_role` scope)

### 2. Dependencies
The script uses these npm packages (already in your `package.json`):
- `@supabase/supabase-js` — Supabase client
- `ts-node` — Run TypeScript directly
- `typescript` — TypeScript compiler

Install if needed:
```bash
npm install @supabase/supabase-js ts-node typescript
```

### 3. Database Function
The script calls `upsert_employee_prompt()` RPC function (should exist in your Supabase):
```sql
-- This function should exist in your database
select upsert_employee_prompt(
  p_slug text,
  p_title text,
  p_prompt text,
  p_capabilities text[],
  p_tools text[],
  p_active boolean
);
```

---

## 🚀 QUICK START (3 Steps)

### Step 1: Set Environment Variables
```bash
# Linux/macOS
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-key"

# Windows PowerShell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-key"

# Or create .env.local file
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
```

### Step 2: Prepare Markdown File
Create a file with your employee system prompt:
```bash
# Example: Crystal's persona
docs/CRYSTAL_2.0_SYSTEM_PROMPT.md

# Example: Prime's persona
docs/PRIME_CEO_PERSONA.md
```

### Step 3: Run Sync Command
```bash
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
```

**Output:**
```
📖 Reading file: /path/to/docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
   Lines: 1200, Characters: 52341
💾 Syncing to employee: crystal-analytics
   Title: Crystal — Financial Intelligence (AI CFO)
✅ Successfully synced employee "crystal-analytics"
   Source: /path/to/docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
   Prompt size: 52341 characters

🚀 Changes will be picked up by production code immediately
   (no code deployment required)
```

---

## 📚 SUPPORTED EMPLOYEES

| Slug | Title | File Example |
|------|-------|--------------|
| `crystal-analytics` | Crystal — Financial Intelligence (AI CFO) | `docs/CRYSTAL_2.0_SYSTEM_PROMPT.md` |
| `prime-boss` | Prime — AI Financial CEO & Orchestrator | `docs/PRIME_CEO_PERSONA.md` |
| `byte-docs` | Byte — Document Processing & OCR | `docs/BYTE_PERSONA.md` |
| `tag-categorizer` | Tag — Transaction Categorization | `docs/TAG_PERSONA.md` |
| `ledger-tax` | Ledger — Tax & Compliance | `docs/LEDGER_PERSONA.md` |
| `goalie-agent` | Goalie — Goals & Reminders | `docs/GOALIE_PERSONA.md` |

---

## 📖 COMMAND REFERENCE

### Basic Syntax
```bash
ts-node scripts/sync-employee-prompt.ts <slug> <filePath>
```

### Examples

#### Sync Crystal's persona
```bash
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
```

#### Sync Prime's persona
```bash
ts-node scripts/sync-employee-prompt.ts prime-boss ./docs/PRIME_CEO_PERSONA.md
```

#### Sync from a different directory
```bash
ts-node scripts/sync-employee-prompt.ts crystal-analytics ~/my-prompts/crystal-v2.md
```

#### With environment variables
```bash
SUPABASE_URL="https://xxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="key" \
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
```

---

## 🔍 WHAT THE SCRIPT DOES

### 1. Validates Arguments
- Checks `<slug>` is provided
- Checks `<filePath>` is provided
- Shows helpful error message if missing

### 2. Validates Environment
- Checks `SUPABASE_URL` is set
- Checks `SUPABASE_SERVICE_ROLE_KEY` is set
- Shows setup instructions if missing

### 3. Validates File
- Resolves file path (handles `./` and `~/` syntax)
- Checks file exists
- Reports helpful error if missing

### 4. Reads File
- Reads entire file as UTF-8 text
- Counts lines and characters
- Displays file stats

### 5. Syncs to Database
- Creates Supabase client with service role key
- Calls `upsert_employee_prompt()` RPC function with:
  - `p_slug` — Employee slug (e.g., `crystal-analytics`)
  - `p_title` — Display name (auto-detected or custom)
  - `p_prompt` — Full system prompt text
  - `p_capabilities` — 13-item capability array
  - `p_tools` — Tool list (e.g., `['delegate']`)
  - `p_active` — Activation flag (true)

### 6. Handles Response
- Success: Shows confirmation with file path and size
- Failure: Shows database error message
- Always exits cleanly (exit code 0 or 1)

---

## ✅ SUCCESS RESPONSE

When sync succeeds, you'll see:
```
✅ Successfully synced employee "crystal-analytics"
   Source: /path/to/docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
   Prompt size: 52341 characters

🚀 Changes will be picked up by production code immediately
   (no code deployment required)
```

---

## ❌ ERROR HANDLING

### Missing Arguments
```
❌ Missing required arguments
Usage: ts-node scripts/sync-employee-prompt.ts <slug> <filePath>

Examples:
  ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
  ts-node scripts/sync-employee-prompt.ts prime-boss ./docs/PRIME_CEO_PERSONA.md
```

**Fix:** Provide both `<slug>` and `<filePath>` arguments

### Missing Environment Variables
```
❌ Missing required environment variables:
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY

Set them in your .env file or export them:
  export SUPABASE_URL="https://your-project.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

**Fix:** Export or set environment variables in `.env.local`

### File Not Found
```
❌ File not found: /path/to/file.md
```

**Fix:** Check the file path is correct and file exists

### Database Error
```
❌ Database error: permission denied
```

**Fix:** Verify `SUPABASE_SERVICE_ROLE_KEY` has write access to `employee_profiles` table

---

## 🎯 USE CASES

### Use Case 1: Update Crystal's Persona (Post-Deployment)
After deploying code, you realize Crystal needs a tweak:
```bash
# Edit the persona file locally
vim docs/CRYSTAL_2.0_SYSTEM_PROMPT.md

# Sync to database (no code deployment)
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md

# Done! Changes live immediately
```

### Use Case 2: A/B Test Different Personas
Compare two versions before committing:
```bash
# Sync version A
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./personas/crystal-v1.md

# Test with users...

# Swap to version B
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./personas/crystal-v2.md

# Test again... Pick winner, commit to main
```

### Use Case 3: Version Control Personas
Keep all personas in version control:
```
docs/
├── CRYSTAL_2.0_SYSTEM_PROMPT.md
├── PRIME_CEO_PERSONA.md
├── BYTE_PERSONA.md
├── TAG_PERSONA.md
├── LEDGER_PERSONA.md
└── GOALIE_PERSONA.md
```

Sync from any branch:
```bash
git checkout feature/crystal-v2
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
```

### Use Case 4: Batch Update All Personas
Update multiple employees at once:
```bash
#!/bin/bash
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
ts-node scripts/sync-employee-prompt.ts prime-boss ./docs/PRIME_CEO_PERSONA.md
ts-node scripts/sync-employee-prompt.ts byte-docs ./docs/BYTE_PERSONA.md
echo "✅ All personas synced!"
```

---

## 🔐 SECURITY BEST PRACTICES

### 1. Use Service Role Key Safely
- ✅ Store in `.env.local` (never commit to git)
- ✅ Rotate keys regularly
- ✅ Use different keys per environment (dev/staging/prod)
- ❌ Don't paste in public channels or chat
- ❌ Don't hardcode in scripts

### 2. Verify File Content
- ✅ Review changes in Markdown file before syncing
- ✅ Use git diff to see what changed
- ✅ Test in staging environment first
- ❌ Don't sync untrusted files

### 3. Monitor Database Changes
- ✅ Check sync logs in application
- ✅ Verify changes in Supabase dashboard
- ✅ Monitor error rates after sync
- ❌ Assume sync succeeded without verification

### 4. Version Control
- ✅ Keep Markdown files in git
- ✅ Use PR reviews before syncing
- ✅ Tag releases with persona versions
- ❌ Lost track of which version is live

---

## 📊 PERFORMANCE NOTES

| Operation | Time | Notes |
|-----------|------|-------|
| Read file | <10ms | Local disk I/O |
| Database sync | 50-200ms | Network + RPC execution |
| Total | ~100-300ms | Very fast, no noticeable delay |
| Live time | Immediate | Production picks up next request |

---

## 🧪 VERIFICATION STEPS

### After Syncing

#### Step 1: Check Database
```sql
select slug, updated_at, char_length(system_prompt) as prompt_len
from employee_profiles
where slug = 'crystal-analytics';
```

**Should show:**
- `slug`: `crystal-analytics`
- `updated_at`: Recent timestamp (just now)
- `prompt_len`: Character count of your prompt

#### Step 2: Test via API
```bash
curl -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1' \
  -H 'content-type: application/json' \
  -d '{"userId":"test","message":"Hi Crystal, quick test","employeeSlug":"crystal-analytics"}'
```

**Should respond with:** Crystal's personality and new system prompt

#### Step 3: Check Logs
```bash
tail -f logs/*.log | grep "Using DB persona"
# Should see: "[Chat] Using DB persona for crystal-analytics"
```

---

## 🚨 TROUBLESHOOTING

### Problem: "File not found"
```bash
# ❌ Wrong
ts-node scripts/sync-employee-prompt.ts crystal-analytics docs/CRYSTAL_2.0_SYSTEM_PROMPT.md

# ✅ Correct
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
```

### Problem: "Missing SUPABASE_URL"
```bash
# Check if env var is set
echo $SUPABASE_URL

# ✅ Set it
export SUPABASE_URL="https://your-project.supabase.co"

# Or create .env.local
cat > .env.local << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
EOF
```

### Problem: "Upsert failed: permission denied"
```bash
# Issue: Service role key doesn't have write access
# Solution: Verify key is correct and has proper permissions

# Check in Supabase dashboard:
# 1. Settings → API → Copy correct SERVICE ROLE KEY
# 2. (Not the anon key!)
```

### Problem: Changes not taking effect
```bash
# The code dynamically loads from DB, but may be cached
# Solutions:
# 1. Wait for next API request (cache refresh)
# 2. Restart Netlify dev server
# 3. Check logs to confirm DB persona loaded
```

---

## 📈 WORKFLOW EXAMPLE

### Iteration Workflow
```bash
# 1. Edit persona locally
vim docs/CRYSTAL_2.0_SYSTEM_PROMPT.md

# 2. Commit to git
git add docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
git commit -m "refine: Crystal's strategic thinking section"

# 3. Sync to staging
export SUPABASE_URL="https://staging.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="staging-key"
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md

# 4. Test with real users
# ... collect feedback ...

# 5. Once approved, sync to production
export SUPABASE_URL="https://prod.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="prod-key"
ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md

# 6. Monitor
tail -f logs/*.log | grep "crystal-analytics"
```

---

## 💡 BEST PRACTICES

### 1. Keep Prompts Version Controlled
```bash
docs/
├── CRYSTAL_2.0_SYSTEM_PROMPT.md    ← main version
├── CRYSTAL_2.0_SYSTEM_PROMPT.v1.md ← archive
└── CRYSTAL_2.0_SYSTEM_PROMPT.v2.md ← experiment
```

### 2. Review Before Syncing
```bash
# See what changed
git diff docs/CRYSTAL_2.0_SYSTEM_PROMPT.md

# Only sync after review
ts-node scripts/sync-employee-prompt.ts ...
```

### 3. Test in Staging First
```bash
# Sync to staging DB
# Test with real queries
# Monitor for errors
# Then promote to production
```

### 4. Monitor After Sync
```bash
# Watch logs
tail -f logs/*.log | grep "Crystal\|crystal"

# Check error rate
# Verify user feedback
# Be ready to rollback if needed
```

### 5. Rollback Strategy
```bash
# Keep previous version in git
git log --oneline docs/CRYSTAL_2.0_SYSTEM_PROMPT.md

# If needed, sync previous version
git show HEAD~1:docs/CRYSTAL_2.0_SYSTEM_PROMPT.md > /tmp/crystal-prev.md
ts-node scripts/sync-employee-prompt.ts crystal-analytics /tmp/crystal-prev.md
```

---

## 🎯 AUTOMATION IDEAS

### Automated Sync on Merge
```yaml
# .github/workflows/sync-prompts.yml
name: Sync Personas to DB
on:
  push:
    branches: [main]
    paths:
      - 'docs/**.md'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

---

## ❓ FAQ

**Q: Do I need to restart the app?**  
A: No! Changes are picked up immediately on next request.

**Q: Can I sync to production directly?**  
A: Yes, but recommended: test in staging first.

**Q: How do I rollback?**  
A: Sync the previous version of the file (keep in git history).

**Q: Can multiple people sync at same time?**  
A: Yes, last sync wins (RPC handles concurrency).

**Q: What if sync fails halfway?**  
A: Script exits with error (exit code 1), nothing is partially updated.

**Q: Can I use different prompts per user?**  
A: Not with this script. This syncs global employee profiles.

**Q: How large can prompts be?**  
A: Very large (tested to 100KB+). Depends on database limits.

---

## 🚀 SUMMARY

**The sync script enables:**
- ✅ Zero-downtime persona updates
- ✅ Version-controlled prompts (Markdown in git)
- ✅ Immediate live changes (no code deployment)
- ✅ A/B testing different versions
- ✅ Batch updates via scripts
- ✅ Simple CLI interface
- ✅ Secure with service role keys
- ✅ Fast execution (~100-300ms)

**Typical workflow:**
1. Edit Markdown file locally
2. Commit to git
3. Run sync command
4. Changes live immediately
5. Monitor and verify

---

**Status:** ✅ Ready to Use  
**Complexity:** Easy  
**Time Required:** ~2 minutes per sync  
**Risk:** Very Low (easily reversible)

🚀 **Happy syncing!**






