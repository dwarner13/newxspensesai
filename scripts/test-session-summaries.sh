#!/bin/bash
# Test script for Day 5 Session Summaries
# Drives a 12+ turn conversation and checks headers

USER_ID="test-user-$(date +%s)"
SESSION_ID="test-session-$(date +%s)"
CHAT_URL="http://localhost:8888/.netlify/functions/chat"

echo "=== Day 5 Session Summaries Test ==="
echo "User ID: $USER_ID"
echo "Session ID: $SESSION_ID"
echo ""

# Test messages (12+ turns)
MESSAGES=(
  "Hi, I'm testing session summaries."
  "My name is John and I work at Acme Corp."
  "I need help categorizing my expenses."
  "I spent $50 at Starbucks yesterday."
  "Also bought groceries at Save-On-Foods for $120."
  "My email is john@example.com for receipts."
  "Can you help me set up a budget?"
  "I want to track monthly spending."
  "My weekly income is $2000."
  "I also have a side business."
  "Monthly rent is $1500."
  "I need to track tax deductions."
  "What's my spending trend?"
  "Show me a summary of our conversation."
)

echo "Sending ${#MESSAGES[@]} messages..."
echo ""

TURN=1
for MSG in "${MESSAGES[@]}"; do
  echo "--- Turn $TURN ---"
  echo "Message: $MSG"
  
  RESPONSE=$(curl -s -X POST "$CHAT_URL" \
    -H "Content-Type: application/json" \
    -d "{\"userId\":\"$USER_ID\",\"message\":\"$MSG\",\"sessionId\":\"$SESSION_ID\"}" \
    -i)
  
  # Extract headers
  X_SESSION_SUMMARY=$(echo "$RESPONSE" | grep -i "X-Session-Summary" | cut -d' ' -f2 | tr -d '\r')
  X_SESSION_SUMMARIZED=$(echo "$RESPONSE" | grep -i "X-Session-Summarized" | cut -d' ' -f2 | tr -d '\r')
  
  echo "X-Session-Summary: $X_SESSION_SUMMARY"
  echo "X-Session-Summarized: $X_SESSION_SUMMARIZED"
  echo ""
  
  # Check if summary was written (turn 12+)
  if [ "$TURN" -ge 12 ] && [ "$X_SESSION_SUMMARIZED" = "yes" ]; then
    echo "✅ Summary generated on turn $TURN!"
  fi
  
  # Check if summary is present (after first write)
  if [ "$X_SESSION_SUMMARY" = "present" ]; then
    echo "✅ Summary present in context!"
  fi
  
  TURN=$((TURN + 1))
  sleep 1  # Rate limiting
done

echo ""
echo "=== Test Complete ==="
echo "Check database for summary:"
echo "SELECT * FROM chat_convo_summaries WHERE user_id = '$USER_ID' AND convo_id = '$SESSION_ID';"

