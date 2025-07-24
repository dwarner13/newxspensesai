import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MessageSquare, Zap, DollarSign, FileText } from 'lucide-react';
import ProgressBar from '../../components/onboarding/ProgressBar';

const AIPreferencesScreen = () => {
  const navigate = useNavigate();
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  
  const aiPreferences = [
    {
      id: 'natural',
      icon: <MessageSquare className="w-6 h-6" />,
      title: 'Natural-sounding explanations',
      description: 'Get conversational insights about your finances'
    },
    {
      id: 'fast',
      icon: <Zap className="w-6 h-6" />,
      title: 'Fast automated categorization',
      description: 'Prioritize speed and efficiency in processing'
    },
    {
      id: 'savings',
      icon: <DollarSign className="w-6 h-6" />,
      title: 'Suggestions to save money',
      description: 'Receive tips on reducing expenses and saving more'
    },
    {
      id: 'tax',
      icon: <FileText className="w-6 h-6" />,
      title: 'Tax report summaries',
      description: 'Focus on tax-ready organization and reporting'
    }
  ];

  const togglePreference = (id: string) => {
    if (selectedPreferences.includes(id)) {
      setSelectedPreferences(selectedPreferences.filter(pref => pref !== id));
    } else {
      setSelectedPreferences([...selectedPreferences, id]);
    }
  };

  const handleContinue = () => {
    // Save selected AI preferences to local storage
    localStorage.setItem('xspensesai_ai_preferences', JSON.stringify(selectedPreferences));
    navigate('/onboarding/referral-source');
  };

  const handleBack = () => {
    navigate('/onboarding/document-sources');
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
          
          <ProgressBar currentStep={5} totalSteps={8} />
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">
              What type of AI support would you prefer?
            </h1>
            <p className="text-lg text-gray-400">
              Select all that interest you. This helps us tailor the AI to your needs.
            </p>
          </div>
          
          <div className="space-y-4 mb-8">
            {aiPreferences.map((preference) => (
              <motion.div
                key={preference.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: aiPreferences.indexOf(preference) * 0.1 }}
                className={`bg-gray-800 rounded-xl p-4 border-2 cursor-pointer transition-all duration-300 ${
                  selectedPreferences.includes(preference.id) 
                    ? 'border-primary-500 bg-gray-800/80' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => togglePreference(preference.id)}
              >
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 transition-colors ${
                    selectedPreferences.includes(preference.id) 
                      ? 'bg-primary-600' 
                      : 'bg-gray-700'
                  }`}>
                    {preference.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{preference.title}</h3>
                    <p className="text-sm text-gray-400">{preference.description}</p>
                  </div>
                  <div className="ml-auto">
                    <div className={`w-6 h-6 rounded-md border ${
                      selectedPreferences.includes(preference.id)
                        ? 'bg-primary-500 border-primary-600'
                        : 'bg-gray-700 border-gray-600'
                    } flex items-center justify-center`}>
                      {selectedPreferences.includes(preference.id) && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
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
              className="flex items-center px-6 py-3 rounded-lg font-medium bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white transition-all"
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

export default AIPreferencesScreen;
