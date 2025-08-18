import { useState } from 'react';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');

  const plans = [
    {
      name: "Automation Starter",
      price: { monthly: 0, annual: 0 },
      description: "Experience the Automation Revolution",
      features: [
        "Smart Import AI - 10 documents/month (any bank, any format)",
        "99.7% auto-categorization accuracy",
        "2.3s processing speed (instant results)",
        "Basic AI learning (remembers top 10 patterns)",
        "Universal bank compatibility (500+ supported)",
        "Bonus: 3 personal podcasts + 1 AI personality"
      ],
      cta: "Process 10 Documents Free",
      popular: false,
      color: "border-gray-200"
    },
    {
      name: "Complete Automation + Entertainment",
      price: { monthly: 19, annual: 15 },
      description: "Never Do Manual Expense Work Again",
      features: [
        "Unlimited Smart Import AI (any document, any bank)",
        "Advanced OCR (crumpled receipts, poor quality scans)",
        "Email processing (forward receipts automatically)",
        "Bulk upload (process 50+ files instantly)",
        "Advanced AI learning (unlimited pattern memory)",
        "All 16 AI personalities (from gentle to savage coaching)",
        "Unlimited personal podcasts about YOUR money",
        "AI Financial Therapist (24/7 emotional support)",
        "Premium Spotify integration (mood-based playlists)",
        "Financial wellness programs (meditation, stress relief)"
      ],
      cta: "Get My Time Back with AI",
      popular: true,
      color: "border-blue-500"
    },
    {
      name: "Professional Automation + Tax Intelligence",
      price: { monthly: 49, annual: 39 },
      description: "AI Finds More Deductions Than You Pay in Fees",
      features: [
        "Everything in Personal plan",
        "Multi-entity automation (business + personal seamlessly)",
        "Tax optimization AI (finds $3,200+ annually on average)",
        "Quarterly tax predictions (avoid underpayment penalties)",
        "Business intelligence analytics (spending insights)",
        "Audit-proof documentation (IRS/CRA compliant)",
        "Receipt email forwarding (team@yourcompany.com)",
        "Advanced deduction discovery (R&D credits, equipment depreciation)",
        "Priority support (live chat with tax experts)",
        "Export integrations (QuickBooks, Xero, TurboTax)"
      ],
      cta: "Get Enterprise Automation Demo",
      popular: false,
      color: "border-blue-500"
    }
  ];

  const features = [
    {
      category: "Smart Import AI Automation",
      items: [
        "99.7% categorization accuracy",
        "2.3s processing speed",
        "Universal bank compatibility",
        "Advanced OCR technology",
        "Bulk document processing"
      ]
    },
    {
      category: "Entertainment + Wellness",
      items: [
        "Personalized financial podcasts",
        "16 AI personality coaches",
        "AI Financial Therapist",
        "Spotify mood integration",
        "Meditation & stress relief"
      ]
    },
    {
      category: "Business Intelligence",
      items: [
        "Tax optimization AI",
        "Deduction discovery",
        "Audit-proof documentation",
        "Multi-entity management",
        "Professional integrations"
      ]
    }
  ];

  const handleNavigation = (path: string) => {
    // For demo purposes - in your app, use React Router
    console.log(`Navigating to: ${path}`);
  };

  return (
    <WebsiteLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Choose Your Level of Financial Automation</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">From basic automation magic to complete AI control - find the perfect level of freedom from manual financial work.</p>
          <div className="flex items-center justify-center space-x-4 mt-8">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-blue-300' : 'text-gray-400'}`}> 
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-400 transition-colors"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnnual ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? 'text-blue-300' : 'text-gray-400'}`}> 
              Annual
            </span>
            {isAnnual && (
              <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium ml-2">
                Save 20%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-2xl shadow-xl border-2 ${plan.color} ${
                plan.popular ? 'transform scale-105' : ''
              } transition-all duration-300 hover:shadow-2xl`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                {plan.name === "Automation Starter" && (
                  <p className="text-sm text-green-600 font-semibold mb-4">Worth $390/month in time savings - yours free to try</p>
                )}
                {plan.name === "Complete Automation + Entertainment" && (
                  <p className="text-sm text-green-600 font-semibold mb-4">Saves $4,700/year in time - costs only $180/year. ROI: 2,611%</p>
                )}
                {plan.name === "Professional Automation + Tax Intelligence" && (
                  <p className="text-sm text-green-600 font-semibold mb-4">Average user saves $3,200/year in found deductions. Plan costs $600/year. ROI: 533%</p>
                )}
                
                <div className="mb-8">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">
                      ${isAnnual ? plan.price.annual : plan.price.monthly}
                    </span>
                    <span className="text-gray-500 ml-2">
                      {plan.price.monthly === 0 ? '' : '/month'}
                    </span>
                  </div>
                  {isAnnual && plan.price.monthly > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Billed annually (${(isAnnual ? plan.price.annual : plan.price.monthly) * 12}/year)
                    </p>
                  )}
                </div>

                <button
                  onClick={() => setSelectedPlan(plan.name)}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 mb-8 ${
                    plan.popular
                      ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg hover:shadow-cyan-500/25'
                      : 'border-2 border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-white'
                  }`}
                >
                  {plan.cta}
                </button>

                <ul className="space-y-4">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Breakdown */}
      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            The Choice: Keep Working for Your Expenses, or Let AI Work for You
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((category, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-white text-2xl">
                    {index === 0 ? '🧠' : index === 1 ? '🎵' : '📊'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{category.category}</h3>
                <ul className="space-y-2 text-gray-600">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        
        {/* Plan Comparison Section */}
        <div className="mt-16 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-8 border border-gray-200">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">Manual Work vs. Smart Import AI</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-center p-6 bg-white rounded-xl border-2 border-red-200">
              <div className="text-4xl mb-4">⏰</div>
              <h4 className="text-xl font-bold text-red-700 mb-4">Manual Work</h4>
              <div className="space-y-3 text-gray-700">
                <div className="text-2xl font-bold text-red-600">8+ hours monthly</div>
                <div>85% accuracy</div>
                <div>Constant stress</div>
                <div>Manual categorization</div>
                <div>Risk of errors</div>
              </div>
            </div>
            <div className="text-center p-6 bg-white rounded-xl border-2 border-green-200">
              <div className="text-4xl mb-4">🤖</div>
              <h4 className="text-xl font-bold text-green-700 mb-4">Smart Import AI</h4>
              <div className="space-y-3 text-gray-700">
                <div className="text-2xl font-bold text-green-600">5 minutes monthly</div>
                <div>99.7% accuracy</div>
                <div>Complete automation</div>
                <div>Instant processing</div>
                <div>Zero manual work</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-8">
            {[
              {
                question: "What makes XspensesAI different from other expense apps?",
                answer: "XspensesAI is the only platform that completely eliminates manual expense work through 99.7% accurate Smart Import AI. While other apps still require manual categorization, we process ANY financial document in 2.3 seconds with zero manual input required. Plus, we make financial wellness enjoyable through personalized podcasts and AI coaching."
              },
              {
                question: "How does Smart Import AI work?",
                answer: "Simply upload any bank statement, receipt, or financial document. Our AI reads, categorizes, and processes everything automatically in under 3 seconds. It learns your spending patterns and never asks the same question twice. The result? 8 hours of manual work reduced to 5 minutes of automation."
              },
              {
                question: "Can I cancel my subscription anytime?",
                answer: "Yes, you can cancel your subscription at any time. There are no long-term contracts, and you'll continue to have access to premium features until the end of your billing period. We're confident you'll love the automation so much you won't want to leave."
              },
              {
                question: "Is my financial data secure?",
                answer: "Absolutely. We use bank-level encryption and security measures. Your data is protected with 256-bit SSL encryption, and we never sell your personal information to third parties. Plus, our AI processes documents without storing sensitive data permanently."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 py-16">
        <div className="text-center px-6">
          <h2 className="text-3xl font-bold text-white mb-6">
            Join the Automation Revolution - Start Free Today
          </h2>
          <p className="text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Join thousands of users who've eliminated manual expense work forever. Stop working for your expenses - let AI work for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-cyan-500/25">
              End Manual Work Forever - No Credit Card Required
            </button>
            <button 
              onClick={() => handleNavigation('/ai-demo')}
              className="border-2 border-cyan-400 text-cyan-400 px-8 py-3 rounded-lg font-semibold hover:bg-cyan-400 hover:text-white transition-all duration-300"
            >
              Watch AI Process 50 Receipts in 30 Seconds
            </button>
          </div>
        </div>
      </div>
    </WebsiteLayout>
  );
};

export default PricingPage;
