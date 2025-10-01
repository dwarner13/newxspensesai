import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Crown, Bot, Calculator, BarChart3, Brain, Headphones, 
  Users, Zap, Target, TrendingUp, ArrowRight, Star,
  CheckCircle, Play, Settings, MessageCircle, Sparkles, Clock, Shield,
  Mic, Music, TrendingDown, FileText, CreditCard, PiggyBank, Building2,
  Heart, Eye, Lightbulb, Shield as SecurityIcon, Volume2, Briefcase,
  Flame, Rocket, Gem, Compass, Telescope, Crown as CrownIcon,
  Eye as EyeIcon, Sparkles as SparklesIcon, Zap as ZapIcon,
  TrendingUp as TrendingUpIcon, AlertTriangle, Calendar, DollarSign,
  Clock as ClockIcon, Target as TargetIcon, BarChart3 as BarChart3Icon,
  PieChart as PieChartIcon, TrendingDown as TrendingDownIcon,
  ArrowUpRight, ArrowDownRight, Minus, Plus, RotateCcw, Shuffle,
  Bell, AlertCircle, CheckCircle2, XCircle, CreditCard as CreditCardIcon,
  Home, Car, ShoppingCart, Heart as HeartIcon, Zap as ZapIcon2
} from 'lucide-react';

const BillRemindersFeaturePage = () => {
  const [activeBill, setActiveBill] = useState('rent');
  const [isGuardianActive, setIsGuardianActive] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [guardianStage, setGuardianStage] = useState(0);
  const [showProtection, setShowProtection] = useState(false);

  // Chime's AI Team for Bill Protection
  const guardianTeam = [
    {
      name: "Chime",
      role: "AI Bill Guardian & Payment Protection Master",
      specialty: "100% Payment Success Rate",
      superpower: "Never Miss a Payment",
      color: "from-orange-500 via-red-500 to-pink-500",
      icon: "🔔",
      description: "Your personal AI bill guardian who ensures you never miss a payment again. Chime monitors, reminds, and protects your financial commitments with military precision.",
      avatar: "🔔"
    },
    {
      name: "Shield",
      role: "Payment Security & Fraud Protection",
      specialty: "Real-time Security Monitoring",
      superpower: "Bulletproof Payment Security",
      color: "from-blue-500 to-indigo-600",
      icon: "🛡️",
      description: "Works with Chime to protect every payment from fraud and security threats. Shield ensures your financial transactions are always safe and secure.",
      avatar: "🛡️"
    },
    {
      name: "Crystal",
      role: "Predictive Bill Analysis & Smart Scheduling",
      specialty: "Future Bill Prediction",
      superpower: "Anticipates Your Bills",
      color: "from-indigo-500 to-purple-600",
      icon: "🔮",
      description: "Helps Chime predict upcoming bills and optimize payment timing. Crystal uses AI to suggest the best payment strategies for maximum financial efficiency.",
      avatar: "🔮"
    },
    {
      name: "Wisdom",
      role: "Strategic Payment Planning & Optimization",
      specialty: "Payment Strategy Optimization",
      superpower: "Maximizes Your Money",
      color: "from-purple-500 to-pink-600",
      icon: "🧠",
      description: "Provides strategic insights to Chime's payment system, ensuring optimal cash flow and helping you avoid late fees and penalties.",
      avatar: "🧠"
    }
  ];

  // Bill Protection Scenarios
  const protectionScenarios = [
    {
      type: "rent",
      user: "Chime, protect my rent payment of $1,200",
      chime: "I've got your back! Let me set up comprehensive protection for your rent payment... This is critical housing security!",
      shield: "Security protocols activated! I'm monitoring your payment account and setting up fraud protection for this transaction.",
      crystal: "Based on your payment history, I recommend setting reminders 7, 3, and 1 day before due date for optimal protection.",
      wisdom: "Consider linking this to your primary checking account for automatic payment. I'll ensure you never face housing insecurity.",
      color: "from-green-500 to-emerald-600",
      bill: "Rent Payment",
      amount: "$1,200",
      protection: "100% Secure",
      strategy: "Triple Reminder System"
    },
    {
      type: "car",
      user: "Chime, watch over my car payment",
      chime: "Your wheels are precious! Let me establish a protective shield around your car payment... This is transportation security!",
      shield: "Payment fortress activated! I'm setting up secure payment channels and monitoring for any payment anomalies.",
      crystal: "I've detected your payment pattern. Setting up reminders 5, 2, and 1 day before due date to ensure smooth processing.",
      wisdom: "I recommend enabling auto-pay for this critical payment. Your credit score and vehicle security depend on this!",
      color: "from-blue-500 to-indigo-600",
      bill: "Car Payment",
      amount: "$350",
      protection: "100% Secure",
      strategy: "Auto-Pay + Smart Reminders"
    },
    {
      type: "utilities",
      user: "Chime, guard my utility bills",
      chime: "Essential services protection activated! Let me shield your utility payments... This is basic living security!",
      shield: "Utility payment shield deployed! I'm monitoring for any service interruptions and ensuring payment continuity.",
      crystal: "I've analyzed your usage patterns. Setting up flexible reminders based on your actual consumption cycles.",
      wisdom: "Consider budget billing to smooth out seasonal variations. I'll help you maintain consistent monthly payments.",
      color: "from-purple-500 to-pink-600",
      bill: "Utility Bills",
      amount: "$89.50",
      protection: "100% Secure",
      strategy: "Smart Budget Billing"
    },
    {
      type: "subscriptions",
      user: "Chime, protect my streaming subscriptions",
      chime: "Entertainment security engaged! Let me safeguard your subscription payments... This is lifestyle protection!",
      shield: "Subscription shield activated! I'm monitoring for any service interruptions and ensuring seamless entertainment access.",
      crystal: "I've detected your viewing patterns. Setting up reminders 2 days before renewal to prevent service disruption.",
      wisdom: "Consider annual billing for better value. I'll help you optimize your entertainment spending while maintaining service quality.",
      color: "from-orange-500 to-red-600",
      bill: "Streaming Subscriptions",
      amount: "$15.99",
      protection: "100% Secure",
      strategy: "Annual Billing + Smart Reminders"
    }
  ];

  // Protection Stages
  const protectionStages = [
    {
      stage: 1,
      title: "Bill Detection",
      description: "Chime automatically detects and categorizes all your bills",
      icon: "🔍",
      color: "from-blue-500 to-cyan-500"
    },
    {
      stage: 2,
      title: "Smart Scheduling",
      description: "AI optimizes payment timing for maximum financial efficiency",
      icon: "📅",
      color: "from-cyan-500 to-teal-500"
    },
    {
      stage: 3,
      title: "Multi-Channel Reminders",
      description: "Notifications across email, SMS, app, and calendar",
      icon: "🔔",
      color: "from-teal-500 to-green-500"
    },
    {
      stage: 4,
      title: "Payment Protection",
      description: "Fraud detection and secure payment processing",
      icon: "🛡️",
      color: "from-green-500 to-emerald-500"
    },
    {
      stage: 5,
      title: "Success Guarantee",
      description: "100% payment success rate with late fee protection",
      icon: "✅",
      color: "from-emerald-500 to-blue-500"
    }
  ];

  // Simulate AI response
  useEffect(() => {
    if (isGuardianActive) {
      const currentScenario = protectionScenarios.find(s => s.type === activeBill);
      if (currentScenario) {
        setCurrentResponse(currentScenario.chime);
        setGuardianStage(0);
      }
    }
  }, [isGuardianActive, activeBill]);

  const startGuardianService = (billType: string) => {
    setActiveBill(billType);
    setIsGuardianActive(true);
    setShowProtection(true);
    setTimeout(() => setShowProtection(false), 2000);
  };

  const nextGuardianStage = () => {
    setGuardianStage(prev => prev + 1);
    const currentScenario = getCurrentScenario();
    if (guardianStage === 0) {
      setCurrentResponse(currentScenario.shield);
    } else if (guardianStage === 1) {
      setCurrentResponse(currentScenario.crystal);
    } else if (guardianStage === 2) {
      setCurrentResponse(currentScenario.wisdom);
    }
  };

  const getCurrentScenario = () => {
    return protectionScenarios.find(s => s.type === activeBill) || protectionScenarios[0];
  };

  return (
    <>
      <Helmet>
        <title>AI Bill Guardian Theater - Your AI Payment Protection Master for 100% Bill Success | XspensesAI</title>
        <meta name="description" content="Experience Chime's AI Bill Guardian Theater where bill management becomes effortless and secure. 100% payment success rate with intelligent reminders and fraud protection." />
        <meta name="keywords" content="AI bill reminders, payment protection, bill management, AI reminders, financial security, payment success" />
        <style>
          {`
            @keyframes spin-slow {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .animate-spin-slow {
              animation: spin-slow 8s linear infinite;
            }
            @keyframes pulse-glow {
              0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); }
              50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.8); }
            }
            .animate-pulse-glow {
              animation: pulse-glow 2s ease-in-out infinite;
            }
          `}
        </style>
      </Helmet>

      {/* Hero Section */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          {/* Prime's Crown Badge */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white px-4 py-2 rounded-full shadow-2xl"
            >
              <Crown size={20} className="mr-2" />
              <span className="font-bold">Prime's AI Payment Protection Division</span>
            </div>
          </div>

          {/* Hero Content */}
          <div className="text-center mb-16">
            <h1
              className="text-5xl md:text-7xl font-extrabold text-white mb-6"
            >
              AI Bill Guardian Theater
            </h1>
            <p
              className="text-xl md:text-2xl text-white/80 max-w-4xl mx-auto mb-8"
            >
              Where Chime and his AI team transform bill management from stress into seamless, intelligent protection with 100% payment success rate
            </p>
            <div
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                to="/signup"
                className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-2xl"
              >
                Start Protecting Today
              </Link>
              <button
                onClick={() => startGuardianService('rent')}
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 border border-white/20 backdrop-blur-md"
              >
                Watch Chime in Action
              </button>
            </div>
          </div>

          {/* Performance Stats */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16"
          >
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-red-400 mb-2">100%</div>
              <div className="text-white/60">Payment Success</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-orange-400 mb-2">0</div>
              <div className="text-white/60">Late Fees</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-pink-400 mb-2">24/7</div>
              <div className="text-white/60">Bill Monitoring</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-red-400 mb-2">5x</div>
              <div className="text-white/60">Faster Setup</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chime's AI Team Showcase */}
      <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Meet Chime's AI Protection Team
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Meet the AI specialists who make Chime's bill protection possible with their unique abilities and expertise
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {guardianTeam.map((member, index) => (
              <div
                key={member.name}
                className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-105"
              >
                <div className="text-center">
                  <div className={`w-20 h-20 bg-gradient-to-r ${member.color} rounded-full flex items-center justify-center text-4xl mb-4 mx-auto`}>
                    {member.avatar}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{member.name}</h3>
                  <p className="text-orange-400 font-semibold text-sm mb-3">{member.role}</p>
                  <div className="bg-white/10 rounded-lg p-3 mb-4">
                    <p className="text-white/80 text-sm font-semibold">{member.specialty}</p>
                  </div>
                  <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-lg p-3 mb-4">
                    <p className="text-red-300 text-sm font-semibold">{member.superpower}</p>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed">{member.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Protection Demo */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-red-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Live Bill Protection Theater
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Experience Chime's magical protection in real-time as he consults with his AI team to safeguard your payments
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Demo Interface */}
            <div
              className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
            >
              <h3 className="text-2xl font-bold text-white mb-6">Try Chime's Protection</h3>
              
              {/* Bill Selection */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {protectionScenarios.map((scenario) => (
                  <button
                    key={scenario.type}
                    onClick={() => startGuardianService(scenario.type)}
                    className={`p-4 rounded-xl text-left transition-all duration-200 ${
                      activeBill === scenario.type
                        ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-400/50'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="text-white font-semibold mb-1">
                      {scenario.type === 'rent' && '🏠 Rent'}
                      {scenario.type === 'car' && '🚗 Car Payment'}
                      {scenario.type === 'utilities' && '⚡ Utilities'}
                      {scenario.type === 'subscriptions' && '📺 Subscriptions'}
                    </div>
                    <div className="text-white/60 text-sm">
                      {scenario.user.split(', ')[1]}
                    </div>
                  </button>
                ))}
              </div>

              {/* AI Response Display */}
              {isGuardianActive && (
                <div
                  className="bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-xl p-6 border border-red-400/30"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-600 rounded-full flex items-center justify-center">
                      <Bell size={20} className="text-white" />
                    </div>
                    <div className="text-white font-semibold">Chime's Response</div>
                  </div>
                  <p className="text-white/90 mb-4">{currentResponse}</p>
                  
                  {guardianStage < 3 && (
                    <button
                      onClick={nextGuardianStage}
                      className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200"
                    >
                      Continue Protection
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Results Display */}
            <div
              className="space-y-6"
            >
              {protectionScenarios.map((scenario) => (
                <div
                  key={scenario.type}
                  className={`bg-gradient-to-br ${scenario.color} rounded-2xl p-6 text-white ${
                    activeBill === scenario.type ? 'ring-4 ring-red-400/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold">
                      {scenario.type === 'rent' && '🏠 Rent Protection'}
                      {scenario.type === 'car' && '🚗 Car Payment Protection'}
                      {scenario.type === 'utilities' && '⚡ Utility Protection'}
                      {scenario.type === 'subscriptions' && '📺 Subscription Protection'}
                    </h4>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{scenario.protection}</div>
                      <div className="text-sm opacity-80">Security Level</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-sm opacity-80">Bill Amount</div>
                      <div className="font-semibold">{scenario.amount}</div>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <div className="text-sm opacity-80">Protection Strategy</div>
                      <div className="font-semibold">{scenario.strategy}</div>
                    </div>
                  </div>
                  
                  <div className="bg-white/20 rounded-lg p-3">
                    <div className="text-sm opacity-80 mb-2">AI Guardian Status</div>
                    <div className="font-semibold text-green-300">🛡️ Protected & Monitored</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Chime's Protection Journey */}
      <section className="py-20 bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Chime's Protection Journey
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Watch Chime evolve from basic reminders to intelligent bill protection through continuous AI learning
            </p>
          </div>

          <div className="relative">
            {/* Connection Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-orange-500 transform -translate-x-1/2"></div>
            
            <div className="space-y-12">
              {protectionStages.map((stage, index) => (
                <div
                  key={stage.stage}
                  className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  {/* Stage Content */}
                  <div className={`flex-1 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <div className={`inline-block bg-gradient-to-r ${stage.color} rounded-2xl p-6 text-white max-w-md`}>
                      <div className="text-3xl mb-3">{stage.icon}</div>
                      <h3 className="text-xl font-bold mb-2">Stage {stage.stage}: {stage.title}</h3>
                      <p className="text-white/90">{stage.description}</p>
                    </div>
                  </div>
                  
                  {/* Stage Number */}
                  <div className="relative z-10">
                    <div className={`w-16 h-16 bg-gradient-to-r ${stage.color} rounded-full flex items-center justify-center text-white font-bold text-xl border-4 border-slate-800`}>
                      {stage.stage}
                    </div>
                  </div>
                  
                  {/* Empty Space for Alignment */}
                  <div className="flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-red-900 to-orange-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Experience Chime's Protection?
            </h2>
            <p className="text-xl text-white/80 mb-8">
              Join thousands of users who've transformed their bill management with Chime's AI protection. 
              Experience 100% payment success and never worry about late fees again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="bg-white text-red-900 hover:bg-gray-100 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 shadow-2xl"
              >
                Start Protecting Today
              </Link>
              <Link
                to="/ai-employees"
                className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 border border-white/20 backdrop-blur-md"
              >
                Meet the Full AI Team
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default BillRemindersFeaturePage;
