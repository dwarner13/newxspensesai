import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { 
  Calculator, Crown, Zap, FileText, Receipt, TrendingUp, 
  Play, RefreshCw, CheckCircle, AlertTriangle, DollarSign,
  Calendar, Target, BarChart3, PieChart, ArrowRight, 
  Upload, Download, Eye, Brain, Sparkles, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


interface AIEmployee {
  name: string;
  role: string;
  avatar: string;
  specialty: string;
  color: string;
  taxStyle: string;
}

interface TaxSuggestion {
  id: string;
  category: string;
  description: string;
  potentialSavings: string;
  confidence: number;
  aiReason: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  amount: number;
  deductible: boolean;
  taxImpact: string;
  suggestions: string[];
}

interface TaxStage {
  stage: string;
  description: string;
  icon: string;
}

const TaxAssistantFeaturePage = () => {
  const [showTaxStudio, setShowTaxStudio] = useState(false);
  const [isAnalyzingExpenses, setIsAnalyzingExpenses] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedTaxYear, setSelectedTaxYear] = useState<string>('2024');
  const [currentSuggestions, setCurrentSuggestions] = useState<TaxSuggestion[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // AI Tax Team
  const aiTaxTeam: AIEmployee[] = [
    {
      name: 'Prime',
      role: 'AI Tax Director',
      avatar: '👑',
      specialty: 'Strategic Tax Planning',
      color: 'from-purple-500 to-pink-500',
      taxStyle: 'Orchestrates your complete tax strategy and optimization'
    },
    {
      name: 'Byte',
      role: 'AI Receipt Processor',
      avatar: '📄',
      specialty: 'Receipt Intelligence',
      color: 'from-blue-500 to-cyan-500',
      taxStyle: 'Reads and categorizes receipts with 99% accuracy'
    },
    {
      name: 'Tag',
      role: 'AI Expense Categorizer',
      avatar: '🏷️',
      specialty: 'Smart Categorization',
      color: 'from-green-500 to-emerald-500',
      taxStyle: 'Automatically categorizes expenses for maximum deductions'
    },
    {
      name: 'Crystal',
      role: 'AI Tax Predictor',
      avatar: '🔮',
      specialty: 'Tax Forecasting',
      color: 'from-indigo-500 to-purple-500',
      taxStyle: 'Predicts tax implications and suggests optimizations'
    }
  ];

  // Sample Tax Suggestions
  const taxSuggestions: TaxSuggestion[] = [
    {
      id: '1',
      category: 'Business Expenses',
      description: 'Home office deduction opportunity detected',
      potentialSavings: '$2,400',
      confidence: 95,
      aiReason: 'Based on your remote work patterns and home office setup'
    },
    {
      id: '2',
      category: 'Medical Expenses',
      description: 'Medical receipts qualify for deduction',
      potentialSavings: '$1,200',
      confidence: 88,
      aiReason: 'Medical expenses exceed 7.5% of your AGI threshold'
    },
    {
      id: '3',
      category: 'Charitable Donations',
      description: 'Unclaimed charitable contributions found',
      potentialSavings: '$800',
      confidence: 92,
      aiReason: 'Donation receipts from verified charities detected'
    }
  ];

  // Sample Expense Categories
  const expenseCategories: ExpenseCategory[] = [
    {
      id: '1',
      name: 'Business Meals',
      amount: 2400,
      deductible: true,
      taxImpact: '50% deductible',
      suggestions: ['Keep detailed receipts', 'Note business purpose']
    },
    {
      id: '2',
      name: 'Home Office',
      amount: 1800,
      deductible: true,
      taxImpact: '100% deductible',
      suggestions: ['Measure office space', 'Document exclusive use']
    },
    {
      id: '3',
      name: 'Professional Development',
      amount: 1200,
      deductible: true,
      taxImpact: '100% deductible',
      suggestions: ['Keep course certificates', 'Document business relevance']
    }
  ];

  // Tax Analysis Stages
  const taxStages: TaxStage[] = [
    { stage: 'Scanning your receipts...', description: 'AI is reading and categorizing your documents', icon: '📄' },
    { stage: 'Byte is processing receipts...', description: 'Extracting key information from receipts', icon: '🔍' },
    { stage: 'Tag is categorizing expenses...', description: 'Smart classification for maximum deductions', icon: '🏷️' },
    { stage: 'Crystal is analyzing tax impact...', description: 'Calculating potential savings and optimizations', icon: '🔮' },
    { stage: 'Prime is optimizing your strategy...', description: 'Coordinating the complete tax approach', icon: '👑' },
    { stage: 'Your AI Tax Analysis is ready! 💰', description: 'Personalized tax optimization complete', icon: '✨' }
  ];

  // Demo Functions
  const handleTaxConnect = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
    }, 2000);
  };

  const analyzeExpenses = () => {
    setIsAnalyzingExpenses(true);
    setAnalysisProgress(0);
    
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAnalyzingExpenses(false);
          setCurrentSuggestions(taxSuggestions);
          return 100;
        }
        return prev + 15;
      });
    }, 600);
  };

  return (
    <>
      <Helmet>
        <title>AI Tax Assistant - Smart Tax Optimization | XspensesAI Platform</title>
        <meta name="description" content="Revolutionary AI Tax Assistant that analyzes your expenses, suggests deductions, and optimizes your tax strategy. Get free tax suggestions and comprehensive expense summaries." />
        <meta name="keywords" content="AI tax assistant, tax optimization, expense categorization, tax deductions, receipt scanning, tax planning, AI tax advisor, smart tax preparation" />
        <meta property="og:title" content="AI Tax Assistant - Smart Tax Optimization | XspensesAI Platform" />
        <meta property="og:description" content="Revolutionary AI Tax Assistant that analyzes your expenses, suggests deductions, and optimizes your tax strategy." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Tax Assistant - Smart Tax Optimization | XspensesAI Platform" />
        <meta name="twitter:description" content="Revolutionary AI Tax Assistant that analyzes your expenses and suggests deductions." />
      </Helmet>

      {/* Hero Section */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            {/* Prime Badge */}
            <div className="text-center mb-8">
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 mb-8"
              >
                <Crown size={20} className="text-yellow-400" />
                <span className="text-white font-semibold">Prime's AI Tax Division</span>
              </motion.div>
            </div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-6xl font-bold text-white mb-6"
            >
              The World's First AI Tax Assistant
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-lg md:text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed"
            >
              Revolutionary AI that analyzes your expenses, suggests deductions, and optimizes your tax strategy. Get free tax suggestions, comprehensive expense summaries, and intelligent tax planning - all powered by advanced AI.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center"
            >
              {!isConnected ? (
                <button 
                  onClick={handleTaxConnect}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={24} className="animate-spin" />
                      Connecting to Tax AI...
                    </>
                  ) : (
                    <>
                      <Calculator size={24} />
                      Connect Your Financial Data
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setShowTaxStudio(true)}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-cyan-500 hover:to-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <Calculator size={24} />
                    Enter AI Tax Studio
                  </button>
                  <button 
                    onClick={analyzeExpenses}
                    className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Zap size={24} />
                    Analyze My Expenses
                  </button>
                </>
              )}
            </motion.div>
          </div>

          {/* AI Tax Team Showcase */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-12">Meet Your AI Tax Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {aiTaxTeam.map((member, index) => (
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
                    <p className="text-white/60 text-xs mt-3">{member.taxStyle}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Live AI Tax Analysis Theater */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">Live AI Tax Analysis Theater</h2>
            <p className="text-white/80">Watch our AI tax team analyze your expenses and suggest optimizations in real-time</p>
          </div>

          {/* Analysis Progress */}
          {isAnalyzingExpenses && (
            <div className="bg-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Analyzing Your Tax Situation</h3>
                <span className="text-cyan-400 font-bold">{analysisProgress}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${analysisProgress}%` }}
                ></div>
              </div>
              <div className="text-center">
                <p className="text-white/70 text-sm">
                  {taxStages[Math.floor((analysisProgress / 100) * (taxStages.length - 1))]?.stage}
                </p>
                <p className="text-white/50 text-xs mt-1">
                  {taxStages[Math.floor((analysisProgress / 100) * (taxStages.length - 1))]?.description}
                </p>
              </div>
            </div>
          )}

          {/* Tax Suggestions Display */}
          {currentSuggestions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white/10 rounded-xl p-6 mb-6"
            >
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles size={20} className="text-yellow-400" />
                AI Tax Optimization Suggestions
              </h3>
              <div className="space-y-4">
                {currentSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-white">{suggestion.category}</h4>
                        <p className="text-white/80 text-sm">{suggestion.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-bold text-lg">{suggestion.potentialSavings}</div>
                        <div className="text-cyan-400 text-sm">{suggestion.confidence}% confidence</div>
                      </div>
                    </div>
                    <p className="text-white/70 text-xs">{suggestion.aiReason}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <button className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
                  <CheckCircle size={16} />
                  Apply Suggestions
                </button>
                <button className="border border-white/30 text-white px-6 py-2 rounded-lg font-semibold">
                  Export Report
                </button>
              </div>
            </motion.div>
          )}

          {/* Tax Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[
              {
                title: "Smart Receipt Scanner",
                description: "AI reads any receipt format and automatically categorizes expenses",
                icon: "📄",
                color: "from-blue-500 to-cyan-500"
              },
              {
                title: "Deduction Finder",
                description: "Discovers tax deductions you might have missed",
                icon: "🔍",
                color: "from-green-500 to-emerald-500"
              },
              {
                title: "Tax Optimization",
                description: "Real-time suggestions to minimize your tax burden",
                icon: "📊",
                color: "from-purple-500 to-pink-500"
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

      {/* Expense Categories Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">AI-Powered Expense Categorization</h2>
            <p className="text-white/80">Smart categorization that maximizes your tax deductions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {expenseCategories.map((category, index) => (
              <motion.div 
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white/10 rounded-xl p-6 border border-white/20"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{category.name}</h3>
                  <div className="text-right">
                    <div className="text-cyan-400 font-bold">${category.amount.toLocaleString()}</div>
                    <div className="text-green-400 text-sm">{category.taxImpact}</div>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${category.deductible ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className="text-white/80 text-sm">
                      {category.deductible ? 'Tax Deductible' : 'Not Deductible'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-white font-semibold text-sm">AI Suggestions:</h4>
                  {category.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="text-white/70 text-xs flex items-center gap-2">
                      <CheckCircle size={12} className="text-green-400" />
                      {suggestion}
                    </div>
                  ))}
                </div>
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
          className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Revolutionize Your Tax Preparation?
          </h2>
          <p className="text-white/80 text-lg mb-6 max-w-2xl mx-auto">
            Connect your financial data to unlock AI-powered tax optimization, expense summaries, and intelligent deduction suggestions. Make tax season stress-free with our revolutionary AI Tax Assistant.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setShowTaxStudio(true)}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-cyan-500 hover:to-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Calculator size={24} />
              Start AI Tax Analysis
            </button>
            <button 
              onClick={analyzeExpenses}
              className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Zap size={24} />
              Try Free Analysis
            </button>
          </div>
        </motion.div>
      </div>

      {/* AI Tax Studio Modal */}
      <AnimatePresence>
        {showTaxStudio && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTaxStudio(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 rounded-2xl p-8 max-w-2xl w-full border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">AI Tax Studio</h2>
                <p className="text-white/80">Choose your tax analysis type and let our AI team optimize your tax strategy</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {[
                  { type: 'receipts', title: 'Receipt Analysis', icon: '📄', description: 'Scan and categorize receipts' },
                  { type: 'expenses', title: 'Expense Review', icon: '💰', description: 'Analyze expense patterns' },
                  { type: 'deductions', title: 'Deduction Finder', icon: '🔍', description: 'Find missed deductions' },
                  { type: 'optimization', title: 'Tax Optimization', icon: '📊', description: 'Minimize tax burden' }
                ].map((option) => (
                  <button
                    key={option.type}
                    onClick={() => {
                      setSelectedTaxYear(option.type);
                      setShowTaxStudio(false);
                      analyzeExpenses();
                    }}
                    className="p-6 rounded-xl border-2 border-white/20 bg-white/5 hover:border-blue-300 hover:bg-blue-500/10 transition-all duration-300"
                  >
                    <div className="text-4xl mb-3">{option.icon}</div>
                    <h3 className="text-lg font-semibold text-white mb-2">{option.title}</h3>
                    <p className="text-white/70 text-sm">{option.description}</p>
                  </button>
                ))}
              </div>

              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => setShowTaxStudio(false)}
                  className="px-6 py-3 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowTaxStudio(false);
                    analyzeExpenses();
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all duration-300"
                >
                  Start Analysis
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TaxAssistantFeaturePage;
