import React from 'react';
import { Link } from 'react-router-dom';

const SpendingPredictionsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header Section */}
      <div className="text-center py-16 px-6">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
          AI Spending Predictions
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Your AI predicts future expenses with 94% accuracy. Never be caught off-guard by unexpected spending again. Watch your financial AI learn your patterns and forecast what's coming.
        </p>
      </div>

      {/* Interactive Demo Section */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            See Your Spending Predictions in Real-Time
          </h2>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 mb-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🔮</div>
              <h3 className="text-lg font-semibold text-purple-800">
                Your AI Financial Forecast
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Next Week</span>
                </div>
                <span className="text-gray-600">Predicted: $284 • Confidence: 96%</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="font-medium">Next Month</span>
                </div>
                <span className="text-gray-600">Predicted: $1,247 • Holiday surge detected</span>
              </div>
              <div className="flex items-center justify-between bg-white rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="font-medium">3 Months</span>
                </div>
                <span className="text-gray-600">Predicted: $1,156 • Back to normal pattern</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How Your AI Learns to Predict Spending
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">🧠</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Pattern Analysis</h3>
              <p className="text-gray-600">
                AI analyzes your spending history, identifying patterns, cycles, and trends unique to your lifestyle and financial behavior.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Future Modeling</h3>
              <p className="text-gray-600">
                Advanced algorithms predict future expenses based on seasonality, income changes, and life events with 94% accuracy.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Smart Alerts</h3>
              <p className="text-gray-600">
                Get personalized audio alerts and podcast recommendations to help you prepare for predicted spending changes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Learning Timeline */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Watch Your AI Get Smarter Over Time
          </h2>
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold">1M</span>
              </div>
              <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">Month 1: Learning Your Basics</h3>
                <p className="text-gray-600">AI identifies your regular bills, salary patterns, and basic spending categories. Accuracy: 78%</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-pink-600 font-bold">3M</span>
              </div>
              <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">Month 3: Pattern Recognition</h3>
                <p className="text-gray-600">Detects seasonal spending, lifestyle changes, and predicts irregular expenses. Accuracy: 89%</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold">6M</span>
              </div>
              <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">Month 6: Financial Forecasting Mastery</h3>
                <p className="text-gray-600">Predicts complex spending scenarios, economic impacts, and life changes. Accuracy: 94%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Entertainment Integration */}
      <div className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Predictions + Audio = Smart Financial Preparation
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">🎧</span>
                <h3 className="text-lg font-semibold">Prediction Podcasts</h3>
              </div>
              <p className="text-gray-700 mb-4">
                "Your AI predicts higher spending next month. Here's a personalized podcast about holiday budgeting strategies..."
              </p>
              <div className="bg-white rounded-lg p-3">
                <div className="text-sm font-medium text-gray-800">Now Playing:</div>
                <div className="text-sm text-gray-600">"Preparing for Holiday Expenses - Your Personal Guide"</div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">🎵</span>
                <h3 className="text-lg font-semibold">Focus Music for Financial Goals</h3>
              </div>
              <p className="text-gray-700 mb-4">
                When AI predicts budget challenges, get motivational Spotify playlists to keep you focused on your financial goals.
              </p>
              <div className="bg-white rounded-lg p-3">
                <div className="text-sm font-medium text-gray-800">Recommended Playlist:</div>
                <div className="text-sm text-gray-600">"Budget Boss - Motivation Mix"</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-16">
        <div className="text-center px-6">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to See Your Financial Future?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join thousands who've eliminated financial surprises with AI-powered spending predictions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Start Free Trial
            </Link>
            <Link to="/ai-demo" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors">
              Try AI Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpendingPredictionsPage; 