Day 1 PR Creation - Instructions
==================================

The branch `feature/day1-chat-merge-adapt` exists at origin and is ready for PR creation.

METHOD 1: Using GitHub CLI (if installed)
-------------------------------------------
```bash
gh pr create \
  --title "Day 1: Chat consolidation with adapters" \
  --base main \
  --head feature/day1-chat-merge-adapt \
  --body-file reports/DAY1_PR_BODY.md \
  --draft
```

METHOD 2: Using REST API Script
--------------------------------
```bash
export GITHUB_TOKEN=your_github_token_here
bash scripts/create_pr_day1.sh
```

METHOD 3: Manual Creation via GitHub UI
----------------------------------------
1. Visit: https://github.com/dwarner13/newxspensesai/compare/main...feature/day1-chat-merge-adapt
2. Click "Create pull request"
3. Set title: "Day 1: Chat consolidation with adapters"
4. Paste contents from `reports/DAY1_PR_BODY.md` into description
5. Check "Create as draft"
6. Click "Create pull request"

METHOD 4: Direct REST API Call
-------------------------------
```bash
export GITHUB_TOKEN=your_token
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/dwarner13/newxspensesai/pulls" \
  -d '{
    "title": "Day 1: Chat consolidation with adapters",
    "head": "feature/day1-chat-merge-adapt",
    "base": "main",
    "body": "<paste contents of reports/DAY1_PR_BODY.md here, properly escaped>",
    "draft": true
  }'
```

PR DETAILS
----------
- Title: Day 1: Chat consolidation with adapters
- Base: main
- Head: feature/day1-chat-merge-adapt
- Draft: true
- Body: See reports/DAY1_PR_BODY.md

CURRENT STATUS
-------------
✅ Branch exists at origin: feature/day1-chat-merge-adapt
✅ PR body file ready: reports/DAY1_PR_BODY.md
⚠️  GITHUB_TOKEN not configured (required for API methods)

NEXT STEPS AFTER PR CREATION
----------------------------
1. Verify PR created successfully
2. Review the PR description
3. Run verification tests
4. Update PR with verification results
5. Mark PR as ready for review when complete

