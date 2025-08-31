import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Zap, Crown, Brain, Settings, Play, RefreshCw, CheckCircle, 
  DollarSign, TrendingUp, Target, BarChart3, PieChart, 
  ArrowRight, Upload, Download, Eye, Sparkles, Award,
  Bot, Cpu, Database, Network, Lock, Key, Shield, 
  Clock, Calendar, Bell, AlertTriangle, Lightbulb, Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIEmployee {
  name: string;
  role: string;
  avatar: string;
  specialty: string;
  color: string;
  automationStyle: string;
}

interface AutomationScenario {
  id: string;
  title: string;
  description: string;
  aiDecision: string;
  impact: string;
  confidence: number;
  timeSaved: string;
}

interface AutomationStage {
  stage: string;
  description: string;
  icon: string;
}

const SmartAutomationFeaturePage = () => {
  const [showAutomationStudio, setShowAutomationStudio] = useState(false);
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationProgress, setAutomationProgress] = useState(0);
  const [selectedAutomationType, setSelectedAutomationType] = useState<string>('basic');
  const [currentScenarios, setCurrentScenarios] = useState<AutomationScenario[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // AI Automation Team
  const aiAutomationTeam: AIEmployee[] = [
    {
      name: 'Prime',
      role: 'AI Automation Director',
      avatar: '👑',
      specialty: 'Strategic Automation Planning',
      color: 'from-purple-500 to-pink-500',
      automationStyle: 'Orchestrates your complete automation strategy and autonomous control'
    },
    {
      name: 'Byte',
      role: 'AI Process Optimizer',
      avatar: '⚙️',
      specialty: 'Workflow Automation',
      color: 'from-blue-500 to-cyan-500',
      automationStyle: 'Optimizes every process and workflow for maximum efficiency'
    },
    {
      name: 'Tag',
      role: 'AI Rule Engine',
      avatar: '🏷️',
      specialty: 'Smart Rule Creation',
      color: 'from-green-500 to-emerald-500',
      automationStyle: 'Creates and manages intelligent automation rules'
    },
    {
      name: 'Crystal',
      role: 'AI Prediction Engine',
      avatar: '🔮',
      specialty: 'Predictive Automation',
      color: 'from-indigo-500 to-purple-500',
      automationStyle: 'Predicts needs and automates before you even think about it'
    }
  ];

  // Sample Automation Scenarios
  const automationScenarios: AutomationScenario[] = [
    {
      id: '1',
      title: 'Bill Payment Optimization',
      description: 'AI detected optimal payment timing for maximum cash flow',
      aiDecision: 'Automatically scheduled all bills for optimal dates',
      impact: '+$127 saved this month',
      confidence: 98,
      timeSaved: '2.5 hours'
    },
    {
      id: '2',
      title: 'Expense Categorization',
      description: 'AI categorized 47 transactions with 99.7% accuracy',
      aiDecision: 'Applied smart categorization rules automatically',
      impact: 'Perfect tax preparation',
      confidence: 99,
      timeSaved: '1.2 hours'
    },
    {
      id: '3',
      title: 'Investment Rebalancing',
      description: 'AI detected portfolio drift and rebalanced automatically',
      aiDecision: 'Executed rebalancing trades at optimal market timing',
      impact: '+$340 portfolio value',
      confidence: 95,
      timeSaved: '3.1 hours'
    }
  ];

  // Automation Stages
  const automationStages: AutomationStage[] = [
    { stage: 'Analyzing your financial patterns...', description: 'AI is learning your unique financial behavior', icon: '🧠' },
    { stage: 'Byte is optimizing processes...', description: 'Creating efficient automation workflows', icon: '⚙️' },
    { stage: 'Tag is creating smart rules...', description: 'Building intelligent automation rules', icon: '🏷️' },
    { stage: 'Crystal is predicting needs...', description: 'Forecasting future automation opportunities', icon: '🔮' },
    { stage: 'Prime is orchestrating automation...', description: 'Coordinating complete automation strategy', icon: '👑' },
    { stage: 'Your AI Automation is live! ⚡', description: 'Autonomous financial control activated', icon: '✨' }
  ];

  // Demo Functions
  const handleAutomationConnect = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
    }, 2000);
  };

  const startAutomation = () => {
    setIsAutomating(true);
    setAutomationProgress(0);
    
    const interval = setInterval(() => {
      setAutomationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAutomating(false);
          setCurrentScenarios(automationScenarios);
          return 100;
        }
        return prev + 15;
      });
    }, 600);
  };

  return (
    <>
      <Helmet>
        <title>AI Smart Automation - Revolutionary Financial Autopilot | XspensesAI Platform</title>
        <meta name="description" content="Revolutionary AI Smart Automation that takes complete control of your finances. Watch AI make 200+ daily decisions, optimize everything automatically, and achieve superhuman accuracy." />
        <meta name="keywords" content="AI smart automation, financial autopilot, automated budgeting, AI financial control, smart automation, autonomous finance, AI automation theater, predictive automation" />
        <meta property="og:title" content="AI Smart Automation - Revolutionary Financial Autopilot | XspensesAI Platform" />
        <meta property="og:description" content="Revolutionary AI Smart Automation that takes complete control of your finances." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Smart Automation - Revolutionary Financial Autopilot | XspensesAI Platform" />
        <meta name="twitter:description" content="Revolutionary AI Smart Automation for complete financial control." />
      </Helmet>

      {/* Hero Section */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            {/* Prime Badge */}
            <div className="text-center mb-8">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 mb-8"
              >
                <Crown size={20} className="text-yellow-400" />
                <span className="text-white font-semibold">Prime's AI Automation Division</span>
              </motion.div>
            </div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold text-white mb-6"
            >
              The World's First AI Smart Automation
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg md:text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed"
            >
              Revolutionary AI that takes complete control of your finances. Watch AI make 200+ daily decisions, optimize everything automatically, and achieve superhuman accuracy. Experience the future of autonomous financial management.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center"
            >
              {!isConnected ? (
                <button 
                  onClick={handleAutomationConnect}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={24} className="animate-spin" />
                      Connecting to AI Automation...
                    </>
                  ) : (
                    <>
                      <Zap size={24} />
                      Connect Your Financial Data
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setShowAutomationStudio(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <Zap size={24} />
                    Enter AI Automation Studio
                  </button>
                  <button 
                    onClick={startAutomation}
                    className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Play size={24} />
                    Start AI Automation
                  </button>
                </>
              )}
            </motion.div>
          </div>

          {/* AI Automation Team Showcase */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-12">Meet Your AI Automation Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {aiAutomationTeam.map((member, index) => (
                <motion.div 
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300"
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">{member.avatar}</div>
                    <h3 className="text-xl font-bold text-white mb-2">{member.name}</h3>
                    <p className="text-cyan-400 font-semibold mb-3">{member.role}</p>
                    <p className="text-white/70 text-sm mb-4">{member.specialty}</p>
                    <div className={`w-full h-1 bg-gradient-to-r ${member.color} rounded-full`}></div>
                    <p className="text-white/60 text-xs mt-3">{member.automationStyle}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Live AI Automation Theater */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Live AI Automation Theater</h2>
            <p className="text-white/80">Watch our AI automation team take control of your finances in real-time</p>
          </div>

          {/* Automation Progress */}
          {isAutomating && (
            <div className="bg-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Activating AI Automation</h3>
                <span className="text-cyan-400 font-bold">{automationProgress}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${automationProgress}%` }}
                ></div>
              </div>
              <div className="text-center">
                <p className="text-white/70 text-sm">
                  {automationStages[Math.floor((automationProgress / 100) * (automationStages.length - 1))]?.stage}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  {automationStages[Math.floor((automationProgress / 100) * (automationStages.length - 1))]?.description}
                </p>
              </div>
            </div>
          )}

          {/* Automation Scenarios Display */}
          {currentScenarios.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white/10 rounded-xl p-6 mb-6"
            >
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles size={20} className="text-yellow-400" />
                AI Automation in Action
              </h3>
              <div className="space-y-4">
                {currentScenarios.map((scenario) => (
                  <div key={scenario.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-white">{scenario.title}</h4>
                        <p className="text-white/80 text-sm">{scenario.description}</p>
                        <p className="text-white/70 text-xs mt-1">{scenario.aiDecision}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold text-lg">{scenario.impact}</div>
                        <div className="text-cyan-400 text-sm">{scenario.confidence}% confidence</div>
                        <div className="text-purple-400 text-xs">{scenario.timeSaved} saved</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
                  <CheckCircle size={16} />
                  View All Automations
                </button>
                <button className="border border-white/30 text-white px-6 py-2 rounded-lg font-semibold">
                  Export Report
                </button>
              </div>
            </motion.div>
          )}

          {/* Automation Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[
              {
                title: "Autonomous Decision Making",
                description: "AI makes 200+ daily financial decisions automatically",
                icon: "🤖",
                color: "from-purple-500 to-pink-500"
              },
              {
                title: "Predictive Automation",
                description: "AI predicts needs and automates before you think about it",
                icon: "🔮",
                color: "from-blue-500 to-cyan-500"
              },
              {
                title: "Superhuman Accuracy",
                description: "99.7% accuracy in all automated financial decisions",
                icon: "⚡",
                color: "from-green-500 to-emerald-500"
              }
            ].map((feature, index) => (
              <motion.div 
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300"
              >
                <div className={`w-16 h-16 bg-gradient-to-r ${feature.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 text-center">{feature.title}</h3>
                <p className="text-white/80 text-sm leading-relaxed text-center">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Automation Types Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Revolutionary Automation Types</h2>
            <p className="text-white/80">Choose your level of AI automation control</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                type: 'basic',
                title: 'Basic Automation',
                icon: '⚙️',
                description: 'Simple rule-based automation for essential tasks',
                features: ['Bill payments', 'Expense categorization', 'Basic budgeting'],
                color: 'from-green-500 to-emerald-500'
              },
              {
                type: 'smart',
                title: 'Smart Automation',
                icon: '🧠',
                description: 'AI-powered intelligent automation with learning',
                features: ['Predictive budgeting', 'Smart categorization', 'Optimization suggestions'],
                color: 'from-blue-500 to-cyan-500'
              },
              {
                type: 'autonomous',
                title: 'Autonomous Automation',
                icon: '🤖',
                description: 'Complete AI control with human oversight',
                features: ['Autonomous decisions', 'Predictive actions', 'Complete control'],
                color: 'from-purple-500 to-pink-500'
              }
            ].map((automation, index) => (
              <motion.div 
                key={automation.type}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`bg-white/10 rounded-xl p-6 border border-white/20 hover:scale-105 transition-all duration-300 ${
                  selectedAutomationType === automation.type ? 'ring-2 ring-purple-400' : ''
                }`}
                onClick={() => setSelectedAutomationType(automation.type)}
              >
                <div className="text-center mb-4">
                  <div className="text-4xl mb-3">{automation.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{automation.title}</h3>
                  <p className="text-white/70 text-sm mb-4">{automation.description}</p>
                </div>
                
                <div className="space-y-2">
                  {automation.features.map((feature, idx) => (
                    <div key={idx} className="text-white/70 text-sm flex items-center gap-2">
                      <CheckCircle size={12} className="text-green-400" />
                      {feature}
                    </div>
                  ))}
                </div>
                
                <div className={`w-full h-1 bg-gradient-to-r ${automation.color} rounded-full mt-4`}></div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Call to Action */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Experience Revolutionary AI Automation?
          </h2>
          <p className="text-white/80 text-lg mb-6 max-w-2xl mx-auto">
            Connect your financial data to unlock autonomous AI control, predictive automation, and superhuman accuracy. Let AI take complete control of your finances with 99.7% accuracy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setShowAutomationStudio(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Zap size={24} />
              Start AI Automation
            </button>
            <button 
              onClick={startAutomation}
              className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Try Free Demo
            </button>
          </div>
        </motion.div>
      </div>

      {/* AI Automation Studio Modal */}
      <AnimatePresence>
        {showAutomationStudio && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAutomationStudio(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl p-8 max-w-2xl w-full border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">AI Automation Studio</h2>
                <p className="text-white/80">Choose your automation type and let our AI team take control</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  { type: 'basic', title: 'Basic Automation', icon: '⚙️', description: 'Simple rule-based automation' },
                  { type: 'smart', title: 'Smart Automation', icon: '🧠', description: 'AI-powered intelligent automation' },
                  { type: 'autonomous', title: 'Autonomous Control', icon: '🤖', description: 'Complete AI control' }
                ].map((option) => (
                  <button
                    key={option.type}
                    onClick={() => {
                      setSelectedAutomationType(option.type);
                      setShowAutomationStudio(false);
                      startAutomation();
                    }}
                    className="p-6 rounded-xl border-2 border-white/20 bg-white/5 hover:border-purple-300 hover:bg-purple-500/10 transition-all duration-300"
                  >
                    <div className="text-4xl mb-3">{option.icon}</div>
                    <h3 className="text-lg font-semibold text-white mb-2">{option.title}</h3>
                    <p className="text-white/70 text-sm">{option.description}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => setShowAutomationStudio(false)}
                  className="px-6 py-3 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowAutomationStudio(false);
                    startAutomation();
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
                >
                  Start Automation
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SmartAutomationFeaturePage;
