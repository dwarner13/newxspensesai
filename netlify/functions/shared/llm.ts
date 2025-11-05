/**
 * LLM - Agent execution with tool support
 */

interface RunAgentParams {
  agent: string;
  message: string;
  convoId: string;
  tools: Record<string, (...args: any[]) => Promise<any>>;
}

/**
 * Run agent with tools
 * If message contains a URL, calls tools['url.fetch']()
 * Returns a fake summary string
 */
export async function runAgent(params: RunAgentParams): Promise<string> {
  const { message, tools } = params;
  
  // Check if message contains a URL
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const urls = message.match(urlPattern);
  
  if (urls && urls.length > 0 && tools['url.fetch']) {
    // Fetch the first URL found
    try {
      const url = urls[0];
      const fetchResult = await tools['url.fetch'](url);
      
      // Return a summary that includes the fetch result
      return `I found a URL in your message: ${url}. Fetch result: ${JSON.stringify(fetchResult)}. This is a placeholder response from the ${params.agent} agent.`;
    } catch (error) {
      return `I found a URL but encountered an error fetching it. This is a placeholder response from the ${params.agent} agent.`;
    }
  }
  
  // Return fake summary string if no URL
  return `This is a placeholder response from the ${params.agent} agent processing: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`;
}

