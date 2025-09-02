/**
 * Universal AI Employee Intelligence Demo Page
 * 
 * This page demonstrates the Universal AI Employee Intelligence System
 * and showcases how all AI employees operate at 85-90/100 intelligence level.
 */

import React, { useState, useEffect } from 'react';
import UniversalAIEmployeeIntelligence from '../components/ai/UniversalAIEmployeeIntelligence';
import { SystemIntelligenceReport } from '../lib/universalAIEmployeeIntelligenceSystem';

export const UniversalAIEmployeeIntelligenceDemo: React.FC = () => {
  const [systemReport, setSystemReport] = useState<SystemIntelligenceReport | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [demoMode, setDemoMode] = useState<'overview' | 'interaction' | 'capabilities'>('overview');

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    setDemoMode('interaction');
  };

  const handleIntelligenceReport = (report: SystemIntelligenceReport) => {
    setSystemReport(report);
  };

  const demoRequests = {
    'Tag': [
      "Categorize my recent transactions and identify any spending patterns",
      "I uploaded a CSV file with my bank transactions - can you analyze and categorize them?",
      "What categories should I create for my spending habits?"
    ],
    'Blitz': [
      "Create a debt elimination plan for my credit cards",
      "I have $15,000 in credit card debt - what's the best strategy to pay it off?",
      "Should I consolidate my debts or pay them individually?"
    ],
    'Crystal': [
      "Predict my financial future based on my current spending patterns",
      "What will my credit score be in 6 months if I follow your recommendations?",
      "Show me different scenarios for my debt payoff timeline"
    ],
    'Wisdom': [
      "Give me a comprehensive financial strategy for the next 5 years",
      "How should I balance debt payoff, savings, and investments?",
      "What's the best approach to achieve my financial goals?"
    ],
    'Prime': [
      "Coordinate a comprehensive financial analysis with the entire AI team",
      "I need a complete financial overhaul - mobilize all available resources",
      "What's the big picture view of my financial situation?"
    ],
    'Harmony': [
      "Help me balance my financial goals with my personal wellness",
      "I'm stressed about money - how can I manage this better?",
      "What's a mindful approach to financial planning?"
    ],
    'Fortune': [
      "Give me a reality check on my financial situation",
      "Are my financial goals realistic given my current income?",
      "What's the honest truth about my spending habits?"
    ],
    'Ledger': [
      "Optimize my taxes and help me organize my financial records",
      "What deductions am I missing on my taxes?",
      "How should I organize my financial documents for tax season?"
    ],
    'Automa': [
      "Set up automated systems for my financial management",
      "What financial processes can I automate to save time?",
      "Help me create automated savings and bill payment systems"
    ],
    'Byte': [
      "Recommend the best financial technology tools for my situation",
      "What apps and digital tools should I use for financial management?",
      "How can technology help me optimize my finances?"
    ]
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🧠 Universal AI Employee Intelligence System
              </h1>
              <p className="text-gray-600 mt-1">
                Experience AI employees operating at 85-90/100 intelligence level
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setDemoMode('overview')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  demoMode === 'overview'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setDemoMode('interaction')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  demoMode === 'interaction'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Interaction
              </button>
              <button
                onClick={() => setDemoMode('capabilities')}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  demoMode === 'capabilities'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Capabilities
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {demoMode === 'overview' && (
          <div className="space-y-8">
            {/* System Introduction */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Universal AI Employee Intelligence System
              </h2>
              <div className="prose max-w-none">
                <p className="text-lg text-gray-700 mb-6">
                  The Universal AI Employee Intelligence System elevates every AI employee to operate at a minimum 
                  <strong className="text-blue-600"> 85-90/100 intelligence level</strong> through a comprehensive 
                  framework of universal capabilities and specialized expertise.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">🎯 Universal Capabilities</h3>
                    <ul className="space-y-2 text-gray-700">
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></span>
                        Complete financial data mastery
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></span>
                        Advanced document processing
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></span>
                        Predictive financial analysis
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></span>
                        Cross-employee collaboration
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></span>
                        Proactive insight generation
                      </li>
                      <li className="flex items-start">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3 mt-2"></span>
                        Learning and adaptation
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">🚀 Intelligence Boost</h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-800">Before Universal Framework</span>
                          <span className="text-sm text-green-600">50-80/100</span>
                        </div>
                        <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-800">After Universal Framework</span>
                          <span className="text-sm text-blue-600">85-96/100</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-3">💡 Key Benefits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600 mb-2">Instant</div>
                      <p className="text-sm text-yellow-700">All employees become smarter immediately</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600 mb-2">Consistent</div>
                      <p className="text-sm text-yellow-700">No weak employees - all operate at high level</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600 mb-2">Collaborative</div>
                      <p className="text-sm text-yellow-700">Employees work together seamlessly</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Employee Intelligence Levels */}
            {systemReport && (
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Employee Intelligence Levels</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {systemReport.employeeUpgrades.map((upgrade) => (
                    <div
                      key={upgrade.employeeId}
                      className="p-6 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleEmployeeSelect(upgrade.employeeId)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {upgrade.employeeId}
                        </h3>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {upgrade.afterIntelligence}/100
                          </div>
                          <div className="text-sm text-green-600">
                            +{upgrade.improvement.toFixed(1)} boost
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                        <div
                          className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${upgrade.afterIntelligence}%` }}
                        ></div>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <div className="flex justify-between mb-1">
                          <span>Before: {upgrade.beforeIntelligence}/100</span>
                          <span>After: {upgrade.afterIntelligence}/100</span>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">New Capabilities:</h4>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {upgrade.newCapabilities.slice(0, 3).map((capability, index) => (
                            <li key={index} className="flex items-start">
                              <span className="w-1 h-1 bg-blue-500 rounded-full mr-2 mt-1"></span>
                              {capability}
                            </li>
                          ))}
                          {upgrade.newCapabilities.length > 3 && (
                            <li className="text-blue-600">+{upgrade.newCapabilities.length - 3} more...</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {demoMode === 'interaction' && (
          <div className="space-y-8">
            {/* Employee Selection */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Select an AI Employee</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.keys(demoRequests).map((employeeId) => (
                  <button
                    key={employeeId}
                    onClick={() => handleEmployeeSelect(employeeId)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedEmployee === employeeId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900 mb-1">
                        {employeeId}
                      </div>
                      <div className="text-sm text-gray-600">
                        {intelligenceLevels[employeeId] || 0}/100
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Demo Requests */}
            {selectedEmployee && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Try These Demo Requests with {selectedEmployee}
                </h2>
                <div className="space-y-4">
                  {demoRequests[selectedEmployee as keyof typeof demoRequests]?.map((request, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => {
                        // This would trigger the actual request
                        console.log(`Demo request: ${request}`);
                      }}
                    >
                      <p className="text-gray-800">"{request}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Interaction Component */}
            <UniversalAIEmployeeIntelligence
              userId="demo-user"
              onEmployeeSelect={handleEmployeeSelect}
              onIntelligenceReport={handleIntelligenceReport}
            />
          </div>
        )}

        {demoMode === 'capabilities' && (
          <div className="space-y-8">
            {/* Universal Capabilities */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Universal Capabilities</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">🧠 Core Intelligence</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Financial Data Mastery</h4>
                      <p className="text-sm text-blue-800">
                        Access complete user financial picture, cross-reference data sources, 
                        identify patterns, and generate insights from combined analysis.
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-2">Advanced Processing</h4>
                      <p className="text-sm text-green-800">
                        Handle any document type, extract financial information automatically, 
                        learn from corrections, and improve accuracy with each interaction.
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-900 mb-2">Predictive Capabilities</h4>
                      <p className="text-sm text-purple-800">
                        Forecast future scenarios, identify opportunities and risks, 
                        predict user needs, and model different strategy outcomes.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">🤝 Collaboration & Learning</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h4 className="font-semibold text-yellow-900 mb-2">Collaboration Intelligence</h4>
                      <p className="text-sm text-yellow-800">
                        Coordinate with other AI employees, share insights, route complex issues, 
                        and maintain unified understanding of user situation.
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <h4 className="font-semibold text-red-900 mb-2">Proactive Engagement</h4>
                      <p className="text-sm text-red-800">
                        Surface important insights without being asked, alert users to opportunities, 
                        recommend improvements, and anticipate user needs.
                      </p>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <h4 className="font-semibold text-indigo-900 mb-2">Learning & Adaptation</h4>
                      <p className="text-sm text-indigo-800">
                        Remember user preferences, adapt based on feedback, personalize recommendations, 
                        and evolve understanding of user's unique situation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Response Quality Standards */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Response Quality Standards</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Universal Response Structure</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                      <div>
                        <h4 className="font-medium text-gray-900">Acknowledge</h4>
                        <p className="text-sm text-gray-600">"I've analyzed your [specific data/request] and I have some insights..."</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                      <div>
                        <h4 className="font-medium text-gray-900">Analyze</h4>
                        <p className="text-sm text-gray-600">Present specific findings with data references</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                      <div>
                        <h4 className="font-medium text-gray-900">Insight</h4>
                        <p className="text-sm text-gray-600">Share the "aha" moment or key realization</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
                      <div>
                        <h4 className="font-medium text-gray-900">Recommend</h4>
                        <p className="text-sm text-gray-600">Provide actionable next steps</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">5</span>
                      <div>
                        <h4 className="font-medium text-gray-900">Collaborate</h4>
                        <p className="text-sm text-gray-600">Suggest how other AI employees can help</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">6</span>
                      <div>
                        <h4 className="font-medium text-gray-900">Follow-up</h4>
                        <p className="text-sm text-gray-600">Set expectations for monitoring and updates</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Requirements</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-1">Task Loop Completion</h4>
                      <p className="text-sm text-green-800">Process → Analyze → Deliver → Next Actions</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-1">Data Reference Accuracy</h4>
                      <p className="text-sm text-blue-800">Specific user data, numbers, dates, patterns</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-900 mb-1">Actionability Score</h4>
                      <p className="text-sm text-purple-800">Concrete, actionable recommendations with clear steps</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <h4 className="font-medium text-yellow-900 mb-1">Personality Consistency</h4>
                      <p className="text-sm text-yellow-800">Maintain character while demonstrating intelligence</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <h4 className="font-medium text-red-900 mb-1">Collaboration Awareness</h4>
                      <p className="text-sm text-red-800">Demonstrate how other employees can contribute</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversalAIEmployeeIntelligenceDemo;
