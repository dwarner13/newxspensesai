# 📦 NPM SCRIPTS — EMPLOYEE SYNC GUIDE

**Purpose:** Convenient npm scripts for syncing employee personas  
**Status:** ✅ Ready  
**Usage:** `npm run sync:crystal` (and others)

---

## 🎯 AVAILABLE SCRIPTS

### Individual Sync Scripts

#### Sync Crystal (Financial Intelligence)
```bash
npm run sync:crystal
```
Syncs: `docs/CRYSTAL_2.0_SYSTEM_PROMPT.md` → `crystal-analytics`

#### Sync Prime (CEO)
```bash
npm run sync:prime
```
Syncs: `docs/PRIME_CEO_PERSONA.md` → `prime-boss`

#### Sync Byte (Documents)
```bash
npm run sync:byte
```
Syncs: `docs/BYTE_PERSONA.md` → `byte-docs`

#### Sync Tag (Categorization)
```bash
npm run sync:tag
```
Syncs: `docs/TAG_PERSONA.md` → `tag-categorizer`

#### Sync Ledger (Tax)
```bash
npm run sync:ledger
```
Syncs: `docs/LEDGER_PERSONA.md` → `ledger-tax`

#### Sync Goalie (Goals)
```bash
npm run sync:goalie
```
Syncs: `docs/GOALIE_PERSONA.md` → `goalie-agent`

### Batch Sync

#### Sync All Employees
```bash
npm run sync:all
```
Runs all 6 sync scripts in sequence:
1. Crystal
2. Prime
3. Byte
4. Tag
5. Ledger
6. Goalie

---

## 📋 SCRIPT DEFINITIONS

Here's what's in `package.json`:

```json
{
  "scripts": {
    "sync:crystal": "ts-node scripts/sync-employee-prompt.ts crystal-analytics ./docs/CRYSTAL_2.0_SYSTEM_PROMPT.md",
    "sync:prime": "ts-node scripts/sync-employee-prompt.ts prime-boss ./docs/PRIME_CEO_PERSONA.md",
    "sync:byte": "ts-node scripts/sync-employee-prompt.ts byte-docs ./docs/BYTE_PERSONA.md",
    "sync:tag": "ts-node scripts/sync-employee-prompt.ts tag-categorizer ./docs/TAG_PERSONA.md",
    "sync:ledger": "ts-node scripts/sync-employee-prompt.ts ledger-tax ./docs/LEDGER_PERSONA.md",
    "sync:goalie": "ts-node scripts/sync-employee-prompt.ts goalie-agent ./docs/GOALIE_PERSONA.md",
    "sync:all": "npm run sync:crystal && npm run sync:prime && npm run sync:byte && npm run sync:tag && npm run sync:ledger && npm run sync:goalie && echo '✅ All employees synced!'"
  }
}
```

---

## 🚀 QUICK START

### Prerequisites
Before running any script, set environment variables:

```bash
# Option 1: Export (Linux/macOS)
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-key"

# Option 2: Windows PowerShell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-key"

# Option 3: Create .env.local (recommended)
cat > .env.local << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
EOF
```

### Run a Sync
```bash
# Sync Crystal
npm run sync:crystal

# Expected output:
# 📖 Reading file: /path/to/docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
#    Lines: 1200, Characters: 52341
# 💾 Syncing to employee: crystal-analytics
#    Title: Crystal — Financial Intelligence (AI CFO)
# ✅ Successfully synced employee "crystal-analytics"
#    Source: /path/to/docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
#    Prompt size: 52341 characters
#
# 🚀 Changes will be picked up by production code immediately
#    (no code deployment required)
```

---

## 📖 WORKFLOW EXAMPLES

### Workflow 1: Update Crystal Only
```bash
# Edit Crystal's persona
vim docs/CRYSTAL_2.0_SYSTEM_PROMPT.md

# Sync to database
npm run sync:crystal

# Test
curl http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1 \
  -d '{"userId":"test","message":"Hi Crystal"}'
```

### Workflow 2: Update Multiple Employees
```bash
# Edit personas
vim docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
vim docs/PRIME_CEO_PERSONA.md

# Sync both
npm run sync:crystal
npm run sync:prime

# Or batch
npm run sync:all
```

### Workflow 3: Release New Version
```bash
# 1. Review changes
git diff docs/

# 2. Commit
git add docs/
git commit -m "feat: Crystal 2.1 with better reasoning"

# 3. Sync to staging
export SUPABASE_URL="https://staging.supabase.co"
npm run sync:crystal

# 4. Test with users
# ...

# 5. Promote to production
export SUPABASE_URL="https://prod.supabase.co"
npm run sync:crystal
```

### Workflow 4: Batch Update All (Post-Deploy)
```bash
# After deploying new code, update all personas
npm run sync:all

# Watch for results
# Should see 6 success messages (one per employee)
```

---

## 🎯 USE CASES

### Use Case 1: Daily Updates
```bash
# Morning: Edit and sync Crystal's latest insights
vim docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
npm run sync:crystal

# No downtime, no deployment needed!
```

### Use Case 2: A/B Testing
```bash
# Test version A
npm run sync:crystal  # Points to CRYSTAL_2.0_SYSTEM_PROMPT.md

# Collect metrics...

# Test version B (keep backup of v1)
cp docs/CRYSTAL_2.0_SYSTEM_PROMPT.md docs/CRYSTAL_2.0_SYSTEM_PROMPT.v1.md

# Edit and sync v2
npm run sync:crystal

# Collect more metrics...

# Keep winner
git add docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
git commit -m "winner: Crystal v2"
```

### Use Case 3: Team Collaboration
```bash
# Developer A: Edit Prime's persona
git checkout -b feature/prime-enhancement
vim docs/PRIME_CEO_PERSONA.md
git commit -m "enhance: Prime's strategic planning"
git push

# Create PR, get review, merge

# Developer B: Auto-deploy on merge
# (via GitHub Actions, see below)
```

---

## 🔧 ADVANCED USAGE

### Batch Sync with Custom Environment

```bash
# Create a deploy script
cat > deploy-personas.sh << 'EOF'
#!/bin/bash
set -e

echo "Deploying to production..."

# Set production credentials
export SUPABASE_URL="https://prod.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY=$(cat secrets/prod-key.txt)

# Sync all employees
npm run sync:all

echo "✅ All personas deployed to production!"
EOF

chmod +x deploy-personas.sh
./deploy-personas.sh
```

### Per-Environment Configuration

```bash
# Create environment-specific scripts
cat > deploy-staging.sh << 'EOF'
#!/bin/bash
export SUPABASE_URL="https://staging.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY=$(cat .env.staging)
npm run sync:all
EOF

cat > deploy-prod.sh << 'EOF'
#!/bin/bash
export SUPABASE_URL="https://prod.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY=$(cat .env.prod)
npm run sync:all
EOF

chmod +x deploy-staging.sh deploy-prod.sh
```

---

## 🤖 GITHUB ACTIONS AUTOMATION

### Auto-Sync on PR Merge

```yaml
# .github/workflows/sync-personas.yml
name: Sync Personas to Production

on:
  push:
    branches: [main]
    paths:
      - 'docs/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Sync all personas
        run: npm run sync:all
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL_PROD }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY_PROD }}
```

### Conditional Sync (Staging vs Production)

```yaml
# .github/workflows/sync-staging.yml
name: Sync Personas to Staging

on:
  pull_request:
    paths:
      - 'docs/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run sync:all
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL_STAGING }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY_STAGING }}
```

---

## ✅ VERIFICATION AFTER SYNC

### Quick Check
```bash
# Should see success message
npm run sync:crystal
# Output ends with: ✅ Successfully synced employee "crystal-analytics"
```

### Database Verification
```bash
# Check in Supabase
supabase db execute "SELECT slug, updated_at FROM employee_profiles WHERE slug = 'crystal-analytics';"
```

### API Test
```bash
# Test with real API call
curl -X POST 'http://localhost:8888/.netlify/functions/chat-v3-production?nostream=1' \
  -H 'content-type: application/json' \
  -d '{"userId":"test","message":"Hi Crystal, test the new persona"}'
```

### Log Check
```bash
# Watch logs for confirmation
tail -f logs/*.log | grep "Using DB persona"
# Should see: "[Chat] Using DB persona for crystal-analytics"
```

---

## 🚨 TROUBLESHOOTING

### Error: "Command not found: ts-node"
```bash
# Install ts-node globally
npm install -g ts-node typescript

# Or install locally if not in package.json
npm install --save-dev ts-node typescript
```

### Error: "SUPABASE_URL not set"
```bash
# Make sure to export environment variables before running
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-key"

# Or create .env.local
echo "SUPABASE_URL=https://your-project.supabase.co" > .env.local
echo "SUPABASE_SERVICE_ROLE_KEY=your-key" >> .env.local
```

### Error: "File not found"
```bash
# Make sure Markdown files exist
ls -la docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
ls -la docs/PRIME_CEO_PERSONA.md

# Create them if missing
touch docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
```

### Error: "Permission denied"
```bash
# Check Service Role Key has write access
# In Supabase Dashboard:
# 1. Settings → API
# 2. Copy SERVICE ROLE KEY (not anon key)
# 3. Verify it has write access to employee_profiles
```

---

## 📊 PERFORMANCE

| Operation | Time |
|-----------|------|
| `npm run sync:crystal` | ~2-5 seconds |
| `npm run sync:all` | ~15-30 seconds |
| Database update | <300ms |
| Live time | Immediate |

---

## 💡 BEST PRACTICES

### 1. Always Review Before Syncing
```bash
# Review changes
git diff docs/CRYSTAL_2.0_SYSTEM_PROMPT.md

# Then sync
npm run sync:crystal
```

### 2. Test in Staging First
```bash
# Sync to staging
export SUPABASE_URL="https://staging.supabase.co"
npm run sync:crystal

# Test thoroughly...

# Then promote to production
export SUPABASE_URL="https://prod.supabase.co"
npm run sync:crystal
```

### 3. Version Control Everything
```bash
# Always commit personas
git add docs/
git commit -m "update: Crystal's reasoning section"

# Keep history for easy rollback
git log --oneline docs/CRYSTAL_2.0_SYSTEM_PROMPT.md
```

### 4. Monitor After Sync
```bash
# Watch logs
tail -f logs/*.log | grep "Crystal\|crystal"

# Check error rates
# Verify user feedback
```

---

## 🎯 SUMMARY

**Available Scripts:**

| Script | Command | Purpose |
|--------|---------|---------|
| `sync:crystal` | `npm run sync:crystal` | Sync Crystal AI |
| `sync:prime` | `npm run sync:prime` | Sync Prime CEO |
| `sync:byte` | `npm run sync:byte` | Sync Byte OCR |
| `sync:tag` | `npm run sync:tag` | Sync Tag categorizer |
| `sync:ledger` | `npm run sync:ledger` | Sync Ledger tax |
| `sync:goalie` | `npm run sync:goalie` | Sync Goalie goals |
| `sync:all` | `npm run sync:all` | Sync all 6 employees |

**Key Benefits:**
- ✅ Easy to remember (`npm run sync:crystal`)
- ✅ No typing long commands
- ✅ Consistent across team
- ✅ Works with CI/CD
- ✅ Zero-downtime updates
- ✅ Production-ready

---

## 📚 RELATED DOCUMENTATION

- **sync-employee-prompt.ts** — The actual sync script
- **SYNC_EMPLOYEE_PROMPT_GUIDE.md** — Comprehensive guide
- **SYNC_QUICK_REFERENCE.md** — Quick reference card
- **INDEX_CRYSTAL_2_0_COMPLETE.md** — Crystal 2.0 index

---

**Status:** ✅ Ready  
**Ease of Use:** ⭐⭐⭐⭐⭐ (5/5)  
**Time to Learn:** <5 minutes  

🚀 **Happy scripting!**






