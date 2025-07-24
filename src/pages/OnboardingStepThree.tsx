import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  FileText, 
  Mail, 
  Camera,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const OnboardingStepThree = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  
  const options = [
    {
      id: 'paper',
      icon: <FileText className="w-6 h-6" />,
      title: '📄 Paper',
      description: 'I keep paper receipts or invoices that I want to scan or photograph.'
    },
    {
      id: 'pdf',
      icon: <FileText className="w-6 h-6" />,
      title: '📎 PDF',
      description: 'I save digital invoices or receipts as PDFs or image files.'
    },
    {
      id: 'email',
      icon: <Mail className="w-6 h-6" />,
      title: '📬 Email',
      description: 'I get invoices and receipts by email — I\'d like XspensesAI to help sort them.'
    },
    {
      id: 'lost',
      icon: <AlertTriangle className="w-6 h-6" />,
      title: '🌀 They\'re lost!',
      description: 'I misplace receipts often — I need help tracking them in one place.'
    }
  ];

  const toggleOption = (id: string) => {
    if (selectedOptions.includes(id)) {
      setSelectedOptions(selectedOptions.filter(option => option !== id));
    } else {
      setSelectedOptions([...selectedOptions, id]);
    }
  };

  const handleContinue = () => {
    if (selectedOptions.length > 0) {
      // In a real app, you would save these preferences to the user's profile
      // For now, we'll just navigate to the next step
      navigate('/onboarding/step-four');
    }
  };

  const handleGoBack = () => {
    navigate('/onboarding/step-two');
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
              Where do your receipts, invoices, and documents usually come from?
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl ">
              Select all that apply so XspensesAI can automate your imports and sorting.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {options.map((option) => (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: options.indexOf(option) * 0.1 }}
                className={`relative bg-gray-800 rounded-xl p-6 border-2 cursor-pointer transition-all duration-300 ${
                  selectedOptions.includes(option.id) 
                    ? 'border-primary-500 bg-gray-800/80 shadow-lg shadow-primary-500/20' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => toggleOption(option.id)}
              >
                <div className="flex items-start">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-colors ${
                    selectedOptions.includes(option.id) 
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
                
                {selectedOptions.includes(option.id) && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute top-4 right-4"
                  >
                    <CheckCircle className="w-6 h-6 text-primary-500" />
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
              disabled={selectedOptions.length === 0}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                selectedOptions.length > 0
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

export default OnboardingStepThree;
