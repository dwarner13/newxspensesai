/**
 * Comprehensive Financial Automation Component
 * 
 * This component provides the main interface for the comprehensive AI financial automation system,
 * allowing users to upload multiple financial documents and receive coordinated analysis from all AI employees.
 */

import React, { useState, useCallback } from 'react';
import { 
  ComprehensiveAnalysis, 
  DocumentSummary, 
  AIEmployeeAnalyses,
  CollaborativeStrategy,
  ImplementationPlan,
  MonitoringSetup
} from '../../lib/comprehensiveFinancialAutomation';
import { ComprehensiveFinancialAutomation } from '../../lib/comprehensiveFinancialAutomation';
import { MultiDocumentAnalysisEngine } from '../../lib/multiDocumentAnalysisEngine';
import { EnhancedBlitzAutomation } from '../../lib/enhancedBlitzAutomation';
import { EnhancedWisdomAutomation } from '../../lib/enhancedWisdomAutomation';
import { EnhancedCrystalAutomation } from '../../lib/enhancedCrystalAutomation';

interface ComprehensiveFinancialAutomationProps {
  onAnalysisComplete?: (analysis: ComprehensiveAnalysis) => void;
  onError?: (error: string) => void;
}

export const ComprehensiveFinancialAutomationComponent: React.FC<ComprehensiveFinancialAutomationProps> = ({
  onAnalysisComplete,
  onError
}) => {
  const [documents, setDocuments] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<ComprehensiveAnalysis | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'analysis' | 'complete'>('upload');
  const [progress, setProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');

  // Initialize the comprehensive automation system
  const [automationSystem] = useState(() => {
    const multiDocumentEngine = new MultiDocumentAnalysisEngine(null, null);
    const blitzAutomation = new EnhancedBlitzAutomation(multiDocumentEngine);
    const wisdomAutomation = new EnhancedWisdomAutomation(multiDocumentEngine);
    const crystalAutomation = new EnhancedCrystalAutomation(multiDocumentEngine);
    
    return new ComprehensiveFinancialAutomation(
      multiDocumentEngine,
      blitzAutomation,
      wisdomAutomation,
      crystalAutomation
    );
  });

  const handleFileUpload = useCallback((files: File[]) => {
    setDocuments(prev => [...prev, ...files]);
  }, []);

  const handleRemoveDocument = useCallback((index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleStartAnalysis = useCallback(async () => {
    if (documents.length === 0) {
      onError?.('Please upload at least one financial document');
      return;
    }

    setIsProcessing(true);
    setCurrentStep('processing');
    setProgress(0);
    setProcessingStep('Initializing analysis...');

    try {
      // Simulate progress updates
      const progressSteps = [
        { step: 'Processing documents...', progress: 20 },
        { step: 'Analyzing credit reports...', progress: 40 },
        { step: 'Processing pay stubs...', progress: 60 },
        { step: 'Analyzing debt documents...', progress: 80 },
        { step: 'Generating comprehensive analysis...', progress: 100 }
      ];

      for (const { step, progress: stepProgress } of progressSteps) {
        setProcessingStep(step);
        setProgress(stepProgress);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Perform the actual analysis
      const comprehensiveAnalysis = await automationSystem.performComprehensiveAnalysis(documents);
      
      setAnalysis(comprehensiveAnalysis);
      setCurrentStep('analysis');
      onAnalysisComplete?.(comprehensiveAnalysis);
    } catch (error) {
      console.error('Analysis failed:', error);
      onError?.(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsProcessing(false);
    }
  }, [documents, automationSystem, onAnalysisComplete, onError]);

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Comprehensive Financial Automation
        </h2>
        <p className="text-gray-600">
          Upload your financial documents for comprehensive AI-powered analysis and strategy generation
        </p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="space-y-4">
          <div className="text-6xl">📊</div>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload Financial Documents
            </h3>
            <p className="text-gray-600 mb-4">
              Upload credit reports, pay stubs, debt documents, and bank statements
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.csv,.jpg,.jpeg,.png,.xls,.xlsx,.txt"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                handleFileUpload(files);
              }}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              Choose Files
            </label>
          </div>
        </div>
      </div>

      {documents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Uploaded Documents</h3>
          <div className="space-y-2">
            {documents.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {doc.type.includes('pdf') ? '📄' : 
                     doc.type.includes('image') ? '🖼️' : 
                     doc.type.includes('sheet') ? '📊' : '📋'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{doc.name}</p>
                    <p className="text-sm text-gray-500">
                      {(doc.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveDocument(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleStartAnalysis}
            disabled={isProcessing}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Comprehensive Analysis
          </button>
        </div>
      )}
    </div>
  );

  const renderProcessingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Processing Your Documents
        </h2>
        <p className="text-gray-600">
          Our AI employees are analyzing your financial data...
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-200 rounded-full h-4">
          <div 
            className="bg-blue-600 h-4 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-gray-600">{processingStep}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-3xl mb-2">💣</div>
          <h3 className="font-medium text-gray-900">Blitz</h3>
          <p className="text-sm text-gray-600">Debt Destroyer</p>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-3xl mb-2">🧠</div>
          <h3 className="font-medium text-gray-900">Wisdom</h3>
          <p className="text-sm text-gray-600">Strategic Advisor</p>
        </div>
        <div className="text-center p-4 bg-indigo-50 rounded-lg">
          <div className="text-3xl mb-2">🔮</div>
          <h3 className="font-medium text-gray-900">Crystal</h3>
          <p className="text-sm text-gray-600">Predictive AI</p>
        </div>
      </div>
    </div>
  );

  const renderAnalysisStep = () => {
    if (!analysis) return null;

    return (
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Comprehensive Financial Analysis Complete
          </h2>
          <p className="text-gray-600">
            Your AI financial team has completed their analysis
          </p>
        </div>

        {/* Document Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Document Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysis.documents.map((doc, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">
                    {doc.type === 'credit_report' ? '📊' :
                     doc.type === 'pay_stub' ? '💰' :
                     doc.type === 'debt_document' ? '💳' : '📄'}
                  </span>
                  <span className="font-medium text-gray-900">{doc.filename}</span>
                </div>
                <p className="text-sm text-gray-600">
                  Type: {doc.type.replace('_', ' ')}
                </p>
                <p className="text-sm text-gray-600">
                  Confidence: {(doc.confidence * 100).toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Employee Analyses */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">AI Employee Analyses</h3>
          
          {/* Blitz Analysis */}
          <div className="bg-red-50 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-3xl">💣</div>
              <div>
                <h4 className="text-lg font-medium text-gray-900">Blitz - Debt Destroyer</h4>
                <p className="text-sm text-gray-600">Debt Annihilation Plan</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-gray-700">{analysis.aiEmployeeAnalyses.blitz.personality}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.aiEmployeeAnalyses.blitz.strategies.slice(0, 2).map((strategy, index) => (
                  <div key={index} className="p-3 bg-white rounded-lg">
                    <h5 className="font-medium text-gray-900">{strategy.name}</h5>
                    <p className="text-sm text-gray-600">{strategy.description}</p>
                    <p className="text-sm text-green-600 font-medium">
                      Time to Freedom: {strategy.timeToFreedom}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Wisdom Analysis */}
          <div className="bg-purple-50 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-3xl">🧠</div>
              <div>
                <h4 className="text-lg font-medium text-gray-900">Wisdom - Strategic Advisor</h4>
                <p className="text-sm text-gray-600">Master Strategy</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-gray-700">{analysis.aiEmployeeAnalyses.wisdom.personality}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-white rounded-lg">
                  <h5 className="font-medium text-gray-900">Credit Optimization</h5>
                  <p className="text-sm text-gray-600">
                    {analysis.aiEmployeeAnalyses.wisdom.creditOptimization.currentScore} → {analysis.aiEmployeeAnalyses.wisdom.creditOptimization.optimizedScore}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <h5 className="font-medium text-gray-900">Cashflow Engineering</h5>
                  <p className="text-sm text-gray-600">
                    ${analysis.aiEmployeeAnalyses.wisdom.cashflowEngineering.currentMonthlyFlow} → ${analysis.aiEmployeeAnalyses.wisdom.cashflowEngineering.optimizedFlow}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <h5 className="font-medium text-gray-900">Debt Consolidation</h5>
                  <p className="text-sm text-gray-600">
                    Save ${analysis.aiEmployeeAnalyses.wisdom.debtConsolidation.monthlySavings}/month
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Crystal Analysis */}
          <div className="bg-indigo-50 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="text-3xl">🔮</div>
              <div>
                <h4 className="text-lg font-medium text-gray-900">Crystal - Predictive AI</h4>
                <p className="text-sm text-gray-600">Financial Forecast</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-gray-700">{analysis.aiEmployeeAnalyses.crystal.personality}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysis.aiEmployeeAnalyses.crystal.scenarios.slice(0, 3).map((scenario, index) => (
                  <div key={index} className="p-3 bg-white rounded-lg">
                    <h5 className="font-medium text-gray-900">{scenario.name}</h5>
                    <p className="text-sm text-gray-600">{scenario.description}</p>
                    <p className="text-sm text-blue-600 font-medium">
                      Timeline: {scenario.timeline}
                    </p>
                    <p className="text-sm text-green-600 font-medium">
                      Debt-Free: {scenario.outcomes.debtFreeDate}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Collaborative Strategy */}
        <div className="bg-green-50 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-3xl">👑</div>
            <div>
              <h4 className="text-lg font-medium text-gray-900">Prime - Team Orchestration</h4>
              <p className="text-sm text-gray-600">Collaborative Strategy</p>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-gray-700">{analysis.aiEmployeeAnalyses.prime.personality}</p>
            <div className="p-3 bg-white rounded-lg">
              <h5 className="font-medium text-gray-900">Mission</h5>
              <p className="text-sm text-gray-600">{analysis.aiEmployeeAnalyses.prime.mission}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-white rounded-lg">
                <h5 className="font-medium text-gray-900">Primary Team</h5>
                <p className="text-sm text-gray-600">
                  {analysis.aiEmployeeAnalyses.prime.teamCoordination.primaryTeam.join(', ')}
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <h5 className="font-medium text-gray-900">Success Probability</h5>
                <p className="text-sm text-green-600 font-medium">
                  {(analysis.collaborativeStrategy.successProbability * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Plan */}
        <div className="bg-yellow-50 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Implementation Plan</h4>
          <div className="space-y-4">
            {analysis.implementationPlan.phases.map((phase, index) => (
              <div key={index} className="p-3 bg-white rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">Phase {phase.phase}: {phase.name}</h5>
                  <span className="text-sm text-gray-600">{phase.duration}</span>
                </div>
                <p className="text-sm text-gray-600">{phase.expectedOutcome}</p>
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-900">Key Actions:</p>
                  <ul className="text-sm text-gray-600 list-disc list-inside">
                    {phase.actions.slice(0, 3).map((action, actionIndex) => (
                      <li key={actionIndex}>{action}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monitoring Setup */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Real-Time Monitoring</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3 bg-white rounded-lg">
              <h5 className="font-medium text-gray-900">Credit Monitoring</h5>
              <p className="text-sm text-gray-600">
                {analysis.monitoringSetup.realTimeMonitoring.creditMonitoring ? '✅ Active' : '❌ Inactive'}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <h5 className="font-medium text-gray-900">Rate Monitoring</h5>
              <p className="text-sm text-gray-600">
                {analysis.monitoringSetup.realTimeMonitoring.rateMonitoring ? '✅ Active' : '❌ Inactive'}
              </p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <h5 className="font-medium text-gray-900">Opportunity Alerts</h5>
              <p className="text-sm text-gray-600">
                {analysis.monitoringSetup.realTimeMonitoring.opportunityMonitoring ? '✅ Active' : '❌ Inactive'}
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => setCurrentStep('complete')}
            className="bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700"
          >
            Complete Analysis
          </button>
        </div>
      </div>
    );
  };

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="text-6xl">🎉</div>
      <h2 className="text-2xl font-bold text-gray-900">
        Analysis Complete!
      </h2>
      <p className="text-gray-600">
        Your comprehensive financial automation system is now active and monitoring your financial health.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="text-2xl mb-2">📊</div>
          <h3 className="font-medium text-gray-900">Real-Time Monitoring</h3>
          <p className="text-sm text-gray-600">Active</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl mb-2">🤖</div>
          <h3 className="font-medium text-gray-900">AI Employees</h3>
          <p className="text-sm text-gray-600">Deployed</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl mb-2">📈</div>
          <h3 className="font-medium text-gray-900">Strategy</h3>
          <p className="text-sm text-gray-600">Executing</p>
        </div>
      </div>
      <button
        onClick={() => {
          setCurrentStep('upload');
          setAnalysis(null);
          setDocuments([]);
        }}
        className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700"
      >
        Start New Analysis
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {currentStep === 'upload' && renderUploadStep()}
      {currentStep === 'processing' && renderProcessingStep()}
      {currentStep === 'analysis' && renderAnalysisStep()}
      {currentStep === 'complete' && renderCompleteStep()}
    </div>
  );
};

export default ComprehensiveFinancialAutomationComponent;
