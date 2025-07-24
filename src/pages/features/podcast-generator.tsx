import React from 'react';
import { Link } from 'react-router-dom';
import WebsiteLayout from '../../components/layout/WebsiteLayout';

const PodcastGeneratorPage = () => {
  return (
    <WebsiteLayout>
      {/* Hero Section with Dark Gradient */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Personal Podcast Generator</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-purple-200">Your AI Financial Storyteller</h2>
            <p className="mb-8 text-lg text-purple-100">The world's first AI that creates personalized financial podcasts about YOUR money story. Get custom episodes that evolve with your financial journey, making money management actually entertaining.</p>
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex items-center gap-2 text-lg"><span className="text-pink-200 text-2xl">🎙️</span> Personalized financial episodes</div>
              <div className="flex items-center gap-2 text-lg"><span className="text-blue-200 text-2xl">📊</span> AI analyzes your spending patterns</div>
              <div className="flex items-center gap-2 text-lg"><span className="text-green-200 text-2xl">🎵</span> Natural voice with background music</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/signup" className="inline-block bg-gradient-to-r from-orange-500 to-pink-500 text-white px-10 py-5 rounded-xl font-bold text-lg shadow-lg hover:from-pink-500 hover:to-orange-500 transition-all duration-300">
                Generate My First Episode
              </Link>
              <Link to="/ai-demo" className="inline-block border-2 border-white text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-600 transition-all duration-300">
                Hear Sample Episodes
              </Link>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white/10 rounded-2xl shadow-xl p-6 w-full max-w-md text-center">
              <div className="flex flex-col items-center mb-4">
                <span className="text-purple-200 text-5xl mb-2">🎙️</span>
                <span className="font-semibold text-lg text-white">Your Latest Episode</span>
              </div>
              <div className="text-xl font-bold text-green-300 mb-2">"Your Money Story - December"</div>
              <div className="text-purple-200 text-sm mb-4">Episode 12 • 18 minutes</div>
              <div className="space-y-2 text-left">
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>Holiday spending patterns</span>
                  <span>✓</span>
                </div>
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>Friday overspending analysis</span>
                  <span>✓</span>
                </div>
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>Europe trip fund progress</span>
                  <span>✓</span>
                </div>
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>Subscription audit results</span>
                  <span>✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Listen to Your AI-Generated Financial Podcast
          </h2>
          {/* Podcast Player Demo */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white mb-6">
            <div className="grid md:grid-cols-2 gap-6 items-center">
              {/* Left: Player */}
              <div>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🎙️</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">"Your Money Story - December 2024"</h3>
                    <p className="text-purple-200 text-sm">Episode 12 • Generated for you • 18 minutes</p>
                  </div>
                </div>
                {/* Audio Waveform Visualization */}
                <div className="mb-4">
                  <div className="flex items-center space-x-1 mb-2">
                    {Array.from({length: 50}).map((_, i) => (
                      <div key={i} className={`w-1 bg-white bg-opacity-60 rounded-full ${
                        i < 20 ? 'h-2' : i < 25 ? 'h-4' : i < 30 ? 'h-3' : i < 35 ? 'h-6' : 'h-2'
                      }`}></div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-purple-200">
                    <span>2:34</span>
                    <span>18:42</span>
                  </div>
                </div>
                {/* Episode Description */}
                <div className="bg-white bg-opacity-10 rounded-lg p-4">
                  <p className="text-sm text-purple-100">
                    "This month, your AI noticed you're spending 23% more on dining out compared to last month. Let's explore why this happened and create a strategy that doesn't eliminate the joy of eating out, but makes it more intentional..."
                  </p>
                </div>
              </div>
              {/* Right: Content Examples */}
              <div className="grid gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">This Week's Topics</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Your holiday spending patterns</li>
                    <li>• Why you overspend on Fridays</li>
                    <li>• Goal progress: Europe trip fund</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Personalized Insights</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Coffee spending psychology</li>
                    <li>• Weekend vs weekday habits</li>
                    <li>• Subscription audit results</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Action Items</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Set up Christmas fund</li>
                    <li>• Negotiate gym membership</li>
                    <li>• Try 1-week dining budget</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid Section */}
      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How Your AI Podcast Host Knows Your Money Story
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Analyzes Your Data</h3>
              <p className="text-gray-600">
                AI reviews your spending patterns, financial goals, and money habits to understand your unique financial story and challenges.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">✍️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Creates Custom Scripts</h3>
              <p className="text-gray-600">
                Generates personalized episode scripts addressing your specific financial situations, goals, and learning preferences.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">🎵</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Produces Episodes</h3>
              <p className="text-gray-600">
                Creates engaging audio content with natural voice, background music, and actionable insights tailored specifically to you.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Your Podcast Evolves With Your Financial Journey
          </h2>
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold">Ep1</span>
              </div>
              <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">"Getting to Know Your Money Habits"</h3>
                <p className="text-gray-600 mb-3">Your AI host introduces itself and breaks down your spending patterns from the last 3 months.</p>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="mr-4">🎧 22 min</span>
                  <span className="mr-4">📅 Week 1</span>
                  <span>🎯 Foundation Building</span>
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-pink-600 font-bold">Ep5</span>
              </div>
              <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">"Your Coffee Shop Revelation"</h3>
                <p className="text-gray-600 mb-3">AI discovered you spend more at coffee shops when stressed. Let's explore this pattern and create better coping strategies.</p>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="mr-4">🎧 18 min</span>
                  <span className="mr-4">📅 Month 1</span>
                  <span>🎯 Behavior Analysis</span>
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold">Ep12</span>
              </div>
              <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">"Celebrating Your Savings Win"</h3>
                <p className="text-gray-600 mb-3">You hit your $500 emergency fund goal! Your AI celebrates this milestone and plans your next financial adventure.</p>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="mr-4">🎧 25 min</span>
                  <span className="mr-4">📅 Month 3</span>
                  <span>🎯 Achievement & Growth</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Integration Section */}
      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Powered by Your Complete Financial Picture
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold mb-2">Smart Import Data</h3>
              <p className="text-sm text-gray-600">Your bank statements fuel personalized episode topics</p>
            </div>
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="font-semibold mb-2">Goal Progress</h3>
              <p className="text-sm text-gray-600">Episodes celebrate wins and strategize challenges</p>
            </div>
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-3xl mb-3">🔮</div>
              <h3 className="font-semibold mb-2">Spending Predictions</h3>
              <p className="text-sm text-gray-600">Future-focused content based on AI forecasts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-16">
        <div className="text-center px-6">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready for Your Personal Financial Podcast?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join thousands getting weekly AI-generated episodes about their unique money story. It's like having a financial advisor and podcast host in one.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Generate My First Episode
            </Link>
            <Link to="/ai-demo" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors">
              Hear Sample Episodes
            </Link>
          </div>
        </div>
      </div>
    </WebsiteLayout>
  );
};

export default PodcastGeneratorPage; 