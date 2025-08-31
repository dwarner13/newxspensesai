
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  UploadCloud, Bot, HeartPulse, Target, LineChart, Bell, 
  PiggyBank, Crown, Mic, Music, FileText, BarChart3, 
  Zap, Activity, Settings, User, Play, Trophy, Video, 
  MessageCircle, TrendingUp, Users, Award, Star, Gamepad2
} from 'lucide-react';
import ChatBot from './chat/ChatBot';
import DashboardHeader from './ui/DashboardHeader';

export default function XspensesProDashboard() {
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedAI, setSelectedAI] = useState('Prime');

  // AI Dream Team for Dashboard
  const aiDreamTeam = [
    { name: 'Prime', role: 'AI Boss & Director', avatar: '👑', color: 'from-purple-500 to-pink-500', status: 'Online' },
    { name: 'Byte', role: 'AI Process Optimizer', avatar: '⚙️', color: 'from-blue-500 to-cyan-500', status: 'Processing' },
    { name: 'Tag', role: 'AI Rule Engine', avatar: '🏷️', color: 'from-green-500 to-emerald-500', status: 'Active' },
    { name: 'Crystal', role: 'AI Prediction Engine', avatar: '🔮', color: 'from-indigo-500 to-purple-500', status: 'Analyzing' }
  ];

  return (
    <div className="w-full">
      <DashboardHeader />

      {/* AI Empire Command Center */}
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* AI Empire Status Dashboard */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Crown className="w-8 h-8 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">Prime's AI Empire Command Center</h2>
          </div>
          
          {/* Live AI Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {[
              { metric: 'AI Decisions Today', value: '247', icon: '🤖', color: 'text-purple-400', change: '+12%' },
              { metric: 'Documents Processed', value: '1,234', icon: '📄', color: 'text-blue-400', change: '+8%' },
              { metric: 'Money Saved', value: '$2,847', icon: '💰', color: 'text-green-400', change: '+15%' },
              { metric: 'AI Accuracy', value: '99.7%', icon: '🎯', color: 'text-cyan-400', change: '+0.2%' }
            ].map((stat, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center">
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-white/70 text-sm mb-2">{stat.metric}</div>
                <div className="text-green-400 text-xs">{stat.change} from yesterday</div>
              </div>
            ))}
          </div>

          {/* AI Team Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {aiDreamTeam.map((ai, index) => (
              <div key={ai.name} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center">
                <div className="text-4xl mb-3">{ai.avatar}</div>
                <h3 className="font-semibold text-white mb-1">{ai.name}</h3>
                <p className="text-white/70 text-sm mb-3">{ai.role}</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 text-xs">{ai.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI Entertainment & Games Hub */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Gamepad2 className="w-8 h-8 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">AI Entertainment & Games Hub</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* AI Financial Trivia */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-purple-600 to-indigo-700 hover:shadow-purple-500/25">
              <div className="absolute top-4 right-4">
                <Trophy className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">AI Financial Trivia</h3>
                <p className="text-sm text-white/90 leading-relaxed">Test your financial knowledge with AI-generated questions. Earn points and compete!</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-cyan-400 text-sm">2,847 players</span>
                  <span className="text-green-400 text-sm">500 pts reward</span>
                </div>
              </div>
              <Link to="/dashboard/ai-trivia" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Play Now
              </Link>
            </div>

            {/* AI Video Content Hub */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-red-600 to-orange-700 hover:shadow-red-500/25">
              <div className="absolute top-4 right-4">
                <Video className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">AI Video Content Hub</h3>
                <p className="text-sm text-white/90 leading-relaxed">Personalized AI-generated videos about your financial journey and insights.</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-cyan-400 text-sm">6 video categories</span>
                  <span className="text-green-400 text-sm">AI Generated</span>
                </div>
              </div>
              <Link to="/dashboard/ai-videos" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Watch Videos
              </Link>
            </div>

            {/* AI Leaderboard */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-yellow-500 to-orange-600 hover:shadow-yellow-500/25">
              <div className="absolute top-4 right-4">
                <Award className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">AI Leaderboard</h3>
                <p className="text-sm text-white/90 leading-relaxed">Compete with other users and earn AI rewards. Track your progress and achievements.</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-cyan-400 text-sm">Top 4 users</span>
                  <span className="text-green-400 text-sm">Rewards system</span>
                </div>
              </div>
              <Link to="/dashboard/ai-leaderboard" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                View Rankings
              </Link>
            </div>
          </div>
        </section>

        {/* AI Financial Tools */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Bot className="w-8 h-8 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">AI Financial Tools</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Smart Import AI */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-blue-600 to-cyan-700 hover:shadow-blue-500/25">
              <div className="absolute top-4 right-4">
                <UploadCloud className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">Smart Import AI</h3>
                <p className="text-sm text-white/90 leading-relaxed">Instantly upload or scan bank statements, bills, or receipts — PDF, photo, CSV, Excel, even handwritten.</p>
              </div>
              <Link to="/dashboard/smart-import-ai" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Upload or Scan
              </Link>
            </div>

            {/* AI Financial Assistant */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-green-600 to-emerald-700 hover:shadow-green-500/25">
              <div className="absolute top-4 right-4">
                <Bot className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">AI Financial Assistant</h3>
                <p className="text-sm text-white/90 leading-relaxed">Automatic expense tracking, insights, and predictions. No spreadsheets required.</p>
              </div>
              <Link to="/dashboard/ai-financial-assistant" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                View Insights
              </Link>
            </div>

            {/* AI Financial Therapist */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-pink-600 to-rose-700 hover:shadow-pink-500/25">
              <div className="absolute top-4 right-4">
                <HeartPulse className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">AI Financial Therapist</h3>
                <p className="text-sm text-white/90 leading-relaxed">Emotional and behavioral coaching to improve your financial wellness and mental clarity.</p>
              </div>
              <Link to="/dashboard/financial-therapist" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Start Session
              </Link>
            </div>
          </div>
        </section>

        {/* AI Predictions & Analytics */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-8 h-8 text-indigo-400" />
            <h2 className="text-2xl font-bold text-white">AI Predictions & Analytics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* AI Market Predictor */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-emerald-600 to-teal-700 hover:shadow-emerald-500/25">
              <div className="absolute top-4 right-4">
                <TrendingUp className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">AI Market Predictor</h3>
                <p className="text-sm text-white/90 leading-relaxed">Crystal's market insights and predictions. Get AI-powered investment recommendations.</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-cyan-400 text-sm">+12.7% prediction</span>
                  <span className="text-green-400 text-sm">94.2% confidence</span>
                </div>
              </div>
              <Link to="/dashboard/ai-market-predictor" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                View Predictions
              </Link>
            </div>

            {/* AI Financial Health Score */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-blue-600 to-indigo-700 hover:shadow-blue-500/25">
              <div className="absolute top-4 right-4">
                <HeartPulse className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">AI Financial Health Score</h3>
                <p className="text-sm text-white/90 leading-relaxed">Get your personalized financial health rating with AI-powered analysis and recommendations.</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-cyan-400 text-sm">85/100 score</span>
                  <span className="text-green-400 text-sm">Excellent</span>
                </div>
              </div>
              <Link to="/dashboard/ai-health-score" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Check Score
              </Link>
            </div>

            {/* AI Goal Concierge */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-green-600 to-emerald-700 hover:shadow-green-500/25">
              <div className="absolute top-4 right-4">
                <Target className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">AI Goal Concierge</h3>
                <p className="text-sm text-white/90 leading-relaxed">Plan savings, debt payoff, and life milestones with AI-driven support and timelines.</p>
              </div>
              <Link to="/dashboard/goal-concierge" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Set Goals
              </Link>
            </div>
          </div>
        </section>

        {/* AI Communication Hub */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <MessageCircle className="w-8 h-8 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">AI Communication Hub</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* AI Chat Integration */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-cyan-600 to-blue-700 hover:shadow-cyan-500/25">
              <div className="absolute top-4 right-4">
                <MessageCircle className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">AI Chat Integration</h3>
                <p className="text-sm text-white/90 leading-relaxed">Chat with Prime's AI team in real-time. Get instant financial advice and support.</p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-cyan-400 text-sm">Live chat</span>
                  <span className="text-green-400 text-sm">24/7 available</span>
                </div>
              </div>
              <Link to="/dashboard/ai-chat" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Start Chat
              </Link>
            </div>

            {/* Personal Podcast */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-purple-600 to-violet-700 hover:shadow-purple-500/25">
              <div className="absolute top-4 right-4">
                <Mic className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">Personal Podcast</h3>
                <p className="text-sm text-white/90 leading-relaxed">AI-generated podcasts about your financial journey and money story.</p>
              </div>
              <Link to="/dashboard/personal-podcast" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Listen Now
              </Link>
            </div>

            {/* Spotify Integration */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-green-500 to-emerald-600 hover:shadow-green-500/25">
              <div className="absolute top-4 right-4">
                <Music className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">Spotify Integration</h3>
                <p className="text-sm text-white/90 leading-relaxed">Curated playlists for focus, relaxation, and financial motivation.</p>
              </div>
              <Link to="/dashboard/spotify-integration" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Connect
              </Link>
            </div>
          </div>
        </section>

        {/* Tools & Settings */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-8 h-8 text-slate-400" />
            <h2 className="text-2xl font-bold text-white">Tools & Settings</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Analytics */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-slate-600 to-slate-800 hover:shadow-slate-500/25">
              <div className="absolute top-4 right-4">
                <BarChart3 className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">Analytics</h3>
                <p className="text-sm text-white/90 leading-relaxed">Comprehensive financial analytics and reporting dashboard.</p>
              </div>
              <Link to="/dashboard/analytics" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                View Reports
              </Link>
            </div>

            {/* Settings */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-slate-600 to-slate-800 hover:shadow-slate-500/25">
              <div className="absolute top-4 right-4">
                <Settings className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">Settings</h3>
                <p className="text-sm text-white/90 leading-relaxed">Configure your account, preferences, and security settings.</p>
              </div>
              <Link to="/dashboard/settings" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Configure
              </Link>
            </div>

            {/* Reports */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-slate-600 to-slate-800 hover:shadow-slate-500/25">
              <div className="absolute top-4 right-4">
                <FileText className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">Reports</h3>
                <p className="text-sm text-white/90 leading-relaxed">Generate and export detailed financial reports and summaries.</p>
              </div>
              <Link to="/dashboard/reports" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Generate
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
