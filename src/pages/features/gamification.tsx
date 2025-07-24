import React from 'react';
import { Helmet } from 'react-helmet';
import WebsiteLayout from '../../components/layout/WebsiteLayout';

const GamificationFeaturePage = () => {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>Expense Gamification - Level Up Your Money Game | XspensesAI</title>
        <meta name="description" content="Turn boring budgeting into an addictive game. Earn XP, unlock achievements, and level up your financial health with XspensesAI's gamification system." />
        <meta name="keywords" content="gamified budgeting, financial gamification, expense tracking game, XspensesScore, financial achievements" />
      </Helmet>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Level Up Your Money Game</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-purple-200">Turn Boring Budgeting Into an Addictive Game</h2>
            <p className="mb-8 text-lg text-purple-100">Earn XP for good financial habits, unlock achievements for hitting goals, and compete with yourself to build the ultimate financial health score.</p>
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex items-center gap-2 text-lg"><span className="text-yellow-300 text-2xl">⭐</span> <span className="text-purple-100">Level 47 Financial Wizard</span></div>
              <div className="flex items-center gap-2 text-lg"><span className="text-pink-200 text-2xl">🏆</span> <span className="text-purple-100">23 Achievements Unlocked</span></div>
              <div className="flex items-center gap-2 text-lg"><span className="text-orange-300 text-2xl">🔥</span> <span className="text-purple-100">45 Day Streak</span></div>
            </div>
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-bold text-lg shadow-lg hover:scale-105 transition-transform">Start Playing Now</button>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white/10 rounded-2xl shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center gap-4 mb-4">
                <div className="text-4xl">👑</div>
                <div>
                  <h4 className="font-semibold text-white">Sarah the Budget Master</h4>
                  <div className="w-40 h-3 bg-purple-200/30 rounded-full overflow-hidden mt-2 mb-1">
                    <div className="bg-gradient-to-r from-yellow-400 to-pink-400 h-full rounded-full" style={{width: '73%'}}></div>
                  </div>
                  <span className="text-purple-100 text-xs">2,340 / 3,200 XP to Level 48</span>
                </div>
              </div>
              <div className="bg-purple-800/40 rounded-lg p-4">
                <h5 className="font-semibold text-white mb-2">Recent Achievements</h5>
                <div className="text-yellow-200 text-sm mb-1">🎯 Goal Crusher - Saved $1,000 this month</div>
                <div className="text-pink-200 text-sm mb-1">📊 Data Detective - Analyzed 3 months of spending</div>
                <div className="text-green-200 text-sm">💰 Penny Pincher - Found $50 in savings</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Game Mechanics Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How the Money Game Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">⭐</div>
              <h3 className="font-semibold text-lg mb-2">Earn XP for Good Habits</h3>
              <p className="text-gray-600 mb-3">Every positive financial action earns experience points</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>+50 XP for staying under budget</li>
                <li>+100 XP for hitting savings goals</li>
                <li>+25 XP for categorizing expenses</li>
                <li>+200 XP for debt payments</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">🏆</div>
              <h3 className="font-semibold text-lg mb-2">Unlock Achievements</h3>
              <p className="text-gray-600 mb-3">Celebrate financial milestones with special badges</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>🎯 Goal Crusher - Hit 5 goals in a row</li>
                <li>💎 Diamond Saver - $10K in savings</li>
                <li>🔥 Streak Master - 30 day budget streak</li>
                <li>📈 Growth Hacker - 50% spending improvement</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-semibold text-lg mb-2">XspensesScore Ranking</h3>
              <p className="text-gray-600 mb-3">Your overall financial health score that levels up over time</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>Real-time score based on all financial metrics</li>
                <li>Compare with your past performance</li>
                <li>Unlock new features as score improves</li>
                <li>Achievement multipliers for high scores</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">🎮</div>
              <h3 className="font-semibold text-lg mb-2">Daily Challenges</h3>
              <p className="text-gray-600 mb-3">Fun mini-games and challenges to build financial habits</p>
              <ul className="list-disc list-inside text-gray-500 text-sm space-y-1">
                <li>"No-Spend Tuesday" challenge</li>
                <li>"Find 3 subscription savings" quest</li>
                <li>"Cook at home" week challenge</li>
                <li>"Emergency fund" building mission</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default GamificationFeaturePage; 