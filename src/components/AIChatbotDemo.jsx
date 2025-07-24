import React, { useState } from 'react';
import AIFinancialChatbot from './AIFinancialChatbot';

const AIChatbotDemo = () => {
    const [demoUser] = useState({
        id: 1,
        name: 'Demo User',
        tier: 'premium' // Set to 'free' to test freemium limits
    });

    const [demoTransactions] = useState([
        {
            id: 1,
            description: 'STARBUCKS COFFEE',
            amount: -5.50,
            date: '2024-01-15',
            category: 'Food & Dining',
            confidence: 0.99
        },
        {
            id: 2,
            description: 'UBER RIDE',
            amount: -25.00,
            date: '2024-01-15',
            category: 'Transportation',
            confidence: 0.95
        },
        {
            id: 3,
            description: 'AMAZON PURCHASE',
            amount: -45.99,
            date: '2024-01-15',
            category: 'Shopping',
            confidence: 0.70
        },
        {
            id: 4,
            description: 'SALARY DEPOSIT',
            amount: 2500.00,
            date: '2024-01-16',
            category: 'Income',
            confidence: 0.98
        },
        {
            id: 5,
            description: 'GROCERY STORE',
            amount: -78.45,
            date: '2024-01-16',
            category: 'Food & Dining',
            confidence: 0.95
        }
    ]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        🤖 AI Financial Coach Demo
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Experience your personal AI financial coach! Ask questions about spending, 
                        get personalized advice, and discover insights about your money patterns.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Chatbot */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            💬 Chat with AI Coach
                        </h2>
                        <AIFinancialChatbot 
                            user={demoUser}
                            userTransactions={demoTransactions}
                        />
                    </div>

                    {/* Demo Info */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                🎯 What You Can Ask
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-start space-x-3">
                                    <span className="text-purple-600 font-bold">💳</span>
                                    <div>
                                        <div className="font-medium">Analyze my spending</div>
                                        <div className="text-sm text-gray-600">"What's my biggest expense category?"</div>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <span className="text-green-600 font-bold">💰</span>
                                    <div>
                                        <div className="font-medium">Save money</div>
                                        <div className="text-sm text-gray-600">"How can I save more money?"</div>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <span className="text-blue-600 font-bold">📊</span>
                                    <div>
                                        <div className="font-medium">Get insights</div>
                                        <div className="text-sm text-gray-600">"What patterns do you see in my spending?"</div>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <span className="text-orange-600 font-bold">🎯</span>
                                    <div>
                                        <div className="font-medium">Financial advice</div>
                                        <div className="text-sm text-gray-600">"Help me create a budget"</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                📊 Demo Data
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Total Income:</span>
                                    <span className="font-semibold text-green-600">$2,500.00</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Total Spent:</span>
                                    <span className="font-semibold text-red-600">$154.94</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Net Change:</span>
                                    <span className="font-semibold text-blue-600">$2,345.06</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Top Category:</span>
                                    <span className="font-semibold">Food & Dining ($83.95)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Transactions:</span>
                                    <span className="font-semibold">5</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                🚀 Features
                            </h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li>✅ <strong>Personalized Responses</strong> - Based on your actual financial data</li>
                                <li>✅ <strong>Multiple Personalities</strong> - Encouraging, Analytical, Casual, Professional</li>
                                <li>✅ <strong>Smart Suggestions</strong> - Context-aware quick actions</li>
                                <li>✅ <strong>Freemium Limits</strong> - 50 free messages per day</li>
                                <li>✅ <strong>Real-time Analysis</strong> - Instant insights and advice</li>
                                <li>✅ <strong>Learning System</strong> - Improves with every conversation</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        🎯 How to Test
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6 text-sm">
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">1. Start a Conversation</h4>
                            <p className="text-gray-600">Try asking "What's my biggest expense category?" or "How can I save money?"</p>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">2. Try Different Personalities</h4>
                            <p className="text-gray-600">Switch between Encouraging, Analytical, Casual, and Professional modes</p>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">3. Use Quick Actions</h4>
                            <p className="text-gray-600">Click the suggestion buttons for instant responses</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIChatbotDemo; 