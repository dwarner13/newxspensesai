import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import WebsiteLayout from '../components/layout/WebsiteLayout';

const SpendingPredictionsPage = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [predictionConfidence, setPredictionConfidence] = useState(94);
  const [selectedScenario, setSelectedScenario] = useState('holiday');
  const [animationStep, setAnimationStep] = useState(0);

  // Prediction scenarios
  const scenarios = {
    holiday: {
      title: "Holiday Season Surge",
      prediction: "$1,847 above normal",
      confidence: 96,
      reason: "AI detected gift shopping patterns from last 3 years",
      timeline: "Starting mid-November",
      color: "from-red-500 to-green-500"
    },
    income: {
      title: "Tax Refund Impact", 
      prediction: "$2,340 spending increase",
      confidence: 92,
      reason: "Historical pattern shows 23% spending boost after refunds",
      timeline: "March-April window",
      color: "from-blue-500 to-purple-500"
    },
    subscription: {
      title: "Subscription Creep Alert",
      prediction: "+$89/month by year-end",
      confidence: 89,
      reason: "AI identified 3 forgotten trials converting to paid",
      timeline: "Next 90 days",
      color: "from-yellow-500 to-orange-500"
    }
  };

  // Future months prediction data
  const monthlyPredictions = [
    { month: 'Jan', actual: 2340, predicted: 2410, confidence: 94 },
    { month: 'Feb', actual: 2180, predicted: 2205, confidence: 96 },
    { month: 'Mar', actual: 2890, predicted: 2850, confidence: 93 },
    { month: 'Apr', actual: 0, predicted: 2420, confidence: 91 },
    { month: 'May', actual: 0, predicted: 2680, confidence: 89 },
    { month: 'Jun', actual: 0, predicted: 2340, confidence: 88 }
  ];

  // Animation cycle for confidence meter
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Cycle through scenarios
  useEffect(() => {
    const scenarios_keys = Object.keys(scenarios);
    const interval = setInterval(() => {
      setSelectedScenario(prev => {
        const currentIndex = scenarios_keys.indexOf(prev);
        return scenarios_keys[(currentIndex + 1) % scenarios_keys.length];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const currentScenario = scenarios[selectedScenario];

  return (
    <WebsiteLayout>
      {/* Hero Section with Dark Gradient */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">AI Spending Predictions</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-purple-200">Your Financial Crystal Ball</h2>
            <p className="mb-8 text-lg text-purple-100">Your AI predicts future expenses with 94% accuracy. See what's coming before it hits your bank account. Never be financially surprised again.</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/signup" className="inline-block bg-gradient-to-r from-orange-500 to-pink-500 text-white px-10 py-5 rounded-xl font-bold text-lg shadow-lg hover:from-pink-500 hover:to-orange-500 transition-all duration-300">
                Start Predicting My Future
              </Link>
              <Link to="/ai-demo" className="inline-block border-2 border-white text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-600 transition-all duration-300">
                Try AI Demo
              </Link>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white/10 rounded-2xl shadow-xl p-6 w-full max-w-md text-center">
              <div className="flex flex-col items-center mb-4">
                <span className="text-purple-200 text-5xl mb-2">🔮</span>
                <span className="font-semibold text-lg text-white">Next Month's Prediction</span>
              </div>
              <div className="text-3xl font-bold text-green-300 mb-2">$2,340</div>
              <div className="text-purple-200 text-sm mb-4">Expected total spending (AI forecast)</div>
              <div className="flex justify-between text-purple-100 text-xs mb-2">
                <span>Dining Out</span>
                <span>$420</span>
              </div>
              <div className="flex justify-between text-purple-100 text-xs mb-2">
                <span>Groceries</span>
                <span>$510</span>
              </div>
              <div className="flex justify-between text-purple-100 text-xs mb-2">
                <span>Subscriptions</span>
                <span>$120</span>
              </div>
              <div className="flex justify-between text-purple-100 text-xs mb-2">
                <span>Transportation</span>
                <span>$280</span>
              </div>
              <div className="flex justify-between text-purple-100 text-xs mb-2">
                <span>Entertainment</span>
                <span>$180</span>
              </div>
              <div className="flex justify-between text-purple-100 text-xs mb-2">
                <span>Other</span>
                <span>$630</span>
              </div>
              <div className="mt-4 pt-4 border-t border-purple-300/30">
                <div className="flex justify-between items-center">
                  <span className="text-purple-200 text-sm">Confidence</span>
                  <span className="text-green-300 font-bold text-sm">94%</span>
                </div>
                <div className="w-full bg-purple-700 rounded-full h-2 mt-2">
                  <div className="bg-green-400 h-2 rounded-full" style={{ width: '94%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Predict Your Financial Future</h2>
            <p className="text-xl text-gray-600">AI-powered spending predictions that actually work</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🧠</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Pattern Recognition</h3>
              <p className="text-gray-600 mb-4">AI analyzes your spending patterns across seasons, life events, and habits to predict future expenses.</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Seasonal spending patterns</li>
                <li>• Life event correlations</li>
                <li>• Behavioral analysis</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">94% Accuracy</h3>
              <p className="text-gray-600 mb-4">Our predictions are 94% accurate on average, helping you plan with confidence.</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Machine learning models</li>
                <li>• Continuous improvement</li>
                <li>• Real-time adjustments</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Early Warnings</h3>
              <p className="text-gray-600 mb-4">Get alerts about unusual spending patterns before they become problems.</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Anomaly detection</li>
                <li>• Budget alerts</li>
                <li>• Trend warnings</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-4xl font-bold mb-6">Ready to See Your Financial Future?</h2>
          <p className="text-xl mb-8">Join thousands of users who never get financially surprised again.</p>
          <Link to="/signup" className="inline-block bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors">
            Start Predicting Now
          </Link>
        </div>
      </section>
    </WebsiteLayout>
  );
};

export default SpendingPredictionsPage; 