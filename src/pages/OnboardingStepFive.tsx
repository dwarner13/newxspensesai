import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  Search, 
  Youtube, 
  Users,
  BookOpen,
  ExternalLink,
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const OnboardingStepFive = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const options = [
    {
      id: 'google_search',
      icon: <Search className="w-6 h-6" />,
      title: '🔍 Google Search',
      description: 'I was searching for an expense or tax tracker.'
    },
    {
      id: 'youtube_social',
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
      id: 'blog_article',
      icon: <BookOpen className="w-6 h-6" />,
      title: '🧾 Blog or Article',
      description: 'I read about XspensesAI in a blog, forum, or review.'
    },
    {
      id: 'online_ad',
      icon: <ExternalLink className="w-6 h-6" />,
      title: '🎯 Online Ad',
      description: 'I clicked on an ad (Facebook, Instagram, Google, etc.)'
    },
    {
      id: 'early_tester',
      icon: <CheckCircle className="w-6 h-6" />,
      title: "🚀 I'm an Early Tester",
      description: 'I joined through a private invite or beta program.'
    }
  ];

  const handleOptionSelect = (id: string) => {
    setSelectedOption(id);
  };

  const handleContinue = async () => {
    if (!selectedOption) return;
    
    try {
      setIsSubmitting(true);
      
      if (user) {
        // Save user source and referrer name to profile
        const { error } = await supabase
          .from('profiles')
          .update({
            user_source: selectedOption,
            referrer_name: referrerName || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
          
        if (error) throw error;
      }
      
      // Navigate to next step
      navigate('/onboarding/step-six');
      
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      toast.error('Failed to save your preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    navigate('/onboarding/step-four');
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
              How did you discover XspensesAI?
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl ">
              Your feedback helps us grow smarter — and reward our top referrers.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {options.map((option) => (
              <div
                key={option.id}
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
                  <div
                    className="mt-4 text-primary-400 text-sm font-medium flex items-center"
                  >
                    Selected
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Optional referrer input */}
          <div
            className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-12"
          >
            <div className="flex items-start mb-3">
              <MessageSquare className="w-5 h-5 text-primary-400 mr-2 mt-1" />
              <label htmlFor="referrer" className="block text-sm font-medium text-gray-300">
                Want to give a shoutout or mention who referred you? (Optional)
              </label>
            </div>
            <input
              type="text"
              id="referrer"
              placeholder="e.g. @name or website"
              value={referrerName}
              onChange={(e) => setReferrerName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
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
        </div>
      </div>
    </div>
  );
};

export default OnboardingStepFive;
