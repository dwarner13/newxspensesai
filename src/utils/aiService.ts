import { generateContextualPrompt, getAIPersonality } from "./aiPersonalities";
import { userMemory, rememberConversation, getPersonalizedContext } from "./userMemory";

// Note: OpenAI calls are now handled via Netlify functions

export interface AIResponse {
  message: string;
  personality: string;
  suggestions?: string[];
  followUpQuestions?: string[];
  confidence: number;
}

export interface AIContext {
  section: string;
  userData?: any;
  additionalContext?: string;
  conversationHistory?: Array<{ role: 'user' | 'ai'; content: string }>;
}

// Main AI service function
export const getAIResponse = async (
  userMessage: string,
  context: AIContext
): Promise<AIResponse> => {
  try {
    const personality = getAIPersonality(context.section);
    
          // Get personalized user context
      const personalizedContext = getPersonalizedContext(context.section);
      
      // Generate the contextual prompt with personalization
      const systemPrompt = generateContextualPrompt(
        context.section,
        context.userData,
        context.additionalContext + '\n' + personalizedContext
      );

    // Build conversation messages
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(context.conversationHistory || []),
      { role: 'user' as const, content: userMessage }
    ];

    // Get AI response via Netlify function
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: context.userId || 'default-user',
        employeeSlug: 'general-assistant',
        message: userMessage,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Chat function failed: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.content || "I'm sorry, I couldn't process that request.";

    // Generate follow-up questions based on the AI's response
    const followUpQuestions = generateFollowUpQuestions(context.section, userMessage, aiMessage);

    // Generate suggestions based on the section
    const suggestions = generateSuggestions(context.section, context.userData);

    // Remember this conversation for future personalization
    rememberConversation(
      context.section,
      userMessage,
      aiMessage,
      context.additionalContext || ''
    );

    return {
      message: aiMessage,
      personality: personality.name,
      suggestions,
      followUpQuestions,
      confidence: 0.95 // High confidence for structured responses
    };

  } catch (error) {
    console.error('AI Service Error:', error);
    
    // Fallback response
    const personality = getAIPersonality(context.section);
    return {
      message: `I'm having trouble connecting right now, but I'm here to help! As your ${personality.role}, I want to make sure you get the support you need. Can you try asking your question again?`,
      personality: personality.name,
      confidence: 0.5
    };
  }
};

// Generate intelligent follow-up questions
const generateFollowUpQuestions = (
  section: string, 
  userMessage: string, 
  aiResponse: string
): string[] => {
  const questions = [];
  
  switch (section) {
    case 'analytics':
      questions.push(
        "What aspect of this data are you most curious about?",
        "How does this compare to your expectations?",
        "What would you like to improve or optimize?"
      );
      break;
      
    case 'smartImport':
      questions.push(
        "How can I help you improve your document processing?",
        "Are you experiencing any specific issues with uploads?",
        "What types of documents do you process most often?"
      );
      break;
      
    case 'therapist':
      questions.push(
        "How are you feeling about your financial situation today?",
        "What's been your biggest financial win recently?",
        "What would help you feel more confident about money?"
      );
      break;
      
    case 'goals':
      questions.push(
        "What's your biggest financial dream right now?",
        "What's one small step you could take today?",
        "How can I help you stay motivated?"
      );
      break;
  }
  
  return questions.slice(0, 2); // Return top 2 questions
};

// Generate contextual suggestions
const generateSuggestions = (section: string, userData?: any): string[] => {
  const suggestions = [];
  
  if (!userData) {
    suggestions.push("Upload some documents to get started!");
    return suggestions;
  }
  
  switch (section) {
    case 'analytics':
      if (userData.totalAmount > 10000) {
        suggestions.push("Consider setting up automated expense tracking");
        suggestions.push("Review your top spending categories for optimization");
      }
      break;
      
    case 'smartImport':
      if (userData.documents?.length > 5) {
        suggestions.push("Try batch uploading for efficiency");
        suggestions.push("Review categorization accuracy");
      }
      break;
      
    case 'therapist':
      suggestions.push("Take a moment to celebrate your progress");
      suggestions.push("Remember that financial growth is a journey");
      break;
      
    case 'goals':
      if (userData.goals?.length > 0) {
        suggestions.push("Review your progress on current goals");
        suggestions.push("Consider setting a new milestone");
      }
      break;
  }
  
  return suggestions.slice(0, 2); // Return top 2 suggestions
};

// Specialized functions for different sections
export const getAnalyticsInsight = async (userData: any, question: string) => {
  return getAIResponse(question, {
    section: 'analytics',
    userData,
    additionalContext: 'Focus on financial data analysis and insights'
  });
};

export const getSmartImportHelp = async (userData: any, question: string) => {
  return getAIResponse(question, {
    section: 'smartImport',
    userData,
    additionalContext: 'Focus on document processing and categorization help'
  });
};

export const getFinancialTherapy = async (userData: any, question: string) => {
  return getAIResponse(question, {
    section: 'therapist',
    userData,
    additionalContext: 'Focus on emotional support and financial wellness'
  });
};

export const getGoalGuidance = async (userData: any, question: string) => {
  return getAIResponse(question, {
    section: 'goals',
    userData,
    additionalContext: 'Focus on goal setting and achievement strategies'
  });
};
