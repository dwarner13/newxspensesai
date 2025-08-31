import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EMPLOYEES, findEmployeeByIntent } from '../data/aiEmployees';
import { chatWithBoss, ChatMessage } from '../lib/boss/openaiClient';

interface PrimeRouterProps {
  children: React.ReactNode;
}

export default function PrimeRouter({ children }: PrimeRouterProps) {
  const navigate = useNavigate();
  const [isPrimeActive, setIsPrimeActive] = useState(false);

  // Create system prompt for Prime
  const createSystemPrompt = () => {
    const employeeList = EMPLOYEES.map(e => 
      `${e.emoji} ${e.name}: ${e.short} (tags: ${e.tags.join(', ')})`
    ).join('\n');

    return `You are Prime, the Boss AI for XspensesAI. A user clicked a marketing CTA button. Your job is to understand their intent and route them to the right AI employee.

Available AI Employees:
${employeeList}

Instructions:
1. Analyze the user's likely intent based on the context
2. Match it to the most appropriate AI employee
3. Respond naturally and conversationally
4. If you find a good match, format your response as: "I'll connect you with [Employee Name] who specializes in [their expertise]. [Brief explanation]"
5. If no clear match, suggest the dashboard or ask for clarification
6. Be helpful, friendly, and professional

Always respond as Prime, the helpful AI boss.`;
  };

  // Intercept CTA clicks and route through Prime
  useEffect(() => {
    const handleCTAClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href) return;

      // Only intercept marketing CTAs (signup, dashboard, feature pages)
      const isMarketingCTA = href.includes('/signup') || 
                            href.includes('/dashboard') || 
                            href.includes('/features/') ||
                            href.includes('/ai-employees');

      if (!isMarketingCTA) return;

      // Prevent default navigation
      event.preventDefault();
      event.stopPropagation();

      // Determine user intent based on context
      let userIntent = 'I want to get started with XspensesAI';
      
      // Analyze button text and context
      const buttonText = link.textContent?.toLowerCase() || '';
      const parentText = link.parentElement?.textContent?.toLowerCase() || '';
      const pageContext = window.location.pathname;

      if (buttonText.includes('signup') || buttonText.includes('get started') || buttonText.includes('start free')) {
        userIntent = 'I want to create an account and get started with XspensesAI';
      } else if (buttonText.includes('dashboard') || buttonText.includes('login')) {
        userIntent = 'I want to access my dashboard';
      } else if (pageContext.includes('/features/')) {
        // Extract feature from URL
        const feature = pageContext.split('/').pop()?.replace(/-/g, ' ') || '';
        userIntent = `I'm interested in the ${feature} feature`;
      } else if (pageContext.includes('/ai-employees')) {
        userIntent = 'I want to learn more about the AI employees';
      }

      setIsPrimeActive(true);

      try {
        // Use AI to determine the best route
        const aiMessages: ChatMessage[] = [
          { role: 'system', content: createSystemPrompt() },
          { role: 'user', content: userIntent }
        ];

        const aiResponse = await chatWithBoss(aiMessages);
        
        // Extract employee name from AI response
        const employeeMatch = EMPLOYEES.find(e => 
          aiResponse.content.toLowerCase().includes(e.name.toLowerCase())
        );

        if (employeeMatch) {
          // Show Prime's response briefly, then navigate
          setTimeout(() => {
            navigate(employeeMatch.route);
            setIsPrimeActive(false);
          }, 1500);
        } else {
          // Fallback to original destination
          setTimeout(() => {
            navigate(href);
            setIsPrimeActive(false);
          }, 1000);
        }
      } catch (error) {
        console.error('Prime routing error, using fallback:', error);
        
        // Fallback to keyword matching
        const keywordMatch = findEmployeeByIntent(userIntent);
        
        if (keywordMatch) {
          setTimeout(() => {
            navigate(keywordMatch.route);
            setIsPrimeActive(false);
          }, 1000);
        } else {
          // Final fallback to original destination
          setTimeout(() => {
            navigate(href);
            setIsPrimeActive(false);
          }, 500);
        }
      }
    };

    // Add click listener to all links
    document.addEventListener('click', handleCTAClick, true);

    return () => {
      document.removeEventListener('click', handleCTAClick, true);
    };
  }, [navigate]);

  return (
    <>
      {children}
      
      {/* Prime Loading Overlay */}
      {isPrimeActive && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl max-w-md mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">⭐</div>
              <h3 className="text-xl font-bold text-white mb-2">Prime is Routing You</h3>
              <p className="text-white/80 mb-4">Let me find the perfect AI employee for you...</p>
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                <span className="text-cyan-400 text-sm">Analyzing your needs...</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
