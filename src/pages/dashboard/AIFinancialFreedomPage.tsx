import React, { useState } from 'react';
import { 
  Crown, Target, TrendingUp, DollarSign, Calendar, 
  CheckCircle, AlertCircle, Zap, BarChart3, Settings
} from 'lucide-react';

const AIFinancialFreedomPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const freedomSteps = [
    {
      id: 1,
      title: 'Financial Assessment',
      description: 'Complete AI-powered analysis of your current financial situation',
      icon: '📊',
      status: 'completed'
    },
    {
      id: 2,
      title: 'Goal Setting',
      description: 'Define your financial freedom milestones and timeline',
      icon: '🎯',
      status: 'active'
    },
    {
      id: 3,
      title: 'Strategy Creation',
      description: 'AI generates personalized strategies for achieving freedom',
      icon: '🧠',
      status: 'pending'
    },
    {
      id: 4,
      title: 'Implementation',
      description: 'Execute your financial freedom plan with AI guidance',
      icon: '⚡',
      status: 'pending'
    },
    {
      id: 5,
      title: 'Monitoring',
      description: 'Track progress and adjust strategies as needed',
      icon: '📈',
      status: 'pending'
    }
  ];

  const financialMetrics = [
    { name: 'Current Net Worth', value: '$45,230', change: '+12.5%', trend: 'up' },
    { name: 'Monthly Savings Rate', value: '23%', change: '+5.2%', trend: 'up' },
    { name: 'Debt-to-Income Ratio', value: '28%', change: '-3.1%', trend: 'down' },
    { name: 'Emergency Fund', value: '6.2 months', change: '+1.1 months', trend: 'up' }
  ];

  const handleStartAssessment = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setCurrentStep(2);
    } catch (err) {
      setError('Failed to start financial assessment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <>
        <header className="p-6">
          <h1 className="text-3xl font-bold">AI Financial Freedom</h1>
        </header>
        <div className="flex-1 px-10 py-12">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-400 mb-2">Error</h2>
            <p className="text-white/80 mb-4">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="p-6">
        <h1 className="text-3xl font-bold mb-2">AI Financial Freedom</h1>
        <p className="text-lg text-gray-300">Your personalized path to financial independence</p>
      </header>
      <div className="flex-1 px-10 py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Progress Overview */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-6">Your Freedom Journey</h2>
            <div className="space-y-4">
              {freedomSteps.map((step, index) => (
                <div key={step.id} className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.status === 'completed' ? 'bg-green-500' :
                    step.status === 'active' ? 'bg-blue-500' : 'bg-gray-500'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle size={16} className="text-white" />
                    ) : (
                      <span className="text-white text-sm font-bold">{step.id}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{step.title}</h3>
                    <p className="text-white/60 text-sm">{step.description}</p>
                  </div>
                  <div className="text-2xl">{step.icon}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {financialMetrics.map((metric, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <BarChart3 size={24} className="text-white" />
                  </div>
                  <span className="text-2xl font-bold text-white">{metric.value}</span>
                </div>
                <h3 className="text-white font-semibold mb-2">{metric.name}</h3>
                <div className={`flex items-center space-x-1 ${
                  metric.trend === 'up' ? 'text-green-400' : 'text-red-400'
                }`}>
                  <TrendingUp size={16} className={metric.trend === 'down' ? 'rotate-180' : ''} />
                  <span className="text-sm">{metric.change}</span>
                </div>
              </div>
            ))}
          </div>

          {/* AI Recommendations */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">AI Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-center space-x-3 mb-3">
                  <Target size={20} className="text-green-400" />
                  <h3 className="text-white font-semibold">Increase Savings Rate</h3>
                </div>
                <p className="text-white/80 text-sm">
                  Based on your spending patterns, you can increase your savings rate by 5% by reducing dining out expenses.
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl p-4 border border-blue-500/20">
                <div className="flex items-center space-x-3 mb-3">
                  <Zap size={20} className="text-blue-400" />
                  <h3 className="text-white font-semibold">Investment Opportunity</h3>
                </div>
                <p className="text-white/80 text-sm">
                  Consider investing your emergency fund excess in a high-yield savings account for better returns.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={handleStartAssessment}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Crown size={20} />
                  <span>Start Freedom Assessment</span>
                </>
              )}
            </button>
            
            <button className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200">
              View Detailed Plan
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AIFinancialFreedomPage;
