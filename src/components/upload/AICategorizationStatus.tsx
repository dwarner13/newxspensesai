import { useState } from 'react';
import { Brain, Zap, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

interface AICategorizationStatusProps {
  isProcessing: boolean;
  progress: number;
  currentStep: 'parsing' | 'categorizing' | 'learning' | 'complete' | 'error';
  processedCount: number;
  totalCount: number;
  message: string;
}

const AICategorizationStatus = ({
  isProcessing,
  progress,
  currentStep,
  processedCount,
  totalCount,
  message
}: AICategorizationStatusProps) => {
  const getStepIcon = () => {
    switch (currentStep) {
      case 'parsing':
        return <Clock className="animate-spin" size={20} />;
      case 'categorizing':
        return <Brain className="animate-pulse text-primary-600" size={20} />;
      case 'learning':
        return <Zap className="animate-pulse text-secondary-600" size={20} />;
      case 'complete':
        return <CheckCircle className="text-success-600" size={20} />;
      case 'error':
        return <AlertTriangle className="text-error-600" size={20} />;
      default:
        return <Brain size={20} />;
    }
  };

  const getStepColor = () => {
    switch (currentStep) {
      case 'categorizing':
        return 'from-primary-500 to-secondary-500';
      case 'learning':
        return 'from-secondary-500 to-accent-500';
      case 'complete':
        return 'from-success-500 to-success-600';
      case 'error':
        return 'from-error-500 to-error-600';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  if (!isProcessing && currentStep !== 'complete' && currentStep !== 'error') {
    return null;
  }

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          {getStepIcon()}
          <div>
            <h4 className="font-medium text-gray-900">AI Categorization</h4>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>
        
        {totalCount > 0 && (
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {processedCount} / {totalCount}
            </div>
            <div className="text-xs text-gray-500">transactions</div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          animate={{ width: `${progress}%` }}
          className={`h-2 rounded-full bg-gradient-to-r ${getStepColor()}`}
        />
      </div>

      {/* Step Details */}
      {currentStep === 'categorizing' && (
        <div className="mt-3 text-xs text-gray-500 bg-primary-50 p-2 rounded">
          <div className="flex items-center space-x-2">
            <Brain size={12} className="text-primary-600" />
            <span>AI is analyzing transaction descriptions and assigning categories...</span>
          </div>
        </div>
      )}

      {currentStep === 'learning' && (
        <div className="mt-3 text-xs text-gray-500 bg-secondary-50 p-2 rounded">
          <div className="flex items-center space-x-2">
            <Zap size={12} className="text-secondary-600" />
            <span>Learning vendor patterns for future automatic categorization...</span>
          </div>
        </div>
      )}

      {currentStep === 'complete' && (
        <div className="mt-3 text-xs text-success-600 bg-success-50 p-2 rounded">
          <div className="flex items-center space-x-2">
            <CheckCircle size={12} />
            <span>AI categorization complete! Your transactions are ready to review.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AICategorizationStatus;
