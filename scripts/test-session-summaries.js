/**
 * Test script for Day 5 Session Summaries
 * Drives a 12+ turn conversation and checks headers
 */

const CHAT_URL = 'http://localhost:8888/.netlify/functions/chat';
const USER_ID = `test-user-${Date.now()}`;
const SESSION_ID = `test-session-${Date.now()}`;

const messages = [
  "Hi, I'm testing session summaries.",
  "My name is John and I work at Acme Corp.",
  "I need help categorizing my expenses.",
  "I spent $50 at Starbucks yesterday.",
  "Also bought groceries at Save-On-Foods for $120.",
  "My email is john@example.com for receipts.",
  "Can you help me set up a budget?",
  "I want to track monthly spending.",
  "My weekly income is $2000.",
  "I also have a side business.",
  "Monthly rent is $1500.",
  "I need to track tax deductions.",
  "What's my spending trend?",
  "Show me a summary of our conversation."
];

async function testSessionSummaries() {
  console.log('=== Day 5 Session Summaries Test ===');
  console.log(`User ID: ${USER_ID}`);
  console.log(`Session ID: ${SESSION_ID}`);
  console.log(`\nSending ${messages.length} messages...\n`);

  let turn = 1;
  let summaryPresent = false;
  let summaryWritten = false;

  for (const msg of messages) {
    console.log(`--- Turn ${turn} ---`);
    console.log(`Message: ${msg}`);

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: USER_ID,
          message: msg,
          sessionId: SESSION_ID
        })
      });

      const xSessionSummary = response.headers.get('X-Session-Summary');
      const xSessionSummarized = response.headers.get('X-Session-Summarized');

      console.log(`X-Session-Summary: ${xSessionSummary}`);
      console.log(`X-Session-Summarized: ${xSessionSummarized}`);

      if (xSessionSummary === 'present') {
        summaryPresent = true;
        console.log('✅ Summary present in context!');
      }

      if (xSessionSummarized === 'yes') {
        summaryWritten = true;
        console.log(`✅ Summary generated on turn ${turn}!`);
      }

      // Parse response body (for debugging)
      const data = await response.json().catch(() => ({}));
      if (data.reply) {
        console.log(`Reply preview: ${data.reply.substring(0, 50)}...`);
      }
    } catch (error) {
      console.error(`Error on turn ${turn}:`, error.message);
    }

    console.log('');
    turn++;
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('=== Test Complete ===');
  console.log(`Summary present: ${summaryPresent}`);
  console.log(`Summary written: ${summaryWritten}`);
  console.log(`\nCheck database for summary:`);
  console.log(`SELECT * FROM chat_convo_summaries WHERE user_id = '${USER_ID}' AND convo_id = '${SESSION_ID}';`);
}

testSessionSummaries().catch(console.error);



















