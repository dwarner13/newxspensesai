#!/bin/bash
# Create Day 1 Draft PR
# Requires GITHUB_TOKEN environment variable

set -e

REPO="dwarner13/newxspensesai"
BRANCH="feature/day1-chat-merge-adapt"
BASE="main"
TITLE="Day 1: Chat consolidation with adapters"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "ERROR: GITHUB_TOKEN environment variable is not set"
  echo "Please set it with: export GITHUB_TOKEN=your_token_here"
  exit 1
fi

# Read PR body and escape as JSON
PR_BODY=$(python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))" < reports/DAY1_PR_BODY.md 2>/dev/null || \
  node -e "const fs=require('fs'); console.log(JSON.stringify(fs.readFileSync('reports/DAY1_PR_BODY.md','utf8')))" 2>/dev/null || \
  echo "Failed to read PR body")

if [ "$PR_BODY" = "Failed to read PR body" ]; then
  echo "ERROR: Could not read/escape PR body file"
  exit 1
fi

# Create the PR
echo "Creating draft PR..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$REPO/pulls" \
  -d "{
    \"title\": \"$TITLE\",
    \"head\": \"$BRANCH\",
    \"base\": \"$BASE\",
    \"body\": $PR_BODY,
    \"draft\": true
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" != "201" ]; then
  echo "ERROR: Failed to create PR (HTTP $HTTP_CODE)"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  exit 1
fi

# Extract PR URL
PR_URL=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['html_url'])" 2>/dev/null || \
  node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.html_url)" <<< "$BODY" 2>/dev/null || \
  echo "Unknown")

echo ""
echo "✅ Draft PR created successfully!"
echo "PR URL: $PR_URL"
echo ""
echo "You can now:"
echo "1. Review the PR at: $PR_URL"
echo "2. Mark it as ready when verification is complete"
echo "3. Add verification comments as needed"

