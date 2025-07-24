import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ThumbsUp, ThumbsDown } from 'lucide-react';
import ProgressBar from '../../components/onboarding/ProgressBar';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const CommitmentScreen = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const commitmentOptions = [
    {
      id: 'committed',
      icon: <ThumbsUp className="w-8 h-8" />,
      title: 'Absolutely!',
      description: 'I\'m ready to take control of my finances'
    },
    {
      id: 'not_committed',
      icon: <ThumbsDown className="w-8 h-8" />,
      title: 'Not really',
      description: 'I\'m just exploring for now'
    }
  ];

  const handleOptionSelect = (id: string) => {
    setSelectedOption(id);
  };

  const handleContinue = async () => {
    if (!selectedOption) return;
    
    try {
      setIsSubmitting(true);
      
      // Save to local storage
      localStorage.setItem('xspensesai_commitment', selectedOption);
      
      // Save to Supabase if user is logged in
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            commitment_level: selectedOption,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
          
        if (error) throw error;
      }
      
      navigate('/onboarding/marketing-consent');
      
    } catch (error) {
      console.error('Error saving commitment data:', error);
      toast.error('Failed to save your preference. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/onboarding/account-setup');
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
          
          <ProgressBar currentStep={7} totalSteps={8} />
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">
              Are you committed to improving your finances?
            </h1>
            <p className="text-lg text-gray-400">
              Users who commit to regular tracking see the best results.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            {commitmentOptions.map((option) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: commitmentOptions.indexOf(option) * 0.1 }}
                className={`bg-gray-800 rounded-xl p-4 border-2 cursor-pointer transition-all duration-300 ${
                  selectedOption === option.id 
                    ? 'border-primary-500 bg-gray-800/80' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => handleOptionSelect(option.id)}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-colors ${
                    selectedOption === option.id 
                      ? option.id === 'committed' ? 'bg-green-600' : 'bg-gray-600'
                      : 'bg-gray-700'
                  }`}>
                    {option.icon}
                  </div>
                  <h3 className="font-semibold text-lg">{option.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-8"
          >
            <p className="text-sm text-gray-300">
              Users who commit to tracking their finances at least once a week save an average of 15% more money and have better financial outcomes.
            </p>
          </motion.div>
          
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
              disabled={!selectedOption || isSubmitting}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                selectedOption && !isSubmitting
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
        </motion.div>
      </div>
    </div>
  );
};

export default CommitmentScreen;
