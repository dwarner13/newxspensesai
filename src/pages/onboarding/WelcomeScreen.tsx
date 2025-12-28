import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouteTransition } from '../../contexts/RouteTransitionContext';
import ProgressBar from '../../components/onboarding/ProgressBar';

const WelcomeScreen = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { endTransition } = useRouteTransition();

  // End route transition when page mounts
  useEffect(() => {
    endTransition();
  }, [endTransition]);
  
  const handleContinue = () => {
    navigate('/onboarding/document-types');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container  px-4 py-8 ">
        <div
        >
          <div className="flex items-center justify-center space-x-2 mb-8">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6L18 18M18 6L6 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-2xl font-bold">XspensesAI</span>
          </div>
          
          <ProgressBar currentStep={1} totalSteps={8} />
          
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-4">
              Welcome to XspensesAI
            </h1>
            <p className="text-lg text-gray-400">
              Let's personalize your experience to help you better manage your finances.
            </p>
          </div>
          
          <div
            className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8"
          >
            <div className="aspect-video bg-gray-700 rounded-lg mb-6 overflow-hidden">
              <img 
                src="https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                alt="XspensesAI Demo" 
                className="w-full h-full object-cover"
              />
            </div>
            
            <h3 className="text-xl font-semibold mb-2">Smart Financial Management</h3>
            <p className="text-gray-400 mb-4">
              XspensesAI uses artificial intelligence to help you track expenses, categorize transactions, and gain insights into your financial habits.
            </p>
            
            <ul className="space-y-2 mb-4">
              <li className="flex items-center text-gray-300">
                <svg className="w-5 h-5 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Automatic receipt scanning
              </li>
              <li className="flex items-center text-gray-300">
                <svg className="w-5 h-5 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                AI-powered categorization
              </li>
              <li className="flex items-center text-gray-300">
                <svg className="w-5 h-5 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Insightful financial reports
              </li>
              <li className="flex items-center text-gray-300">
                <svg className="w-5 h-5 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Tax-ready summaries
              </li>
            </ul>
          </div>
          
          <div
            className="flex justify-center"
          >
            <button
              onClick={handleContinue}
              className="flex items-center px-8 py-3 rounded-lg font-medium bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white transition-all"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
