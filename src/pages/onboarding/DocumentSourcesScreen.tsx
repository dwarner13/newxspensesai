import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileText, Mail, Camera, AlertTriangle } from 'lucide-react';
import ProgressBar from '../../components/onboarding/ProgressBar';

const DocumentSourcesScreen = () => {
  const navigate = useNavigate();
  const [selectedSources, setSelectedSources] = useState<string[]>(['pdf']);
  
  const sourceOptions = [
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

  const toggleSource = (id: string) => {
    if (selectedSources.includes(id)) {
      setSelectedSources(selectedSources.filter(source => source !== id));
    } else {
      setSelectedSources([...selectedSources, id]);
    }
  };

  const handleContinue = () => {
    if (selectedSources.length > 0) {
      // Save selected sources to local storage
      localStorage.setItem('xspensesai_document_sources', JSON.stringify(selectedSources));
      navigate('/onboarding/ai-preferences');
    }
  };

  const handleBack = () => {
    navigate('/onboarding/volume');
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
          
          <ProgressBar currentStep={4} totalSteps={8} />
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">
              Where do you get your receipts, invoices and documents?
            </h1>
            <p className="text-lg text-gray-400">
              Select all that apply so XspensesAI can automate your imports and sorting.
            </p>
          </div>
          
          <div className="space-y-4 mb-8">
            {sourceOptions.map((option) => (
              <div
                key={option.id}
                className={`bg-gray-800 rounded-xl p-4 border-2 cursor-pointer transition-all duration-300 ${
                  selectedSources.includes(option.id) 
                    ? 'border-primary-500 bg-gray-800/80' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => toggleSource(option.id)}
              >
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 transition-colors ${
                    selectedSources.includes(option.id) 
                      ? 'bg-primary-600' 
                      : 'bg-gray-700'
                  }`}>
                    {option.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{option.title}</h3>
                    <p className="text-sm text-gray-400">{option.description}</p>
                  </div>
                  <div className="ml-auto">
                    <div className={`w-6 h-6 rounded-md border ${
                      selectedSources.includes(option.id)
                        ? 'bg-primary-500 border-primary-600'
                        : 'bg-gray-700 border-gray-600'
                    } flex items-center justify-center`}>
                      {selectedSources.includes(option.id) && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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
              disabled={selectedSources.length === 0}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                selectedSources.length > 0
                  ? 'bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white' 
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentSourcesScreen;
