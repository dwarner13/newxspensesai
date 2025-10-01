import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  Brain, 
  FileText, 
  Receipt, 
  PieChart,
  FileSpreadsheet,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const OnboardingStepSix = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const features = [
    {
      icon: <FileText className="w-6 h-6 text-primary-400" />,
      title: "Categorize receipts and transactions automatically",
      description: "Our AI analyzes your spending patterns and learns from your preferences."
    },
    {
      icon: <Brain className="w-6 h-6 text-primary-400" />,
      title: "Remember vendors and previous categorizations",
      description: "The more you use XspensesAI, the smarter it gets at recognizing your transactions."
    },
    {
      icon: <Receipt className="w-6 h-6 text-primary-400" />,
      title: "Scan PDFs and extract useful info from receipts or bank statements",
      description: "No more manual data entry - our AI does the heavy lifting."
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-primary-400" />,
      title: "Give smart financial tips and summaries",
      description: "Get insights about your spending habits and suggestions for improvement."
    },
    {
      icon: <FileSpreadsheet className="w-6 h-6 text-primary-400" />,
      title: "Help prepare tax-ready reports based on your data",
      description: "Simplify tax season with AI-organized financial information."
    },
    {
      icon: <PieChart className="w-6 h-6 text-primary-400" />,
      title: "Learn and improve with your feedback",
      description: "Our AI assistant gets better with every correction and suggestion you provide."
    }
  ];

  const handleContinue = async () => {
    if (!acceptedTerms) {
      toast.error('Please accept the AI assistant terms to continue');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      if (user) {
        // Save AI terms acceptance to profile
        const { error } = await supabase
          .from('profiles')
          .update({
            accepted_ai_terms: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
          
        if (error) throw error;
      }
      
      // Navigate to welcome page
      navigate('/welcome');
      
    } catch (error) {
      console.error('Error saving AI terms acceptance:', error);
      toast.error('Failed to save your preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    navigate('/onboarding/step-five');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container  px-4 py-12 max-w-4xl">
        <div
        >
          <div className="flex items-center justify-center space-x-2 mb-12">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6L18 18M18 6L6 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-2xl font-bold">XspensesAI</span>
          </div>
          
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Meet Your AI Assistant
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl ">
              XspensesAI is powered by smart financial intelligence — here's what it can do for you.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-gray-800 rounded-xl p-6 border border-gray-700"
              >
                <div className="flex items-start">
                  <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center mr-4">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-400">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Disclaimer */}
          <div
            className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8"
          >
            <div className="flex items-start">
              <AlertTriangle className="w-6 h-6 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-2 text-yellow-500">Important Note</h3>
                <p className="text-gray-300">
                  XspensesAI is not a certified accountant or tax advisor. Always double-check important submissions.
                </p>
              </div>
            </div>
          </div>
          
          {/* Terms Acceptance */}
          <div
            className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-12"
          >
            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input
                  id="ai-terms"
                  name="ai-terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500 focus:ring-offset-gray-800"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="ai-terms" className="text-gray-300">
                  I understand and agree to use XspensesAI as a smart assistant, not a replacement for a financial advisor.
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={handleGoBack}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            
            <button
              onClick={handleContinue}
              disabled={!acceptedTerms || isSubmitting}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                acceptedTerms && !isSubmitting
                  ? 'bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white' 
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  Get Started
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStepSix;
