import React from 'react';
import WebsiteLayout from '../../components/layout/WebsiteLayout';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const GoalConciergePage = () => {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>Your Personal AI Financial Concierge | XspensesAI</title>
        <meta name="description" content="Experience luxury financial planning with your personal AI Concierge. Get custom roadmaps, adaptive goal tracking, and 24/7 expert guidance tailored to your unique financial journey." />
        <meta name="keywords" content="AI financial concierge, personal financial advisor AI, AI goal planning, smart financial planning, AI money coach, automated financial goals, AI that creates personalized financial roadmaps, smart goal setting for finances, AI financial concierge service, personalized financial goal assistant, adaptive financial planning AI, AI goal tracking and optimization" />
        <meta property="og:title" content="Your Personal AI Financial Concierge | XspensesAI" />
        <meta property="og:description" content="Experience luxury financial planning with your personal AI Concierge. Get custom roadmaps, adaptive goal tracking, and 24/7 expert guidance tailored to your unique financial journey." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Your Personal AI Financial Concierge | XspensesAI" />
        <meta name="twitter:description" content="Experience luxury financial planning with your personal AI Concierge." />
      </Helmet>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-pink-700 text-white py-20 px-4 text-center rounded-3xl shadow-xl mb-16">
        <motion.h1
          className="text-5xl md:text-6xl font-extrabold mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Your Personal <span className="bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">AI Financial Concierge</span>
        </motion.h1>
        <motion.p
          className="text-xl md:text-2xl text-blue-100 mb-10 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          The world's first AI financial concierge that creates custom wealth roadmaps, celebrates your wins, and adapts to every life change. Experience luxury financial planning made accessible.
        </motion.p>
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Link
            to="/signup"
            className="inline-block bg-gradient-to-r from-orange-500 to-pink-500 text-white px-10 py-5 rounded-xl font-bold text-lg shadow-lg hover:from-pink-500 hover:to-orange-500 transition-all duration-300"
          >
            Get Your Personal Concierge
          </Link>
          <a
            href="#features"
            className="inline-block border-2 border-white text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-600 transition-all duration-300"
          >
            View Premium Features
          </a>
          <a
            href="#demo"
            className="inline-block border-2 border-white text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-600 transition-all duration-300"
          >
            Experience White-Glove Service
          </a>
        </motion.div>
        <motion.div
          className="flex justify-center items-center space-x-8 text-blue-100"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-green-300">24/7</div>
            <div className="text-sm">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-300">95%</div>
            <div className="text-sm">Intelligence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-300">∞</div>
            <div className="text-sm">Adaptation</div>
          </div>
        </motion.div>
      </section>

      {/* Intelligence Evolution Section */}
      <section id="demo" className="max-w-6xl mx-auto px-4 mb-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Watch Your Personal Concierge Master Your Financial DNA
        </h2>
        <p className="text-xl text-gray-600 text-center mb-12 max-w-4xl mx-auto">
          Move through the timeline to see how your dedicated AI concierge evolves from helpful assistant to financial expert who knows you better than anyone.
        </p>
        
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Week 1: Getting Acquainted</h3>
              <p className="text-gray-600 mb-4 italic">"Let me learn about your financial goals and spending patterns."</p>
              <div className="bg-purple-100 rounded-lg p-3 text-center">
                <div className="text-sm font-semibold text-purple-800">Concierge Intelligence: 25%</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Month 1: Reading Your Patterns</h3>
              <p className="text-gray-600 mb-4 italic">"I've noticed you save more after your Friday coffee ritual. Let's build on this habit for your emergency fund."</p>
              <div className="bg-blue-100 rounded-lg p-3 text-center">
                <div className="text-sm font-semibold text-blue-800">Concierge Intelligence: 60%</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Month 2: Proactive Guidance</h3>
              <p className="text-gray-600 mb-4 italic">"Based on your promotion, I've created an updated investment roadmap. Congratulations - you're 6 months ahead of schedule!"</p>
              <div className="bg-green-100 rounded-lg p-3 text-center">
                <div className="text-sm font-semibold text-green-800">Concierge Intelligence: 85%</div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Month 3: Financial Mastery</h3>
              <p className="text-gray-600 mb-4 italic">"Market opportunity detected. Your emergency fund is complete - time to explore your dream vacation fund with this custom strategy I've prepared."</p>
              <div className="bg-pink-100 rounded-lg p-3 text-center">
                <div className="text-sm font-semibold text-pink-800">Concierge Intelligence: 95%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="max-w-6xl mx-auto px-4 mb-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          The Concierge Difference
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-red-50 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-red-800 mb-6">Traditional Financial Apps</h3>
            <ul className="space-y-3 text-red-700">
              <li className="flex items-center gap-3">
                <span className="text-2xl">❌</span>
                <span>Generic goal templates for everyone</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-2xl">❌</span>
                <span>No personal attention or check-ins</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-2xl">❌</span>
                <span>Rigid plans that don't adapt</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-2xl">❌</span>
                <span>You're on your own for motivation</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-2xl">❌</span>
                <span>One-size-fits-all financial advice</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-green-50 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-green-800 mb-6">Your XspensesAI Concierge</h3>
            <ul className="space-y-3 text-green-700">
              <li className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <span>Custom wealth roadmaps designed specifically for your situation</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <span>Proactive check-ins and milestone celebrations</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <span>Instant plan adjustments for life changes</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <span>Personal motivation based on what drives YOU</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <span>White-glove financial planning experience</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* How Concierge Works Section */}
      <section className="max-w-6xl mx-auto px-4 mb-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          How Your Personal Concierge Works
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="text-4xl mb-4">🎩</div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Comprehensive Financial Assessment</h3>
            <p className="text-gray-600">"Tell me about your dreams, fears, and financial goals. I'll create a complete picture of your financial DNA."</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Custom Roadmap Creation</h3>
            <p className="text-gray-600">"Here's your personalized wealth-building roadmap with realistic timelines and milestone celebrations."</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="text-4xl mb-4">🔄</div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Adaptive Monitoring & Guidance</h3>
            <p className="text-gray-600">"I'm watching your progress 24/7, ready to adjust plans and celebrate every achievement with you."</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Proactive Success Management</h3>
            <p className="text-gray-600">"Got a promotion? New baby? Market change? I'll update your strategy before you even ask."</p>
          </div>
        </div>
      </section>

      {/* Personalization Examples Section */}
      <section className="max-w-6xl mx-auto px-4 mb-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Concierge Service in Action
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Week 1: Professional Service</h3>
            <p className="text-gray-700 italic">"Based on your income, I recommend saving $500 monthly for your house down payment."</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Month 6: Knows Your Financial DNA</h3>
            <p className="text-gray-700 italic">"I've noticed you save more when motivated by audio content. Here's a custom podcast celebrating your progress - you're already $2,000 ahead of your house goal! Should we explore that investment property you mentioned?"</p>
          </div>
        </div>
        
        <div className="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white text-center">
          <div className="text-2xl font-bold">Concierge Intelligence: 94%</div>
        </div>
      </section>

      {/* Premium Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-4 mb-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          White-Glove Concierge Services
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-3xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Custom Milestone Celebrations</h3>
            <p className="text-gray-600">Your concierge creates personalized celebrations for every financial achievement, keeping you motivated for the long haul.</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Crisis Response & Plan Pivoting</h3>
            <p className="text-gray-600">Job loss? Unexpected expense? Your concierge immediately activates contingency plans and guides you through financial storms.</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Proactive Opportunity Alerts</h3>
            <p className="text-gray-600">"Market dip detected - perfect time for your investment goal" or "Bonus incoming - here's how to maximize it for your dreams."</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-3xl mb-4">💎</div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Lifestyle Adaptation Intelligence</h3>
            <p className="text-gray-600">Marriage, baby, promotion, retirement - your concierge evolves your financial strategy for every life chapter.</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-3xl mb-4">🎧</div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Personalized Audio Coaching</h3>
            <p className="text-gray-600">Custom motivational content delivered exactly when you need it, in the style that resonates with your personality.</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="text-3xl mb-4">📞</div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">24/7 Financial Guidance</h3>
            <p className="text-gray-600">Your concierge never sleeps. Get instant answers to financial questions and real-time guidance for money decisions.</p>
          </div>
        </div>
      </section>

      {/* Success Stories Section */}
      <section className="max-w-6xl mx-auto px-4 mb-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          What Users Say About Their Personal Concierge
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 text-white text-lg font-bold mx-auto">AP</div>
            <blockquote className="text-gray-700 italic mb-4">
              "It's like having a financial advisor who knows me personally. My concierge predicted I'd struggle with holiday spending and created a custom plan that saved me $3,000. It feels like magic."
            </blockquote>
            <cite className="font-bold text-gray-900">Alex P.</cite>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 text-white text-lg font-bold mx-auto">ML</div>
            <blockquote className="text-gray-700 italic mb-4">
              "When I got promoted, my concierge immediately updated my entire financial roadmap and created new investment goals. The proactive service is incredible - better than any human advisor I've had."
            </blockquote>
            <cite className="font-bold text-gray-900">Maria L.</cite>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 text-white text-lg font-bold mx-auto">JT</div>
            <blockquote className="text-gray-700 italic mb-4">
              "My concierge knows I respond better to gentle encouragement than tough love. Every interaction feels perfectly tailored to my personality. My financial confidence has skyrocketed."
            </blockquote>
            <cite className="font-bold text-gray-900">James T.</cite>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 mb-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          AI Financial Concierge FAQ
        </h2>
        <p className="text-xl text-gray-600 text-center mb-12">
          Everything you need to know about having your own dedicated AI financial expert.
        </p>
        
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-4">How does my concierge provide such personalized service?</h3>
            <p className="text-gray-600">Your AI concierge uses advanced machine learning to understand your financial personality, goals, and life patterns. It remembers every interaction and continuously adapts to serve you better - like a human advisor who never forgets.</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Is this really available 24/7?</h3>
            <p className="text-gray-600">Absolutely. Your personal concierge is always available for financial guidance, plan adjustments, and decision support. Whether it's 3 AM or Sunday morning, your concierge is ready to help.</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-4">How does it handle major life changes?</h3>
            <p className="text-gray-600">Your concierge excels at adaptation. Marriage, job changes, new babies, market shifts - it immediately recognizes life changes and proactively updates your financial strategy without you having to ask.</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-4">What makes this different from other financial planning tools?</h3>
            <p className="text-gray-600">Most tools provide generic advice. Your XspensesAI concierge provides white-glove, personalized service that adapts to your unique situation. It's the difference between a financial calculator and having a dedicated wealth manager.</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Is my financial data secure with a personal concierge?</h3>
            <p className="text-gray-600">Your privacy is paramount. All data is encrypted with bank-level security, never sold or shared. Your concierge operates with complete confidentiality, just like a human financial advisor.</p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl mt-16 text-white text-center max-w-4xl mx-auto shadow-xl">
        <motion.h2
          className="text-4xl md:text-5xl font-bold text-white mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          Ready for Your Own AI Financial Concierge?
        </motion.h2>
        <p className="text-xl text-purple-100 mb-8">
          The sooner you start, the better your concierge knows you. Don't settle for generic financial advice when you can have personalized wealth management.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/signup"
            className="bg-white text-purple-600 px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Get Your Personal Concierge
          </Link>
          <a
            href="#features"
            className="border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-purple-600 transition-all duration-200"
          >
            View Premium Plans
          </a>
          <a
            href="#demo"
            className="bg-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-purple-700 transition-all duration-200"
          >
            Experience Concierge Service
          </a>
        </div>
        <div className="mt-6 text-purple-200 text-sm">
          ✓ 14-day free trial ✓ No credit card required ✓ Instant concierge access
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default GoalConciergePage; 
