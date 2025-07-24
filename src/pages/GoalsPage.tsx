import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import WebsiteLayout from '../components/layout/WebsiteLayout';
import { ArrowRight, Sparkles, Brain, Star, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

const testimonials = [
  {
    name: 'Alex P.',
    quote: 'After 3 months, it knows my spending better than my spouse does! The AI learned I overspend when stressed and now warns me during tough weeks.',
    avatar: 'AP',
  },
  {
    name: 'Maria L.',
    quote: 'It remembered I hate budgeting spreadsheets and created audio summaries instead. My goals feel personal now.',
    avatar: 'ML',
  },
  {
    name: 'James T.',
    quote: 'Day 1: Generic advice. Day 30: Knows me better than I know myself. My financial goals have never felt so achievable.',
    avatar: 'JT',
  },
];

const faqs = [
  {
    question: 'How does the AI learn my habits?',
    answer: 'XspensesAI uses advanced machine learning to recognize your spending patterns, goal achievement style, and motivational triggers. The more you use it, the smarter it gets.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. Your financial data is encrypted and never sold. Only you and your AI assistant have access.'
  },
  {
    question: 'Can the AI adapt to life changes?',
    answer: 'Yes! Whether you change jobs, get married, or have a new goal, the AI adapts its recommendations and memory to fit your evolving life.'
  },
  {
    question: 'What makes this different from other goal apps?',
    answer: 'Most apps give static advice. XspensesAI learns, remembers, and evolves with you—delivering truly personalized financial guidance.'
  }
];

const GoalsPage = () => {
  // Interactive Learning Timeline Demo
  const [timeline, setTimeline] = useState(30);
  const [pattern, setPattern] = useState('weekends');
  const [advice, setAdvice] = useState('Track your weekend spending for better savings.');

  // Simulate AI learning progression
  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setTimeline(val);
    if (val < 30) {
      setPattern('weekends');
      setAdvice('Track your weekend spending for better savings.');
    } else if (val < 60) {
      setPattern('coffee shops');
      setAdvice('You visit Starbucks 12x/month. AI will auto-categorize as coffee.');
    } else {
      setPattern('motivation style');
      setAdvice('AI discovered you respond best to audio encouragement. New podcast episode unlocked!');
    }
  };

  return (
    <WebsiteLayout>
      <Helmet>
        <title>AI Goal Concierge That Learns You | Adaptive Financial Planning | XspensesAI</title>
        <meta name="description" content="Meet the only AI financial goal planner that learns your habits, adapts to your life, and remembers your preferences. Try XspensesAI's adaptive financial planning free!" />
        <meta property="og:title" content="AI Goal Concierge That Learns You | Adaptive Financial Planning | XspensesAI" />
        <meta property="og:description" content="Finally, an AI financial assistant that remembers, adapts, and evolves with your money journey. Try XspensesAI free!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://xspensesai.com/goals" />
        <meta property="og:image" content="/public/assets/xspensesai-logo.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Goal Concierge That Learns You | Adaptive Financial Planning | XspensesAI" />
        <meta name="twitter:description" content="Meet the only AI financial goal planner that learns your habits, adapts to your life, and remembers your preferences. Try XspensesAI's adaptive financial planning free!" />
        <meta name="twitter:image" content="/public/assets/xspensesai-logo.svg" />
        {/* SoftwareApplication Schema */}
        <script type="application/ld+json">{`
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "XspensesAI AI Goal Concierge",
            "operatingSystem": "All",
            "applicationCategory": "FinanceApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "reviewCount": "10000"
            },
            "publisher": {
              "@type": "Organization",
              "name": "XspensesAI",
              "url": "https://xspensesai.com"
            }
          }
        `}</script>
      </Helmet>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Your AI Goal Concierge That Actually Gets To Know You</h1>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto mb-8">
            The only AI financial goal planner that learns your habits, adapts to your life, and remembers your preferences. Start your adaptive financial journey today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link to="/signup" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center justify-center gap-2">
              Start Free Trial <ArrowRight className="inline-block ml-2 w-5 h-5" />
            </Link>
            <Link to="/pricing" className="border-2 border-purple-500 text-purple-700 px-8 py-4 rounded-lg font-semibold hover:bg-purple-50 transition-all duration-300">
              View Pricing
            </Link>
            <Link to="/ai-demo" className="border-2 border-pink-500 text-pink-700 px-8 py-4 rounded-lg font-semibold hover:bg-pink-50 transition-all duration-300">
              Try AI Demo
            </Link>
          </div>
        </div>
      </section>
      {/* Learning Progression Demo */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-purple-900">Watch Your AI Get Smarter Every Day</h2>
          <p className="text-lg text-gray-700 mb-8">Move the slider to see how your AI financial assistant evolves from generic advice to deeply personalized guidance.</p>
          <div className="flex flex-col items-center gap-6">
            <input
              type="range"
              min={1}
              max={90}
              value={timeline}
              onChange={handleTimelineChange}
              className="w-full max-w-lg accent-purple-500"
              aria-label="AI learning timeline"
            />
            <div className="flex justify-between w-full max-w-lg text-xs text-gray-500">
              <span>Day 1</span>
              <span>Day 30</span>
              <span>Day 60</span>
              <span>Day 90</span>
            </div>
            <div className="mt-6 bg-white/10 rounded-xl p-6 max-w-xl mx-auto text-left shadow-lg animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="w-8 h-8 text-purple-300 animate-pulse" aria-label="AI brain animation" />
                <span className="text-lg font-bold text-white">Pattern Recognized: {pattern}</span>
              </div>
              <p className="text-purple-100 mb-2">{advice}</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: `${Math.min(100, timeline)}%` }}></div>
              </div>
              <div className="text-xs text-gray-300 mt-2">AI Intelligence: {timeline}%</div>
            </div>
          </div>
        </div>
      </section>
      {/* The Learning Difference */}
      <section className="py-16 bg-white">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10 text-purple-900">The Learning Difference</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-8 shadow-lg text-center">
              <h3 className="text-xl font-bold mb-2 text-gray-700">Other Apps</h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 text-left">
                <li>Static, one-size-fits-all advice</li>
                <li>Forgets your preferences</li>
                <li>No adaptation to life changes</li>
                <li>Motivation doesn't evolve</li>
              </ul>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-8 shadow-lg text-center">
              <h3 className="text-xl font-bold mb-2 text-purple-900">XspensesAI</h3>
              <ul className="list-disc pl-6 text-purple-900 space-y-2 text-left">
                <li>Remembers your spending patterns and gets smarter over time</li>
                <li>Adapts to your goal-setting style and life changes</li>
                <li>Memorizes your categorization preferences</li>
                <li>Motivational content that adapts to YOU</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      {/* How Your AI Learns */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10 text-purple-900">How Your AI Learns</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4" role="img" aria-label="Pattern recognition">🔍</span>
              <h3 className="text-xl font-semibold mb-2 text-purple-900">Pattern Recognition</h3>
              <p className="text-gray-700">"After 30 days, your AI knows you spend more on weekends."</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4" role="img" aria-label="Habit learning">🧠</span>
              <h3 className="text-xl font-semibold mb-2 text-purple-900">Habit Learning</h3>
              <p className="text-gray-700">"Remembers you prefer aggressive savings in January, relaxed in summer."</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4" role="img" aria-label="Preference memory">💾</span>
              <h3 className="text-xl font-semibold mb-2 text-purple-900">Preference Memory</h3>
              <p className="text-gray-700">"Never ask you to categorize 'Starbucks' again - it learns it's coffee."</p>
            </div>
          </div>
        </div>
      </section>
      {/* Personalization Showcase */}
      <section className="py-16 bg-white">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10 text-purple-900">Personalization in Action</h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-purple-900 mb-2">Month 1: Basic Advice</h3>
                <p className="text-gray-700">"Try saving 10% of your income."</p>
              </div>
              <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-pink-700 mb-2">Month 6: Knows Your Financial DNA</h3>
                <p className="text-gray-700">"You save more when you get audio encouragement. Here’s a new podcast episode to keep you motivated!"</p>
              </div>
            </div>
            <div className="flex flex-col gap-6 items-center">
              <div className="w-full bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <span className="text-lg font-bold text-purple-700 mb-2">Learning Timeline</span>
                <div className="w-full bg-gray-200 rounded-full mb-2">
                  <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-progress-bar" style={{width: '90%'}}></div>
                </div>
                <span className="text-sm text-gray-600">AI Intelligence: 90%</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Memory & Recognition Features */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10 text-purple-900">Memory & Recognition Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4" role="img" aria-label="Auto-categorization">🏷️</span>
              <h3 className="text-xl font-semibold mb-2 text-purple-900">Auto-Categorization</h3>
              <p className="text-gray-700">Learns your preferences and never asks you to categorize the same expense twice.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4" role="img" aria-label="Goal adjustment">🎯</span>
              <h3 className="text-xl font-semibold mb-2 text-purple-900">Goal Adjustment</h3>
              <p className="text-gray-700">Adapts your savings targets based on your actual achievement patterns.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4" role="img" aria-label="Motivational learning">🎧</span>
              <h3 className="text-xl font-semibold mb-2 text-purple-900">Motivational Learning</h3>
              <p className="text-gray-700">Discovers whether you respond better to gentle nudges or tough love, and adapts content accordingly.</p>
            </div>
          </div>
        </div>
      </section>
      {/* Social Proof Section */}
      <section className="py-16 bg-white">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10 text-purple-900">What Users Say About AI That Learns</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl shadow-lg p-8 border border-gray-100 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4" aria-label={`User avatar for ${t.name}`}>{t.avatar}</div>
                <p className="italic text-gray-700 mb-4">"{t.quote}"</p>
                <div className="font-semibold text-purple-900">{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* FAQ Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4 text-center">AI Goal Concierge FAQ</h2>
          <p className="text-purple-700 text-center mb-10">Everything you need to know about adaptive, learning-based financial goal setting.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center">
        <div className="container max-w-3xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready for an AI That Grows With You?</h2>
          <p className="text-xl text-purple-100 mb-8">
            The sooner you start, the smarter your AI becomes. Don’t waste another day with generic financial advice.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="bg-white text-purple-600 px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-xl transform hover:scale-105 transition-all duration-200">
              Start Free Trial <ArrowRight className="inline-block ml-2 w-5 h-5" />
            </Link>
            <Link to="/pricing" className="border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-purple-600 transition-all duration-200">
              View Pricing
            </Link>
            <Link to="/ai-demo" className="border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-purple-600 transition-all duration-200">
              Try AI Demo
            </Link>
          </div>
          <p className="text-purple-100 text-sm mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default GoalsPage; 