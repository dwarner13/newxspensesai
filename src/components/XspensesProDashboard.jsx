
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  UploadCloud, Bot, HeartPulse, Target, LineChart, Bell, 
  PiggyBank, Crown, Mic, Music, FileText, BarChart3, 
  Zap, Activity, Settings, User
} from 'lucide-react';
import ChatBot from './chat/ChatBot';
import DashboardHeader from './ui/DashboardHeader';

export default function XspensesProDashboard() {
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  return (
    <div className="w-full">
      <DashboardHeader />

      {/* Content Area with Enhanced Styling */}
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* 🧠 Personal Finance AI Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🧠</span>
            <h2 className="text-3xl font-bold text-white">Personal Finance AI</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Smart Import AI */}
            <div className="group relative overflow-hidden rounded-2xl p-8 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 hover:shadow-purple-500/25">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-5">🏦</div>
                <h3 className="text-2xl font-bold mb-3 text-white">Smart Import AI</h3>
                <p className="text-sm text-white/90 leading-relaxed">Instantly upload or scan bank statements, bills, or receipts — PDF, photo, CSV, Excel, even handwritten.</p>
              </div>
              <Link to="/dashboard/smart-import-ai" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-3 px-6 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Upload or Scan
              </Link>
            </div>

            {/* AI Financial Assistant */}
            <div className="group relative overflow-hidden rounded-2xl p-8 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-pink-600 via-rose-600 to-pink-700 hover:shadow-pink-500/25">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-5">🤖</div>
                <h3 className="text-2xl font-bold mb-3 text-white">AI Financial Assistant</h3>
                <p className="text-sm text-white/90 leading-relaxed">Automatic expense tracking, insights, and predictions. No spreadsheets required.</p>
              </div>
              <Link to="/dashboard/ai-financial-assistant" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-3 px-6 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                View Insights
              </Link>
            </div>

            {/* AI Financial Therapist */}
            <div className="group relative overflow-hidden rounded-2xl p-8 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-rose-600 via-pink-600 to-rose-700 hover:shadow-rose-500/25">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-5">💚</div>
                <h3 className="text-2xl font-bold mb-3 text-white">AI Financial Therapist</h3>
                <p className="text-sm text-white/90 leading-relaxed">Emotional and behavioral coaching to improve your financial wellness and mental clarity.</p>
              </div>
              <Link to="/dashboard/financial-therapist" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-3 px-6 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Start Session
              </Link>
            </div>
          </div>
        </section>

        {/* 🎯 Goals & Predictions Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🎯</span>
            <h2 className="text-3xl font-bold text-white">Goals & Predictions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* AI Goal Concierge */}
            <div className="group relative overflow-hidden rounded-2xl p-8 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-700 hover:shadow-emerald-500/25">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-5">🎯</div>
                <h3 className="text-2xl font-bold mb-3 text-white">AI Goal Concierge</h3>
                <p className="text-sm text-white/90 leading-relaxed">Plan savings, debt payoff, and life milestones with AI-driven support and timelines.</p>
              </div>
              <Link to="/dashboard/goal-concierge" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-3 px-6 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Set Goals
              </Link>
            </div>

            {/* Spending Predictions */}
            <div className="group relative overflow-hidden rounded-2xl p-8 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 hover:shadow-amber-500/25">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-5">📊</div>
                <h3 className="text-2xl font-bold mb-3 text-white">Spending Predictions</h3>
                <p className="text-sm text-white/90 leading-relaxed">See future trends and spending forecasts based on past behaviors and seasonal cycles.</p>
              </div>
              <Link to="/dashboard/spending-predictions" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-3 px-6 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                View Trends
              </Link>
            </div>

            {/* AI Categorization */}
            <div className="group relative overflow-hidden rounded-2xl p-8 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-blue-600 via-sky-600 to-blue-700 hover:shadow-blue-500/25">
              <div className="absolute top-4 right-4 bg-white/20 text-white py-2 px-4 rounded-xl text-xs font-semibold backdrop-blur-md">
                Coming Soon
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-5">🏷️</div>
                <h3 className="text-2xl font-bold mb-3 text-white">AI Categorization</h3>
                <p className="text-sm text-white/90 leading-relaxed">Automatically categorize transactions and learn from your corrections.</p>
              </div>
              <button className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-3 px-6 rounded-xl text-sm font-semibold opacity-60 cursor-not-allowed self-start">
                Coming Soon
              </button>
            </div>
          </div>
        </section>

        {/* 🎭 Expense & Planning Tools Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🎭</span>
            <h2 className="text-2xl font-bold text-white">Expense & Planning Tools</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Personal Podcast */}
            <div className="group relative overflow-hidden rounded-2xl p-8 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-purple-600 via-violet-600 to-purple-700 hover:shadow-purple-500/25">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-5">🎙️</div>
                <h3 className="text-2xl font-bold mb-3 text-white">Personal Podcast</h3>
                <p className="text-sm text-white/90 leading-relaxed">AI-generated podcasts about your financial journey and money story.</p>
              </div>
              <Link to="/dashboard/personal-podcast" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-3 px-6 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Listen Now
              </Link>
            </div>

            {/* Spotify Integration */}
            <div className="group relative overflow-hidden rounded-2xl p-8 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 hover:shadow-green-500/25">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-5">🎵</div>
                <h3 className="text-2xl font-bold mb-3 text-white">Spotify Integration</h3>
                <p className="text-sm text-white/90 leading-relaxed">Curated playlists for focus, relaxation, and financial motivation.</p>
              </div>
              <Link to="/dashboard/spotify-integration" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-3 px-6 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Connect
              </Link>
            </div>

            {/* Financial Wellness Studio */}
            <div className="group relative overflow-hidden rounded-2xl p-8 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-red-600 via-rose-600 to-red-700 hover:shadow-red-500/25">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-5">💖</div>
                <h3 className="text-2xl font-bold mb-3 text-white">Financial Wellness Studio</h3>
                <p className="text-sm text-white/90 leading-relaxed">Educational content and guided sessions for financial mental health.</p>
              </div>
              <Link to="/dashboard/wellness-studio" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-3 px-6 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Learn More
              </Link>
            </div>
          </div>
        </section>

        {/* 🛠️ Tools & Settings Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🛠️</span>
            <h2 className="text-2xl font-bold text-white">Tools & Settings</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Analytics */}
            <div className="group relative overflow-hidden rounded-2xl p-8 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 hover:shadow-slate-500/25">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-5">📈</div>
                <h3 className="text-2xl font-bold mb-3 text-white">Analytics</h3>
                <p className="text-sm text-white/90 leading-relaxed">Comprehensive financial analytics and reporting dashboard.</p>
              </div>
              <Link to="/dashboard/analytics" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-3 px-6 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                View Reports
              </Link>
            </div>

            {/* Settings */}
            <div className="group relative overflow-hidden rounded-2xl p-8 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 hover:shadow-slate-500/25">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-5">⚙️</div>
                <h3 className="text-2xl font-bold mb-3 text-white">Settings</h3>
                <p className="text-sm text-white/90 leading-relaxed">Configure your account, preferences, and security settings.</p>
              </div>
              <Link to="/dashboard/settings" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-3 px-6 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Configure
              </Link>
            </div>

            {/* Reports */}
            <div className="group relative overflow-hidden rounded-2xl p-8 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800 hover:shadow-slate-500/25">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-5xl mb-5">📋</div>
                <h3 className="text-2xl font-bold mb-3 text-white">Reports</h3>
                <p className="text-sm text-white/90 leading-relaxed">Generate and export detailed financial reports and summaries.</p>
              </div>
              <Link to="/dashboard/reports" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-3 px-6 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Generate
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
