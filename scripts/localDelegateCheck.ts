#!/usr/bin/env tsx
/**
 * Local Delegation Check
 * ======================
 * Quick test script to verify Prime delegation works
 */

const CHAT_ENDPOINT = process.env.CHAT_ENDPOINT || 'http://localhost:8888/.netlify/functions/chat';
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-delegation-user';

interface SSEEvent {
  type: string;
  content?: string;
  session_id?: string;
  tool?: any;
  [key: string]: any;
}

async function testDelegation() {
  console.log('🧪 Prime Delegation Local Check\n');
  console.log(`Endpoint: ${CHAT_ENDPOINT}`);
  console.log(`User ID: ${TEST_USER_ID}\n`);

  const message = 'Prime, ask Tag (tag-ai) to say "ready" and return it.';
  console.log(`📤 Sending: "${message}"\n`);

  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        employeeSlug: 'prime-boss',
        message,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('📥 Streaming response:\n');

    // Parse SSE stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';
    let sessionId = '';
    const toolCalls: any[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));

            switch (event.type) {
              case 'start':
                sessionId = event.session_id || '';
                console.log(`✓ Session: ${sessionId.substring(0, 8)}...`);
                break;

              case 'text':
                process.stdout.write(event.content || '');
                fullResponse += event.content || '';
                break;

              case 'tool_call':
                toolCalls.push(event.tool);
                console.log(`\n\n🔧 Tool Call: ${event.tool?.name || 'unknown'}`);
                console.log(`   Target: ${event.tool?.args?.targetEmployee || 'unknown'}`);
                break;

              case 'tool_result':
                console.log(`\n✓ Tool Result: ${event.result?.substring(0, 50) || 'completed'}...`);
                break;

              case 'done':
                console.log(`\n\n✓ Done (${event.total_tokens || 0} tokens)`);
                break;

              case 'error':
                console.error(`\n❌ Error: ${event.error}`);
                break;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    // Summary
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Session ID: ${sessionId}`);
    console.log(`Tool Calls: ${toolCalls.length}`);
    console.log(`Full Response Length: ${fullResponse.length} chars`);
    
    if (toolCalls.length > 0) {
      console.log('\n🔧 Tools Used:');
      toolCalls.forEach((tool, i) => {
        console.log(`   ${i + 1}. ${tool.name} → ${tool.args?.targetEmployee || '?'}`);
      });
    }

    if (fullResponse.toLowerCase().includes('ready')) {
      console.log('\n✅ SUCCESS: Response contains "ready"');
      process.exit(0);
    } else {
      console.log('\n⚠️  WARNING: Response does not contain "ready"');
      console.log(`Response: "${fullResponse.substring(0, 100)}..."`);
      process.exit(1);
    }
  } catch (error) {
    const err = error as Error;
    console.error('\n❌ ERROR:', err.message);
    process.exit(1);
  }
}

// Run
testDelegation();

