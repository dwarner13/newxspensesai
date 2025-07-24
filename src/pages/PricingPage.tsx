import { useState } from 'react';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');

  const plans = [
    {
      name: "Starter",
      price: { monthly: 0, annual: 0 },
      description: "Perfect for getting started with AI financial insights",
      features: [
        "Basic expense tracking",
        "AI-powered categorization",
        "Monthly financial summaries",
        "Basic podcast recommendations",
        "Up to 100 transactions/month",
        "Community support"
      ],
      cta: "Start Free",
      popular: false,
      color: "border-gray-200"
    },
    {
      name: "Premium",
      price: { monthly: 19, annual: 15 },
      description: "The complete FinTech Entertainment experience",
      features: [
        "Unlimited expense tracking",
        "Advanced AI financial assistant",
        "Personalized financial podcasts",
        "Spotify integration",
        "Smart budget optimization",
        "Investment tracking & insights",
        "Bill reminder automation",
        "Custom financial goals",
        "Priority support",
        "Advanced analytics dashboard"
      ],
      cta: "Start Premium Trial",
      popular: true,
      color: "border-purple-500"
    },
    {
      name: "Business",
      price: { monthly: 49, annual: 39 },
      description: "Built for businesses and tax professionals",
      features: [
        "Everything in Premium",
        "Multi-entity management",
        "Advanced tax optimization",
        "Business expense categorization",
        "Team collaboration tools",
        "Custom integrations",
        "Dedicated account manager",
        "Advanced reporting & exports",
        "API access",
        "White-label options"
      ],
      cta: "Contact Sales",
      popular: false,
      color: "border-blue-500"
    }
  ];

  const features = [
    {
      category: "AI Financial Management",
      items: [
        "Intelligent expense categorization",
        "Predictive budget insights",
        "Smart financial recommendations",
        "Automated bill detection",
        "Investment portfolio analysis"
      ]
    },
    {
      category: "Entertainment Integration",
      items: [
        "Personalized financial podcasts",
        "Spotify playlist generation",
        "Gamified savings challenges",
        "Interactive financial education",
        "Audio-first user experience"
      ]
    },
    {
      category: "Advanced Analytics",
      items: [
        "Real-time spending insights",
        "Trend analysis & forecasting",
        "Goal tracking & achievements",
        "Custom reporting dashboard",
        "Export & integration options"
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
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2">Choose Your Financial Future</h1>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto">Experience the world's first FinTech Entertainment Platform. Transform your relationship with money through AI-powered insights and personalized audio content.</p>
          <div className="flex items-center justify-center space-x-4 mt-8">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-purple-300' : 'text-gray-400'}`}> 
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
            <span className={`text-sm font-medium ${isAnnual ? 'text-purple-300' : 'text-gray-400'}`}> 
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
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                
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
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 mb-8 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
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
            Everything You Need to Master Your Finances
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((category, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
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
                answer: "XspensesAI is the world's first FinTech Entertainment Platform, combining AI financial management with personalized podcasts and Spotify integration. We transform financial management from a chore into an engaging, audio-first experience."
              },
              {
                question: "How does the AI assistant work?",
                answer: "Our AI assistant analyzes your spending patterns, predicts future expenses, and provides personalized recommendations. It also curates financial podcasts based on your goals and creates Spotify playlists to make budgeting fun."
              },
              {
                question: "Can I cancel my subscription anytime?",
                answer: "Yes, you can cancel your subscription at any time. There are no long-term contracts, and you'll continue to have access to premium features until the end of your billing period."
              },
              {
                question: "Is my financial data secure?",
                answer: "Absolutely. We use bank-level encryption and security measures. Your data is protected with 256-bit SSL encryption, and we never sell your personal information to third parties."
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
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-16">
        <div className="text-center px-6">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to Transform Your Financial Future?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who've revolutionized their relationship with money through intelligent conversation and personalized audio content.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Start Free Trial - No Credit Card Required
            </button>
            <button 
              onClick={() => handleNavigation('/ai-demo')}
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors"
            >
              Try AI Demo
            </button>
          </div>
        </div>
      </div>
    </WebsiteLayout>
  );
};

export default PricingPage;
