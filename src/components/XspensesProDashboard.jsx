
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  UploadCloud, Bot, HeartPulse, Target, LineChart, Bell, 
  PiggyBank, Crown, Mic, Music, FileText, BarChart3, 
  Zap, Activity, Settings, User, Play, TrendingUp, Users, Award, Star
} from 'lucide-react';
import DashboardHeader from './ui/DashboardHeader';

export default function XspensesProDashboard() {
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  return (
    <div className="w-full">
      <DashboardHeader />

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        
        {/* Welcome Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Crown className="w-8 h-8 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">Welcome to Your Financial Dashboard</h2>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {[
              { metric: 'Total Expenses', value: '$2,847', icon: '💰', color: 'text-green-400', change: '+12%' },
              { metric: 'Categories', value: '24', icon: '🏷️', color: 'text-blue-400', change: '+3' },
              { metric: 'This Month', value: '$847', icon: '📊', color: 'text-purple-400', change: '+8%' },
              { metric: 'Savings Goal', value: '75%', icon: '🎯', color: 'text-cyan-400', change: '+5%' }
            ].map((stat, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center">
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className={`text-2xl font-bold ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-white/70 text-sm mb-2">{stat.metric}</div>
                <div className="text-green-400 text-xs">{stat.change} from last month</div>
              </div>
            ))}
          </div>
        </section>

        {/* AI Tools Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Bot className="w-8 h-8 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">AI-Powered Tools</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Smart Import AI */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-blue-600 to-cyan-700 hover:shadow-blue-500/25">
              <div className="absolute top-4 right-4">
                <UploadCloud className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">Smart Import AI</h3>
                <p className="text-sm text-white/90 leading-relaxed">Upload receipts and bank statements. Our AI automatically categorizes and organizes your expenses.</p>
              </div>
              <Link to="/dashboard/smart-import-ai" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Import Now
              </Link>
            </div>

            {/* AI Financial Assistant */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-purple-600 to-indigo-700 hover:shadow-purple-500/25">
              <div className="absolute top-4 right-4">
                <Bot className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">AI Financial Assistant</h3>
                <p className="text-sm text-white/90 leading-relaxed">Get personalized financial advice and insights from our AI assistant.</p>
              </div>
              <Link to="/dashboard/ai-financial-assistant" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Chat Now
              </Link>
            </div>

            {/* Goal Concierge */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-green-600 to-emerald-700 hover:shadow-green-500/25">
              <div className="absolute top-4 right-4">
                <Target className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">Goal Concierge</h3>
                <p className="text-sm text-white/90 leading-relaxed">Set and track your financial goals with AI-powered insights and recommendations.</p>
              </div>
              <Link to="/dashboard/goal-concierge" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Set Goals
              </Link>
            </div>

            {/* Spending Predictions */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-indigo-600 to-purple-700 hover:shadow-indigo-500/25">
              <div className="absolute top-4 right-4">
                <LineChart className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">Spending Predictions</h3>
                <p className="text-sm text-white/90 leading-relaxed">AI-powered spending forecasts and trend analysis to help you plan better.</p>
              </div>
              <Link to="/dashboard/spending-predictions" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                View Predictions
              </Link>
            </div>

            {/* AI Categorization */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-pink-600 to-rose-700 hover:shadow-pink-500/25">
              <div className="absolute top-4 right-4">
                <FileText className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">AI Categorization</h3>
                <p className="text-sm text-white/90 leading-relaxed">Automatic transaction categorization with smart rules and learning capabilities.</p>
              </div>
              <Link to="/dashboard/ai-categorization" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Manage Categories
              </Link>
            </div>

            {/* Bill Reminders */}
            <div className="group relative overflow-hidden rounded-2xl p-6 shadow-2xl hover:scale-[1.02] transition-all duration-300 min-h-[200px] flex flex-col justify-between bg-gradient-to-br from-orange-600 to-red-700 hover:shadow-orange-500/25">
              <div className="absolute top-4 right-4">
                <Bell className="w-8 h-8 text-white/80" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-3 text-white">Bill Reminders</h3>
                <p className="text-sm text-white/90 leading-relaxed">Never miss a payment with smart bill tracking and automated reminders.</p>
              </div>
              <Link to="/dashboard/bill-reminders" className="relative z-10 bg-white/20 backdrop-blur-md border-none text-white py-2 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all hover:bg-white/30 hover:-translate-y-1 self-start hover:shadow-lg">
                Manage Bills
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-8 h-8 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/dashboard/analytics" className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all group">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-blue-400" />
                <span className="text-white font-medium">Analytics</span>
              </div>
            </Link>
            <Link to="/dashboard/reports" className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all group">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-green-400" />
                <span className="text-white font-medium">Reports</span>
              </div>
            </Link>
            <Link to="/dashboard/settings" className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all group">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-purple-400" />
                <span className="text-white font-medium">Settings</span>
              </div>
            </Link>
            <Link to="/dashboard/spotify-integration" className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all group">
              <div className="flex items-center gap-3">
                <Music className="w-6 h-6 text-green-400" />
                <span className="text-white font-medium">Music</span>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
