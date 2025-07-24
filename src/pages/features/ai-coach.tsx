import React from 'react';
import { Helmet } from 'react-helmet';
import WebsiteLayout from '../../components/layout/WebsiteLayout';

const AICoachFeaturePage = () => {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>AI Goal Concierge - Dreams to Reality | XspensesAI</title>
        <meta name="description" content="Your AI Goal Concierge creates personalized financial roadmaps, provides emotional support, celebrates your wins, and adapts your goals as life changes. The only app that emotionally invests in your success." />
        <meta name="keywords" content="AI goal coach, financial goals, personalized roadmap, emotional support, celebration podcast, smart goal adjustment" />
      </Helmet>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Your AI Goal Concierge</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-purple-200">Dreams to Reality</h2>
            <p className="mb-8 text-lg text-purple-100">Let AI create your personalized goal roadmap, support you emotionally through setbacks, and celebrate your wins with podcasts and smart adjustments as your life evolves.</p>
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex items-center gap-2 text-lg"><span className="text-green-200 text-2xl">🗺️</span> Personalized goal roadmaps for every dream</div>
              <div className="flex items-center gap-2 text-lg"><span className="text-blue-200 text-2xl">💬</span> Emotional support during setbacks</div>
              <div className="flex items-center gap-2 text-lg"><span className="text-pink-200 text-2xl">🎉</span> Celebration podcasts when you achieve goals</div>
              <div className="flex items-center gap-2 text-lg"><span className="text-yellow-200 text-2xl">🔄</span> Smart goal adjustments based on life changes</div>
            </div>
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-bold text-lg shadow-lg hover:scale-105 transition-transform">Start My Goal Journey</button>
            <p className="mt-4 text-purple-200">The only app that emotionally invests in your success</p>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white/10 rounded-2xl shadow-xl p-6 w-full max-w-md flex flex-col items-center">
              <div className="flex flex-col items-center mb-4">
                <div className="text-5xl">🌟</div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse mt-2"></div>
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-white mb-1">Personalized Roadmap</h4>
                <p className="text-purple-200 text-sm mb-2">AI builds your step-by-step plan</p>
                <div className="flex items-center gap-2 justify-center">
                  <button className="bg-white/20 text-white px-4 py-2 rounded-full text-lg">See My Roadmap</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How Your AI Goal Concierge Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">🗺️</div>
              <h3 className="font-semibold text-lg mb-2">Personalized Roadmaps</h3>
              <p className="text-gray-600 mb-3">AI analyzes your dreams, finances, and habits to create a step-by-step plan tailored to you.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">💬</div>
              <h3 className="font-semibold text-lg mb-2">Emotional Support</h3>
              <p className="text-gray-600 mb-3">Get encouragement and empathy when you hit roadblocks or feel discouraged.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">🎉</div>
              <h3 className="font-semibold text-lg mb-2">Celebration Podcasts</h3>
              <p className="text-gray-600 mb-3">When you achieve a goal, your AI creates a custom podcast episode to celebrate your journey.</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">🔄</div>
              <h3 className="font-semibold text-lg mb-2">Smart Adjustments</h3>
              <p className="text-gray-600 mb-3">Life changes? Your roadmap adapts instantly, keeping you on track no matter what.</p>
            </div>
          </div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default AICoachFeaturePage; 