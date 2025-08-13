import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import WebsiteLayout from '../components/layout/WebsiteLayout';
import { ArrowRight, CheckCircle, Play, Sparkles, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const testimonials = [
  {
    name: 'Jessica T.',
    goal: 'Saved $5,000 for a dream vacation',
    quote: 'The AI Goal Concierge made saving fun! The audio motivation and progress tracking kept me on track. I hit my goal 2 months early!',
    avatar: 'JT',
  },
  {
    name: 'Mike R.',
    goal: 'Paid off $12,000 in debt',
    quote: 'I never thought I could pay off my credit cards so fast. The AI assistant broke it down into milestones and the podcasts kept me motivated.',
    avatar: 'MR',
  },
  {
    name: 'Priya S.',
    goal: 'Invested $10,000 for the first time',
    quote: 'Traditional goal apps were boring. XspensesAI made investing feel like a game, and the audio rewards were a huge boost!',
    avatar: 'PS',
  },
];

const faqs = [
  {
    question: 'How does the AI Goal Concierge work?',
    answer: 'Our AI assistant creates a personalized financial roadmap, tracks your progress, and keeps you motivated with audio content and gamification.'
  },
  {
    question: 'Is the AI Goal Concierge free to try?',
    answer: 'Yes! You can try the AI financial goal planner for free. No credit card required.'
  },
  {
    question: 'Can I set any type of financial goal?',
    answer: 'Absolutely. Whether it’s saving, investing, or paying off debt, the AI adapts to your needs.'
  },
  {
    question: 'What makes XspensesAI different from other goal apps?',
    answer: 'We combine AI, audio entertainment, and gamification for a truly engaging, personalized experience.'
  }
];

const AIGoalConciergePage = () => {
  // Interactive Goal Calculator State
  const [goal, setGoal] = useState('');
  const [amount, setAmount] = useState('');
  const [timeline, setTimeline] = useState('12');
  const [aiPlan, setAiPlan] = useState<null | {monthly: number, milestones: string[]}>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [loading, setLoading] = useState(false);

  // Demo AI analysis
  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const amt = parseFloat(amount);
      const months = parseInt(timeline);
      if (!amt || !months) return;
      const monthly = Math.ceil(amt / months * 100) / 100;
      setAiPlan({
        monthly,
        milestones: [
          `Save $${(amt * 0.25).toLocaleString()} by month ${Math.ceil(months * 0.25)}`,
          `Reach halfway ($${(amt * 0.5).toLocaleString()}) by month ${Math.ceil(months * 0.5)}`,
          `Hit $${(amt * 0.75).toLocaleString()} by month ${Math.ceil(months * 0.75)}`,
          `Goal achieved: $${amt.toLocaleString()} in ${months} months!`
        ]
      });
      setShowPlan(true);
      setLoading(false);
    }, 1200);
  };

  return (
    <WebsiteLayout>
      <Helmet>
        <title>AI Goal Concierge - Smart Financial Goal Planner | XspensesAI</title>
        <meta name="description" content="Let AI create your personalized financial roadmap. Smart goal planning + motivational audio content. Try free - no credit card required." />
        <meta property="og:title" content="AI Goal Concierge - Smart Financial Goal Planner | XspensesAI" />
        <meta property="og:description" content="AI assistant for financial goals. Smart planning, audio motivation, and milestone tracking. Try XspensesAI free!" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://xspensesai.com/ai-goal-concierge" />
        <meta property="og:image" content="/public/assets/xspensesai-logo.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Goal Concierge - Smart Financial Goal Planner | XspensesAI" />
        <meta name="twitter:description" content="Let AI create your personalized financial roadmap. Smart goal planning + motivational audio content. Try free - no credit card required." />
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
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">AI Financial Goal Concierge</h1>
          <p className="text-xl text-purple-100 max-w-2xl mx-auto mb-8">
            Let AI create your personalized financial roadmap. Smart goal planning, audio motivation, and milestone tracking. Try free – no credit card required.
          </p>
          <form className="bg-white/10 rounded-xl p-6 max-w-xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-center shadow-lg" onSubmit={handleCalculate}>
            <input
              type="text"
              placeholder="e.g. Save for a house"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              required
              aria-label="Goal description"
            />
            <input
              type="number"
              placeholder="Amount ($)"
              className="w-32 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              min={1}
              aria-label="Goal amount"
            />
            <input
              type="number"
              placeholder="Months"
              className="w-24 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={timeline}
              onChange={e => setTimeline(e.target.value)}
              required
              min={1}
              max={60}
              aria-label="Timeline in months"
            />
            <button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg hover:scale-105 transition-transform flex items-center gap-2" disabled={loading}>
              {loading ? 'Analyzing...' : 'Get AI Plan'} <Sparkles className="w-5 h-5" />
            </button>
          </form>
          {showPlan && aiPlan && (
            <div className="mt-8 bg-white/10 rounded-xl p-6 max-w-xl mx-auto text-left shadow-lg animate-fade-in">
              <h2 className="text-2xl font-bold mb-2 text-white">Your AI-Powered Goal Plan</h2>
              <p className="text-purple-100 mb-4">To achieve <span className="font-semibold">{goal}</span> in <span className="font-semibold">{timeline} months</span>:</p>
              <div className="mb-4">
                <span className="text-lg font-bold text-green-300">Save ${aiPlan.monthly.toLocaleString()} per month</span>
              </div>
              <ul className="list-disc pl-6 text-purple-100 space-y-1">
                {aiPlan.milestones.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
              <div className="mt-6 flex items-center gap-3">
                <Play className="w-8 h-8 text-pink-300 animate-pulse" aria-label="Audio preview" />
                <span className="text-pink-100 font-medium">Motivational podcast preview: "You’re on track! Keep going!"</span>
                <button className="ml-auto bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 transition">Listen</button>
              </div>
            </div>
          )}
        </div>
      </section>
      {/* Problem/Solution Section */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4 text-purple-900">Why Traditional Goal Setting Fails</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-6">
                <li>Boring spreadsheets and static apps</li>
                <li>No real motivation or accountability</li>
                <li>One-size-fits-all advice that doesn’t adapt</li>
                <li>Lack of progress tracking and celebration</li>
              </ul>
              <h3 className="text-xl font-semibold mb-2 text-pink-700">The AI Solution</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Personalized, intelligent goal roadmaps</li>
                <li>Audio motivation: podcasts & Spotify playlists</li>
                <li>Automatic milestone tracking and adjustments</li>
                <li>Gamified, entertainment-first experience</li>
              </ul>
            </div>
            <div className="flex flex-col gap-6 items-center">
              <img src="/public/assets/xspensesai-icon.svg" alt="AI financial goal planner icon" className="w-32 h-32 mb-4" />
              <div className="w-full bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <span className="text-lg font-bold text-purple-700 mb-2">Before: Frustration</span>
                <div className="w-full h-2 bg-gray-200 rounded-full mb-2">
                  <div className="h-2 bg-gray-400 rounded-full w-1/4 animate-pulse"></div>
                </div>
                <span className="text-lg font-bold text-green-600 mb-2">After: Progress & Motivation</span>
                <div className="w-full h-2 bg-green-400 rounded-full animate-progress-bar" style={{width: '100%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* How It Works Section */}
      <section className="py-16 bg-white">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10 text-purple-900">How the AI Goal Concierge Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4" role="img" aria-label="AI creates your plan">🤖</span>
              <h3 className="text-xl font-semibold mb-2 text-purple-900">1. Tell the AI Your Goal</h3>
              <p className="text-gray-700">Describe your financial goal and timeline. The AI listens and understands your unique needs.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4" role="img" aria-label="AI analyzes">📊</span>
              <h3 className="text-xl font-semibold mb-2 text-purple-900">2. Get a Smart Roadmap</h3>
              <p className="text-gray-700">The AI creates a step-by-step plan, tracks milestones, and adapts as you go.</p>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-gray-100">
              <span className="text-4xl mb-4" role="img" aria-label="Audio motivation">🎧</span>
              <h3 className="text-xl font-semibold mb-2 text-purple-900">3. Stay Motivated with Audio</h3>
              <p className="text-gray-700">Listen to motivational podcasts and Spotify playlists tailored to your journey.</p>
            </div>
          </div>
        </div>
      </section>
      {/* Audio Entertainment Preview */}
      <section className="py-16 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-purple-900">Audio Motivation & Entertainment</h2>
          <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
            <div className="flex-1 bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
              <Play className="w-10 h-10 text-pink-500 mb-4 animate-pulse" aria-label="Podcast preview" />
              <h3 className="text-xl font-semibold mb-2 text-purple-900">Personalized Podcast Preview</h3>
              <p className="text-gray-700 mb-4">"You’re 50% to your goal! Here’s a story of someone who made it happen."</p>
              <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                Listen to Sample
              </button>
            </div>
            <div className="flex-1 bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
              <img src="/public/assets/xspensesai-icon.svg" alt="Spotify integration for financial goals" className="w-16 h-16 mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-purple-900">Spotify Playlist Integration</h3>
              <p className="text-gray-700 mb-4">Upbeat playlists to keep you motivated while you save, invest, or pay off debt.</p>
              <button className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold text-lg shadow-lg hover:bg-green-600 transition flex items-center gap-2">
                Open Spotify
              </button>
            </div>
          </div>
        </div>
      </section>
      {/* Success Stories Section */}
      <section className="py-16 bg-white">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10 text-purple-900">Success Stories</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl shadow-lg p-8 border border-gray-100 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4" aria-label={`User avatar for ${t.name}`}>{t.avatar}</div>
                <p className="italic text-gray-700 mb-4">"{t.quote}"</p>
                <div className="font-semibold text-purple-900">{t.name}</div>
                <div className="text-sm text-green-700">{t.goal}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Features Breakdown */}
      <section className="py-16 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-10 text-purple-900">AI Goal Concierge Features</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <ul className="list-disc pl-6 text-gray-700 space-y-3">
                <li><strong>AI financial goal planner:</strong> Personalized, adaptive goal roadmaps</li>
                <li><strong>Smart goal setting assistant:</strong> Intelligent milestone tracking and adjustments</li>
                <li><strong>Personal finance goal tracker:</strong> Visual progress bars and achievement animations</li>
                <li><strong>Audio motivation:</strong> Podcasts and Spotify playlists for every milestone</li>
                <li><strong>Gamification:</strong> Earn badges and rewards as you progress</li>
                <li><strong>Automated financial goals:</strong> Set, forget, and let the AI keep you on track</li>
                <li><strong>Mobile-first design:</strong> Fast, responsive, and beautiful on any device</li>
              </ul>
            </div>
            <div className="flex flex-col gap-6 items-center">
              <img src="/public/assets/xspensesai-icon.svg" alt="AI goal planner app screenshot" className="w-32 h-32" />
              <div className="w-full bg-white rounded-xl shadow p-6 flex flex-col items-center">
                <span className="text-lg font-bold text-purple-700 mb-2">Animated Progress</span>
                <div className="w-full h-2 bg-gray-200 rounded-full mb-2">
                  <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-progress-bar" style={{width: '80%'}}></div>
                </div>
                <span className="text-sm text-gray-600">80% to goal!</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Pricing Integration */}
      <section className="py-16 bg-white">
        <div className="container max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-purple-900">Start Your AI Goal Journey</h2>
          <p className="text-lg text-gray-700 mb-8">Try the AI Goal Concierge free. Upgrade anytime for advanced features and unlimited goals.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
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
          <p className="text-xs text-gray-500">No credit card required • Cancel anytime • Money-back guarantee</p>
        </div>
      </section>
      {/* FAQ Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="container max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4 text-center">AI Goal Concierge FAQ</h2>
          <p className="text-purple-700 text-center mb-10">Everything you need to know about smart financial goal setting with AI.</p>
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Achieve Your Goals?</h2>
          <p className="text-xl text-purple-100 mb-8">
            Join thousands who’ve transformed their finances with the AI Goal Concierge. Start your journey today!
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

export default AIGoalConciergePage; 
