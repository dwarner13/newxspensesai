import React, { useState, useEffect, useRef } from 'react';
import { AIService } from '../services/AIService';

const AIFinancialChatbot = ({ user, userTransactions = [] }) => {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [chatPersonality, setChatPersonality] = useState('encouraging');
    const [conversationContext, setConversationContext] = useState([]);
    const messagesEndRef = useRef(null);

    // Initial AI greeting based on user data
    useEffect(() => {
        const initializeChat = async () => {
            const welcomeMessage = await generateWelcomeMessage();
            setMessages([{
                id: 1,
                type: 'ai',
                content: welcomeMessage,
                timestamp: new Date(),
                personality: 'welcoming'
            }]);
        };
        
        initializeChat();
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const generateWelcomeMessage = async () => {
        const hasTransactions = userTransactions.length > 0;
        const recentUpload = hasTransactions ? "I see you just uploaded a statement!" : "";
        
        const welcomeMessages = [
            `🤖 Hey there! I'm your AI Financial Coach. ${recentUpload} I'm here to help you understand your money patterns and make smarter financial decisions. What would you like to explore?`,
            
            `💰 Welcome! I've analyzed thousands of financial patterns and I'm excited to help with yours. ${recentUpload} Ask me anything about your spending, savings, or financial goals!`,
            
            `🎯 Hi! I'm your personal AI money expert. ${recentUpload} I can help you discover insights, optimize spending, and answer any financial questions. What's on your mind?`
        ];
        
        return welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        // Check freemium limits
        if (!canSendMessage()) {
            showUpgradePrompt();
            return;
        }

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputMessage,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsTyping(true);

        try {
            // Generate AI response based on user's financial data
            const aiResponse = await generateAIResponse(inputMessage);
            
            const aiMessage = {
                id: Date.now() + 1,
                type: 'ai',
                content: aiResponse.content,
                timestamp: new Date(),
                personality: aiResponse.personality,
                suggestions: aiResponse.suggestions
            };

            setMessages(prev => [...prev, aiMessage]);
            
            // Update conversation context for better responses
            setConversationContext(prev => [...prev, {
                user: inputMessage,
                ai: aiResponse.content,
                timestamp: new Date()
            }]);

        } catch (error) {
            console.error('AI response error:', error);
            const errorMessage = {
                id: Date.now() + 1,
                type: 'ai',
                content: "Sorry, I'm having trouble right now. Please try again in a moment! 🤖",
                timestamp: new Date(),
                personality: 'apologetic'
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const generateAIResponse = async (userInput) => {
        // Analyze user's financial data for context
        const financialContext = analyzeUserFinancialContext();
        
        const prompt = `
        You are an AI Financial Coach chatbot for XspensesAI. You're helpful, encouraging, and insightful.

        USER'S FINANCIAL CONTEXT:
        ${JSON.stringify(financialContext, null, 2)}

        CONVERSATION HISTORY:
        ${conversationContext.slice(-3).map(c => `User: ${c.user}\nAI: ${c.ai}`).join('\n')}

        USER JUST ASKED: "${userInput}"

        Respond as a helpful financial coach. Include:
        1. Direct answer to their question
        2. Specific insights from their data when relevant
        3. Actionable advice
        4. Encouraging tone

        Keep responses under 150 words. Use emojis appropriately.
        
        If they ask about spending patterns, reference their actual data.
        If they ask for advice, give personalized suggestions.
        If they seem stressed about money, be supportive.
        `;

        try {
            const response = await fetch('http://127.0.0.1:5000/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt,
                    user_context: financialContext,
                    personality: chatPersonality
                })
            });

            if (!response.ok) {
                throw new Error('AI service unavailable');
            }

            const result = await response.json();
            
            return {
                content: result.response,
                personality: result.detected_mood || 'helpful',
                suggestions: result.suggestions || []
            };
            
        } catch (error) {
            // Fallback responses if API fails
            return generateFallbackResponse(userInput);
        }
    };

    const analyzeUserFinancialContext = () => {
        if (!userTransactions.length) {
            return { status: 'no_data', message: 'No transaction data available yet' };
        }

        const totalSpent = userTransactions
            .filter(t => t.amount < 0)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
        const totalIncome = userTransactions
            .filter(t => t.amount > 0)
            .reduce((sum, t) => sum + t.amount, 0);

        const categories = userTransactions.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
            return acc;
        }, {});

        const topCategory = Object.entries(categories)
            .sort(([,a], [,b]) => b - a)[0];

        return {
            total_spent: totalSpent,
            total_income: totalIncome,
            net_change: totalIncome - totalSpent,
            top_category: topCategory ? topCategory[0] : 'Unknown',
            top_category_amount: topCategory ? topCategory[1] : 0,
            transaction_count: userTransactions.length,
            categories: categories
        };
    };

    const generateFallbackResponse = (userInput) => {
        const fallbacks = [
            {
                keywords: ['spend', 'spending', 'money'],
                response: "I'd love to analyze your spending patterns! Upload a bank statement and I can give you personalized insights about where your money goes. 💳"
            },
            {
                keywords: ['save', 'saving', 'savings'],
                response: "Saving money is all about understanding your patterns first. Once you upload your transactions, I can help you find opportunities to save without sacrificing what you love! 💰"
            },
            {
                keywords: ['budget', 'budgeting'],
                response: "Budgeting doesn't have to be restrictive! I believe in conscious spending. Let me analyze your transactions and we'll create a budget that actually works for your lifestyle. 📊"
            },
            {
                keywords: ['help', 'how'],
                response: "I'm here to help! I can analyze your spending patterns, suggest ways to save money, answer questions about your transactions, and help you make smarter financial decisions. What would you like to explore? 🤖"
            }
        ];

        const matchedFallback = fallbacks.find(f => 
            f.keywords.some(keyword => userInput.toLowerCase().includes(keyword))
        );

        return {
            content: matchedFallback?.response || "That's a great question! I'm constantly learning. For now, try asking me about your spending patterns, savings goals, or upload a statement for personalized insights! 💡",
            personality: 'helpful',
            suggestions: ['Analyze my spending', 'Help me save money', 'Upload bank statement']
        };
    };

    const canSendMessage = () => {
        if (user?.tier === 'premium') return true;
        
        const todayMessages = messages.filter(m => 
            m.type === 'user' && 
            new Date(m.timestamp).toDateString() === new Date().toDateString()
        ).length;
        
        return todayMessages < 50; // Free tier limit
    };

    const showUpgradePrompt = () => {
        const upgradeMessage = {
            id: Date.now(),
            type: 'upgrade',
            content: "🚀 You've reached your daily chat limit! Upgrade to Premium for unlimited AI conversations and advanced financial insights.",
            timestamp: new Date(),
            ctaText: "Upgrade to Premium",
            ctaAction: () => window.location.href = '/upgrade'
        };
        
        setMessages(prev => [...prev, upgradeMessage]);
    };

    const handleSuggestionClick = (suggestion) => {
        setInputMessage(suggestion);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Chatbot Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="text-2xl">🤖</div>
                        <div>
                            <h3 className="font-semibold">AI Financial Coach</h3>
                            <span className="text-sm text-purple-100">
                                {isTyping ? 'Analyzing your data...' : 'Ready to help'}
                            </span>
                        </div>
                    </div>
                    <select 
                        value={chatPersonality} 
                        onChange={(e) => setChatPersonality(e.target.value)}
                        className="bg-white/20 text-white border border-white/30 rounded px-3 py-1 text-sm"
                    >
                        <option value="encouraging">🎉 Encouraging</option>
                        <option value="analytical">📊 Analytical</option>
                        <option value="casual">😎 Casual</option>
                        <option value="professional">💼 Professional</option>
                    </select>
                </div>
            </div>

            {/* Messages Container */}
            <div className="h-96 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            {message.type === 'ai' && (
                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm">🤖</div>
                            )}
                            
                            <div className={`rounded-lg px-4 py-2 ${
                                message.type === 'user' 
                                    ? 'bg-purple-600 text-white' 
                                    : message.type === 'upgrade'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-900'
                            }`}>
                                <div className="text-sm">{message.content}</div>
                                
                                {message.suggestions && (
                                    <div className="mt-2 space-y-1">
                                        {message.suggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                className="block w-full text-left text-xs bg-white/20 rounded px-2 py-1 hover:bg-white/30 transition-colors"
                                                onClick={() => handleSuggestionClick(suggestion)}
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                {message.type === 'upgrade' && (
                                    <button 
                                        className="mt-2 w-full bg-yellow-500 text-white rounded px-3 py-1 text-sm font-medium hover:bg-yellow-600 transition-colors"
                                        onClick={message.ctaAction}
                                    >
                                        {message.ctaText}
                                    </button>
                                )}
                            </div>
                            
                            {message.type === 'user' && (
                                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm">👤</div>
                            )}
                        </div>
                    </div>
                ))}
                
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="flex items-start space-x-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm">🤖</div>
                            <div className="bg-gray-100 rounded-lg px-4 py-2">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-200 p-4">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 mb-3">
                    <button 
                        onClick={() => handleSuggestionClick("Analyze my spending patterns")}
                        className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 transition-colors"
                    >
                        💳 Analyze Spending
                    </button>
                    <button 
                        onClick={() => handleSuggestionClick("How can I save more money?")}
                        className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full hover:bg-green-200 transition-colors"
                    >
                        💰 Save Money
                    </button>
                    <button 
                        onClick={() => handleSuggestionClick("What's my biggest expense category?")}
                        className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors"
                    >
                        📊 Top Expenses
                    </button>
                </div>
                
                {/* Input Area */}
                <div className="flex space-x-2">
                    <textarea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask me anything about your finances..."
                        rows={1}
                        disabled={isTyping}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || isTyping}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isTyping ? '⏳' : '📤'}
                    </button>
                </div>
                
                {/* Usage Indicator */}
                {user?.tier === 'free' && (
                    <div className="text-xs text-gray-500 mt-2 text-center">
                        💬 {50 - messages.filter(m => m.type === 'user').length} free messages remaining today
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIFinancialChatbot; 