import React from 'react';
import { Helmet } from 'react-helmet-async';
import WebsiteLayout from '../../components/layout/WebsiteLayout';

const AIGoalsFeaturePage = () => {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>AI Goal Concierge - Personal Financial Goals Assistant | XspensesAI</title>
        <meta name="description" content="Your personal AI goal concierge helps set, track, and achieve financial goals with emotional support, smart adjustments, and celebration podcasts." />
        <meta name="keywords" content="AI goal setting, personal financial goals, goal tracking app, financial goal assistant, smart goal planning" />
      </Helmet>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Your AI Goal Concierge</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-purple-200">Dreams to Reality - With Emotional Support</h2>
            <p className="mb-8 text-lg text-purple-100">The only AI that emotionally invests in your success. Get personalized goal roadmaps, emotional support during setbacks, and celebration podcasts when you achieve your dreams.</p>
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex items-center gap-2 text-lg"><span className="text-green-200 text-2xl">94%</span> Goal completion rate</div>
              <div className="flex items-center gap-2 text-lg"><span className="text-blue-200 text-2xl">3.2x</span> Faster goal achievement</div>
              <div className="flex items-center gap-2 text-lg"><span className="text-pink-200 text-2xl">24/7</span> Emotional support</div>
            </div>
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-bold text-lg shadow-lg hover:scale-105 transition-transform">Start Achieving My Dreams</button>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white/10 rounded-2xl shadow-xl p-6 w-full max-w-md flex flex-col items-center">
              <div className="w-full mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">🏠</span>
                  <h4 className="font-semibold text-white">Save $50,000 for House Down Payment</h4>
                </div>
                <div className="w-full h-4 bg-purple-200/30 rounded-full overflow-hidden mb-2">
                  <div className="bg-gradient-to-r from-green-400 to-blue-400 h-full rounded-full" style={{width: '67%'}}></div>
                </div>
                <span className="text-purple-100 text-xs">$33,500 / $50,000 (67%)</span>
                <div className="bg-purple-800/40 rounded-lg p-3 mt-3">
                  <p className="text-green-200 text-sm">💪 "You're doing amazing! At this pace, you'll reach your goal 4 months early. Your dedication is inspiring!"</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Goal Features Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Your Personal Goal Success System</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-semibold text-lg mb-2">Smart Goal Planning</h3>
              <p className="text-gray-600 mb-3">AI creates personalized roadmaps based on your income, expenses, and lifestyle</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>SMART goal framework adaptation</li>
                <li>Realistic timeline calculations</li>
                <li>Custom milestone creation</li>
                <li>Risk factor assessment</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">💪</div>
              <h3 className="font-semibold text-lg mb-2">Emotional Support System</h3>
              <p className="text-gray-600 mb-3">Get encouragement, motivation, and gentle guidance when you face setbacks</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>Personalized motivation messages</li>
                <li>Setback recovery strategies</li>
                <li>Progress celebration moments</li>
                <li>Mental health check-ins</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">🔄</div>
              <h3 className="font-semibold text-lg mb-2">Dynamic Goal Adjustments</h3>
              <p className="text-gray-600 mb-3">AI adapts your goals when life changes, keeping them challenging but achievable</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>Income change adaptations</li>
                <li>Life event goal modifications</li>
                <li>Priority rebalancing</li>
                <li>Timeline optimization</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">🎉</div>
              <h3 className="font-semibold text-lg mb-2">Achievement Celebrations</h3>
              <p className="text-gray-600 mb-3">Personal podcast episodes celebrating your wins and reflecting on your journey</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>Custom celebration podcasts</li>
                <li>Achievement story narration</li>
                <li>Success pattern analysis</li>
                <li>Next goal inspiration</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default AIGoalsFeaturePage; 
