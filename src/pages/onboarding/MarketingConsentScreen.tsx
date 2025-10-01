import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, Bell } from 'lucide-react';
import ProgressBar from '../../components/onboarding/ProgressBar';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const MarketingConsentScreen = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    try {
      setIsSubmitting(true);
      
      // Save to local storage
      localStorage.setItem('xspensesai_marketing_consent', marketingConsent.toString());
      
      // Save to Supabase if user is logged in
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            marketing_consent: marketingConsent,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
          
        if (error) throw error;
      }
      
      navigate('/onboarding/final');
      
    } catch (error) {
      console.error('Error saving marketing consent:', error);
      toast.error('Failed to save your preference. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/onboarding/commitment');
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
          
          <ProgressBar currentStep={8} totalSteps={8} />
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">
              Marketing consent
            </h1>
            <p className="text-lg text-gray-400">
              Would you like to receive updates about features, discounts, and financial tips?
            </p>
          </div>
          
          <div
            className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8"
          >
            <div className="flex items-start mb-6">
              <div className="w-12 h-12 rounded-lg bg-primary-900 flex items-center justify-center mr-4 flex-shrink-0">
                <Mail className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Stay Updated</h3>
                <p className="text-gray-400 text-sm">
                  We'll send you helpful content like:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-gray-300">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    New feature announcements
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Money-saving tips and financial advice
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Exclusive discounts and offers
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 mr-2 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Tax season reminders and guides
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center">
                <Bell className="w-5 h-5 text-gray-300 mr-2" />
                <span className="text-gray-300">Receive marketing emails</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={marketingConsent} 
                  onChange={() => setMarketingConsent(!marketingConsent)} 
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            
            <p className="text-xs text-gray-500 mt-4">
              You can change your preferences anytime in settings. We respect your privacy and will never sell your data.
            </p>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </button>
            
            <button
              onClick={handleContinue}
              disabled={isSubmitting}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                !isSubmitting
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
                  Continue
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

export default MarketingConsentScreen;
