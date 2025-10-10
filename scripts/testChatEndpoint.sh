#!/bin/bash
# Quick test script for the new chat endpoint

echo "🧪 Testing Chat Endpoint..."
echo ""

# Configuration
ENDPOINT="${1:-http://localhost:8888/.netlify/functions/chat}"
USER_ID="${2:-TEST_USER}"

echo "Endpoint: $ENDPOINT"
echo "User ID: $USER_ID"
echo ""

# Test 1: Simple greeting
echo "Test 1: Simple Greeting"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -N -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"employeeSlug\": \"prime-boss\",
    \"message\": \"Hello, are you there?\",
    \"stream\": true
  }" 2>&1

echo ""
echo ""

# Test 2: Non-streaming
echo "Test 2: Non-Streaming Response"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"employeeSlug\": \"byte-doc\",
    \"message\": \"What can you help me with?\",
    \"stream\": false
  }" 2>&1 | jq '.' || cat

echo ""
echo ""

# Test 3: Check different employee
echo "Test 3: Different Employee (Tag AI)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"employeeSlug\": \"tag-ai\",
    \"message\": \"Explain how you categorize transactions.\",
    \"stream\": false
  }" 2>&1 | jq '.' || cat

echo ""
echo ""
echo "✅ Tests complete!"

