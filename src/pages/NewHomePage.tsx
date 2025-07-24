import React from 'react';
import { Helmet } from 'react-helmet';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const NewHomepageHero = () => (
  <section className="homepage-hero bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-24">
    <div className="container max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-16 items-center">
      {/* Left: Hero Content */}
      <div className="flex-1">
        <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm mb-6 font-semibold shadow">
          <span className="mr-2 text-lg">🚀</span>
          <span>World's First FinTech Entertainment Platform</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
          World's First FinTech Entertainment Platform
          <span className="gradient-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent block md:inline"> + Smart Import AI</span>
        </h1>
        <p className="text-xl text-purple-100 mb-8 max-w-2xl">
          Revolutionary AI reads ANY bank statement, receipt, or financial document instantly. Creates personal podcasts about YOUR money story + Spotify integration. 
          End expense categorization hell forever.
        </p>
        <div className="unique-features-preview flex flex-col gap-3 mb-8">
          <div className="flex items-center gap-2 text-lg"><span className="text-2xl">🔍</span> AI reads ANY financial document instantly</div>
          <div className="flex items-center gap-2 text-lg"><span className="text-2xl">🎧</span> AI creates personal podcasts about <span className="font-bold">YOUR</span> financial journey</div>
          <div className="flex items-center gap-2 text-lg"><span className="text-2xl">🎵</span> Spotify integration for focus music while budgeting</div>
          <div className="flex items-center gap-2 text-lg"><span className="text-2xl">💚</span> AI Financial Therapist for money anxiety & stress</div>
        </div>
        <div className="hero-cta flex flex-col sm:flex-row gap-4 mb-8">
          <button className="btn-primary-large bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl font-bold text-xl shadow-lg hover:scale-105 transition-transform">
            Upload Any Statement - Watch AI Magic
            <span className="block text-xs font-normal mt-1">End expense categorization hell forever</span>
          </button>
          <button className="btn-secondary flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-lg border border-white/30 text-white hover:bg-white/10 transition">
            <span className="play-icon text-2xl">▶️</span>
            Get My Personal Financial Podcast
          </button>
        </div>
        <div className="trust-indicators flex flex-wrap gap-4 text-sm text-purple-200 font-medium">
          <span className="flex items-center gap-1">💳 Bank-level security</span>
          <span className="flex items-center gap-1">⭐ 4.9/5 rating</span>
          <span className="flex items-center gap-1">👥 50,000+ happy users</span>
          <span className="flex items-center gap-1">🔒 SOC 2 compliant</span>
        </div>
      </div>
      {/* Right: Visual Showcase */}
      <div className="flex-1 flex flex-col gap-8 items-center">
        <div className="app-showcase flex flex-col gap-6 w-full max-w-md">
          {/* AI Chat Preview */}
          <div className="ai-chat-preview bg-white/10 rounded-2xl shadow-lg p-6">
            <div className="chat-header flex items-center gap-2 mb-2">
              <span className="ai-avatar text-2xl">🤖</span>
              <span className="font-semibold">Your AI Financial Assistant</span>
            </div>
            <div className="chat-message bg-purple-800/60 rounded-lg p-3 text-sm">
              <p>"I just organized your 47 bank statements in 12 seconds! Found $3,400 in missed deductions. Want to hear your personalized tax strategy podcast? 🎧"</p>
            </div>
          </div>
          {/* Podcast Preview */}
          <div className="podcast-preview bg-white/10 rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="podcast-player flex items-center gap-3">
              <div className="podcast-artwork text-3xl">🎧</div>
              <div className="podcast-info">
                <h4 className="font-semibold text-white mb-1">"Your Money Story - November 2024"</h4>
                <p className="text-purple-200 text-xs">Personal podcast about your financial wins</p>
              </div>
            </div>
          </div>
          {/* Spotify Preview */}
          <div className="spotify-preview bg-white/10 rounded-2xl shadow-lg p-6 flex items-center gap-4">
            <div className="music-player flex items-center gap-2">
              <span className="music-icon text-2xl">♪</span>
              <span className="font-semibold">Budgeting Focus Playlist</span>
              <span className="playing text-green-300 ml-2">🎵 Playing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const SmartImportAIDemo = () => (
  <section className="smart-import-demo py-24 bg-gradient-to-br from-white via-purple-50 to-pink-50">
    <div className="container max-w-7xl mx-auto px-4">
      <div className="section-header text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-2">Smart Import AI in Action</h2>
        <p className="section-subtitle text-lg text-purple-700">Watch revolutionary AI read ANY financial document in seconds</p>
      </div>
      
      {/* 3-Step Process */}
      <div className="demo-process grid md:grid-cols-3 gap-8 mb-16">
        <div className="step-card bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="step-number bg-gradient-to-r from-purple-500 to-pink-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
          <h3 className="text-xl font-bold mb-3">Upload Any Document</h3>
          <p className="text-gray-600 mb-4">PDFs, CSVs, receipts, emails, bank statements - AI reads it all</p>
          <div className="document-examples flex flex-wrap gap-2 justify-center">
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">Chase Statement</span>
            <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm">Receipt Photo</span>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">CSV Export</span>
          </div>
        </div>
        
        <div className="step-card bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="step-number bg-gradient-to-r from-purple-500 to-pink-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
          <h3 className="text-xl font-bold mb-3">AI Processing Magic</h3>
          <p className="text-gray-600 mb-4">Superhuman accuracy with 99.7% categorization precision</p>
          <div className="processing-stats text-center">
            <div className="stat-highlight bg-green-100 text-green-700 px-4 py-2 rounded-lg">
              <span className="font-bold">847 transactions</span> in <span className="font-bold">12 seconds</span>
            </div>
          </div>
        </div>
        
        <div className="step-card bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="step-number bg-gradient-to-r from-purple-500 to-pink-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
          <h3 className="text-xl font-bold mb-3">Perfect Results</h3>
          <p className="text-gray-600 mb-4">Tax-ready categories with audit-proof documentation</p>
          <div className="result-highlight bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-lg">
            <span className="font-bold text-purple-700">$3,400</span> in missed deductions found
          </div>
        </div>
      </div>
      
      {/* AI Conversation Example */}
      <div className="ai-conversation bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
        <h3 className="text-xl font-bold mb-6 text-center">AI Learning in Real-Time</h3>
        <div className="conversation-flow space-y-4">
          <div className="ai-message bg-purple-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="ai-avatar text-xl">🤖</span>
              <span className="font-semibold">AI Assistant</span>
            </div>
            <p>"I noticed you categorize Starbucks as 'Business Meals' but this location is near your home. Should I update this pattern?"</p>
          </div>
          <div className="user-message bg-blue-100 rounded-lg p-4 ml-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="user-avatar text-xl">👤</span>
              <span className="font-semibold">You</span>
            </div>
            <p>"Yes, that's for client meetings. Keep it as business."</p>
          </div>
          <div className="ai-message bg-purple-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="ai-avatar text-xl">🤖</span>
              <span className="font-semibold">AI Assistant</span>
            </div>
            <p>"Perfect! I'll remember that pattern. I've also found 3 similar transactions from last month that should be reclassified. Want me to update them?"</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const TaxSeasonTransformation = () => (
  <section className="tax-season-hero py-24 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
    <div className="container max-w-7xl mx-auto px-4">
      <div className="section-header text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-2">Transform Tax Season from Hell to Heaven</h2>
        <p className="section-subtitle text-lg text-gray-700">From hours of manual work to effortless AI organization</p>
      </div>
      
      <div className="transformation-showcase grid md:grid-cols-2 gap-12 items-center">
        {/* Before XspensesAI */}
        <div className="before-scenario bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold mb-6 text-red-600">❌ Before XspensesAI</h3>
          <div className="pain-points space-y-4">
            <div className="pain-point flex items-start gap-3">
              <span className="text-red-500 text-xl">😰</span>
              <div>
                <h4 className="font-semibold">Hours of Manual Sorting</h4>
                <p className="text-gray-600">Spending 8+ hours organizing receipts and statements</p>
              </div>
            </div>
            <div className="pain-point flex items-start gap-3">
              <span className="text-red-500 text-xl">😤</span>
              <div>
                <h4 className="font-semibold">Categorization Chaos</h4>
                <p className="text-gray-600">Forgetting rules and making inconsistent decisions</p>
              </div>
            </div>
            <div className="pain-point flex items-start gap-3">
              <span className="text-red-500 text-xl">😱</span>
              <div>
                <h4 className="font-semibold">Missing Deductions</h4>
                <p className="text-gray-600">Overlooking legitimate business expenses</p>
              </div>
            </div>
            <div className="pain-point flex items-start gap-3">
              <span className="text-red-500 text-xl">😵</span>
              <div>
                <h4 className="font-semibold">Tax Season Stress</h4>
                <p className="text-gray-600">Panic attacks and sleepless nights</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* After XspensesAI */}
        <div className="after-scenario bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold mb-6 text-green-600">✅ After XspensesAI</h3>
          <div className="success-points space-y-4">
            <div className="success-point flex items-start gap-3">
              <span className="text-green-500 text-xl">⚡</span>
              <div>
                <h4 className="font-semibold">Bulk Upload Magic</h4>
                <p className="text-gray-600">47 bank statements organized in 3 minutes</p>
              </div>
            </div>
            <div className="success-point flex items-start gap-3">
              <span className="text-green-500 text-xl">🧠</span>
              <div>
                <h4 className="font-semibold">AI Organization</h4>
                <p className="text-gray-600">Perfect categorization with 99.7% accuracy</p>
              </div>
            </div>
            <div className="success-point flex items-start gap-3">
              <span className="text-green-500 text-xl">💰</span>
              <div>
                <h4 className="font-semibold">Found Deductions</h4>
                <p className="text-gray-600">$3,400 in missed business expenses discovered</p>
              </div>
            </div>
            <div className="success-point flex items-start gap-3">
              <span className="text-green-500 text-xl">😌</span>
              <div>
                <h4 className="font-semibold">Effortless Tax Season</h4>
                <p className="text-gray-600">Tax-ready reports with audit-proof documentation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Success Story */}
      <div className="success-story bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-8 mt-12 text-center">
        <h3 className="text-2xl font-bold mb-4">Real Success Story</h3>
        <p className="text-lg text-gray-700 mb-4">
          "My shoebox of 1,200 receipts became a perfect spreadsheet in under 5 minutes. 
          AI found $3,400 in deductions I missed. Tax season went from nightmare to entertainment!"
        </p>
        <div className="story-metrics flex justify-center gap-8 text-sm">
          <span className="bg-white px-4 py-2 rounded-full">⚡ 5 minutes vs 8 hours</span>
          <span className="bg-white px-4 py-2 rounded-full">💰 $3,400 found</span>
          <span className="bg-white px-4 py-2 rounded-full">😌 Zero stress</span>
        </div>
      </div>
    </div>
  </section>
);

const RevolutionaryFeatures = () => (
  <section className="revolutionary-features py-24 bg-gradient-to-br from-white via-blue-50 to-indigo-50">
    <div className="container max-w-7xl mx-auto px-4">
      <div className="section-header text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-2">Entertainment Features That Make Finance Addictive</h2>
        <p className="section-subtitle text-lg text-purple-700">The only financial platform that makes managing money genuinely fun and engaging</p>
      </div>
      <div className="features-showcase flex flex-col gap-20">
        {/* AI-Generated Personal Podcasts */}
        <div className="feature-highlight flex flex-col md:flex-row gap-12 items-center">
          <div className="feature-visual flex-1 flex justify-center">
            <div className="podcast-mockup bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center w-full max-w-sm">
              <div className="podcast-icon text-5xl mb-4">🎧</div>
              <h4 className="font-semibold text-lg mb-2">"Sarah's Financial Victory - Goal Achieved!"</h4>
              <div className="audio-waves flex gap-1 mt-2">
                <span className="w-1 h-6 bg-purple-400 rounded animate-pulse"></span>
                <span className="w-1 h-4 bg-pink-400 rounded animate-pulse delay-100"></span>
                <span className="w-1 h-8 bg-blue-400 rounded animate-pulse delay-200"></span>
                <span className="w-1 h-5 bg-purple-300 rounded animate-pulse delay-300"></span>
              </div>
              <div className="podcast-preview mt-4 text-center">
                <p className="text-sm text-gray-600 italic">"This month, Sarah conquered her credit card debt, achieving her goal 3 months early. Her discipline with weekend spending, down 40% from last month, shows remarkable progress..."</p>
              </div>
            </div>
          </div>
          <div className="feature-content flex-1">
            <h3 className="text-2xl font-bold mb-2">AI-Generated Personal Podcasts</h3>
            <p className="feature-tagline text-purple-700 mb-3">Monthly episodes about <span className="font-bold">YOUR</span> financial journey - like having your own money documentary</p>
            <ul className="feature-benefits list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Celebrates your financial wins with documentary-style narration</li>
              <li>Explains spending patterns in engaging, motivational stories</li>
              <li>Provides emotional support during challenging financial periods</li>
              <li>Creates addictive connection to your financial progress</li>
            </ul>
            <div className="podcast-examples bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold mb-2">Sample Episode Titles:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• "How Sarah Conquered Her Credit Card Debt in 6 Months"</li>
                <li>• "Mike's Q4 Business Expense Review & Tax Strategy"</li>
                <li>• "Your November Financial Wins & December Goals"</li>
              </ul>
            </div>
            <a href="/features/personal-podcast" className="feature-link text-purple-600 font-semibold hover:underline">Get My Personal Podcast →</a>
          </div>
        </div>
        
        {/* AI Financial Therapist */}
        <div className="feature-highlight flex flex-col md:flex-row-reverse gap-12 items-center">
          <div className="feature-visual flex-1 flex justify-center">
            <div className="therapy-chat-mockup bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
              <div className="chat-bubble therapist bg-purple-100 text-purple-900 rounded-lg p-4 mb-2 shadow">
                <p>"Money anxiety is completely normal. I notice you feel guilty about self-care expenses. Let's explore why you deserve to invest in yourself..."</p>
              </div>
              <div className="chat-bubble user bg-blue-100 text-blue-900 rounded-lg p-4 mb-2 shadow">
                <p>"I always feel guilty buying anything for myself, even coffee"</p>
              </div>
              <div className="chat-bubble therapist bg-purple-100 text-purple-900 rounded-lg p-4 shadow">
                <p>"That guilt is protecting you from past financial trauma. But you're building healthy habits now. A $5 coffee is an investment in your well-being."</p>
              </div>
            </div>
          </div>
          <div className="feature-content flex-1">
            <h3 className="text-2xl font-bold mb-2">AI Financial Therapist</h3>
            <p className="feature-tagline text-purple-700 mb-3">24/7 emotional support to heal your relationship with money</p>
            <ul className="feature-benefits list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Address money anxiety and financial stress with empathy</li>
              <li>Work through spending guilt without judgment or shame</li>
              <li>Build healthy financial habits and positive money mindset</li>
              <li>Transform financial fear into confidence and empowerment</li>
            </ul>
            <div className="therapy-benefits bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold mb-2">Real Therapy Results:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• 87% reduction in money anxiety after 30 days</li>
                <li>• 94% feel more confident about financial decisions</li>
                <li>• 76% report better sleep during tax season</li>
              </ul>
            </div>
            <a href="/features/ai-therapist" className="feature-link text-purple-600 font-semibold hover:underline">Start Healing Today →</a>
          </div>
        </div>
        
        {/* Spotify for Money */}
        <div className="feature-highlight flex flex-col md:flex-row gap-12 items-center">
          <div className="feature-visual flex-1 flex justify-center">
            <div className="spotify-mockup bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
              <div className="spotify-player flex items-center gap-3 mb-4">
                <span className="spotify-logo text-3xl">♪</span>
                <div className="track-info">
                  <h4 className="font-semibold">Tax Season Victory Mix</h4>
                  <p className="text-purple-400 text-xs">Celebrating your financial wins</p>
                </div>
              </div>
              <div className="player-controls flex gap-2 mt-2 mb-4">
                <button className="text-xl">⏮️</button>
                <button className="text-xl">⏸️</button>
                <button className="text-xl">⏭️</button>
              </div>
              <div className="playlist-suggestions text-sm text-gray-600">
                <p className="font-semibold mb-2">Now Playing:</p>
                <ul className="space-y-1">
                  <li>• "Deep Focus Instrumentals - Receipt Organization"</li>
                  <li>• "Victory Vibes - After Filing"</li>
                  <li>• "Calm Confidence - IRS Stress Relief"</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="feature-content flex-1">
            <h3 className="text-2xl font-bold mb-2">Spotify for Money</h3>
            <p className="feature-tagline text-purple-700 mb-3">Context-aware music that makes every financial task enjoyable</p>
            <ul className="feature-benefits list-disc list-inside text-gray-700 mb-4 space-y-1">
              <li>Focus music for budgeting and financial planning</li>
              <li>Celebration anthems when you hit financial goals</li>
              <li>Stress-relief audio for tax season anxiety</li>
              <li>Motivational playlists for debt payoff journeys</li>
            </ul>
            <div className="music-features bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold mb-2">Smart Music Integration:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Auto-plays focus music during expense categorization</li>
                <li>• Victory songs when AI finds deductions</li>
                <li>• Calming sounds during financial therapy sessions</li>
              </ul>
            </div>
            <a href="/features/spotify-integration" className="feature-link text-purple-600 font-semibold hover:underline">Connect Your Spotify →</a>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const AILearningEvolution = () => (
  <section className="ai-learning-evolution py-24 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
    <div className="container max-w-7xl mx-auto px-4">
      <div className="section-header text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-2">AI Learning & Evolution Timeline</h2>
        <p className="section-subtitle text-lg text-purple-700">Watch your AI transform from basic tool to financial genius</p>
      </div>
      
      <div className="learning-timeline grid md:grid-cols-4 gap-8">
        <div className="timeline-stage bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="stage-number bg-gradient-to-r from-blue-500 to-purple-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
          <h3 className="text-xl font-bold mb-3">Week 1</h3>
          <div className="accuracy-meter mb-4">
            <div className="text-3xl font-bold text-blue-600">78%</div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </div>
          <p className="text-gray-600 mb-4">Learning your basic spending patterns and categorization preferences</p>
          <div className="learning-example bg-blue-50 rounded-lg p-3 text-sm">
            <strong>Example:</strong> "Starbucks = Coffee" (basic categorization)
          </div>
        </div>
        
        <div className="timeline-stage bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="stage-number bg-gradient-to-r from-purple-500 to-pink-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
          <h3 className="text-xl font-bold mb-3">Month 1</h3>
          <div className="accuracy-meter mb-4">
            <div className="text-3xl font-bold text-purple-600">87%</div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </div>
          <p className="text-gray-600 mb-4">Understanding context and business vs personal patterns</p>
          <div className="learning-example bg-purple-50 rounded-lg p-3 text-sm">
            <strong>Example:</strong> "Starbucks near office = Business Meals"
          </div>
        </div>
        
        <div className="timeline-stage bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="stage-number bg-gradient-to-r from-pink-500 to-red-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
          <h3 className="text-xl font-bold mb-3">Month 3</h3>
          <div className="accuracy-meter mb-4">
            <div className="text-3xl font-bold text-pink-600">94%</div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </div>
          <p className="text-gray-600 mb-4">Predicting categories before you think about them</p>
          <div className="learning-example bg-pink-50 rounded-lg p-3 text-sm">
            <strong>Example:</strong> "This looks like a client lunch - categorizing as Business Meals"
          </div>
        </div>
        
        <div className="timeline-stage bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="stage-number bg-gradient-to-r from-red-500 to-orange-500 text-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">4</div>
          <h3 className="text-xl font-bold mb-3">Month 6</h3>
          <div className="accuracy-meter mb-4">
            <div className="text-3xl font-bold text-red-600">99.7%</div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </div>
          <p className="text-gray-600 mb-4">Financial telepathy - knows your patterns better than you do</p>
          <div className="learning-example bg-red-50 rounded-lg p-3 text-sm">
            <strong>Example:</strong> "Found 3 similar transactions that should be reclassified"
          </div>
        </div>
      </div>
      
      <div className="ai-memory-features bg-white rounded-2xl shadow-lg p-8 mt-12">
        <h3 className="text-2xl font-bold mb-6 text-center">AI Memory Palace Features</h3>
        <div className="memory-grid grid md:grid-cols-3 gap-6">
          <div className="memory-feature text-center">
            <div className="memory-icon text-3xl mb-3">🧠</div>
            <h4 className="font-semibold mb-2">Never Categorize Twice</h4>
            <p className="text-sm text-gray-600">AI remembers every decision and applies it consistently</p>
          </div>
          <div className="memory-feature text-center">
            <div className="memory-icon text-3xl mb-3">🔮</div>
            <h4 className="font-semibold mb-2">Pattern Prediction</h4>
            <p className="text-sm text-gray-600">Anticipates your categorization before you make it</p>
          </div>
          <div className="memory-feature text-center">
            <div className="memory-icon text-3xl mb-3">💡</div>
            <h4 className="font-semibold mb-2">Motivation Mastery</h4>
            <p className="text-sm text-gray-600">Learns what motivates you and tailors suggestions accordingly</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const SmartImportAISection = () => (
  <section className="smart-import-ai py-24 bg-gradient-to-br from-purple-50 to-pink-50">
    <div className="container max-w-7xl mx-auto px-4">
      <div className="section-header text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-2">Smart Import AI Superpowers</h2>
        <p className="section-subtitle text-lg text-purple-700">Revolutionary AI that reads ANY financial document instantly</p>
      </div>
      <div className="ai-superpowers grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="ai-power bg-white rounded-2xl shadow-lg p-8">
          <div className="power-icon text-4xl mb-4">🌍</div>
          <h3 className="text-xl font-bold mb-3">Universal Compatibility</h3>
          <p className="text-gray-600 mb-4">Reads statements from 12,000+ banks worldwide. PDFs, CSVs, images, emails, handwritten receipts - AI reads it all.</p>
          <div className="power-example bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3">
            <div className="text-sm text-gray-700">
              <strong>Example:</strong> Upload Chase, Wells Fargo, or any international bank statement
            </div>
          </div>
        </div>
        
        <div className="ai-power bg-white rounded-2xl shadow-lg p-8">
          <div className="power-icon text-4xl mb-4">🧠</div>
          <h3 className="text-xl font-bold mb-3">Memory Palace</h3>
          <p className="text-gray-600 mb-4">Never ask you to categorize "Starbucks" as coffee again. AI remembers every preference and learns your financial DNA.</p>
          <div className="power-example bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3">
            <div className="text-sm text-gray-700">
              <strong>Example:</strong> AI learned: "Starbucks" = "Business Meals" for you
            </div>
          </div>
        </div>
        
        <div className="ai-power bg-white rounded-2xl shadow-lg p-8">
          <div className="power-icon text-4xl mb-4">⚡</div>
          <h3 className="text-xl font-bold mb-3">Tax Season Magic</h3>
          <p className="text-gray-600 mb-4">Organizes entire year of expenses in under 5 minutes. Creates audit-proof categorization for tax season.</p>
          <div className="power-example bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3">
            <div className="text-sm text-gray-700">
              <strong>Example:</strong> 47 bank statements → Tax-ready in 3 minutes
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const SocialProofResults = () => (
  <section className="social-proof-results py-24 bg-white">
    <div className="container max-w-7xl mx-auto px-4">
      <div className="results-grid grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 text-center">
        <div className="result-stat bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
          <span className="stat-number text-4xl font-bold text-purple-600 block mb-3">$12M+</span>
          <span className="stat-label text-gray-700 font-medium">SAVED BY USERS</span>
        </div>
        <div className="result-stat bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
          <span className="stat-number text-4xl font-bold text-purple-600 block mb-3">2.8M+</span>
          <span className="stat-label text-gray-700 font-medium">DOCUMENTS READ BY AI</span>
        </div>
        <div className="result-stat bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
          <span className="stat-number text-4xl font-bold text-purple-600 block mb-3">94%</span>
          <span className="stat-label text-gray-700 font-medium">ACHIEVE FINANCIAL GOALS</span>
          <span className="stat-subtitle text-sm text-gray-500 block mt-1">(vs 23% industry)</span>
        </div>
        <div className="result-stat bg-white shadow-lg rounded-2xl p-8 border border-gray-100">
          <span className="stat-number text-4xl font-bold text-purple-600 block mb-3">150K+</span>
          <span className="stat-label text-gray-700 font-medium">PERSONAL PODCASTS GENERATED</span>
        </div>
      </div>
      <div className="testimonials-preview text-center">
        <h3 className="text-2xl font-bold mb-8">Real Tax Season Transformations</h3>
        <div className="testimonials-grid grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="testimonial-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 flex flex-col items-center">
            <div className="testimonial-content text-gray-800 mb-4">
              <p>"Uploaded 47 bank statements → AI organized everything for taxes in 3 minutes. Found $3,400 in missed deductions! Tax season is now effortless."</p>
            </div>
            <div className="testimonial-author flex items-center gap-3">
              <img src="/api/placeholder/50/50" alt="Sarah M." className="rounded-full w-12 h-12 object-cover" />
              <div className="text-left">
                <span className="author-name font-semibold text-gray-900 block">Sarah M.</span>
                <div className="author-rating text-yellow-400">⭐⭐⭐⭐⭐</div>
              </div>
            </div>
          </div>
          <div className="testimonial-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 flex flex-col items-center">
            <div className="testimonial-content text-gray-800 mb-4">
              <p>"AI reads ANY financial document. My shoebox of receipts became tax-ready categories in under 5 minutes. Never categorize 'Starbucks' as coffee again!"</p>
            </div>
            <div className="testimonial-author flex items-center gap-3">
              <img src="/api/placeholder/50/50" alt="Mike R." className="rounded-full w-12 h-12 object-cover" />
              <div className="text-left">
                <span className="author-name font-semibold text-gray-900 block">Mike R.</span>
                <div className="author-rating text-yellow-400">⭐⭐⭐⭐⭐</div>
              </div>
            </div>
          </div>
          <div className="testimonial-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 flex flex-col items-center">
            <div className="testimonial-content text-gray-800 mb-4">
              <p>"The AI remembers every categorization preference. From tax season chaos to entertainment platform - managing money is now actually fun!"</p>
            </div>
            <div className="testimonial-author flex items-center gap-3">
              <img src="/api/placeholder/50/50" alt="Jennifer L." className="rounded-full w-12 h-12 object-cover" />
              <div className="text-left">
                <span className="author-name font-semibold text-gray-900 block">Jennifer L.</span>
                <div className="author-rating text-yellow-400">⭐⭐⭐⭐⭐</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const CompetitiveDifferentiation = () => (
  <section className="competitive-section py-24 bg-gray-50">
    <div className="container max-w-5xl mx-auto px-4">
      <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-12">Why XspensesAI vs. Other Expense Apps</h2>
              <div className="comparison-grid grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="comparison-item bg-white rounded-2xl shadow-lg p-8 text-center border border-gray-200">
          <h4 className="text-xl font-bold mb-4 text-gray-700">Other Apps</h4>
          <ul className="comparison-list negative text-left space-y-3 text-gray-600">
            <li>❌ Manual expense categorization</li>
            <li>❌ Limited to specific bank formats</li>
            <li>❌ Forget your categorization rules</li>
            <li>❌ Tax season chaos and stress</li>
            <li>❌ No entertainment or engagement value</li>
          </ul>
        </div>
        <div className="comparison-item highlight bg-white rounded-2xl shadow-lg p-8 text-center border-2 border-purple-500">
          <h4 className="text-xl font-bold mb-4 text-purple-700">XspensesAI</h4>
          <ul className="comparison-list positive text-left space-y-3 text-gray-700 font-semibold">
            <li>✅ AI reads ANY financial document instantly</li>
            <li>✅ Universal compatibility - 12,000+ banks worldwide</li>
            <li>✅ AI remembers every preference forever</li>
            <li>✅ AI organizes entire year in under 5 minutes</li>
            <li>✅ Entertainment platform that makes finance enjoyable</li>
          </ul>
        </div>
      </div>
    </div>
  </section>
);

const FinalCTA = () => (
  <section className="final-cta py-24 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
    <div className="container max-w-3xl mx-auto px-4 text-center">
      <div className="cta-content">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ready to Transform Your Relationship with Money?</h2>
        <p className="text-xl text-purple-100 mb-8">Join 50,000+ users who've made financial management enjoyable with AI-powered insights and personalized audio experiences</p>
        <div className="cta-buttons flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button className="btn-primary-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white px-10 py-5 rounded-xl font-bold text-xl shadow-lg hover:scale-105 transition-transform">
            Upload Any Statement - Watch AI Magic
            <span className="block text-xs font-normal mt-1">End expense categorization hell forever</span>
          </button>
          <button className="btn-secondary-large flex items-center gap-2 px-10 py-5 rounded-xl font-bold text-lg border border-white/30 text-white hover:bg-white/10 transition">
            Get My Personal Financial Podcast
          </button>
          <button className="btn-secondary-large flex items-center gap-2 px-10 py-5 rounded-xl font-bold text-lg border border-white/30 text-white hover:bg-white/10 transition">
            Watch Live Demo of Document Reading
          </button>
          </div>
        <div className="cta-guarantees flex flex-wrap gap-4 text-sm text-purple-200 font-medium justify-center">
          <span className="flex items-center gap-1">💳 No credit card required</span>
          <span className="flex items-center gap-1">🔒 Bank-level security</span>
          <span className="flex items-center gap-1">📞 24/7 support</span>
          <span className="flex items-center gap-1">↩️ Cancel anytime</span>
        </div>
      </div>
    </div>
  </section>
);

const NewHomePage = () => (
  <WebsiteLayout>
    <Helmet>
      <title>XspensesAI - World's First FinTech Entertainment Platform | AI Reads Any Statement</title>
      <meta name="description" content="Revolutionary AI reads any bank statement, receipt, or financial document instantly. Creates personal podcasts about YOUR money story + Spotify integration. End expense categorization hell forever." />
      <meta name="keywords" content="AI expense tracker, smart expense management, AI financial assistant, automated expense categorization, financial entertainment platform, AI statement reader, AI reads bank statements automatically, upload any financial document AI organizes, entertainment financial management platform, AI that learns your spending patterns, smart expense import any format, financial podcast creator personal" />
      <meta property="og:title" content="XspensesAI - World's First FinTech Entertainment Platform | AI Reads Any Statement" />
      <meta property="og:description" content="Revolutionary AI reads any bank statement, receipt, or financial document instantly. Creates personal podcasts about YOUR money story + Spotify integration. End expense categorization hell forever." />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="XspensesAI - World's First FinTech Entertainment Platform | AI Reads Any Statement" />
      <meta name="twitter:description" content="Revolutionary AI reads any bank statement, receipt, or financial document instantly. Creates personal podcasts about YOUR money story + Spotify integration." />
    </Helmet>
    <NewHomepageHero />
    <SmartImportAIDemo />
    <TaxSeasonTransformation />
    <RevolutionaryFeatures />
    <AILearningEvolution />
    <SmartImportAISection />
    <SocialProofResults />
    <CompetitiveDifferentiation />
    <FinalCTA />
    {/* Add more sections here for features, testimonials, etc. */}
  </WebsiteLayout>
);

export default NewHomePage;
