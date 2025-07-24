import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, MessageCircle, TrendingUp, Zap, Shield, 
  PieChart, DollarSign, BarChart3, FileText, Camera,
  Send, Terminal, Play, Headphones, CreditCard, Target,
  Activity, ArrowRight, Sparkles, Brain, Star
} from 'lucide-react';

const XspensesAIDemoPage = () => {
  const [chatMessages, setChatMessages] = useState([
    { 
      type: 'system', 
      content: "🤖 XspensesAI Demo Terminal - Try asking about financial analysis!",
      time: '10:30 AM'
    },
    { 
      type: 'ai', 
      content: "Hi! I'm your AI Financial Advisor. Try uploading a document or asking me demo questions like:\n\n• 'Analyze my coffee spending'\n• 'Create a podcast about my finances'\n• 'Help me optimize my budget'",
      time: '10:30 AM'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState('upload');
  const chatEndRef = useRef(null);

  // Demo financial data for showcase
  const demoData = {
    monthlySpending: 3247.89,
    savingsRate: 23.4,
    creditScore: 738,
    categories: [
      { name: 'Dining', amount: 890, percentage: 27, color: '#8B5CF6', trend: '+15%' },
      { name: 'Transport', amount: 456, percentage: 14, color: '#06B6D4', trend: '-5%' },
      { name: 'Shopping', amount: 723, percentage: 22, color: '#10B981', trend: '+8%' },
      { name: 'Bills', amount: 1178, percentage: 37, color: '#F59E0B', trend: '+2%' }
    ]
  };

  const demoQuestions = [
    "Analyze my coffee spending patterns",
    "Create a podcast about my November finances", 
    "Help me optimize my weekend spending",
    "What's my debt payoff timeline?",
    "Generate insights from my bank statement",
    "How can I improve my credit score?"
  ];

  const demoResponses = {
    "coffee": "☕ **Coffee Spending Analysis:**\n\nYour coffee expenses: $127/month\n• Peak times: Monday mornings (stress correlation)\n• Starbucks: 67% of purchases\n• Weekend spending: 40% higher\n\n💡 **AI Suggestion:** Switch to subscription model - could save $34/month!",
    
    "podcast": "🎧 **Generating Your Personal Podcast...**\n\n*'Your Money Story - November Edition'*\n\n🎙️ \"This month Sarah made incredible progress... her savings rate jumped to 23.4%, putting her ahead of 78% of similar users. But here's what's really fascinating - her coffee spending patterns reveal interesting stress-management opportunities...\"\n\n▶️ [Play 12-minute episode]",
    
    "weekend": "📊 **Weekend Spending Analysis:**\n\nWeekend pattern detected:\n• Fridays: +127% spending spike\n• Saturdays: Entertainment heavy ($89 avg)\n• Sundays: Preparation spending\n\n🎯 **Optimization Strategy:**\n1. Set Friday evening limit: $50\n2. Plan Saturday activities in advance\n3. Batch Sunday prep purchases",
    
    "debt": "💳 **Debt Payoff Timeline:**\n\nCurrent debt: $23,500\n• Credit cards: $8,500 (24.99% APR)\n• Car loan: $15,000 (6.5% APR)\n\n📈 **AI Strategy:**\nAvalanche method: Pay minimums + $200 extra to highest rate\n**Debt-free date: August 2027**\n**Interest saved: $3,247**",
    
    "bank": "🏦 **Bank Statement Insights:**\n\n✅ Processed 47 transactions\n✅ Categorized with 94% confidence\n✅ Found 3 optimization opportunities\n\n**Key Findings:**\n• Subscription audit needed: $67 unused services\n• Timing opportunity: Bills due on paydays\n• Cash flow: $847 available for goals",
    
    "credit": "📈 **Credit Score Optimization:**\n\nCurrent score: 738 (Good)\nTarget: 780+ (Excellent)\n\n**Action Plan:**\n1. Reduce utilization to <10% (+23 points)\n2. Increase credit limits (+8 points) \n3. Keep old accounts open (+5 points)\n\n🎯 **Timeline:** 780+ score by March 2025"
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const sendMessage = () => {
    if (!chatInput.trim()) return;

    setChatMessages(prev => [...prev, {
      type: 'user',
      content: chatInput,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }]);

    setIsTyping(true);

    setTimeout(() => {
      // AI response logic based on input
      let response = "🤖 That's a great question! In the full XspensesAI platform, I'd analyze your actual financial data to provide personalized insights. Try one of the demo questions to see examples of my capabilities!";

      // Check for keywords in user input
      const input = chatInput.toLowerCase();
      if (input.includes('coffee')) response = demoResponses.coffee;
      else if (input.includes('podcast')) response = demoResponses.podcast;
      else if (input.includes('weekend')) response = demoResponses.weekend;
      else if (input.includes('debt')) response = demoResponses.debt;
      else if (input.includes('bank') || input.includes('statement')) response = demoResponses.bank;
      else if (input.includes('credit')) response = demoResponses.credit;

      setChatMessages(prev => [...prev, {
        type: 'ai',
        content: response,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }]);

      setIsTyping(false);
    }, 1500);

    setChatInput('');
  };

  const handleDemoQuestion = (question) => {
    setChatInput(question);
  };

  const simulateFileUpload = () => {
    setChatMessages(prev => [...prev, {
      type: 'system',
      content: "📄 Demo file uploaded: November_Bank_Statement.pdf",
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }]);

    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        type: 'ai',
        content: demoResponses.bank,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }]);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <Brain className="w-8 h-8" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
              AI Demo
            </h1>
            <p className="text-xl text-purple-200 mb-6">
              Experience AI-powered financial intelligence
            </p>
            <p className="text-purple-300 max-w-4xl mx-auto leading-relaxed">
              Experience the power of AI-powered expense categorization and financial insights. 
              Try our interactive demo to see how XspensesAI transforms your financial data into actionable intelligence.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
          <button
            onClick={simulateFileUpload}
            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            Generate My First Episode
          </button>
          <button className="border border-purple-600 text-purple-600 hover:bg-purple-50 px-8 py-4 rounded-xl font-bold text-lg transition-all">
            Hear Sample Episodes
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Demo Features */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Demo Showcase */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Sparkles className="w-6 h-6 mr-3 text-purple-600" />
                Interactive Demo Features
              </h3>

              {/* Demo Tabs */}
              <div className="flex space-x-2 mb-8">
                <button
                  onClick={() => setSelectedDemo('upload')}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    selectedDemo === 'upload' 
                      ? 'bg-purple-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Smart Upload
                </button>
                <button
                  onClick={() => setSelectedDemo('analysis')}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    selectedDemo === 'analysis' 
                      ? 'bg-purple-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  AI Analysis
                </button>
                <button
                  onClick={() => setSelectedDemo('insights')}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    selectedDemo === 'insights' 
                      ? 'bg-purple-600 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Insights
                </button>
              </div>

              {/* Demo Content */}
              {selectedDemo === 'upload' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={simulateFileUpload}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white p-6 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                    >
                      <Upload className="w-8 h-8 mx-auto mb-3" />
                      <div className="font-bold text-lg">Try Demo Upload</div>
                      <div className="text-sm opacity-90">Sample Bank Statement</div>
                    </button>

                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-xl shadow-lg">
                      <Camera className="w-8 h-8 mx-auto mb-3" />
                      <div className="font-bold text-lg">Receipt Scanner</div>
                      <div className="text-sm opacity-90">Camera Magic</div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-bold text-green-800 mb-2 flex items-center">
                      <Shield className="w-5 h-5 mr-2" />
                      Privacy Promise
                    </h4>
                    <p className="text-sm text-green-700">
                      Your documents are analyzed instantly and permanently deleted within seconds. 
                      Zero data storage, maximum intelligence.
                    </p>
                  </div>
                </div>
              )}

              {selectedDemo === 'analysis' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {demoData.categories.map((category, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            ></div>
                            <span className="font-medium text-gray-900">{category.name}</span>
                          </div>
                          <span className={`text-sm font-medium ${category.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                            {category.trend}
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">${category.amount}</div>
                        <div className="text-sm text-gray-600">{category.percentage}% of spending</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-bold text-blue-800 mb-2">🤖 AI Detection</h4>
                    <p className="text-sm text-blue-700">
                      AI automatically categorizes transactions with 94% accuracy and identifies 
                      spending patterns, anomalies, and optimization opportunities.
                    </p>
                  </div>
                </div>
              )}

              {selectedDemo === 'insights' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                      <Target className="w-8 h-8 mx-auto mb-2 text-green-600" />
                      <div className="text-2xl font-bold text-green-600">{demoData.savingsRate}%</div>
                      <div className="text-sm text-green-700 font-medium">Savings Rate</div>
                    </div>
                    
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 text-center">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                      <div className="text-2xl font-bold text-purple-600">{demoData.creditScore}</div>
                      <div className="text-sm text-purple-700 font-medium">Credit Score</div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                      <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <div className="text-2xl font-bold text-blue-600">+12.5%</div>
                      <div className="text-sm text-blue-700 font-medium">Monthly Growth</div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-bold text-yellow-800 mb-2">💡 AI Insights</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Your weekend spending is 40% higher than weekdays</li>
                      <li>• Coffee purchases correlate with email volume (stress spending)</li>
                      <li>• You're on track to save $150 more this month vs last month</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Demo Questions */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-cyan-600" />
                Try These Demo Questions
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {demoQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleDemoQuestion(question)}
                    className="text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-purple-300 rounded-lg p-4 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">{question}</span>
                      <ArrowRight className="w-4 h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Premium AI Chat */}
          <div className="bg-white rounded-2xl border border-gray-200 flex flex-col h-[600px] shadow-lg">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold">AI Financial Advisor</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-white/80 text-sm">Online • Demo Mode</span>
                  </div>
                </div>
                <div className="text-white/60">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((message, index) => (
                <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.type !== 'user' && (
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-3 mt-1 flex-shrink-0">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${
                    message.type === 'user' 
                      ? 'bg-purple-600 text-white' 
                      : message.type === 'system'
                      ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                      : 'bg-gray-50 border border-gray-200 text-gray-800'
                  } rounded-2xl px-4 py-3 shadow-sm`}>
                    {message.type === 'system' && (
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                        <span className="text-xs font-medium uppercase tracking-wide">System</span>
                      </div>
                    )}
                    
                    <div className={`${message.type === 'ai' ? 'whitespace-pre-line' : ''} leading-relaxed`}>
                      {message.content}
                    </div>
                    
                    <div className={`text-xs mt-2 ${
                      message.type === 'user' 
                        ? 'text-purple-200' 
                        : 'text-gray-500'
                    }`}>
                      {message.time}
                    </div>
                  </div>

                  {message.type === 'user' && (
                    <div className="w-8 h-8 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full flex items-center justify-center ml-3 mt-1 flex-shrink-0">
                      <span className="text-white text-sm font-bold">U</span>
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mr-3 mt-1">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 max-w-[80%]">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                      <span className="text-gray-600 text-sm">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center space-x-3 bg-gray-50 rounded-xl p-3 border border-gray-200 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask me anything about your finances..."
                  className="flex-1 bg-transparent border-0 text-gray-700 placeholder-gray-500 focus:outline-none"
                />
                <button
                  onClick={sendMessage}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-2 rounded-lg transition-all transform hover:scale-105 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-center justify-center mt-3 space-x-4 text-xs text-gray-400">
                <div className="flex items-center space-x-1">
                  <Shield className="w-3 h-3" />
                  <span>Privacy Protected</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Zap className="w-3 h-3" />
                  <span>Instant Analysis</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Bank Statement Analyzer Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              🤖 AI Bank Statement Analyzer
            </h2>
          </div>

          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
            <div className="max-w-md mx-auto">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Your Bank Statement</h3>
              <p className="text-gray-600 mb-6">Supports PDF, CSV, Excel, and image files</p>
              <button
                onClick={simulateFileUpload}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
              >
                Choose File to Analyze
              </button>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-gray-900 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Transform Your Finances?
            </h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Experience the full power of XspensesAI with unlimited uploads, advanced AI insights, 
              and personalized financial podcasts about YOUR money story.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-4 rounded-lg font-bold transition-all transform hover:scale-105">
                Start Free Trial
              </button>
              <button className="bg-white/10 hover:bg-white/20 border border-white/20 px-8 py-4 rounded-lg font-bold transition-all">
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XspensesAIDemoPage; 