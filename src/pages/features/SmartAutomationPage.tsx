import React, { useState, useEffect } from 'react';
import WebsiteLayout from '../../components/layout/WebsiteLayout';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const SmartAutomationPage = () => {
  console.log('SmartAutomationPage is loading...');
  
  const [automationLevel, setAutomationLevel] = useState('Basic');
  const [aiAccuracy, setAiAccuracy] = useState(78);
  const [learningDays, setLearningDays] = useState(1);

  // Simulate AI learning progression
  useEffect(() => {
    const interval = setInterval(() => {
      setLearningDays(prev => {
        if (prev < 90) {
          const newDays = prev + 1;
          // AI accuracy progression: 78% → 94% → 99.7%
          if (newDays <= 30) {
            setAiAccuracy(78 + (newDays * 0.53)); // 78% to 94% over 30 days
          } else if (newDays <= 90) {
            setAiAccuracy(94 + ((newDays - 30) * 0.095)); // 94% to 99.7% over 60 days
          }
          return newDays;
        }
        return prev;
      });
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <WebsiteLayout>
      <div className="min-h-screen">
      <Helmet>
        <title>Smart Financial Automation - AI Takes Complete Control | XspensesAI</title>
        <meta name="description" content="Revolutionary AI learns your money habits, automates all financial decisions, and achieves 99.7% accuracy. Let intelligent automation take complete control of your finances." />
        <meta name="keywords" content="smart financial automation, AI automated budgeting, intelligent expense categorization, auto financial management, AI learning financial assistant, smart money automation, AI that learns your spending habits automatically, smart automation takes control of finances, AI categorizes expenses with perfect accuracy, automated budgeting that adapts to lifestyle, financial AI that thinks ahead for you, intelligent automation learns your money patterns" />
        <meta property="og:title" content="Smart Financial Automation - AI Takes Complete Control | XspensesAI" />
        <meta property="og:description" content="Revolutionary AI learns your money habits, automates all financial decisions, and achieves 99.7% accuracy." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Smart Financial Automation - AI Takes Complete Control | XspensesAI" />
        <meta name="twitter:description" content="Revolutionary AI learns your money habits and automates all financial decisions." />
      </Helmet>

      {/* Hero Section with Dark Gradient */}
      <section className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white py-20">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            {/* Automation Level Selector */}
            <div className="flex mb-6">
              <div className="bg-white/10 rounded-lg p-1 backdrop-blur-sm">
                <button 
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    automationLevel === 'Basic' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-purple-200 hover:text-white'
                  }`}
                  onClick={() => setAutomationLevel('Basic')}
                >
                  🚀 Basic AI
                </button>
                <button 
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    automationLevel === 'Advanced' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-purple-200 hover:text-white'
                  }`}
                  onClick={() => setAutomationLevel('Advanced')}
                >
                  ⚡ Advanced AI
                </button>
                <button 
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    automationLevel === 'Autonomous' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-purple-200 hover:text-white'
                  }`}
                  onClick={() => setAutomationLevel('Autonomous')}
                >
                  🤖 Autonomous AI
                </button>
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Smart Financial Automation</h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-purple-200">AI Takes Complete Control</h2>
            <p className="mb-8 text-lg text-purple-100">
              Revolutionary AI that learns your money habits, thinks ahead for you, and makes thousands of micro-decisions automatically. 
              {automationLevel === 'Basic' && ' Start with intelligent categorization and basic automation.'}
              {automationLevel === 'Advanced' && ' Experience predictive budgeting and smart financial insights.'}
              {automationLevel === 'Autonomous' && ' Let AI take complete control with superhuman accuracy and autonomous decision-making.'}
            </p>
            
            <div className="flex flex-col gap-3 mb-8">
              <div className="flex items-center gap-2 text-lg">
                <span className="text-pink-200 text-2xl">🧠</span> 
                AI learns and evolves with 99.7% accuracy
              </div>
              <div className="flex items-center gap-2 text-lg">
                <span className="text-blue-200 text-2xl">⚡</span> 
                Makes 200+ daily micro-decisions automatically
              </div>
              <div className="flex items-center gap-2 text-lg">
                <span className="text-green-200 text-2xl">🔮</span> 
                Predicts financial needs 6 months ahead
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/signup" 
                className="inline-block bg-gradient-to-r from-orange-500 to-pink-500 text-white px-10 py-5 rounded-xl font-bold text-lg shadow-lg hover:from-pink-500 hover:to-orange-500 transition-all duration-300"
              >
                Let AI Take Complete Control
              </Link>
              <a 
                href="#learning"
                className="inline-block border-2 border-white text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-600 transition-all duration-300"
              >
                Watch AI Learn Live
              </a>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="bg-white/10 rounded-2xl shadow-xl p-6 w-full max-w-md text-center">
              <div className="flex flex-col items-center mb-4">
                <span className="text-purple-200 text-5xl mb-2">🤖</span>
                <span className="font-semibold text-lg text-white">AI Learning Live</span>
              </div>
              <div className="text-xl font-bold text-green-300 mb-2">
                Day {learningDays}
              </div>
              <div className="text-purple-200 text-sm mb-4">AI Accuracy: {aiAccuracy.toFixed(1)}%</div>
              <div className="space-y-2 text-left">
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>Pattern recognition</span>
                  <span>✓</span>
                </div>
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>Predictive analysis</span>
                  <span>✓</span>
                </div>
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>Autonomous decisions</span>
                  <span>✓</span>
                </div>
                <div className="flex justify-between text-purple-100 text-xs">
                  <span>Superhuman accuracy</span>
                  <span>✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        {/* AI Learning Showcase */}
        <section id="learning" className="max-w-6xl mx-auto px-4 mb-20 pt-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Watch AI Develop Superhuman Financial Intelligence
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Mind-Blowing AI Learning Examples</h3>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Day 1 → Day 90</div>
                  <div className="text-sm font-semibold">Basic categorization → Predicts spending 6 months ahead with 99.7% accuracy</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Emotion Recognition</div>
                  <div className="text-sm font-semibold">AI learned you overspend during stress - now automatically creates emergency buffers</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Lifestyle Adaptation</div>
                  <div className="text-sm font-semibold">Detected income pattern changes and adjusted entire budget before you noticed</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">AI Learning Evolution Timeline</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-sm">1</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Day 1-30: Pattern Recognition</div>
                    <div className="text-sm text-gray-600">AI observes and learns from every financial decision (78% → 94% accuracy)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm">2</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Day 31-60: Predictive Intelligence</div>
                    <div className="text-sm text-gray-600">Develops superhuman pattern recognition and predictive capabilities (94% → 99.7%)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">3</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Day 61-90: Autonomous Control</div>
                    <div className="text-sm text-gray-600">Begins making autonomous financial optimizations with your approval (99.7% accuracy)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive AI Learning Demo */}
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Experience Superhuman Financial Intelligence
            </h2>
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white mb-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* AI Learning Demo */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">AI Learning Live Demo</h3>
                  <div className="space-y-4">
                    <div className="bg-white bg-opacity-20 rounded-lg p-4">
                      <div className="text-sm font-medium mb-2">Current AI Status:</div>
                      <div className="text-xs space-y-1">
                        <div>Learning Day: {learningDays}</div>
                        <div>Accuracy: {aiAccuracy.toFixed(1)}%</div>
                        <div>Patterns Recognized: {Math.round(learningDays * 15)}</div>
                        <div>Predictions Made: {Math.round(learningDays * 8)}</div>
                      </div>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-4">
                      <div className="text-sm font-medium mb-2">Latest AI Discovery:</div>
                      <div className="text-xs">
                        {learningDays <= 30 && "Learning basic spending patterns and categorization rules"}
                        {learningDays > 30 && learningDays <= 60 && "Detected stress spending triggers and created automatic buffers"}
                        {learningDays > 60 && "Predicting future expenses with 99.7% accuracy and making autonomous optimizations"}
                      </div>
                    </div>
                  </div>
                </div>
                {/* AI Capabilities */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Superhuman AI Capabilities</h3>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span>Micro-Decisions Daily</span>
                      <span className="font-bold">200+</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pattern Recognition</span>
                      <span className="font-bold">15x Human</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Prediction Accuracy</span>
                      <span className="font-bold">{aiAccuracy.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Learning Speed</span>
                      <span className="font-bold">1,000x Faster</span>
                    </div>
                    <div className="border-t border-white border-opacity-30 pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Financial Intelligence</span>
                        <span className="text-yellow-300">Superhuman</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                AI learns from millions of user patterns and gets smarter every second
              </p>
              <Link
                to="/signup"
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-colors"
              >
                Activate Your Financial Autopilot
              </Link>
            </div>
          </div>
        </section>

        {/* Automation Revolution vs Manual Management */}
        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              The End of Manual Financial Management
            </h2>
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Problems Column */}
              <div>
                <h3 className="text-xl font-bold text-red-600 mb-6">
                  😰 Manual Financial Management Nightmares
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-red-600 text-xs">✗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Decision Fatigue</h4>
                      <p className="text-sm text-gray-600">
                        Making hundreds of daily financial decisions leads to exhaustion and poor choices
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-red-600 text-xs">✗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Human Error & Oversight</h4>
                      <p className="text-sm text-gray-600">
                        Humans miss patterns, forget important details, and make emotional decisions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-red-600 text-xs">✗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Reactive Management</h4>
                      <p className="text-sm text-gray-600">Always playing catch-up instead of thinking ahead and preventing problems</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-red-600 text-xs">✗</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Limited Processing Power</h4>
                      <p className="text-sm text-gray-600">
                        Humans can't analyze thousands of data points simultaneously or learn from millions of patterns
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Solutions Column */}
              <div>
                <h3 className="text-xl font-bold text-green-600 mb-6">🤖 Smart Financial Automation Solution</h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Autonomous Decision Making</h4>
                      <p className="text-sm text-gray-600">AI makes 200+ daily micro-decisions automatically with 99.7% accuracy</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Superhuman Intelligence</h4>
                      <p className="text-sm text-gray-600">
                        AI learns from millions of patterns and develops intuition beyond human capability
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Predictive Proactivity</h4>
                      <p className="text-sm text-gray-600">AI thinks 6 months ahead and prevents problems before they happen</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <span className="text-green-600 text-xs">✓</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Infinite Processing Power</h4>
                      <p className="text-sm text-gray-600">
                        AI analyzes thousands of data points simultaneously and learns at superhuman speed
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Automation Capabilities */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Superhuman AI Automation Capabilities
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mb-4">
                  <span className="text-white text-xl">🔮</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Predictive Intelligence</h3>
                <p className="text-gray-600 text-sm mb-4">
                  AI predicts your financial needs 6 months ahead with 99.7% accuracy, automatically adjusting budgets and allocations before you even think about it.
                </p>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3">
                  <div className="text-xs text-gray-700">
                    <strong>Example:</strong> "AI detected rent increase patterns and adjusted your budget 60 days early"
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mb-4">
                  <span className="text-white text-xl">🧠</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Emotion Recognition</h3>
                <p className="text-gray-600 text-sm mb-4">
                  AI detects stress spending triggers from transaction timing and patterns, automatically creating buffers and interventions.
                </p>
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3">
                  <div className="text-xs text-gray-700">
                    <strong>Example:</strong> "AI noticed stress spending and moved $50 to your self-care budget"
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mb-4">
                  <span className="text-white text-xl">⚡</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Micro-Optimization</h3>
                <p className="text-gray-600 text-sm mb-4">
                  AI makes 200+ daily micro-decisions to optimize your money, from timing bill payments to adjusting investment allocations.
                </p>
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-3">
                  <div className="text-xs text-gray-700">
                    <strong>Example:</strong> "AI optimized payment timing to save $23 in interest this month"
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* AI Intelligence Examples */}
        <section className="bg-white py-16">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              AI Intelligence That Feels Like Magic
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-purple-600 font-bold">AI</span>
                  </div>
                  <div>
                    <div className="font-semibold">AI Financial Assistant</div>
                    <div className="text-sm text-gray-600">Superhuman Intelligence</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Electricity Bill Alert</div>
                    <div className="text-sm font-semibold">"I noticed your electricity bill is 23% higher this month. I've allocated extra funds and scheduled an energy audit."</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Stress Detection</div>
                    <div className="text-sm font-semibold">"Your coffee spending suggests stress. I've moved $50 to your self-care budget and booked you a massage."</div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 font-bold">AI</span>
                  </div>
                  <div>
                    <div className="font-semibold">AI Financial Assistant</div>
                    <div className="text-sm text-gray-600">Predictive Intelligence</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Market Opportunity</div>
                    <div className="text-sm font-semibold">"Market opportunity detected. Moving 12% of emergency fund to investment account based on your risk profile."</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Rent Prediction</div>
                    <div className="text-sm font-semibold">"Rent increase predicted from landlord email patterns. Adjusting budget 60 days early."</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Autonomous Control Features */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
              Complete Financial Autopilot
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🤖</span>
                  <h3 className="text-lg font-semibold">Autonomous Decision Making</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700 mb-4">
                  <li>• AI makes decisions while you sleep</li>
                  <li>• Automatic bill payment optimization</li>
                  <li>• Smart savings allocation</li>
                  <li>• Investment timing optimization</li>
                </ul>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs font-medium text-purple-600">Autonomy Level:</div>
                  <div className="text-xs text-gray-600">Complete control with user oversight</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-3">🎯</span>
                  <h3 className="text-lg font-semibold">Superhuman Accuracy</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700 mb-4">
                  <li>• 99.7% prediction accuracy</li>
                  <li>• 15x faster pattern recognition</li>
                  <li>• Zero emotional decision bias</li>
                  <li>• Continuous learning improvement</li>
                </ul>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-xs font-medium text-green-600">Intelligence Level:</div>
                  <div className="text-xs text-gray-600">Exceeds human financial advisors</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-r from-purple-600 to-pink-600 py-16">
          <div className="text-center px-6">
            <h2 className="text-3xl font-bold text-white mb-6">
              Experience Superhuman Financial Intelligence
            </h2>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              Join 10,000+ users who've let AI take complete control of their finances with superhuman accuracy and autonomous decision-making.
            </p>
            <div className="mb-6">
              <div className="text-yellow-300 text-lg font-semibold">
                Limited Time: Smart Financial Automation for $29/month
              </div>
              <div className="text-purple-200 text-sm">
                (Reg. $49/month • Includes complete AI control • Cancel anytime)
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Activate Financial Autopilot
              </Link>
              <a
                href="#learning"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors"
              >
                Watch AI Learn Live
              </a>
            </div>
            <div className="mt-6 text-purple-200 text-sm">
              ✓ 14-day free trial  ✓ No setup fees  ✓ Complete AI control  ✓ Cancel anytime
            </div>
          </div>
        </section>
      </div>
      </div>
    </WebsiteLayout>
  );
};

export default SmartAutomationPage; 
