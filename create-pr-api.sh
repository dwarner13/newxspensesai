#!/bin/bash
# Create GitHub PR using API

REPO="dwarner13/newxspensesai"
BRANCH="feature/day1-chat-merge-adapt"
BASE="main"
TITLE="Day 1: Chat consolidation with adapters"
BODY_FILE="reports/DAY1_PR_FINAL_BODY.md"

# Try to get token from environment or git config
GITHUB_TOKEN="${GITHUB_TOKEN:-$(git config --get github.token 2>/dev/null)}"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "‚ö†Ô∏è  GitHub token not found. Please set GITHUB_TOKEN environment variable or git config github.token"
  echo ""
  echo "Alternative: Create PR manually at:"
  echo "https://github.com/$REPO/pull/new/$BRANCH"
  exit 1
fi

# Read PR body and escape for JSON
PR_BODY=$(cat "$BODY_FILE")

# Create PR
echo "Ì∫Ä Creating draft PR..."

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/$REPO/pulls" \
  -d @- <<EOF
{
  "title": "$TITLE",
  "head": "$BRANCH",
  "base": "$BASE",
  "body": $(echo "$PR_BODY" | python3 -c "import sys, json; print(json.dumps(sys.stdin.read()))" 2>/dev/null || echo "$PR_BODY" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g' | sed 's/^/"/' | sed 's/$/"/'),
  "draft": true
}
EOF
)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY_RESPONSE=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ]; then
  PR_URL=$(echo "$BODY_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['html_url'])" 2>/dev/null || echo "$BODY_RESPONSE" | grep -o '"html_url":"[^"]*' | cut -d'"' -f4)
  PR_NUMBER=$(echo "$BODY_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['number'])" 2>/dev/null || echo "$BODY_RESPONSE" | grep -o '"number":[0-9]*' | cut -d':' -f2)
  echo "‚úÖ Draft PR created successfully!"
  echo "   URL: $PR_URL"
  echo "   Number: #$PR_NUMBER"
  echo "$PR_URL"
else
  echo "‚ùå Failed to create PR"
  echo "   HTTP Code: $HTTP_CODE"
  echo "   Response: $BODY_RESPONSE"
  exit 1
fi
