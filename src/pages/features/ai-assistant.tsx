import React from 'react';
import WebsiteLayout from '../../components/layout/WebsiteLayout';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function AIAssistantFeaturePage() {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>AI Financial Assistant That Learns You | XspensesAI</title>
        <meta name="description" content="Meet your personal AI financial assistant that learns your habits, predicts your needs, and gets smarter every day. Natural language queries, intelligent insights, 94% accuracy." />
        <meta name="keywords" content="AI financial assistant, personal finance AI, AI budgeting assistant, smart money management, AI expense tracker, financial planning AI, AI that learns your spending habits, smart financial assistant app, AI powered expense categorization, natural language financial queries, predictive financial insights AI, personalized AI money coach" />
        <meta property="og:title" content="AI Financial Assistant That Learns You | XspensesAI" />
        <meta property="og:description" content="Meet your personal AI financial assistant that learns your habits, predicts your needs, and gets smarter every day. Natural language queries, intelligent insights, 94% accuracy." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Financial Assistant That Learns You | XspensesAI" />
        <meta name="twitter:description" content="Meet your personal AI financial assistant that learns your habits, predicts your needs, and gets smarter every day." />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-pink-700 text-white py-20 px-4 text-center rounded-3xl shadow-xl mb-16">
        <motion.h1
          className="text-5xl md:text-6xl font-extrabold mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Your Personal <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">AI Financial Assistant</span>
        </motion.h1>
        <motion.p
          className="text-xl md:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          The world's first AI financial assistant that actually learns your habits, understands your lifestyle, and gets smarter every day. Chat naturally and get personalized insights that evolve with you.
        </motion.p>
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Link
            to="/signup"
            className="inline-block bg-gradient-to-r from-orange-500 to-pink-500 text-white px-10 py-5 rounded-xl font-bold text-lg shadow-lg hover:from-pink-500 hover:to-orange-500 transition-all duration-300"
          >
            Meet Your AI Financial Assistant
          </Link>
          <a
            href="#ai-demo"
            className="inline-block border-2 border-white text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-600 transition-all duration-300"
          >
            Experience AI That Learns You
          </a>
        </motion.div>
        <motion.div
          className="flex justify-center items-center space-x-8 text-blue-100"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-green-300">94%</div>
            <div className="text-sm">AI Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-300">24/7</div>
            <div className="text-sm">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-300">∞</div>
            <div className="text-sm">Learning</div>
          </div>
        </motion.div>
      </section>

      {/* Intelligence Revolution Section */}
      <section className="max-w-6xl mx-auto px-4 mb-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              The Intelligence Revolution in Personal Finance
            </h2>
            <div className="bg-red-50 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-red-800 mb-4">Traditional Apps vs. Learning AI</h3>
              <div className="space-y-3 text-red-700">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">😤</span>
                  <span><strong>Manual categorization</strong> - You do all the work</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🤖</span>
                  <span><strong>Generic advice</strong> - One-size-fits-all recommendations</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <span><strong>Static insights</strong> - Same reports, month after month</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⏰</span>
                  <span><strong>Time-consuming</strong> - Hours spent on financial tasks</span>
                </div>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Traditional financial apps treat you like a data entry clerk. They expect you to categorize every transaction, remember to check budgets, and figure out what the numbers mean.
            </p>
            <p className="text-gray-600">
              XspensesAI's AI financial assistant transforms from a simple tool into an intelligent companion that learns your patterns, understands your goals, and gets smarter with every interaction.
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">How AI Learning Transforms Your Experience</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">AI Analyzes Your Patterns</h4>
                  <p className="text-sm text-gray-600">Advanced machine learning algorithms understand your spending triggers, income patterns, and financial behaviors</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Learns Your Preferences</h4>
                  <p className="text-sm text-gray-600">Natural language processing allows you to chat naturally while AI learns your communication style and preferences</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Provides Intelligent Insights</h4>
                  <p className="text-sm text-gray-600">Predictive analytics and behavioral analysis deliver insights that become more accurate and personalized over time</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-pink-600 font-bold">4</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Adapts to Life Changes</h4>
                  <p className="text-sm text-gray-600">AI recognizes lifestyle changes, income fluctuations, and goal adjustments, automatically updating recommendations</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive AI Assistant Demo */}
      <section id="ai-demo" className="max-w-6xl mx-auto mb-20">
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">AI Financial Assistant</h3>
          <p className="text-gray-600 text-center mb-4">
            Chat with your AI financial assistant to get personalized insights, manage your finances, and make smarter decisions.
          </p>
          <div className="flex justify-center items-center space-x-4">
            <input
              type="text"
              placeholder="Ask your AI assistant..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button className="bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors duration-200">
              Send
            </button>
          </div>
        </div>
      </section>

      {/* AI Learning Capabilities Section */}
      <section className="max-w-6xl mx-auto px-4 mb-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Watch Your AI Financial Assistant Get Smarter Every Day
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl">🧠</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Pattern Recognition</h3>
            <p className="text-gray-600 text-center mb-4">
              AI identifies spending patterns, behavioral triggers, and financial habits you never noticed.
            </p>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm font-semibold text-purple-800 mb-2">AI Discovers:</div>
              <ul className="text-xs text-purple-700 space-y-1">
                <li>• You overspend 40% more on weekends</li>
                <li>• Coffee purchases spike when stressed</li>
                <li>• Subscription renewals cluster in Q1</li>
                <li>• Travel spending follows income patterns</li>
              </ul>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl">💬</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Natural Language Processing</h3>
            <p className="text-gray-600 text-center mb-4">
              Chat naturally with your AI assistant using everyday language, not financial jargon.
            </p>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm font-semibold text-blue-800 mb-2">You Can Ask:</div>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• "How much did I spend on coffee this month?"</li>
                <li>• "Why am I always broke on Fridays?"</li>
                <li>• "When do I typically overspend?"</li>
                <li>• "Help me prepare for next month's expenses"</li>
              </ul>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-2xl">🔮</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">Predictive Intelligence</h3>
            <p className="text-gray-600 text-center mb-4">
              AI predicts future expenses, identifies potential problems, and suggests proactive solutions.
            </p>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm font-semibold text-green-800 mb-2">AI Predicts:</div>
              <ul className="text-xs text-green-700 space-y-1">
                <li>• Next month's spending with 94% accuracy</li>
                <li>• Budget overruns before they happen</li>
                <li>• Seasonal spending spikes</li>
                <li>• Optimal savings opportunities</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* AI Conversation Examples Section */}
      <section className="max-w-6xl mx-auto px-4 mb-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Real Conversations with Your AI Financial Assistant
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Week 1: Getting to Know You</h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3">
                <div className="text-sm text-gray-500 mb-1">You:</div>
                <div className="text-sm">"How much did I spend on dining last month?"</div>
              </div>
              <div className="bg-purple-100 rounded-lg p-3">
                <div className="text-sm text-gray-500 mb-1">AI Assistant:</div>
                <div className="text-sm">"You spent $847 on dining in March. I notice you spend 23% more on weekends. Would you like me to help you set a weekend dining budget?"</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <strong>AI Learning:</strong> Recognized weekend spending pattern
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Month 3: Deep Understanding</h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3">
                <div className="text-sm text-gray-500 mb-1">You:</div>
                <div className="text-sm">"I'm feeling stressed about money lately"</div>
              </div>
              <div className="bg-blue-100 rounded-lg p-3">
                <div className="text-sm text-gray-500 mb-1">AI Assistant:</div>
                <div className="text-sm">"I've noticed your coffee spending increased 40% this week, which usually happens when you're stressed. Your emergency fund is healthy at $3,200. Would you like me to suggest some stress-relief activities that won't impact your budget?"</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <strong>AI Learning:</strong> Connected stress patterns with spending behavior
            </div>
          </div>
        </div>
        
        {/* Additional AI Conversation Examples */}
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Month 6: Predictive Intelligence</h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3">
                <div className="text-sm text-gray-500 mb-1">You:</div>
                <div className="text-sm">"Should I be worried about my spending this month?"</div>
              </div>
              <div className="bg-green-100 rounded-lg p-3">
                <div className="text-sm text-gray-500 mb-1">AI Assistant:</div>
                <div className="text-sm">"Based on your patterns, you're on track to spend $2,100 this month vs your $1,800 budget. However, I see you have a bonus coming next week. Want me to adjust your budget to account for the extra income?"</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <strong>AI Learning:</strong> Predictive analysis with income correlation
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Year 1: Life Change Adaptation</h3>
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-3">
                <div className="text-sm text-gray-500 mb-1">You:</div>
                <div className="text-sm">"I just got a promotion with a 20% raise!"</div>
              </div>
              <div className="bg-orange-100 rounded-lg p-3">
                <div className="text-sm text-gray-500 mb-1">AI Assistant:</div>
                <div className="text-sm">"Congratulations! I've automatically updated your financial roadmap. With your new income, you can reach your house down payment goal 8 months earlier. Should I adjust your savings allocation?"</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              <strong>AI Learning:</strong> Automatic goal recalculation
            </div>
          </div>
        </div>
        
        <div className="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-bold mb-4">AI Learning Progression</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">78%</div>
              <div className="text-sm text-purple-200">Week 1 Accuracy</div>
              <div className="text-xs text-purple-300 mt-1">Basic pattern recognition</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">89%</div>
              <div className="text-sm text-purple-200">Month 1 Accuracy</div>
              <div className="text-xs text-purple-300 mt-1">Deep behavioral analysis</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">94%</div>
              <div className="text-sm text-purple-200">Month 3+ Accuracy</div>
              <div className="text-xs text-purple-300 mt-1">Predictive intelligence</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">96%</div>
              <div className="text-sm text-purple-200">Year 1+ Accuracy</div>
              <div className="text-xs text-purple-300 mt-1">Life change adaptation</div>
            </div>
          </div>
        </div>
      </section>

      {/* Core AI Features Section */}
      <section className="max-w-5xl mx-auto mb-20">
        <h2 className="text-3xl font-bold text-center mb-10 text-gray-900">Revolutionary AI That Understands Your Money</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-purple-700 mb-2">Smart Import AI</h3>
            <p className="text-gray-700 mb-4">Universal document parsing that works with any bank, any format. Your AI learns from every transaction automatically.</p>
            <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
              <li>Analyzes your unique spending habits</li>
              <li>Works with any bank or credit card</li>
              <li>Automatic categorization that learns</li>
              <li>Real-time transaction processing</li>
            </ul>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-purple-700 mb-2">Natural Language Queries</h3>
            <p className="text-gray-700 mb-4">Ask questions about your finances in plain English. No financial jargon required.</p>
            <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
              <li>"How much can I afford to spend on vacation?"</li>
              <li>"Why did my grocery budget go over this month?"</li>
              <li>"What's the best way to reach my savings goal?"</li>
              <li>"Should I be worried about this expense?"</li>
            </ul>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-purple-700 mb-2">Predictive Insights</h3>
            <p className="text-gray-700 mb-4">Know what you'll spend before you spend it. AI predicts future expenses and warns about potential budget issues.</p>
            <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
              <li>Forecasts next month's spending with 94% accuracy</li>
              <li>Predicts budget overruns before they happen</li>
              <li>Suggests proactive adjustments</li>
              <li>Identifies seasonal spending patterns</li>
            </ul>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-purple-700 mb-2">Behavioral Analysis</h3>
            <p className="text-gray-700 mb-4">AI understands your spending triggers, emotional patterns, and lifestyle changes to provide truly personalized advice.</p>
            <ul className="list-disc pl-5 text-gray-600 text-sm space-y-1">
              <li>Recognizes spending triggers and patterns</li>
              <li>Adapts to lifestyle and income changes</li>
              <li>Provides emotional intelligence support</li>
              <li>Learns from your feedback and decisions</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Competitive Advantage Section */}
      <section className="max-w-6xl mx-auto px-4 mb-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Why XspensesAI's AI is Different
        </h2>
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Learning vs. Rule-Based Systems</h3>
            <div className="space-y-4">
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Traditional Apps (Rule-Based)</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Fixed rules that never change</li>
                  <li>• Generic advice for everyone</li>
                  <li>• Manual categorization required</li>
                  <li>• Static insights and reports</li>
                  <li>• No adaptation to your lifestyle</li>
                </ul>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">XspensesAI (Learning AI)</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Continuously learns and improves</li>
                  <li>• Personalized advice just for you</li>
                  <li>• Automatic categorization that gets smarter</li>
                  <li>• Dynamic insights that evolve</li>
                  <li>• Adapts to your lifestyle changes</li>
                </ul>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Unique AI Capabilities</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600">🎵</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Entertainment Integration</h4>
                  <p className="text-sm text-gray-600">AI creates personalized financial podcasts and music that make money management enjoyable</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600">🧠</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Emotional Intelligence</h4>
                  <p className="text-sm text-gray-600">AI recognizes stress patterns and provides emotional support alongside financial advice</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600">🔗</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Cross-Platform Learning</h4>
                  <p className="text-sm text-gray-600">AI remembers your preferences across all XspensesAI features and platforms</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-pink-600">⚡</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Real-Time Adaptation</h4>
                  <p className="text-sm text-gray-600">AI adjusts recommendations instantly based on new transactions and life events</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="max-w-5xl mx-auto mb-20">
        <h2 className="text-3xl font-bold text-center mb-10 text-gray-900">What Users Are Saying About Their AI Financial Assistant</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 text-white text-2xl">🤖</div>
            <p className="text-gray-700 italic mb-4">"My AI assistant caught a spending pattern I never noticed and helped me save $300 a month! It's like having a financial advisor who knows me better than I know myself."</p>
            <div className="font-bold text-gray-900">Sarah M.</div>
            <div className="text-sm text-gray-500">Marketing Manager</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 text-white text-2xl">💡</div>
            <p className="text-gray-700 italic mb-4">"It's like having a financial advisor in my pocket. The advice is always relevant to my actual situation, and it gets smarter every time I use it."</p>
            <div className="font-bold text-gray-900">Mike R.</div>
            <div className="text-sm text-gray-500">Freelancer</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 text-white text-2xl">🎯</div>
            <p className="text-gray-700 italic mb-4">"Finally, I can ask 'dumb' money questions without embarrassment. My AI assistant never judges and actually learns from our conversations."</p>
            <div className="font-bold text-gray-900">Jennifer L.</div>
            <div className="text-sm text-gray-500">Entrepreneur</div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mt-16 text-white text-center max-w-4xl mx-auto shadow-xl">
        <motion.h2
          className="text-4xl md:text-5xl font-bold text-white mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          Ready to Meet Your AI Financial Assistant?
        </motion.h2>
        <p className="text-xl text-purple-100 mb-8">
          Join thousands of users who've transformed their relationship with money through intelligent conversation. Experience AI that learns you.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/signup"
            className="bg-white text-purple-600 px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Start Your Intelligent Financial Journey
          </Link>
          <a
            href="#ai-demo"
            className="border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-purple-600 transition-all duration-200"
          >
            Try AI Assistant Free
          </a>
        </div>
        <div className="mt-6 text-purple-200 text-sm">
          ✓ 14-day free trial ✓ No credit card required ✓ Instant AI access
        </div>
      </section>
    </WebsiteLayout>
  );
} 
