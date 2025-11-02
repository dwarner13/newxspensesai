#!/bin/bash
# Create GitHub PR using API with temp JSON file

REPO="dwarner13/newxspensesai"
BRANCH="feature/day1-chat-merge-adapt"
BASE="main"
TITLE="Day 1: Chat consolidation with adapters"
BODY_FILE="reports/DAY1_PR_FINAL_BODY.md"

# Try to get token from environment or git config
GITHUB_TOKEN="${GITHUB_TOKEN:-$(git config --get github.token 2>/dev/null)}"

if [ -z "$GITHUB_TOKEN" ]; then
  echo "⚠️  GitHub token not found. Please set GITHUB_TOKEN environment variable"
  echo ""
  echo "Alternative: Create PR manually at:"
  echo "https://github.com/$REPO/pull/new/$BRANCH"
  echo ""
  echo "Copy PR body from: $BODY_FILE"
  exit 1
fi

# Read PR body
PR_BODY=$(cat "$BODY_FILE")

# Escape JSON special characters manually
PR_BODY_ESCAPED=$(echo "$PR_BODY" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')

# Create JSON payload
cat > /tmp/pr-payload.json <<EOF
{
  "title": "$TITLE",
  "head": "$BRANCH",
  "base": "$BASE",
  "body": "$PR_BODY_ESCAPED",
  "draft": true
}
EOF

echo "🚀 Creating draft PR..."

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  -H "Content-Type: application/json" \
  -d @/tmp/pr-payload.json \
  "https://api.github.com/repos/$REPO/pulls" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY_RESPONSE=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ]; then
  # Extract PR URL from response (simple grep)
  PR_URL=$(echo "$BODY_RESPONSE" | grep -o '"html_url":"[^"]*' | head -1 | cut -d'"' -f4)
  PR_NUMBER=$(echo "$BODY_RESPONSE" | grep -o '"number":[0-9]*' | head -1 | cut -d':' -f2)
  
  echo "✅ Draft PR created successfully!"
  echo "   URL: $PR_URL"
  echo "   Number: #$PR_NUMBER"
  echo ""
  echo "$PR_URL"
  
  # Cleanup
  rm -f /tmp/pr-payload.json
else
  echo "❌ Failed to create PR"
  echo "   HTTP Code: $HTTP_CODE"
  echo "   Response: $BODY_RESPONSE"
  rm -f /tmp/pr-payload.json
  exit 1
fi
