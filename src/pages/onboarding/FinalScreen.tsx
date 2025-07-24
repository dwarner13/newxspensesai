import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const FinalScreen = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userName, setUserName] = useState('');
  
  useEffect(() => {
    // Get user's name from profile or email
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();
          
        if (data?.display_name) {
          setUserName(data.display_name);
        } else if (user.email) {
          const nameFromEmail = user.email.split('@')[0];
          // Capitalize first letter
          setUserName(nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1));
        }
      };
      
      fetchProfile();
    }
  }, [user]);

  const handleFinish = async () => {
    try {
      setIsSubmitting(true);
      
      // Mark onboarding as complete in Supabase if user is logged in
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
          
        if (error) throw error;
      }
      
      // Clear onboarding data from local storage
      const onboardingKeys = [
        'xspensesai_document_types',
        'xspensesai_document_volume',
        'xspensesai_document_sources',
        'xspensesai_ai_preferences',
        'xspensesai_referral_source',
        'xspensesai_referrer_name',
        'xspensesai_account_setup',
        'xspensesai_commitment',
        'xspensesai_marketing_consent'
      ];
      
      onboardingKeys.forEach(key => localStorage.removeItem(key));
      
      // Navigate to dashboard
      navigate('/');
      
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container  px-4 py-8 ">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-center space-x-2 mb-8">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6L18 18M18 6L6 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-2xl font-bold">XspensesAI</span>
          </div>
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-8"
          >
            <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </motion.div>
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">
              You're all set up!
            </h1>
            <p className="text-lg text-gray-400">
              {userName ? `Congratulations ${userName}! ` : 'Congratulations! '}
              Your XspensesAI account is ready to go.
            </p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8"
          >
            <h3 className="font-semibold text-lg mb-4">Here's what you can do next:</h3>
            
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="bg-primary-900 rounded-full p-1 mr-3 flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-300">Upload your first bank statement or receipt</span>
              </li>
              <li className="flex items-start">
                <div className="bg-primary-900 rounded-full p-1 mr-3 flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-300">Let our AI categorize your transactions</span>
              </li>
              <li className="flex items-start">
                <div className="bg-primary-900 rounded-full p-1 mr-3 flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-300">Explore your financial dashboard</span>
              </li>
              <li className="flex items-start">
                <div className="bg-primary-900 rounded-full p-1 mr-3 flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-300">Set up your first savings goal</span>
              </li>
            </ul>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex justify-center"
          >
            <button
              onClick={handleFinish}
              disabled={isSubmitting}
              className={`flex items-center px-8 py-3 rounded-lg font-medium transition-all ${
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
                  Launch Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default FinalScreen;
