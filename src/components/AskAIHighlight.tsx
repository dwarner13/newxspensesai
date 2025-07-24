import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X, Zap, Crown } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useAdminAccess } from "../hooks/useAdminAccess";
import toast from "react-hot-toast";
import { useNavigate } from 'react-router-dom';

interface AskAIHighlightProps {
  className?: string;
}

const AskAIHighlight = ({ className = "" }: AskAIHighlightProps) => {
  const { user } = useAuth();
  const { hasAccess } = useAdminAccess();
  const [highlightedText, setHighlightedText] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [aiResponse, setAiResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleTextSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 1) {
        const range = selection?.getRangeAt(0);
        const rect = range?.getBoundingClientRect();
        
        if (rect) {
          setHighlightedText(text);
          setPosition({
            top: rect.bottom + window.scrollY + 10,
            left: Math.min(rect.left + window.scrollX, window.innerWidth - 200)
          });
          setShowTooltip(true);
        }
      } else {
        setShowTooltip(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current && 
        !tooltipRef.current.contains(e.target as Node) &&
        responseRef.current &&
        !responseRef.current.contains(e.target as Node)
      ) {
        setShowTooltip(false);
        setAiResponse("");
      }
    };

    document.addEventListener("mouseup", handleTextSelection);
    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("mouseup", handleTextSelection);
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const askAI = async () => {
    if (!highlightedText) return;
    
    setLoading(true);
    setShowTooltip(false);

    // Check if user has premium access
    if (!hasAccess('premium')) {
      setAiResponse("🔒 Upgrade to Premium to access AI-powered insights about your financial data!");
      setLoading(false);
      return;
    }

    try {
      const openAIKey = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!openAIKey) {
        throw new Error('OpenAI API key not configured');
      }

      const prompt = `You are a financial AI assistant analyzing highlighted text from a user's transaction data: "${highlightedText}"

Respond with:
1. What this likely refers to (e.g., vendor, category, description)
2. Which category it most likely fits under (Food, Travel, Office, Utilities, Shopping, Healthcare, Entertainment, Transportation, Other)
3. One tip or insight based on it

Be concise, helpful, and specific to the highlighted text. Format your response in 3 short paragraphs.`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAIKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 150,
        }),
      });

      if (!response.ok) {
        throw new Error('AI service temporarily unavailable');
      }

      const data = await response.json();
      const aiReply = data.choices?.[0]?.message?.content || "No insights available for this text.";
      
      setAiResponse(aiReply);
      
      // Award XP for using the feature
      if (user?.id) {
        await supabase
          .from('xp_activities')
          .insert({
            user_id: user.id,
            activity_type: 'ai_highlight',
            xp_earned: 1,
            description: 'Used AI highlight feature'
          });
      }

    } catch (error) {
      console.error('AI request error:', error);
      setAiResponse("AI insights are temporarily unavailable. Please try again later.");
      toast.error("AI service temporarily unavailable");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  return (
    <div className={className}>
      {/* Selection Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            style={{ 
              position: 'absolute',
              top: position.top, 
              left: position.left,
              zIndex: 1000
            }}
            className="bg-white border border-gray-200 shadow-lg rounded-lg px-4 py-3 cursor-pointer hover:bg-primary-50 transition-colors max-w-xs"
            onClick={askAI}
          >
            <div className="flex items-center space-x-2">
              {!hasAccess('premium') ? (
                <>
                  <Crown size={16} className="text-yellow-600" />
                  <span className="text-sm font-medium text-gray-700">
                    💬 Ask AI (Premium)
                  </span>
                </>
              ) : (
                <>
                  <Brain size={16} className="text-primary-600" />
                  <span className="text-sm font-medium text-gray-700">
                    💬 Ask AI about this
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {!hasAccess('premium') 
                ? 'Get AI insights about this selection'
                : 'Click for AI-powered insights'
              }
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Response Panel */}
      <AnimatePresence>
        {aiResponse && (
          <motion.div
            ref={responseRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-4 right-4 bg-white shadow-xl border border-gray-200 rounded-xl p-5 max-w-sm z-50"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                {!hasAccess('premium') ? (
                  <Crown size={18} className="text-yellow-600" />
                ) : (
                  <Brain size={18} className="text-primary-600" />
                )}
                <strong className="text-gray-900">
                  {!hasAccess('premium') ? 'Premium Feature' : 'AI Insight'}
                </strong>
              </div>
              <button 
                onClick={() => setAiResponse("")}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="text-sm text-gray-700 leading-relaxed mb-4">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                </div>
              ) : !hasAccess('premium') ? (
                <div className="space-y-3">
                  <p className="font-medium text-yellow-800">
                    🔒 Unlock AI-powered financial insights!
                  </p>
                  <p>
                    Get intelligent suggestions for categorization, spending patterns, 
                    and budget optimization based on your selected text.
                  </p>
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg border border-yellow-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <Zap size={14} className="text-yellow-600" />
                      <span className="text-xs font-medium text-yellow-800">Premium Features:</span>
                    </div>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li>• Smart transaction categorization</li>
                      <li>• Spending pattern analysis</li>
                      <li>• Budget optimization tips</li>
                      <li>• Duplicate detection</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">
                  <div className="bg-primary-50 p-3 rounded-lg mb-3">
                    <p className="text-xs text-primary-700 font-medium">You highlighted:</p>
                    <p className="text-sm text-primary-900 italic">"{highlightedText}"</p>
                  </div>
                  {aiResponse}
                </div>
              )}
            </div>

            {!hasAccess('premium') && (
              <button
                onClick={handleUpgrade}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-600 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Crown size={16} />
                <span>Upgrade to Premium</span>
              </button>
            )}

            {hasAccess('premium') && !loading && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Brain size={12} />
                  <span>Powered by AI</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Zap size={12} />
                  <span>+1 XP earned</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AskAIHighlight;
