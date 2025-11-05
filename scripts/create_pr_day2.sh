#!/bin/bash
# Create Day 2 PR via GitHub API

set -e

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN environment variable not set"
  echo "Set it with: export GITHUB_TOKEN=your_token_here"
  exit 1
fi

REPO_OWNER="dwarner13"
REPO_NAME="newxspensesai"
BASE_BRANCH="main"
HEAD_BRANCH="feature/day2-pii-unification"
TITLE="Day 2: PII masking unification"
BODY_FILE="reports/DAY2_PR_BODY.md"

# Read PR body from file
PR_BODY=$(cat "$BODY_FILE")

# Create PR
RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/pulls" \
  -d "{
    \"title\": \"$TITLE\",
    \"head\": \"$HEAD_BRANCH\",
    \"base\": \"$BASE_BRANCH\",
    \"body\": $(echo "$PR_BODY" | jq -Rs .),
    \"draft\": true
  }")

PR_URL=$(echo "$RESPONSE" | jq -r '.html_url // empty')
PR_NUMBER=$(echo "$RESPONSE" | jq -r '.number // empty')

if [ -z "$PR_URL" ] || [ "$PR_URL" = "null" ]; then
  echo "Error creating PR:"
  echo "$RESPONSE" | jq .
  exit 1
fi

echo "✅ Draft PR created successfully!"
echo "PR URL: $PR_URL"
echo "PR Number: $PR_NUMBER"

