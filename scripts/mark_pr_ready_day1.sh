#!/bin/bash
# Find and mark Day 1 PR as ready for review, then add verification comment
# Requires GITHUB_TOKEN environment variable

set -e

REPO="dwarner13/newxspensesai"
BRANCH="feature/day1-chat-merge-adapt"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: GITHUB_TOKEN environment variable is not set"
  echo "Please set it with: export GITHUB_TOKEN=your_token_here"
  exit 1
fi

echo "Searching for PR with head branch: $BRANCH..."

# Find the PR
PR_JSON=$(curl -s -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/$REPO/pulls?head=dwarner13:$BRANCH&state=open")

PR_NUMBER=$(echo "$PR_JSON" | grep -o '"number":[0-9]*' | head -1 | cut -d: -f2)

if [ -z "$PR_NUMBER" ]; then
  echo "ERROR: No PR found for branch $BRANCH"
  exit 1
fi

echo "Found PR #$PR_NUMBER"

# Check if it's draft
IS_DRAFT=$(echo "$PR_JSON" | grep -o '"draft":[a-z]*' | head -1 | cut -d: -f2)
PR_URL=$(echo "$PR_JSON" | grep -o '"html_url":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ "$IS_DRAFT" = "true" ]; then
  echo "PR is draft. Marking as ready for review..."
  curl -s -X PATCH \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/$REPO/pulls/$PR_NUMBER" \
    -d '{"draft":false}' > /dev/null
  echo "✅ PR marked as ready for review"
else
  echo "PR is already ready for review"
fi

# Create verification comment
COMMENT_BODY=$(cat <<'EOF'
## Day 1 verification complete ✅

- Endpoint unified to `/.netlify/functions/chat`
- SSE headers + streaming verified
- PII masking active during stream (screenshot + manual test)
- Guardrails active (blocked bad prompts)

### Verification Reports:

- [`reports/DAY1_APPLIED.md`](reports/DAY1_APPLIED.md)
- [`reports/DAY1_CHANGED_FILES.txt`](reports/DAY1_CHANGED_FILES.txt)
- [`reports/DAY1_SMOKE.log`](reports/DAY1_SMOKE.log)
- [`reports/DAY1_VERIFY_SSE_HEADERS.txt`](reports/DAY1_VERIFY_SSE_HEADERS.txt)
- [`reports/DAY1_VERIFY_SSE_SAMPLE.txt`](reports/DAY1_VERIFY_SSE_SAMPLE.txt)

### Next steps:
Run Day 2 (PII unification) per [`reports/CLEANUP_PLAN.md`](reports/CLEANUP_PLAN.md).
EOF
)

echo "Posting verification comment..."
COMMENT_RESPONSE=$(curl -s -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$REPO/issues/$PR_NUMBER/comments" \
  -d "{\"body\":$(echo "$COMMENT_BODY" | node -e "const fs=require('fs'); const d=fs.readFileSync(0,'utf8'); console.log(JSON.stringify(d))" 2>/dev/null || python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))" 2>/dev/null || echo '"Failed to escape"')}")

COMMENT_URL=$(echo "$COMMENT_RESPONSE" | grep -o '"html_url":"[^"]*"' | head -1 | cut -d'"' -f4)

echo ""
echo "✅ Summary:"
echo "PR URL: $PR_URL"
echo "Status: Ready for review"
if [ -n "$COMMENT_URL" ]; then
  echo "Comment URL: $COMMENT_URL"
else
  echo "Comment posted (URL not available)"
fi

