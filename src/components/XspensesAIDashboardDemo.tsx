import React, { useState } from 'react';
import XspensesAIDashboard from './XspensesAIDashboard';

const XspensesAIDashboardDemo = () => {
  const [showDemo, setShowDemo] = useState(false);
  const [demoMode, setDemoMode] = useState('full');

  const demoModes = [
    { id: 'full', label: 'Full Dashboard', description: 'Complete dashboard experience' },
    { id: 'compact', label: 'Compact View', description: 'Condensed layout for smaller screens' },
    { id: 'minimal', label: 'Minimal View', description: 'Simple and clean interface' }
  ];

  const features = [
    {
      icon: '🎨',
      title: 'Purple Gradient Design',
      description: 'Modern purple-to-pink gradient background with professional styling'
    },
    {
      icon: '⚙️',
      title: 'Slide-out Settings',
      description: 'Smooth slide-out settings menu with comprehensive options'
    },
    {
      icon: '📱',
      title: 'Responsive Layout',
      description: 'Fully responsive design that works on all device sizes'
    },
    {
      icon: '🌙',
      title: 'Dark Mode Support',
      description: 'Built-in dark mode toggle with smooth transitions'
    },
    {
      icon: '📊',
      title: 'Real-time Analytics',
      description: 'Live financial data with animated charts and metrics'
    },
    {
      icon: '🎯',
      title: 'Goal Tracking',
      description: 'Visual progress tracking for financial goals'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {!showDemo ? (
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              🚀 New XspensesAI Dashboard
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Experience the next generation of financial dashboard with purple gradient design, 
              slide-out settings, and enhanced user experience.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* Demo Controls */}
          <div className="bg-white rounded-xl p-8 shadow-lg mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Demo Configuration</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Dashboard Mode</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {demoModes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setDemoMode(mode.id)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        demoMode === mode.id
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      <div className="font-semibold mb-1">{mode.label}</div>
                      <div className="text-sm text-gray-600">{mode.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => setShowDemo(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  🚀 Launch Dashboard Demo
                </button>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Technical Implementation</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Technologies</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• React 18 with TypeScript</li>
                  <li>• Tailwind CSS for styling</li>
                  <li>• Framer Motion for animations</li>
                  <li>• Lucide React for icons</li>
                  <li>• Responsive design principles</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Features</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Purple gradient background</li>
                  <li>• Slide-out settings menu</li>
                  <li>• Dark mode toggle</li>
                  <li>• Real-time data display</li>
                  <li>• Interactive navigation</li>
                  <li>• Goal tracking visualization</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Demo Header */}
          <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowDemo(false)}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  ← Back to Demo
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <span className="text-sm text-gray-500">
                  Demo Mode: {demoModes.find(m => m.id === demoMode)?.label}
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">Interactive Demo</span>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Dashboard Demo */}
          <div className="pt-16">
            <XspensesAIDashboard />
          </div>
        </div>
      )}
    </div>
  );
};

export default XspensesAIDashboardDemo; 