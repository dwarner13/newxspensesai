/**
 * Agent Router - Routes messages to appropriate agents based on content
 */

export function pickAgent(message: string): 'Crystal' | 'Tag' | 'Prime' {
  const lowerMessage = message.toLowerCase();
  
  // Check for receipt/pdf/image keywords
  if (lowerMessage.includes('receipt') || 
      lowerMessage.includes('pdf') || 
      lowerMessage.includes('image')) {
    return 'Crystal';
  }
  
  // Check for category/tax/ledger keywords
  if (lowerMessage.includes('category') || 
      lowerMessage.includes('tax') || 
      lowerMessage.includes('ledger')) {
    return 'Tag';
  }
  
  // Default to Prime
  return 'Prime';
}


