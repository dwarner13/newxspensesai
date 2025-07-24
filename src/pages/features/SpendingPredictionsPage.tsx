import React, { useState, useEffect } from 'react';
import WebsiteLayout from '../../components/layout/WebsiteLayout';
import { Link } from 'react-router-dom'; // Added Link import

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
                <span>Travel</span>
                <span>$300</span>
              </div>
              <div className="flex justify-between text-purple-100 text-xs mb-2">
                <span>Other</span>
                <span>$990</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Prediction Demo */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            🤖 Watch AI Predict Your Future Spending in Real-Time
          </h2>
          {/* Prediction Visualization */}
          <div className={`bg-gradient-to-r ${currentScenario.color} rounded-xl p-6 text-white mb-6`}>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left: Current Prediction */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="mr-2">🔮</span>
                  AI Prediction Alert
                </h3>
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <div className="text-2xl font-bold mb-2">{currentScenario.title}</div>
                  <div className="text-xl mb-3">{currentScenario.prediction}</div>
                  <div className="text-sm opacity-90 mb-2">
                    <strong>Why:</strong> {currentScenario.reason}
                  </div>
                  <div className="text-sm opacity-90 mb-3">
                    <strong>When:</strong> {currentScenario.timeline}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Confidence:</span>
                    <span className="font-bold">{currentScenario.confidence}%</span>
                  </div>
                </div>
              </div>
              {/* Right: Timeline Chart */}
              <div>
                <h3 className="text-lg font-semibold mb-4">6-Month Spending Forecast</h3>
                <div className="space-y-2">
                  {monthlyPredictions.map((month, index) => (
                    <div key={month.month} className="flex items-center justify-between bg-white bg-opacity-20 rounded p-2">
                      <span className="w-8 text-sm font-medium">{month.month}</span>
                      <div className="flex-1 mx-3">
                        <div className="bg-white bg-opacity-30 rounded-full h-2">
                          <div 
                            className="bg-yellow-300 h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${(month.predicted / 3000) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-sm font-medium w-16">${month.predicted}</span>
                      <span className="text-xs w-8">{month.confidence}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Scenario Selector */}
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(scenarios).map(([key, scenario]) => (
              <button
                key={key}
                onClick={() => setSelectedScenario(key)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedScenario === key 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="font-semibold text-sm">{scenario.title}</div>
                <div className="text-xs text-gray-600 mt-1">{scenario.prediction}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Spending Timeline */}
      <div className="max-w-4xl mx-auto px-6 pb-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Your Personal Spending Crystal Ball
          </h2>
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
            <h3 className="text-lg font-semibold mb-4">AI-Powered Predictions Include:</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🎄</span>
                  </div>
                  <div>
                    <div className="font-medium">Seasonal Spending Spikes</div>
                    <div className="text-sm opacity-90">Holidays, back-to-school, vacation seasons</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">📱</span>
                  </div>
                  <div>
                    <div className="font-medium">Subscription Lifecycle</div>
                    <div className="text-sm opacity-90">Free trials ending, price increases, renewals</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">💰</span>
                  </div>
                  <div>
                    <div className="font-medium">Income Impact Patterns</div>
                    <div className="text-sm opacity-90">Bonus spending, tax refund splurges</div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🏠</span>
                  </div>
                  <div>
                    <div className="font-medium">Life Event Triggers</div>
                    <div className="text-sm opacity-90">Moving, job changes, major purchases</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">📈</span>
                  </div>
                  <div>
                    <div className="font-medium">Trend Acceleration</div>
                    <div className="text-sm opacity-90">Gradual increases in categories</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">⚠️</span>
                  </div>
                  <div>
                    <div className="font-medium">Budget Breach Warnings</div>
                    <div className="text-sm opacity-90">Early alerts before overspending</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How AI Learns Your Patterns */}
      <div className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How Your AI Becomes a Financial Fortune Teller
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Pattern Analysis</h3>
              <p className="text-gray-600 text-sm">
                AI analyzes 12+ months of spending data to identify recurring patterns, seasonal trends, and behavioral triggers.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">🧠</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Machine Learning</h3>
              <p className="text-gray-600 text-sm">
                Advanced algorithms learn from millions of anonymized spending patterns to improve prediction accuracy.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">⚡</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Real-Time Updates</h3>
              <p className="text-gray-600 text-sm">
                Predictions update instantly as new transactions are processed, keeping forecasts accurate and current.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">🎯</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Personalized Alerts</h3>
              <p className="text-gray-600 text-sm">
                Get custom audio alerts and podcast episodes about your predicted spending changes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Prediction Accuracy Timeline */}
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
                <p className="text-gray-600 mb-3">AI identifies regular bills, salary patterns, and obvious spending cycles. Basic 3-month predictions.</p>
                <div className="bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-500 rounded-full h-2 w-3/4"></div>
                </div>
                <div className="text-sm text-gray-500 mt-1">Accuracy: 78%</div>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-pink-600 font-bold">3M</span>
              </div>
              <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">Month 3: Pattern Recognition</h3>
                <p className="text-gray-600 mb-3">Detects seasonal spending, lifestyle changes, and predicts irregular expenses. 6-month forecasting enabled.</p>
                <div className="bg-gray-200 rounded-full h-2">
                  <div className="bg-pink-500 rounded-full h-2 w-full"></div>
                </div>
                <div className="text-sm text-gray-500 mt-1">Accuracy: 89%</div>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold">6M</span>
              </div>
              <div className="bg-white rounded-lg p-6 flex-1 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">Month 6: Financial Oracle</h3>
                <p className="text-gray-600 mb-3">Predicts complex scenarios, life changes, and economic impacts. 12-month accurate forecasting.</p>
                <div className="bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 rounded-full h-2 w-full"></div>
                </div>
                <div className="text-sm text-gray-500 mt-1">Accuracy: 94%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Entertainment Integration */}
      <div className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Predictions + Audio = Financial Superpowers
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">🎧</span>
                <h3 className="text-lg font-semibold">Prediction Podcasts</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 mb-4">
                <li>• "Your Holiday Spending Forecast Breakdown"</li>
                <li>• "Why AI Predicts Higher Expenses Next Month"</li>
                <li>• "Preparing for Your Predicted Budget Challenges"</li>
                <li>• "Subscription Audit: What's Coming Due"</li>
              </ul>
              <div className="bg-white rounded-lg p-3">
                <div className="text-xs font-medium text-purple-600">Now Playing:</div>
                <div className="text-xs text-gray-600">"Your December Predictions - Personal Financial Forecast"</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">🎵</span>
                <h3 className="text-lg font-semibold">Predictive Playlists</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700 mb-4">
                <li>• "Budget Preparation Focus Flow"</li>
                <li>• "Saving Motivation Mix"</li>
                <li>• "Financial Planning Deep Work"</li>
                <li>• "Abundance Mindset - Future Ready"</li>
              </ul>
              <div className="bg-white rounded-lg p-3">
                <div className="text-xs font-medium text-green-600">Recommended:</div>
                <div className="text-xs text-gray-600">"Future Planning Instrumentals - Crystal Clear Focus"</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof - Prediction Success Stories */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Real Users, Real Prediction Success
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-purple-600 font-bold">MK</span>
                </div>
                <div>
                  <div className="font-semibold">Maria K.</div>
                  <div className="text-sm text-gray-600">Marketing Manager</div>
                </div>
              </div>
              <p className="text-gray-700 text-sm mb-3">
                "AI predicted my car repair 2 months before it happened. Saved me from going into debt by preparing $1,200 in advance!"
              </p>
              <div className="text-green-600 font-semibold">Prediction Accuracy: 96%</div>
            </div>
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-bold">JC</span>
                </div>
                <div>
                  <div className="font-semibold">James C.</div>
                  <div className="text-sm text-gray-600">Freelance Designer</div>
                </div>
              </div>
              <p className="text-gray-700 text-sm mb-3">
                "The AI warned me about holiday overspending in October. I set up a separate fund and had my best financial holiday ever."
              </p>
              <div className="text-green-600 font-semibold">Money Saved: $890</div>
            </div>
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-green-600 font-bold">LS</span>
                </div>
                <div>
                  <div className="font-semibold">Lisa S.</div>
                  <div className="text-sm text-gray-600">Small Business Owner</div>
                </div>
              </div>
              <p className="text-gray-700 text-sm mb-3">
                "AI predicted a cash flow gap 3 months out. I adjusted my business strategy and avoided a major crisis."
              </p>
              <div className="text-green-600 font-semibold">Business Impact: Huge</div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-16">
        <div className="text-center px-6">
          <h2 className="text-3xl font-bold text-white mb-6">
            Ready to See Your Financial Future?
          </h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Join thousands who've eliminated financial surprises with AI-powered spending predictions. Never be caught off-guard again.
          </p>
          <div className="mb-6">
            <div className="text-yellow-300 text-lg font-semibold">
              🔮 Limited Time: Crystal Ball Access for $29/month
            </div>
            <div className="text-purple-200 text-sm">
              (Regular $49/month • See 6 months into your financial future • Cancel anytime)
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Start Predicting My Future
            </Link>
            <Link to="/ai-demo" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors">
              See Prediction Demo
            </Link>
          </div>
          <div className="mt-6 text-purple-200 text-sm">
            ✓ 14-day free trial  ✓ No credit card required  ✓ Instant predictions
          </div>
        </div>
      </div>
    </WebsiteLayout>
  );
};

export default SpendingPredictionsPage; 