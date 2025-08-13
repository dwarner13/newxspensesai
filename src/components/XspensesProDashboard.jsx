
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  UploadCloud, Bot, HeartPulse, Target, LineChart, Bell, 
  PiggyBank, Crown, Mic, Music, FileText, BarChart3, 
  Zap, Activity, Settings, User, Plus, MessageCircle
} from 'lucide-react';

export default function XspensesProDashboard() {
  const [showFab, setShowFab] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  return (
    <div className="w-full">
      {/* Header */}
      <header className="mb-8">
        <h2 className="text-3xl font-bold mb-2 text-white">FinTech Entertainment Platform</h2>
        <p className="text-white/70">Welcome back, John! Here's your financial overview.</p>
      </header>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto">
        {/* 🧠 Personal Finance AI */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold mb-4 text-white">🧠 Personal Finance AI</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Smart Import AI */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">📥</div>
              <h3 className="text-xl font-semibold mb-2">Smart Import AI</h3>
              <p className="text-sm text-white/80">Instantly upload or scan bank statements, bills, or receipts — PDF, photo, CSV, Excel, even handwritten.</p>
              <Link to="/dashboard/smart-import-ai" className="bg-white text-indigo-500 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                Upload or Scan
              </Link>
            </div>

            {/* AI Financial Assistant */}
            <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2">AI Financial Assistant</h3>
              <p className="text-sm text-white/80">Automatic expense tracking, insights, and predictions. No spreadsheets required.</p>
              <Link to="/dashboard/ai-financial-assistant" className="bg-white text-pink-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                View Insights
              </Link>
            </div>

            {/* AI Financial Therapist */}
            <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">🧘</div>
              <h3 className="text-xl font-semibold mb-2">AI Financial Therapist</h3>
              <p className="text-sm text-white/80">Emotional and behavioral coaching to improve your financial wellness and mental clarity.</p>
              <Link to="/dashboard/financial-therapist" className="bg-white text-rose-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                Start Session
              </Link>
            </div>
          </div>
        </section>

        {/* 🎯 Goals & Predictions */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold mb-4 text-white">🎯 Goals & Predictions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* AI Goal Concierge */}
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold mb-2">AI Goal Concierge</h3>
              <p className="text-sm text-white/80">Plan savings, debt payoff, and life milestones with AI-driven support and timelines.</p>
              <Link to="/dashboard/goal-concierge" className="bg-white text-emerald-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                Set Goals
              </Link>
            </div>

            {/* Spending Predictions */}
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Spending Predictions</h3>
              <p className="text-sm text-white/80">See future trends and spending forecasts based on past behaviors and seasonal cycles.</p>
              <Link to="/dashboard/spending-predictions" className="bg-white text-yellow-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                View Trends
              </Link>
            </div>

            {/* AI Categorization */}
            <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">🏷️</div>
              <h3 className="text-xl font-semibold mb-2">AI Categorization</h3>
              <p className="text-sm text-white/80">Automatically categorize transactions and learn from your corrections.</p>
              <div className="bg-white text-sky-500 font-semibold py-2 px-4 rounded-lg opacity-50 cursor-not-allowed mt-4 inline-block">
                Coming Soon
              </div>
            </div>
          </div>
        </section>

        {/* 💳 Expense & Planning Tools */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold mb-4 text-white">💳 Expense & Planning Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Bill Reminder System */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">⏰</div>
              <h3 className="text-xl font-semibold mb-2">Bill Reminder System</h3>
              <p className="text-sm text-white/80">Never miss a payment with smart reminders and automated tracking.</p>
              <Link to="/dashboard/bill-reminders" className="bg-white text-blue-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                Set Reminders
              </Link>
            </div>

            {/* Debt Payoff Planner */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">💸</div>
              <h3 className="text-xl font-semibold mb-2">Debt Payoff Planner</h3>
              <p className="text-sm text-white/80">Create personalized debt payoff strategies with optimal payment sequencing.</p>
              <Link to="/dashboard/debt-payoff-planner" className="bg-white text-green-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                Plan Payoff
              </Link>
            </div>

            {/* AI Financial Freedom */}
            <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold mb-2">AI Financial Freedom</h3>
              <p className="text-sm text-white/80">Achieve financial independence with AI-powered planning and coaching.</p>
              <Link to="/dashboard/ai-financial-freedom" className="bg-white text-purple-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                Start Journey
              </Link>
            </div>
          </div>
        </section>

        {/* 🎧 Audio & Media */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold mb-4 text-white">🎧 Audio & Media</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Personal Podcast */}
            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">🎙️</div>
              <h3 className="text-xl font-semibold mb-2">Personal Podcast</h3>
              <p className="text-sm text-white/80">Create personalized financial podcasts with AI-generated insights and updates.</p>
              <Link to="/dashboard/personal-podcast" className="bg-white text-orange-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                Create Podcast
              </Link>
            </div>

            {/* Spotify Integration */}
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">🎵</div>
              <h3 className="text-xl font-semibold mb-2">Spotify Integration</h3>
              <p className="text-sm text-white/80">Sync your financial insights with personalized Spotify playlists and mood music.</p>
              <Link to="/dashboard/spotify-integration" className="bg-white text-green-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                Connect Spotify
              </Link>
            </div>

            {/* Wellness Studio */}
            <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">🧘‍♂️</div>
              <h3 className="text-xl font-semibold mb-2">Financial Wellness Studio</h3>
              <p className="text-sm text-white/80">Meditation, mindfulness, and stress reduction techniques for financial health.</p>
              <Link to="/dashboard/wellness-studio" className="bg-white text-teal-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                Enter Studio
              </Link>
            </div>
          </div>
        </section>

        {/* 🧾 Smart Tax & Intelligence */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold mb-4 text-white">🧾 Smart Tax & Intelligence</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Tax Assistant */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">🧾</div>
              <h3 className="text-xl font-semibold mb-2">Tax Assistant</h3>
              <p className="text-sm text-white/80">AI-powered tax preparation, deduction optimization, and filing assistance.</p>
              <Link to="/dashboard/tax-assistant" className="bg-white text-indigo-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                Prepare Taxes
              </Link>
            </div>

            {/* Business Intelligence */}
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">📈</div>
              <h3 className="text-xl font-semibold mb-2">Business Intelligence</h3>
              <p className="text-sm text-white/80">Advanced analytics and insights for business financial management.</p>
              <Link to="/dashboard/business-intelligence" className="bg-white text-blue-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                View Analytics
              </Link>
            </div>

            {/* Smart Automation */}
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-2">Smart Automation</h3>
              <p className="text-sm text-white/80">Automate repetitive financial tasks and workflows with AI.</p>
              <Link to="/dashboard/smart-automation" className="bg-white text-violet-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                Configure
              </Link>
            </div>
          </div>
        </section>

        {/* 🛠️ Tools & Settings */}
        <section className="mt-10">
          <h2 className="text-2xl font-semibold mb-4 text-white">🛠️ Tools & Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Analytics */}
            <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Analytics</h3>
              <p className="text-sm text-white/80">Comprehensive financial analytics and reporting dashboard.</p>
              <Link to="/dashboard/analytics" className="bg-white text-gray-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                View Reports
              </Link>
            </div>

            {/* Settings */}
            <div className="bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">⚙️</div>
              <h3 className="text-xl font-semibold mb-2">Settings</h3>
              <p className="text-sm text-white/80">Configure your account, preferences, and security settings.</p>
              <Link to="/dashboard/settings" className="bg-white text-slate-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                Configure
              </Link>
            </div>

            {/* Reports */}
            <div className="bg-gradient-to-br from-stone-500 to-gray-600 rounded-2xl p-6 shadow-lg hover:scale-[1.02] transition-all">
              <div className="text-3xl mb-4">📋</div>
              <h3 className="text-xl font-semibold mb-2">Reports</h3>
              <p className="text-sm text-white/80">Generate and export detailed financial reports and summaries.</p>
              <Link to="/dashboard/reports" className="bg-white text-stone-600 font-semibold py-2 px-4 rounded-lg hover:opacity-90 mt-4 inline-block">
                Generate
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowFab(!showFab)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50"
      >
        <Plus size={24} />
      </button>

      {/* FAB Toggle Button */}
      {showFab && (
        <div className="fixed bottom-20 right-6 space-y-2 z-50">
          <button className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center">
            <UploadCloud size={20} />
          </button>
          <button className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center">
            <MessageCircle size={20} />
          </button>
        </div>
      )}

      {/* AI Chatbot */}
      {showChatbot && (
        <div className="fixed bottom-6 left-6 w-80 h-96 bg-white rounded-lg shadow-xl z-50">
          <div className="p-4 border-b">
            <h3 className="font-semibold">AI Assistant</h3>
          </div>
          <div className="p-4 h-80 overflow-y-auto">
            <p className="text-sm text-gray-600">How can I help you today?</p>
          </div>
        </div>
      )}

      {/* Chatbot Toggle Button */}
      <button
        onClick={() => setShowChatbot(!showChatbot)}
        className="fixed bottom-6 left-6 w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40"
      >
        <MessageCircle size={20} />
      </button>

      {/* Premium Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Upgrade to Premium</h3>
            <p className="text-gray-600 mb-4">Unlock advanced features and unlimited access to all AI tools.</p>
            <div className="flex space-x-4">
              <button className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
                Upgrade Now
              </button>
              <button 
                onClick={() => setShowPremiumModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
