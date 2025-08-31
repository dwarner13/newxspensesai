import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Star, Users, Zap, Shield, Headphones, Brain, TrendingUp, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// Hero Section Component
const PricingHero = () => (
  <section className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center px-4">
    <div className="max-w-6xl mx-auto text-center">
      <motion.div 
        className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="mr-2">🚀</span>
        <span>World's First FinTech Entertainment Platform</span>
      </motion.div>
      
      <motion.h1 
        className="text-5xl md:text-7xl font-bold mb-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        Choose Your <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">Financial Freedom</span> Plan
      </motion.h1>
      
      <motion.p 
        className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        Experience revolutionary expense management with AI-powered insights, 
        personalized podcasts, and curated music that makes financial planning enjoyable.
      </motion.p>
      
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      >
        <div className="text-center">
          <div className="text-3xl font-bold text-orange-400 mb-2">10,000+</div>
          <div className="text-gray-300">Happy Users</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-400 mb-2">$2.1M+</div>
          <div className="text-gray-300">Money Saved</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-400 mb-2">98%</div>
          <div className="text-gray-300">User Satisfaction</div>
        </div>
      </motion.div>
    </div>
  </section>
);

// Pricing Toggle Component
const PricingToggle = ({ isAnnual, setIsAnnual }: { isAnnual: boolean; setIsAnnual: (value: boolean) => void }) => {
  return (
    <div className="flex items-center justify-center gap-4 mb-12">
      <span className={`text-lg ${!isAnnual ? 'text-white font-semibold' : 'text-gray-400'}`}>Monthly</span>
      <button 
        className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${isAnnual ? 'bg-orange-500' : 'bg-gray-600'}`}
        onClick={() => setIsAnnual(!isAnnual)}
      >
        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${isAnnual ? 'translate-x-8' : 'translate-x-1'}`}></div>
      </button>
      <span className={`text-lg ${isAnnual ? 'text-white font-semibold' : 'text-gray-400'}`}>
        Annual
        <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full">Save 30%</span>
      </span>
    </div>
  );
};

// Individual Pricing Card Component
const PricingCard = ({ plan, isAnnual, isPopular = false }: { plan: any; isAnnual: boolean; isPopular?: boolean }) => {
  const getPrice = () => {
    if (plan.monthlyPrice === "Custom") return "Custom";
    if (plan.monthlyPrice === 0) return "Free";
    
    const price = isAnnual ? 
      Math.floor(plan.annualPrice / 12) : 
      plan.monthlyPrice;
    
    return `$${price}`;
  };

  const getSavings = () => {
    if (isAnnual && plan.monthlyPrice > 0 && plan.monthlyPrice !== "Custom") {
      const annualSavings = (plan.monthlyPrice * 12) - plan.annualPrice;
      return `Save $${annualSavings}/year`;
    }
    return null;
  };

  return (
    <motion.div 
      className={`relative p-8 rounded-2xl ${isPopular ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white scale-105' : 'bg-white/10 backdrop-blur-sm text-white border border-white/20'} hover:scale-105 transition-transform duration-300`}
      whileHover={{ y: -10 }}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-orange-400 to-pink-400 text-white px-4 py-2 rounded-full text-sm font-semibold">
            Most Popular
          </div>
        </div>
      )}
      
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
        <p className="text-gray-300 mb-6">{plan.description}</p>
        
        <div className="mb-4">
          <span className="text-4xl font-bold">{getPrice()}</span>
          {plan.monthlyPrice !== "Custom" && plan.monthlyPrice !== 0 && (
            <span className="text-gray-300">/month</span>
          )}
        </div>
        
        {getSavings() && (
          <div className="text-green-400 text-sm font-semibold mb-4">{getSavings()}</div>
        )}
        
        <button className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors duration-300 ${
          isPopular 
            ? 'bg-white text-purple-600 hover:bg-gray-100' 
            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
        }`}>
          {plan.monthlyPrice === 0 ? 'Get Started Free' : 'Choose Plan'}
        </button>
      </div>
      
      <div className="space-y-4">
        <h4 className="font-semibold text-lg mb-4">What's included:</h4>
        {plan.features.map((feature: string, index: number) => (
          <div key={index} className="flex items-start">
            <Check className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
            <span className="text-gray-300">{feature}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// Pricing Plans Component
const PricingPlans = ({ isAnnual }: { isAnnual: boolean }) => {
  const plans = [
    {
      name: "Starter",
      description: "Perfect for individuals getting started with financial management",
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        "Basic expense tracking",
        "Up to 100 transactions/month",
        "Email support",
        "Basic AI categorization",
        "Mobile app access"
      ]
    },
    {
      name: "Professional",
      description: "Ideal for professionals and small businesses",
      monthlyPrice: 19,
      annualPrice: 159,
      features: [
        "Everything in Starter",
        "Unlimited transactions",
        "Advanced AI insights",
        "Personalized podcasts",
        "Curated music playlists",
        "Priority support",
        "Export to multiple formats",
        "Team collaboration (up to 3 users)"
      ]
    },
    {
      name: "Enterprise",
      description: "For large organizations and advanced users",
      monthlyPrice: 49,
      annualPrice: 399,
      features: [
        "Everything in Professional",
        "Advanced analytics & reporting",
        "Custom AI training",
        "API access",
        "White-label solutions",
        "Dedicated account manager",
        "Unlimited team members",
        "Custom integrations",
        "Advanced security features"
      ]
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
      {plans.map((plan, index) => (
        <PricingCard 
          key={plan.name} 
          plan={plan} 
          isAnnual={isAnnual} 
          isPopular={index === 1}
        />
      ))}
    </div>
  );
};

// Feature Comparison Component
const FeatureComparison = () => (
  <section className="py-20 bg-gray-900">
    <div className="max-w-6xl mx-auto px-4">
      <motion.div 
        className="text-center mb-16"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Why Choose <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">XspensesAI</span>?
        </h2>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          We combine cutting-edge AI technology with entertainment to make financial management enjoyable and effective.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          {
            icon: <Brain className="w-12 h-12" />,
            title: "AI-Powered Insights",
            description: "Advanced machine learning algorithms provide personalized financial insights and recommendations."
          },
          {
            icon: <Headphones className="w-12 h-12" />,
            title: "Personalized Podcasts",
            description: "Get financial advice and tips through AI-generated podcasts tailored to your spending patterns."
          },
          {
            icon: <TrendingUp className="w-12 h-12" />,
            title: "Smart Automation",
            description: "Automatically categorize expenses and track your financial goals with intelligent automation."
          },
          {
            icon: <Shield className="w-12 h-12" />,
            title: "Bank-Level Security",
            description: "Your financial data is protected with enterprise-grade security and encryption."
          }
        ].map((feature, index) => (
          <motion.div 
            key={feature.title}
            className="text-center p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true }}
          >
            <div className="text-orange-400 mb-4 flex justify-center">{feature.icon}</div>
            <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
            <p className="text-gray-300">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

// FAQ Component
const PricingFAQ = () => {
  const faqs = [
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time. There are no long-term contracts or cancellation fees."
    },
    {
      question: "Is my financial data secure?",
      answer: "Absolutely. We use bank-level encryption and security measures to protect your financial data. We never share your information with third parties."
    },
    {
      question: "Do you offer a free trial?",
      answer: "Yes! Our Starter plan is completely free forever. You can upgrade to paid plans anytime to unlock additional features."
    },
    {
      question: "Can I switch between plans?",
      answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and are prorated."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, PayPal, and Apple Pay. All payments are processed securely through Stripe."
    },
    {
      question: "Is there a setup fee?",
      answer: "No setup fees! You only pay for the plan you choose. Start with our free plan and upgrade when you're ready."
    }
  ];

  return (
    <section className="py-20 bg-gray-800">
      <div className="max-w-4xl mx-auto px-4">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-300">
            Everything you need to know about XspensesAI pricing and features.
          </p>
        </motion.div>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <motion.div 
              key={index}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="text-xl font-semibold text-white mb-3">{faq.question}</h3>
              <p className="text-gray-300">{faq.answer}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Main Pricing Page Component
const StandalonePricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 text-white hover:text-orange-400 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xl font-bold">XspensesAI</span>
          </Link>
          <div className="flex items-center space-x-6">
            <Link to="/login" className="text-gray-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <PricingHero />

      {/* Pricing Toggle */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-6xl mx-auto px-4">
          <PricingToggle isAnnual={isAnnual} setIsAnnual={setIsAnnual} />
          <PricingPlans isAnnual={isAnnual} />
        </div>
      </section>

      {/* Feature Comparison */}
      <FeatureComparison />

      {/* FAQ */}
      <PricingFAQ />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Financial Life?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of users who are already saving money and achieving their financial goals with XspensesAI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/signup" 
                className="bg-white text-purple-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Start Free Trial
              </Link>
              <Link 
                to="/contact" 
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </motion.div>
        </div>
      </section>


    </div>
  );
};

export default StandalonePricingPage; 
