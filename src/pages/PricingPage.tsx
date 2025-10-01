import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { 
  Crown, Play, CheckCircle, Sparkles, Calculator
} from 'lucide-react';
interface AIEmployee {
  name: string;
  role: string;
  avatar: string;
  specialty: string;
  color: string;
  pricingBenefit: string;
}

interface PricingPlan {
  id: string;
  name: string;
  price: { monthly: number; annual: number };
  description: string;
  features: string[];
  aiEmployees: string[];
  cta: string;
  popular: boolean;
  color: string;
  savings: string;
  roi: string;
}

interface PricingScenario {
  id: string;
  title: string;
  description: string;
  timeSaved: string;
  moneySaved: string;
  aiDecision: string;
}

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const [showPricingCalculator, setShowPricingCalculator] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [currentSavings, setCurrentSavings] = useState<PricingScenario[]>([]);
  const [userInputs, setUserInputs] = useState({
    monthlyExpenses: 5000,
    documentsPerMonth: 50,
    hoursSpent: 8,
    businessType: 'individual'
  });

  // AI Pricing Team
  const aiPricingTeam: AIEmployee[] = [
    {
      name: 'Prime',
      role: 'AI Pricing Director',
      avatar: '👑',
      specialty: 'Strategic Plan Selection',
      color: 'from-purple-500 to-pink-500',
      pricingBenefit: 'Orchestrates your perfect pricing plan and maximizes ROI'
    },
    {
      name: 'Byte',
      role: 'AI ROI Calculator',
      avatar: '⚙️',
      specialty: 'Savings Optimization',
      color: 'from-blue-500 to-cyan-500',
      pricingBenefit: 'Calculates exact time and money savings for your situation'
    },
    {
      name: 'Tag',
      role: 'AI Feature Matcher',
      avatar: '🏷️',
      specialty: 'Feature Optimization',
      color: 'from-green-500 to-emerald-500',
      pricingBenefit: 'Matches the perfect features to your specific needs'
    },
    {
      name: 'Crystal',
      role: 'AI Future Predictor',
      avatar: '🔮',
      specialty: 'Future Savings',
      color: 'from-indigo-500 to-purple-500',
      pricingBenefit: 'Predicts your future savings and ROI over time'
    }
  ];

  // Revolutionary Pricing Plans
  const pricingPlans: PricingPlan[] = [
    {
      id: 'starter',
      name: 'AI Starter',
      price: { monthly: 0, annual: 0 },
      description: 'Experience the AI Revolution - Free Forever',
      features: [
        'Prime\'s Basic AI Automation',
        'Smart Import AI - 10 documents/month',
        '99.7% auto-categorization accuracy',
        '2.3s processing speed',
        'Basic AI learning patterns',
        'Universal bank compatibility',
        '3 personal podcasts + 1 AI personality'
      ],
      aiEmployees: ['Prime'],
      cta: 'Start Free Forever',
      popular: false,
      color: 'from-green-500 to-emerald-500',
      savings: '$390/month in time savings',
      roi: 'Infinite ROI - Free!'
    },
    {
      id: 'complete',
      name: 'AI Complete',
      price: { monthly: 29, annual: 23 },
      description: 'Complete AI Team + Full Automation',
      features: [
        'Full AI Team (Prime, Byte, Tag, Crystal)',
        'Unlimited Smart Import AI',
        'Advanced OCR technology',
        'Email processing automation',
        'Bulk upload (50+ files instantly)',
        'All 16 AI personalities',
        'Unlimited personal podcasts',
        'AI Financial Therapist',
        'Spotify mood integration',
        'Financial wellness programs',
        'Predictive automation',
        'Superhuman 99.7% accuracy'
      ],
      aiEmployees: ['Prime', 'Byte', 'Tag', 'Crystal'],
      cta: 'Get Complete AI Control',
      popular: true,
      color: 'from-purple-500 to-pink-500',
      savings: '$4,700/year in time savings',
      roi: '2,611% ROI'
    },
    {
      id: 'enterprise',
      name: 'AI Enterprise',
      price: { monthly: 79, annual: 63 },
      description: 'Complete AI Control + Business Intelligence',
      features: [
        'Everything in AI Complete',
        'Multi-entity automation',
        'Tax optimization AI',
        'Business intelligence analytics',
        'Audit-proof documentation',
        'Advanced deduction discovery',
        'Priority support',
        'Export integrations',
        'Team collaboration',
        'Custom AI training',
        'White-label options',
        'API access'
      ],
      aiEmployees: ['Prime', 'Byte', 'Tag', 'Crystal'],
      cta: 'Get Enterprise AI Demo',
      popular: false,
      color: 'from-indigo-500 to-purple-500',
      savings: '$8,200/year in total savings',
      roi: '1,300% ROI'
    }
  ];

  // Sample Pricing Scenarios
  const pricingScenarios: PricingScenario[] = [
    {
      id: '1',
      title: 'Time Savings Calculation',
      description: 'AI eliminated 8 hours of manual work per month',
      timeSaved: '96 hours/year',
      moneySaved: '$4,800/year',
      aiDecision: 'AI Complete plan saves 96 hours annually'
    },
    {
      id: '2',
      title: 'Tax Deduction Discovery',
      description: 'AI found $3,200 in missed deductions',
      timeSaved: '24 hours/year',
      moneySaved: '$3,200/year',
      aiDecision: 'AI Enterprise plan maximizes tax savings'
    },
    {
      id: '3',
      title: 'Automation Efficiency',
      description: 'AI processes 50 documents in 2.3 seconds',
      timeSaved: '48 hours/year',
      moneySaved: '$2,400/year',
      aiDecision: 'AI Complete plan optimizes document processing'
    }
  ];

  // Demo Functions
  const startPricingCalculation = () => {
    setIsCalculating(true);
    setCalculationProgress(0);
    
    const interval = setInterval(() => {
      setCalculationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsCalculating(false);
          setCurrentSavings(pricingScenarios);
          return 100;
        }
        return prev + 20;
      });
    }, 400);
  };



  return (
    <>
      <Helmet>
        <title>Revolutionary AI Pricing - Complete Financial Automation | XspensesAI Platform</title>
        <meta name="description" content="Revolutionary AI pricing plans with complete financial automation. Get Prime, Byte, Tag, and Crystal AI team for as low as $0. Experience 2,611% ROI with our AI Complete plan." />
        <meta name="keywords" content="AI pricing, financial automation pricing, AI team pricing, Prime AI pricing, Byte AI pricing, Tag AI pricing, Crystal AI pricing, smart automation pricing" />
        <meta property="og:title" content="Revolutionary AI Pricing - Complete Financial Automation | XspensesAI Platform" />
        <meta property="og:description" content="Revolutionary AI pricing plans with complete financial automation and AI team." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Revolutionary AI Pricing - Complete Financial Automation | XspensesAI Platform" />
        <meta name="twitter:description" content="Revolutionary AI pricing plans with complete financial automation." />
      </Helmet>

      {/* Hero Section */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-16">
            {/* Prime Badge */}
            <div className="text-center mb-8">
              <div
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 mb-8"
              >
                <Crown size={20} className="text-yellow-400" />
                <span className="text-white font-semibold">Prime's AI Pricing Division</span>
              </div>
            </div>

            <h1
              className="text-4xl md:text-6xl font-bold text-white mb-6"
            >
              Revolutionary AI Pricing
            </h1>
            
            <p
              className="text-lg md:text-xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed"
            >
              Get Prime, Byte, Tag, and Crystal AI team for as low as $0. Experience complete financial automation with up to 2,611% ROI. Choose your level of AI control and watch your savings multiply.
            </p>

            {/* Pricing Toggle */}
            <div
              className="flex items-center justify-center space-x-4 mb-12"
            >
              <span className={`text-sm font-medium ${!isAnnual ? 'text-purple-300' : 'text-white/60'}`}> 
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-purple-400 transition-colors"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnnual ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
              <span className={`text-sm font-medium ${isAnnual ? 'text-purple-300' : 'text-white/60'}`}> 
              Annual
            </span>
            {isAnnual && (
                <span className="text-sm bg-green-500/20 text-green-400 px-3 py-1 rounded-full font-medium ml-2 border border-green-400/30">
                Save 20%
              </span>
            )}
            </div>

            <div
              className="flex flex-col sm:flex-row gap-6 justify-center"
            >
              <button 
                onClick={() => setShowPricingCalculator(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Calculator size={24} />
                Calculate My Savings
              </button>
              <button 
                onClick={startPricingCalculation}
                className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Play size={24} />
                Watch AI Calculate ROI
              </button>
            </div>
          </div>

          {/* AI Pricing Team Showcase */}
          <div
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-white text-center mb-12">Meet Your AI Pricing Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {aiPricingTeam.map((member, index) => (
                <div 
                  key={member.name}
                  className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:scale-105 transition-all duration-300"
                >
                  <div className="text-center">
                    <div className="text-6xl mb-4">{member.avatar}</div>
                    <h3 className="text-xl font-bold text-white mb-2">{member.name}</h3>
                    <p className="text-cyan-400 font-semibold mb-3">{member.role}</p>
                    <p className="text-white/70 text-sm mb-4">{member.specialty}</p>
                    <div className={`w-full h-1 bg-gradient-to-r ${member.color} rounded-full`}></div>
                    <p className="text-white/60 text-xs mt-3">{member.pricingBenefit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live AI Pricing Calculator */}
      {isCalculating && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div
            className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Live AI ROI Calculation</h2>
              <p className="text-white/80">Watch our AI team calculate your exact savings and ROI</p>
            </div>

            <div className="bg-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">AI Calculating Your Savings</h3>
                <span className="text-cyan-400 font-bold">{calculationProgress}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${calculationProgress}%` }}
                ></div>
              </div>
              <div className="text-center">
                <p className="text-white/70 text-sm">
                  {calculationProgress < 33 && "Prime is analyzing your financial patterns..."}
                  {calculationProgress >= 33 && calculationProgress < 66 && "Byte is calculating your time savings..."}
                  {calculationProgress >= 66 && calculationProgress < 100 && "Tag is matching perfect features..."}
                  {calculationProgress >= 100 && "Crystal is predicting your future ROI..."}
                </p>
              </div>
            </div>

            {currentSavings.length > 0 && (
              <div
                className="bg-white/10 rounded-xl p-6"
              >
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles size={20} className="text-yellow-400" />
                  Your AI-Calculated Savings
                </h3>
                <div className="space-y-4">
                  {currentSavings.map((scenario) => (
                    <div key={scenario.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-white">{scenario.title}</h4>
                          <p className="text-white/80 text-sm">{scenario.description}</p>
                          <p className="text-white/70 text-xs mt-1">{scenario.aiDecision}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-bold text-lg">{scenario.moneySaved}</div>
                          <div className="text-cyan-400 text-sm">{scenario.timeSaved}</div>
                        </div>
          </div>
        </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pricing Plans */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {pricingPlans.map((plan, index) => (
            <div
              key={plan.id}
              className={`relative bg-white/10 backdrop-blur-md rounded-2xl border-2 ${
                plan.popular ? 'border-purple-400 transform scale-105' : 'border-white/20'
              } transition-all duration-300 hover:shadow-2xl`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="p-8">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-white/80 mb-6">{plan.description}</p>
                
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-white">
                      ${isAnnual ? plan.price.annual : plan.price.monthly}
                    </span>
                    <span className="text-white/60 ml-2">
                      {plan.price.monthly === 0 ? '' : '/month'}
                    </span>
                  </div>
                  {isAnnual && plan.price.monthly > 0 && (
                    <p className="text-sm text-white/60 mt-1">
                      Billed annually (${(isAnnual ? plan.price.annual : plan.price.monthly) * 12}/year)
                    </p>
                  )}
                </div>

                <div className="mb-6">
                  <div className="text-green-400 font-bold text-lg mb-2">{plan.savings}</div>
                  <div className="text-cyan-400 font-semibold">{plan.roi}</div>
                </div>

                <button
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 mb-8 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white shadow-lg'
                      : 'border-2 border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white'
                  }`}
                >
                  {plan.cta}
                </button>

                <div className="mb-6">
                  <h4 className="text-white font-semibold mb-3">AI Team Included:</h4>
                  <div className="flex flex-wrap gap-2">
                    {plan.aiEmployees.map((employee) => (
                      <span key={employee} className="bg-white/10 text-white px-3 py-1 rounded-full text-sm">
                        {employee}
                      </span>
                    ))}
                  </div>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-white/80 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI vs Manual Comparison */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-4">AI vs Manual Financial Management</h2>
            <p className="text-white/80">See the revolutionary difference AI makes</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white/10 rounded-xl p-6 border border-red-400/30">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">⏰</div>
                <h3 className="text-xl font-bold text-red-400 mb-4">Manual Financial Management</h3>
              </div>
              <div className="space-y-3 text-white/80">
                <div className="flex justify-between">
                  <span>Time per month:</span>
                  <span className="text-red-400 font-bold">8+ hours</span>
                </div>
                <div className="flex justify-between">
                  <span>Accuracy:</span>
                  <span className="text-red-400 font-bold">85%</span>
                </div>
                <div className="flex justify-between">
                  <span>Stress level:</span>
                  <span className="text-red-400 font-bold">High</span>
                </div>
                <div className="flex justify-between">
                  <span>Annual cost:</span>
                  <span className="text-red-400 font-bold">$4,800+</span>
              </div>
          </div>
        </div>
        
            <div className="bg-white/10 rounded-xl p-6 border border-green-400/30">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-xl font-bold text-green-400 mb-4">AI Financial Management</h3>
              </div>
              <div className="space-y-3 text-white/80">
                <div className="flex justify-between">
                  <span>Time per month:</span>
                  <span className="text-green-400 font-bold">5 minutes</span>
                </div>
                <div className="flex justify-between">
                  <span>Accuracy:</span>
                  <span className="text-green-400 font-bold">99.7%</span>
              </div>
                <div className="flex justify-between">
                  <span>Stress level:</span>
                  <span className="text-green-400 font-bold">Zero</span>
            </div>
                <div className="flex justify-between">
                  <span>Annual cost:</span>
                  <span className="text-green-400 font-bold">$276</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div
          className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Experience Revolutionary AI Pricing?
          </h2>
          <p className="text-white/80 text-lg mb-6 max-w-2xl mx-auto">
            Join thousands of users who've eliminated manual financial work forever. Get Prime, Byte, Tag, and Crystal AI team for as low as $0. Experience up to 2,611% ROI.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setShowPricingCalculator(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-pink-500 hover:to-purple-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
            >
              <Calculator size={24} />
              Calculate My Savings
            </button>
            <button 
              onClick={startPricingCalculation}
              className="border-2 border-green-400 text-green-400 hover:bg-green-400 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Play size={24} />
              Try Free Forever
            </button>
          </div>
        </div>
      </div>

      {/* AI Pricing Calculator Modal */}
      
        {showPricingCalculator && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPricingCalculator(false)}
          >
            <div
              className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-2xl p-8 max-w-2xl w-full border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">AI Pricing Calculator</h2>
                <p className="text-white/80">Let our AI team calculate your perfect plan and savings</p>
              </div>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="block text-white font-semibold mb-2">Monthly Expenses</label>
                  <input
                    type="number"
                    value={userInputs.monthlyExpenses}
                    onChange={(e) => setUserInputs({...userInputs, monthlyExpenses: Number(e.target.value)})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                  />
              </div>
                <div>
                  <label className="block text-white font-semibold mb-2">Documents per Month</label>
                  <input
                    type="number"
                    value={userInputs.documentsPerMonth}
                    onChange={(e) => setUserInputs({...userInputs, documentsPerMonth: Number(e.target.value)})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                  />
          </div>
                <div>
                  <label className="block text-white font-semibold mb-2">Hours Spent Monthly</label>
                  <input
                    type="number"
                    value={userInputs.hoursSpent}
                    onChange={(e) => setUserInputs({...userInputs, hoursSpent: Number(e.target.value)})}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
                  />
        </div>
      </div>

              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => setShowPricingCalculator(false)}
                  className="px-6 py-3 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
            </button>
            <button 
                  onClick={() => {
                    setShowPricingCalculator(false);
                    startPricingCalculation();
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-pink-500 hover:to-purple-500 transition-all duration-300"
                >
                  Calculate My Savings
            </button>
          </div>
            </div>
          </div>
        )}
      
    </>
  );
};

export default PricingPage;