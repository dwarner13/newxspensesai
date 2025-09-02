/**
 * Comprehensive Financial Automation Demo Page
 * 
 * This page demonstrates the complete comprehensive AI financial automation system
 * with multi-document analysis and coordinated AI employee responses.
 */

import React, { useState } from 'react';
import ComprehensiveFinancialAutomationComponent from '../components/ai/ComprehensiveFinancialAutomation';
import { ComprehensiveAnalysis } from '../lib/comprehensiveFinancialAutomation';

const ComprehensiveFinancialAutomationDemo: React.FC = () => {
  const [analysis, setAnalysis] = useState<ComprehensiveAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysisComplete = (completedAnalysis: ComprehensiveAnalysis) => {
    setAnalysis(completedAnalysis);
    setError(null);
    console.log('Comprehensive analysis completed:', completedAnalysis);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    console.error('Analysis error:', errorMessage);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Comprehensive AI Financial Automation
                </h1>
                <p className="mt-2 text-gray-600">
                  Multi-document analysis with coordinated AI employee strategies
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  Powered by AI Employees
                </div>
                <div className="flex space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    💣 Blitz
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    🧠 Wisdom
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    🔮 Crystal
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    👑 Prime
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="text-red-400">⚠️</div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Analysis Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Overview */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <h3 className="font-medium text-gray-900">Multi-Document Analysis</h3>
              <p className="text-sm text-gray-600">
                Credit reports, pay stubs, debt documents, and bank statements
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">🤖</div>
              <h3 className="font-medium text-gray-900">AI Employee Coordination</h3>
              <p className="text-sm text-gray-600">
                Specialized AI employees working together for comprehensive analysis
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">📈</div>
              <h3 className="font-medium text-gray-900">Predictive Modeling</h3>
              <p className="text-sm text-gray-600">
                Financial forecasting and scenario analysis
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">⚡</div>
              <h3 className="font-medium text-gray-900">Real-Time Monitoring</h3>
              <p className="text-sm text-gray-600">
                Continuous monitoring and automated alerts
              </p>
            </div>
          </div>
        </div>

        {/* AI Employee Showcase */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">AI Employee Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-3xl mb-2">💣</div>
                <h3 className="font-medium text-gray-900">Blitz</h3>
                <p className="text-sm text-gray-600 mb-2">Debt Destroyer</p>
                <p className="text-xs text-gray-500">
                  Creates aggressive debt elimination plans with personality-driven strategies
                </p>
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-3xl mb-2">🧠</div>
                <h3 className="font-medium text-gray-900">Wisdom</h3>
                <p className="text-sm text-gray-600 mb-2">Strategic Advisor</p>
                <p className="text-xs text-gray-500">
                  Provides holistic financial analysis and master strategy generation
                </p>
              </div>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-3xl mb-2">🔮</div>
                <h3 className="font-medium text-gray-900">Crystal</h3>
                <p className="text-sm text-gray-600 mb-2">Predictive AI</p>
                <p className="text-xs text-gray-500">
                  Generates financial forecasts and scenario modeling
                </p>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-3xl mb-2">👑</div>
                <h3 className="font-medium text-gray-900">Prime</h3>
                <p className="text-sm text-gray-600 mb-2">Team Orchestrator</p>
                <p className="text-xs text-gray-500">
                  Coordinates all AI employees for comprehensive financial planning
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Advanced Document Processing</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Multi-format support (PDF, CSV, images, spreadsheets)
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Advanced OCR with multiple providers
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Intelligent data extraction and parsing
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Cross-document correlation and analysis
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-3">AI Employee Specializations</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Debt elimination strategies and planning
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Credit optimization and score improvement
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Tax optimization and benefit analysis
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Financial forecasting and scenario modeling
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Main Component */}
        <div className="bg-white rounded-lg shadow">
          <ComprehensiveFinancialAutomationComponent
            onAnalysisComplete={handleAnalysisComplete}
            onError={handleError}
          />
        </div>

        {/* Analysis Results Summary */}
        {analysis && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Analysis Results Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {analysis.documents.length}
                </div>
                <div className="text-sm text-gray-600">Documents Processed</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {(analysis.collaborativeStrategy.successProbability * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Success Probability</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {analysis.implementationPlan.timeline}
                </div>
                <div className="text-sm text-gray-600">Implementation Timeline</div>
              </div>
            </div>
          </div>
        )}

        {/* Technical Details */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Technical Implementation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Core Components</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• MultiDocumentAnalysisEngine</li>
                <li>• EnhancedBlitzAutomation</li>
                <li>• EnhancedWisdomAutomation</li>
                <li>• EnhancedCrystalAutomation</li>
                <li>• ComprehensiveFinancialAutomation</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Integration Points</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Document processing pipeline</li>
                <li>• AI employee coordination</li>
                <li>• Real-time monitoring system</li>
                <li>• Predictive modeling engine</li>
                <li>• Strategy synthesis framework</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveFinancialAutomationDemo;
