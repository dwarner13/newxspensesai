import React from 'react';
import { Helmet } from 'react-helmet';
import WebsiteLayout from '../../components/layout/WebsiteLayout';

const SpotifyIntegrationFeaturePage = () => {
  return (
    <WebsiteLayout>
      <Helmet>
        <title>Spotify for Money - Music While You Budget | XspensesAI</title>
        <meta name="description" content="The only expense app with Spotify integration. Control your music while budgeting with context-aware playlists for every financial task." />
        <meta name="keywords" content="Spotify budgeting, music expense tracking, financial app with music, budgeting playlist, focus music" />
      </Helmet>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Spotify for Money</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-purple-200">The Only App That Plays Your Music While You Budget</h2>
            <p className="mb-8 text-lg text-purple-100">Transform boring financial tasks into enjoyable experiences with context-aware playlists, focus music for budgeting, and celebration anthems for achieving goals.</p>
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex items-center gap-2 text-lg"><span className="text-green-200 text-2xl">🎵</span> Your Spotify playlists integrated seamlessly</div>
              <div className="flex items-center gap-2 text-lg"><span className="text-purple-200 text-2xl">🎯</span> Smart music suggestions for financial tasks</div>
              <div className="flex items-center gap-2 text-lg"><span className="text-pink-200 text-2xl">🎉</span> Celebration music when you hit financial goals</div>
            </div>
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-lg font-bold text-lg shadow-lg hover:scale-105 transition-transform">Connect My Spotify Free</button>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white/10 rounded-2xl shadow-xl p-6 w-full max-w-md">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-300 text-2xl">♪</span>
                <span className="font-semibold">Budgeting Focus Mix</span>
                <span className="ml-auto text-xs bg-green-700/80 text-white px-2 py-1 rounded">🎵 Playing</span>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <img src="/api/placeholder/60/60" alt="Album Art" className="rounded-lg w-16 h-16 object-cover" />
                <div>
                  <h4 className="font-semibold text-white">Lo-fi Study Beats</h4>
                  <p className="text-purple-200 text-sm">Perfect for Budget Planning</p>
                </div>
                <div className="flex gap-2 ml-auto">
                  <button className="text-white text-xl">⏮️</button>
                  <button className="text-white text-xl">⏸️</button>
                  <button className="text-white text-xl">⏭️</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Context Playlists Section */}
      <section className="py-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Smart Playlists for Every Financial Moment</h2>
          <p className="text-lg text-gray-600 mb-10">AI curates the perfect music for your financial tasks, moods, and achievements</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="font-semibold text-lg mb-2">Budgeting Focus</h3>
              <p className="text-gray-600 mb-3">Lo-fi beats and ambient sounds to keep you focused while planning your finances</p>
              <div className="text-gray-500 text-sm space-y-1">
                <div>• Study Lo-Fi Hip Hop</div>
                <div>• Ambient Focus</div>
                <div>• Concentration Beats</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">🎉</div>
              <h3 className="font-semibold text-lg mb-2">Goal Celebration</h3>
              <p className="text-gray-600 mb-3">Upbeat anthems to celebrate when you hit your savings targets and financial milestones</p>
              <div className="text-gray-500 text-sm space-y-1">
                <div>• Feel Good Hits</div>
                <div>• Victory Songs</div>
                <div>• Pump Up Anthems</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">💰</div>
              <h3 className="font-semibold text-lg mb-2">Expense Review</h3>
              <p className="text-gray-600 mb-3">Smooth jazz and chill vibes for reviewing monthly expenses and financial reports</p>
              <div className="text-gray-500 text-sm space-y-1">
                <div>• Smooth Jazz</div>
                <div>• Chill Vibes</div>
                <div>• Background Instrumental</div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-start">
              <div className="text-3xl mb-2">🧘</div>
              <h3 className="font-semibold text-lg mb-2">Financial Stress Relief</h3>
              <p className="text-gray-600 mb-3">Calming music and nature sounds for when money anxiety gets overwhelming</p>
              <div className="text-gray-500 text-sm space-y-1">
                <div>• Meditation Music</div>
                <div>• Nature Sounds</div>
                <div>• Stress Relief</div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Music Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Music Makes Money Management Better</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
              <h4 className="font-semibold text-lg mb-2">Reduces Financial Stress</h4>
              <p className="text-gray-600">Calming music lowers cortisol levels and makes financial tasks less anxiety-provoking</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
              <h4 className="font-semibold text-lg mb-2">Improves Focus</h4>
              <p className="text-gray-600">Background music helps you concentrate on budgeting and financial planning tasks</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
              <h4 className="font-semibold text-lg mb-2">Creates Positive Associations</h4>
              <p className="text-gray-600">Good music makes you look forward to managing your finances instead of dreading it</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center">
              <h4 className="font-semibold text-lg mb-2">Celebrates Achievements</h4>
              <p className="text-gray-600">Victory music reinforces positive financial behaviors and goal achievement</p>
            </div>
          </div>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default SpotifyIntegrationFeaturePage; 