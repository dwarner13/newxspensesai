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

            {/* Urgency Banner */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-full px-6 py-2 mb-8 inline-block"
            >
              <span className="text-red-300 text-sm font-medium">
                🤖 Limited Time: Automa's first month FREE for new users
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold text-white mb-6"
            >
              Meet{' '}
              <span className="text-purple-400 drop-shadow-lg">
                Automa
              </span>
              {' '}Your AI Financial Employee
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl md:text-2xl text-white/90 mb-8 max-w-4xl mx-auto leading-relaxed font-medium"
            >
              Stop managing your finances manually. Automa is your AI employee who works 24/7, makes 200+ daily decisions, and saves you 15+ hours per week. Watch your money grow while you sleep - Automa never takes a break.
            </motion.p>

            {/* Social Proof Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap justify-center items-center gap-8 mb-8 text-white/80"
            >
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                <span className="font-semibold">15+ hours saved weekly</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold">99.7% accuracy rate</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="font-semibold">$3,200 avg monthly savings</span>
              </div>
            </motion.div>

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
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                  {isLoading ? (
                    <>
                      <RefreshCw size={28} className="animate-spin" />
                      <span>Hiring Automa...</span>
                    </>
                  ) : (
                    <>
                      <Bot size={28} />
                      <span>Hire Automa - My AI Employee</span>
                      <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full ml-2">
                        FREE
                      </div>
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setShowAutomationStudio(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                    <Bot size={28} />
                    <span>Enter Automa's Office</span>
                  </button>
                  <button 
                    onClick={startAutomation}
                    className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 flex items-center justify-center gap-3 transform hover:scale-105"
                  >
                    <Play size={28} />
                    <span>See Automa In Action</span>
                  </button>
                </>
              )}
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="flex flex-wrap justify-center items-center gap-6 mt-8 text-white/60 text-sm"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>Your data stays private</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Setup in 2 minutes</span>
              </div>
            </motion.div>
          </div>

          {/* Testimonials Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-16"
          >
            <h3 className="text-2xl font-bold text-white text-center mb-8">
              🤖 What Users Are Saying About Automa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Award key={i} size={16} className="text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-white/90 mb-4 italic">
                  "Automa is like having a financial assistant who never sleeps. I wake up to find my bills paid, investments rebalanced, and $2,400 saved this month. It's like magic!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">S</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Sarah M.</p>
                    <p className="text-white/60 text-sm">Small Business Owner</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Award key={i} size={16} className="text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-white/90 mb-4 italic">
                  "I used to spend 20+ hours per week managing finances. Now Automa does everything automatically. I've gained back my weekends and my portfolio is up 23%!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">M</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Mike R.</p>
                    <p className="text-white/60 text-sm">Freelance Consultant</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-xl p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Award key={i} size={16} className="text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-white/90 mb-4 italic">
                  "Automa caught a billing error that saved me $1,200 and automatically optimized my tax strategy. It's like having a financial genius working for me 24/7!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">J</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">Jennifer L.</p>
                    <p className="text-white/60 text-sm">Marketing Director</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* AI Automation Team Showcase */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-6">Meet Automa's AI Team</h2>
            <p className="text-white/80 text-center mb-12 max-w-3xl mx-auto">
              Automa leads a team of specialized AI employees who work together to automate every aspect of your financial life. No more manual work - just AI that never sleeps and always makes the right decisions.
            </p>
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
            <h2 className="text-3xl font-bold text-white mb-4">Watch Automa Work Magic in Real-Time</h2>
            <p className="text-white/80">See Automa make 200+ daily decisions, optimize your finances, and save you thousands while you watch. This is the future of financial management - and it's happening right now.</p>
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

      {/* Automa's Capabilities Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">What Automa Does For You 24/7</h2>
            <p className="text-white/80">Automa never sleeps, never takes breaks, and never makes mistakes. Here's what your AI employee does while you focus on what matters most.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Bill Payment Optimization",
                description: "Automa pays bills at optimal times to maximize cash flow and avoid late fees",
                icon: "💳",
                features: ["Optimal payment timing", "Late fee prevention", "Cash flow optimization", "Automatic scheduling"]
              },
              {
                title: "Investment Rebalancing",
                description: "Automa monitors your portfolio and rebalances automatically for maximum returns",
                icon: "📈",
                features: ["Portfolio monitoring", "Automatic rebalancing", "Market timing", "Risk management"]
              },
              {
                title: "Expense Categorization",
                description: "Automa categorizes every transaction with 99.7% accuracy for perfect tax prep",
                icon: "🏷️",
                features: ["Smart categorization", "Tax optimization", "Receipt matching", "Audit trails"]
              },
              {
                title: "Fraud Detection",
                description: "Automa catches suspicious activity and protects your accounts 24/7",
                icon: "🛡️",
                features: ["Real-time monitoring", "Fraud prevention", "Instant alerts", "Account protection"]
              }
            ].map((capability, index) => (
              <motion.div 
                key={capability.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 rounded-xl p-6 border border-white/20 hover:scale-105 transition-all duration-300"
              >
                <div className="text-4xl mb-4">{capability.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-3">{capability.title}</h3>
                <p className="text-white/80 mb-4 text-sm">{capability.description}</p>
                <div className="space-y-2">
                  {capability.features.map((item, idx) => (
                    <div key={idx} className="text-white/70 text-xs flex items-center gap-2">
                      <CheckCircle size={12} className="text-green-400" />
                      {item}
                    </div>
                  ))}
                </div>
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
            Stop Managing Your Finances Manually - Hire Automa Today
          </h2>
          <p className="text-white/80 text-lg mb-6 max-w-2xl mx-auto">
            Join 12,000+ users who've hired Automa as their AI financial employee. Get 15+ hours back per week, save thousands monthly, and watch your money grow while you sleep. Automa never takes a break.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button 
              onClick={() => setShowAutomationStudio(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center justify-center gap-3 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              <Bot size={28} />
              <span>Hire Automa - My AI Employee</span>
              <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full ml-2">
                FREE
              </div>
            </button>
            <button 
              onClick={startAutomation}
              className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-10 py-5 rounded-xl font-bold text-xl transition-all duration-300 flex items-center justify-center gap-3 transform hover:scale-105"
            >
              <Play size={28} />
              <span>See Automa In Action</span>
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
