/**
 * Universal AI Employee Intelligence Component
 * 
 * This component provides the frontend interface for the Universal AI Employee
 * Intelligence System, allowing users to interact with enhanced AI employees.
 */

import React, { useState, useEffect } from 'react';
import { universalAIEmployeeIntelligenceSystem } from '../../lib/universalAIEmployeeIntelligenceSystem';
import { SystemIntelligenceReport, EmployeeIntelligenceUpgrade } from '../../lib/universalAIEmployeeIntelligenceSystem';

interface UniversalAIEmployeeIntelligenceProps {
  userId?: string;
  onEmployeeSelect?: (employeeId: string) => void;
  onIntelligenceReport?: (report: SystemIntelligenceReport) => void;
}

export const UniversalAIEmployeeIntelligence: React.FC<UniversalAIEmployeeIntelligenceProps> = ({
  userId = 'demo-user',
  onEmployeeSelect,
  onIntelligenceReport
}) => {
  const [systemReport, setSystemReport] = useState<SystemIntelligenceReport | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [userRequest, setUserRequest] = useState<string>('');
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [intelligenceLevels, setIntelligenceLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    initializeSystem();
  }, []);

  const initializeSystem = async () => {
    try {
      const report = await universalAIEmployeeIntelligenceSystem.generateSystemReport();
      setSystemReport(report);
      setIntelligenceLevels(universalAIEmployeeIntelligenceSystem.getAllIntelligenceLevels());
      
      if (onIntelligenceReport) {
        onIntelligenceReport(report);
      }
    } catch (error) {
      console.error('Failed to initialize system:', error);
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    if (onEmployeeSelect) {
      onEmployeeSelect(employeeId);
    }
  };

  const handleRequestSubmit = async () => {
    if (!selectedEmployee || !userRequest.trim()) return;

    setIsLoading(true);
    try {
      const intelligenceResponse = await universalAIEmployeeIntelligenceSystem.processRequest(
        selectedEmployee,
        userId,
        userRequest
      );
      setResponse(intelligenceResponse);
    } catch (error) {
      console.error('Failed to process request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getIntelligenceColor = (level: number): string => {
    if (level >= 95) return 'text-green-600';
    if (level >= 90) return 'text-green-500';
    if (level >= 85) return 'text-blue-500';
    if (level >= 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getIntelligenceBadge = (level: number): string => {
    if (level >= 95) return '🏆 Elite';
    if (level >= 90) return '⭐ Excellent';
    if (level >= 85) return '🚀 Advanced';
    if (level >= 80) return '💡 Good';
    return '📈 Improving';
  };

  if (!systemReport) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Universal AI Employee Intelligence System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* System Overview */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          🧠 Universal AI Employee Intelligence System
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Overall Intelligence</h3>
            <p className="text-3xl font-bold text-blue-600">
              {systemReport.overallIntelligenceLevel.toFixed(1)}/100
            </p>
            <p className="text-sm text-blue-700">Universal Framework Active</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Average Improvement</h3>
            <p className="text-3xl font-bold text-green-600">
              +{systemReport.averageImprovement.toFixed(1)}
            </p>
            <p className="text-sm text-green-700">Intelligence Boost</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Active Employees</h3>
            <p className="text-3xl font-bold text-purple-600">
              {systemReport.employeeUpgrades.length}
            </p>
            <p className="text-sm text-purple-700">Enhanced AI Team</p>
          </div>
        </div>
      </div>

      {/* Employee Intelligence Levels */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">AI Employee Intelligence Levels</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemReport.employeeUpgrades.map((upgrade) => (
            <div
              key={upgrade.employeeId}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedEmployee === upgrade.employeeId
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleEmployeeSelect(upgrade.employeeId)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {upgrade.employeeId}
                </h3>
                <span className={`text-sm font-bold ${getIntelligenceColor(upgrade.afterIntelligence)}`}>
                  {upgrade.afterIntelligence}/100
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Before: {upgrade.beforeIntelligence}/100</span>
                <span className="text-sm text-green-600 font-semibold">
                  +{upgrade.improvement.toFixed(1)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${upgrade.afterIntelligence}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {getIntelligenceBadge(upgrade.afterIntelligence)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Interaction */}
      {selectedEmployee && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Interact with {selectedEmployee}
          </h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Request
            </label>
            <textarea
              value={userRequest}
              onChange={(e) => setUserRequest(e.target.value)}
              placeholder={`Ask ${selectedEmployee} anything about your finances...`}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <button
            onClick={handleRequestSubmit}
            disabled={isLoading || !userRequest.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Send Request'}
          </button>

          {response && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Response</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-800">{response.content}</p>
                </div>
                
                {response.insights && response.insights.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Insights:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {response.insights.map((insight: string, index: number) => (
                        <li key={index} className="text-gray-700">{insight}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {response.recommendations && response.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {response.recommendations.map((recommendation: string, index: number) => (
                        <li key={index} className="text-gray-700">{recommendation}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {response.nextActions && response.nextActions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Next Actions:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {response.nextActions.map((action: string, index: number) => (
                        <li key={index} className="text-gray-700">{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      Intelligence Level: <span className="font-semibold">{response.intelligenceLevel}/100</span>
                    </span>
                    <span className="text-sm text-gray-600">
                      Confidence: <span className="font-semibold">{(response.confidence * 100).toFixed(1)}%</span>
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(response.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* System Capabilities */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">System Capabilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Core Intelligence</h3>
            <ul className="space-y-2">
              {systemReport.systemCapabilities.map((capability, index) => (
                <li key={index} className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  {capability}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Collaboration Enhancements</h3>
            <ul className="space-y-2">
              {systemReport.collaborationEnhancements.map((enhancement, index) => (
                <li key={index} className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                  {enhancement}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quality Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(systemReport.qualityMetrics).map(([metric, value]) => (
            <div key={metric} className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                {metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </h3>
              <p className="text-2xl font-bold text-gray-900">
                {(value * 100).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UniversalAIEmployeeIntelligence;
