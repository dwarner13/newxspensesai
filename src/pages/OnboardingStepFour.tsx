import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  Search, 
  Youtube, 
  Users,
  BookOpen,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const OnboardingStepFour = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  const options = [
    {
      id: 'google',
      icon: <Search className="w-6 h-6" />,
      title: '🔍 Google Search',
      description: 'I was searching for an expense or tax tracker.'
    },
    {
      id: 'social',
      icon: <Youtube className="w-6 h-6" />,
      title: '🎥 YouTube / Social Media',
      description: 'I saw a video or post about XspensesAI.'
    },
    {
      id: 'word_of_mouth',
      icon: <Users className="w-6 h-6" />,
      title: '🗣️ Word of Mouth',
      description: 'A friend, coworker, or accountant told me about it.'
    },
    {
      id: 'blog',
      icon: <BookOpen className="w-6 h-6" />,
      title: '🧾 Blog or Article',
      description: 'I read about XspensesAI in a blog, forum, or review.'
    },
    {
      id: 'ad',
      icon: <ExternalLink className="w-6 h-6" />,
      title: '🎯 Online Ad',
      description: 'I clicked on an ad (Facebook, Instagram, Google, etc.)'
    },
    {
      id: 'beta',
      icon: <CheckCircle className="w-6 h-6" />,
      title: "🚀 I'm an Early Tester",
      description: 'I joined through a private invite or beta program.'
    }
  ];

  const handleOptionSelect = (id: string) => {
    setSelectedOption(id);
  };

  const handleContinue = () => {
    if (selectedOption) {
      // In a real app, you would save this data to the user's profile
      // For now, we'll just navigate to the next step
      navigate('/onboarding/step-five');
    }
  };

  const handleGoBack = () => {
    navigate('/onboarding/step-three');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container  px-4 py-12 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
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
              How did you discover XspensesAI?
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl ">
              Your feedback helps us grow smarter — and reward our top referrers.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {options.map((option) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: options.indexOf(option) * 0.1 }}
                className={`bg-gray-800 rounded-xl p-6 border-2 cursor-pointer transition-all duration-300 ${
                  selectedOption === option.id 
                    ? 'border-primary-500 bg-gray-800/80 shadow-lg shadow-primary-500/20' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => handleOptionSelect(option.id)}
              >
                <div className="flex items-start">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-colors ${
                    selectedOption === option.id 
                      ? 'bg-primary-600' 
                      : 'bg-gray-700'
                  }`}>
                    {option.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{option.title}</h3>
                    <p className="text-gray-400">{option.description}</p>
                  </div>
                </div>
                
                {selectedOption === option.id && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 text-primary-400 text-sm font-medium flex items-center"
                  >
                    Selected
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
              </motion.div>
            ))}
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

export default OnboardingStepFour;
