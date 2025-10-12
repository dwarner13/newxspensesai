export async function sendChat({
  userId,
  message,
  employee,
  mock = false
}: {
  userId: string;
  message: string;
  employee?: string;
  mock?: boolean;
}) {
  // Try Netlify Functions first, fall back to mock if not available
  try {
    const res = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, message, employee, mock })
    });
    
    if (res.ok) {
      return (await res.json()) as { text: string; employee: string };
    }
  } catch (error) {
    console.log("Netlify Functions not available, using mock responses");
  }

  // Fallback to mock responses
  const responses = {
    prime: "👑 Prime here! I'm your AI financial boss. How can I help you organize your finances today?",
    byte: "📄 Byte reporting for duty! I specialize in document processing and receipt scanning. What documents do you need help with?",
    tag: "🏷️ Tag here! I'm your categorization expert. Let me help you organize your expenses into proper categories.",
    crystal: "🔮 Crystal at your service! I analyze trends and make predictions. What insights do you need about your spending?",
    ledger: "📊 Ledger here! I can help with tax-related questions and financial planning. What tax guidance do you need?"
  };

  // Simple keyword-based routing
  const messageText = message.toLowerCase();
  let selectedEmployee = employee || 'prime';
  
  if (!employee) {
    if (messageText.includes('receipt') || messageText.includes('document') || messageText.includes('upload')) {
      selectedEmployee = 'byte';
    } else if (messageText.includes('categor') || messageText.includes('tag') || messageText.includes('expense')) {
      selectedEmployee = 'tag';
    } else if (messageText.includes('trend') || messageText.includes('predict') || messageText.includes('insight')) {
      selectedEmployee = 'crystal';
    } else if (messageText.includes('tax') || messageText.includes('deduction') || messageText.includes('planning')) {
      selectedEmployee = 'ledger';
    }
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const text = responses[selectedEmployee as keyof typeof responses];

  return { text, employee: selectedEmployee };
}

