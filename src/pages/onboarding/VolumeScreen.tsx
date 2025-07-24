import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import ProgressBar from '../../components/onboarding/ProgressBar';

const VolumeScreen = () => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  const volumeOptions = [
    {
      id: '0-10',
      title: '0–10',
      description: 'Just a few documents per month'
    },
    {
      id: '10-50',
      title: '10–50',
      description: 'Regular tracking of expenses'
    },
    {
      id: '50-100',
      title: '50–100',
      description: 'Active business or detailed personal tracking'
    },
    {
      id: '200+',
      title: '200+',
      description: 'High volume business or multiple accounts'
    }
  ];

  const handleOptionSelect = (id: string) => {
    setSelectedOption(id);
  };

  const handleContinue = () => {
    if (selectedOption) {
      // Save selected volume to local storage
      localStorage.setItem('xspensesai_document_volume', selectedOption);
      navigate('/onboarding/document-sources');
    }
  };

  const handleBack = () => {
    navigate('/onboarding/document-types');
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
          
          <ProgressBar currentStep={3} totalSteps={8} />
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">
              How many documents do you expect to scan per month?
            </h1>
            <p className="text-lg text-gray-400">
              This helps us optimize your experience and recommend the right plan.
            </p>
          </div>
          
          <div className="space-y-4 mb-8">
            {volumeOptions.map((option) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: volumeOptions.indexOf(option) * 0.1 }}
                className={`bg-gray-800 rounded-xl p-4 border-2 cursor-pointer transition-all duration-300 ${
                  selectedOption === option.id 
                    ? 'border-primary-500 bg-gray-800/80' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => handleOptionSelect(option.id)}
              >
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                    selectedOption === option.id
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-600'
                  }`}>
                    {selectedOption === option.id && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{option.title}</h3>
                    <p className="text-sm text-gray-400">{option.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
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
              disabled={!selectedOption}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                selectedOption
                  ? 'bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white' 
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default VolumeScreen;
