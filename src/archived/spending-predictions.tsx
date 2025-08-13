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
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">1</div>
              <div>
                <h3 className="font-semibold text-gray-900">Week 1: Pattern Recognition</h3>
                <p className="text-gray-600">AI learns your basic spending patterns and categories</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">2</div>
              <div>
                <h3 className="font-semibold text-gray-900">Week 4: Seasonal Patterns</h3>
                <p className="text-gray-600">AI identifies recurring seasonal spending and life events</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">3</div>
              <div>
                <h3 className="font-semibold text-gray-900">Week 12: Predictive Power</h3>
                <p className="text-gray-600">AI achieves 94% accuracy in predicting future expenses</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-4xl font-bold mb-6">Ready to See Your Financial Future?</h2>
          <p className="text-xl mb-8">Join thousands of users who never get financially surprised again.</p>
          <Link to="/signup" className="inline-block bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors">
            Start Predicting Now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SpendingPredictionsPage; 