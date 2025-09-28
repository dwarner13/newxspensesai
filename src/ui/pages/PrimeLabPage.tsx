import React, { useState } from 'react';
import { PrimeChatDrawer } from '../components/PrimeChatDrawer';

export default function PrimeLabPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-6">
            🚀 Prime Agent Kernel
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Your AI-powered financial assistant is ready to revolutionize how you manage expenses, analyze spending, and achieve financial goals.
          </p>
        </div>

        {/* Main Content Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
            {/* Status Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center px-6 py-3 bg-green-100 text-green-800 rounded-full text-lg font-semibold mb-4">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></span>
                Status: Active & Ready
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Prime Lab Dashboard</h2>
              <p className="text-gray-600 text-lg">
                Your AI financial assistant is online and ready to help
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-white text-xl">📄</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Receipt Processing</h3>
                </div>
                <p className="text-gray-600 mb-3">
                  Upload receipts and get instant expense categorization
                </p>
                <div className="flex items-center text-green-600 font-medium">
                  <span className="mr-2">✅</span>
                  Active
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-white text-xl">📊</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Smart Analytics</h3>
                </div>
                <p className="text-gray-600 mb-3">
                  AI-powered spending insights and predictions
                </p>
                <div className="flex items-center text-green-600 font-medium">
                  <span className="mr-2">✅</span>
                  Active
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-white text-xl">🎯</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Goal Tracking</h3>
                </div>
                <p className="text-gray-600 mb-3">
                  Set and monitor your financial objectives
                </p>
                <div className="flex items-center text-green-600 font-medium">
                  <span className="mr-2">✅</span>
                  Active
                </div>
              </div>

              <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-white text-xl">🤖</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">AI Assistant</h3>
                </div>
                <p className="text-gray-600 mb-3">
                  Chat with your personal financial AI advisor
                </p>
                <div className="flex items-center text-green-600 font-medium">
                  <span className="mr-2">✅</span>
                  Active
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="text-center space-y-4">
              <button 
                onClick={() => setIsDrawerOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl text-lg shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                🚀 Start Chatting with Prime
              </button>
              
              <div className="flex justify-center space-x-4 text-sm text-gray-500">
                <span>💬 Real-time AI assistance</span>
                <span>•</span>
                <span>📈 Financial insights</span>
                <span>•</span>
                <span>🎯 Goal optimization</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">24/7</div>
              <div className="text-blue-200">AI Availability</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">99.9%</div>
              <div className="text-blue-200">Uptime</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">⚡</div>
              <div className="text-blue-200">Instant Response</div>
            </div>
          </div>
        </div>
      </div>

      {/* Prime Chat Drawer */}
      <PrimeChatDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
