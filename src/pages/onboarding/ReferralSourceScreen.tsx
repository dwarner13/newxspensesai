import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Search, Youtube, Users, BookOpen, ExternalLink, MessageSquare } from 'lucide-react';
import ProgressBar from '../../components/onboarding/ProgressBar';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const ReferralSourceScreen = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const referralSources = [
    {
      id: 'google',
      icon: <Search className="w-6 h-6" />,
      title: '🔍 Google Search',
      description: 'I was searching for an expense or tax tracker.'
    },
    {
      id: 'youtube',
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
      id: 'early_tester',
      icon: <MessageSquare className="w-6 h-6" />,
      title: "🚀 I'm an Early Tester",
      description: 'I joined through a private invite or beta program.'
    }
  ];

  const handleSourceSelect = (id: string) => {
    setSelectedSource(id);
  };

  const handleContinue = async () => {
    if (!selectedSource) return;
    
    try {
      setIsSubmitting(true);
      
      // Save to local storage
      localStorage.setItem('xspensesai_referral_source', selectedSource);
      localStorage.setItem('xspensesai_referrer_name', referrerName);
      
      // Save to Supabase if user is logged in
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            user_source: selectedSource,
            referrer_name: referrerName || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
          
        if (error) throw error;
      }
      
      navigate('/onboarding/account-setup');
      
    } catch (error) {
      console.error('Error saving referral data:', error);
      toast.error('Failed to save your information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/onboarding/ai-preferences');
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
          
          <ProgressBar currentStep={6} totalSteps={8} />
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">
              How did you find out about XspensesAI?
            </h1>
            <p className="text-lg text-gray-400">
              Your feedback helps us grow smarter — and reward our top referrers.
            </p>
          </div>
          
          <div className="space-y-4 mb-8">
            {referralSources.map((source) => (
              <div
                key={source.id}
                className={`bg-gray-800 rounded-xl p-4 border-2 cursor-pointer transition-all duration-300 ${
                  selectedSource === source.id 
                    ? 'border-primary-500 bg-gray-800/80' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => handleSourceSelect(source.id)}
              >
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 transition-colors ${
                    selectedSource === source.id 
                      ? 'bg-primary-600' 
                      : 'bg-gray-700'
                  }`}>
                    {source.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{source.title}</h3>
                    <p className="text-sm text-gray-400">{source.description}</p>
                  </div>
                  <div className="ml-auto">
                    <div className={`w-6 h-6 rounded-full border-2 ${
                      selectedSource === source.id
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-600'
                    } flex items-center justify-center`}>
                      {selectedSource === source.id && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div
            className="mb-8"
          >
            <label htmlFor="referrer" className="block text-sm font-medium text-gray-300 mb-2">
              Want to give a shoutout or mention who referred you?
            </label>
            <input
              type="text"
              id="referrer"
              value={referrerName}
              onChange={(e) => setReferrerName(e.target.value)}
              placeholder="e.g. @name or website"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
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
              disabled={!selectedSource || isSubmitting}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                selectedSource && !isSubmitting
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

export default ReferralSourceScreen;
