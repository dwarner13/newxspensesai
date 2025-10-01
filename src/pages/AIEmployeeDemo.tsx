/**
 * AI Employee System Demo Page
 * 
 * Demonstrates the complete shared data, specialized AI employee tasks system
 */

import React, { useState } from 'react';
import AIEmployeeChat from '../components/ai/AIEmployeeChat';
import { useAIEmployees } from '../hooks/useAIEmployees';
import { 
  Crown, 
  Bot, 
  Database, 
  Users, 
  Zap, 
  Brain, 
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const AIEmployeeDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'system' | 'employees'>('chat');
  const { systemStatus, getAvailableEmployees, getEmployeeCapabilities } = useAIEmployees('demo-user');

  const employeeConfigs = {
    Tag: { emoji: '🏷️', color: 'from-teal-500 to-cyan-600', description: 'Categorization & Organization' },
    Blitz: { emoji: '⚡', color: 'from-yellow-500 to-orange-600', description: 'Debt Payoff & Strategy' },
    Crystal: { emoji: '🔮', color: 'from-indigo-500 to-blue-600', description: 'Predictions & Forecasting' },
    Fortune: { emoji: '💰', color: 'from-green-500 to-emerald-600', description: 'Budget Reality & Accountability' },
    Goalie: { emoji: '🥅', color: 'from-purple-500 to-pink-600', description: 'Goal Progress & Achievement' },
    Wisdom: { emoji: '🧠', color: 'from-blue-500 to-indigo-600', description: 'Strategic Analysis & Planning' },
    SavageSally: { emoji: '💅', color: 'from-pink-500 to-rose-600', description: 'Reality Checks & Tough Love' },
    Prime: { emoji: '👑', color: 'from-purple-600 to-pink-600', description: 'AI Boss & Coordination' }
  };

  const availableEmployees = getAvailableEmployees();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Crown size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">AI Employee System Demo</h1>
                <p className="text-white/70">Shared Data, Specialized AI Employee Tasks System</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-lg border ${
                systemStatus.dataLoaded 
                  ? 'bg-green-500/20 border-green-500/30 text-green-400' 
                  : 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
              }`}>
                <div className="flex items-center gap-2">
                  <Database size={16} />
                  {systemStatus.dataLoaded ? 'Data Loaded' : 'Loading Data...'}
                </div>
              </div>
              
              <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400">
                <div className="flex items-center gap-2">
                  <Users size={16} />
                  {availableEmployees.length} AI Employees
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex gap-2">
          {[
            { id: 'chat', label: 'AI Chat', icon: Bot },
            { id: 'system', label: 'System Status', icon: Database },
            { id: 'employees', label: 'AI Employees', icon: Users }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {activeTab === 'chat' && (
          <div
            className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden"
            style={{ height: '600px' }}
          >
            <AIEmployeeChat userId="demo-user" />
          </div>
        )}

        {activeTab === 'system' && (
          <div
            className="space-y-6"
          >
            {/* System Architecture */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Database size={28} />
                System Architecture
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Database size={20} />
                    Shared Data Layer
                  </h3>
                  <p className="text-white/70 text-sm mb-4">
                    All AI employees access the same comprehensive financial dataset through a unified data store.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle size={16} />
                      <span>Unified Financial Data Store</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle size={16} />
                      <span>Real-time Data Updates</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle size={16} />
                      <span>Employee Data Subscriptions</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Brain size={20} />
                    Task Specialization
                  </h3>
                  <p className="text-white/70 text-sm mb-4">
                    Each AI employee has specialized tasks and data access patterns while using the same data.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle size={16} />
                      <span>Specialized Task Definitions</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle size={16} />
                      <span>Employee-Specific Queries</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle size={16} />
                      <span>Personality-Driven Responses</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Users size={20} />
                    Multi-Employee Collaboration
                  </h3>
                  <p className="text-white/70 text-sm mb-4">
                    Prime coordinates multiple AI employees for complex tasks requiring diverse expertise.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle size={16} />
                      <span>Intelligent Task Routing</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle size={16} />
                      <span>Collaborative Analysis</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle size={16} />
                      <span>Coordinated Responses</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <TrendingUp size={28} />
                System Status
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-2xl font-bold text-white">
                    {systemStatus.initialized ? '✅' : '⏳'}
                  </div>
                  <div className="text-white/70 text-sm">System Initialized</div>
                </div>
                
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-2xl font-bold text-white">
                    {systemStatus.dataLoaded ? '✅' : '⏳'}
                  </div>
                  <div className="text-white/70 text-sm">Data Loaded</div>
                </div>
                
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-2xl font-bold text-white">
                    {availableEmployees.length}
                  </div>
                  <div className="text-white/70 text-sm">AI Employees</div>
                </div>
                
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-2xl font-bold text-white">
                    {systemStatus.lastDataUpdate ? '🕒' : '⏳'}
                  </div>
                  <div className="text-white/70 text-sm">
                    {systemStatus.lastDataUpdate 
                      ? systemStatus.lastDataUpdate.toLocaleTimeString()
                      : 'No Updates'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'employees' && (
          <div
            className="space-y-6"
          >
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Users size={28} />
                AI Employee Team
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableEmployees.map((employee) => {
                  const config = employeeConfigs[employee as keyof typeof employeeConfigs];
                  const capabilities = getEmployeeCapabilities(employee);
                  
                  return (
                    <div key={employee} className="bg-white/10 rounded-xl p-6 hover:bg-white/15 transition-colors">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-16 h-16 bg-gradient-to-r ${config.color} rounded-full flex items-center justify-center`}>
                          <span className="text-2xl">{config.emoji}</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">{employee}</h3>
                          <p className="text-white/70 text-sm">{config.description}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-white font-semibold text-sm mb-2">Capabilities:</h4>
                          <ul className="space-y-1">
                            {capabilities.slice(0, 3).map((capability, index) => (
                              <li key={index} className="text-white/70 text-sm flex items-center gap-2">
                                <ArrowRight size={12} />
                                {capability}
                              </li>
                            ))}
                            {capabilities.length > 3 && (
                              <li className="text-white/50 text-sm">
                                +{capabilities.length - 3} more...
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Example Usage */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Sparkles size={28} />
                Example Usage
              </h2>
              
              <div className="space-y-4">
                <div className="bg-white/10 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-2">Single Employee Task:</h3>
                  <p className="text-white/70 text-sm mb-2">
                    "Categorize my uncategorized transactions" → Routes to Tag
                  </p>
                  <p className="text-white/70 text-sm mb-2">
                    "Help me pay off my debt faster" → Routes to Blitz
                  </p>
                  <p className="text-white/70 text-sm">
                    "What will my spending look like next month?" → Routes to Crystal
                  </p>
                </div>
                
                <div className="bg-white/10 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-2">Multi-Employee Collaboration:</h3>
                  <p className="text-white/70 text-sm mb-2">
                    "Give me a comprehensive review of my finances" → Prime coordinates all employees
                  </p>
                  <p className="text-white/70 text-sm mb-2">
                    "Help me optimize my debt payoff strategy" → Blitz + Fortune collaborate
                  </p>
                  <p className="text-white/70 text-sm">
                    "Analyze my spending patterns" → Tag + Crystal + Savage Sally work together
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIEmployeeDemo;
