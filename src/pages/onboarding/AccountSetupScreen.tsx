import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, User, Calendar, DollarSign, Percent } from 'lucide-react';
import ProgressBar from '../../components/onboarding/ProgressBar';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const AccountSetupScreen = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    accountName: '',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateLocale: 'en-US',
    currency: 'USD',
    taxIncluded: 'excluded',
    taxSystem: 'default'
  });
  
  useEffect(() => {
    // Pre-fill name from user profile if available
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();
          
        if (data?.display_name) {
          setFormData(prev => ({
            ...prev,
            fullName: data.display_name,
            accountName: data.display_name
          }));
        } else if (user.email) {
          const nameFromEmail = user.email.split('@')[0];
          setFormData(prev => ({
            ...prev,
            fullName: nameFromEmail,
            accountName: nameFromEmail
          }));
        }
      };
      
      fetchProfile();
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContinue = async () => {
    if (!formData.fullName || !formData.accountName) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Save to local storage
      localStorage.setItem('xspensesai_account_setup', JSON.stringify(formData));
      
      // Save to Supabase if user is logged in
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            display_name: formData.fullName,
            account_name: formData.accountName,
            time_zone: formData.timeZone,
            date_locale: formData.dateLocale,
            currency: formData.currency,
            tax_included: formData.taxIncluded,
            tax_system: formData.taxSystem,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
          
        if (error) throw error;
      }
      
      navigate('/onboarding/commitment');
      
    } catch (error) {
      console.error('Error saving account setup:', error);
      toast.error('Failed to save your account settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/onboarding/referral-source');
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
          
          <ProgressBar currentStep={7} totalSteps={8} />
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">
              Account details
            </h1>
            <p className="text-lg text-gray-400">
              Let's set up your account preferences.
            </p>
          </div>
          
          <div className="space-y-6 mb-8">
            <div
              className="space-y-4"
            >
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Your full name"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="accountName" className="block text-sm font-medium text-gray-300 mb-1">
                  Account name
                </label>
                <input
                  type="text"
                  id="accountName"
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="How you want to be addressed"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="timeZone" className="block text-sm font-medium text-gray-300 mb-1">
                  Time zone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-500" />
                  </div>
                  <select
                    id="timeZone"
                    name="timeZone"
                    value={formData.timeZone}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                    <option value="Australia/Sydney">Sydney (AEST)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-300 mb-1">
                  Preferred currency
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-gray-500" />
                  </div>
                  <select
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="USD">US Dollar ($)</option>
                    <option value="EUR">Euro (€)</option>
                    <option value="GBP">British Pound (£)</option>
                    <option value="CAD">Canadian Dollar (C$)</option>
                    <option value="AUD">Australian Dollar (A$)</option>
                    <option value="JPY">Japanese Yen (¥)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="taxIncluded" className="block text-sm font-medium text-gray-300 mb-1">
                  Tax calculations
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Percent className="h-5 w-5 text-gray-500" />
                  </div>
                  <select
                    id="taxIncluded"
                    name="taxIncluded"
                    value={formData.taxIncluded}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="included">Tax included in amounts</option>
                    <option value="excluded">Tax excluded from amounts</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label htmlFor="taxSystem" className="block text-sm font-medium text-gray-300 mb-1">
                  Tax system
                </label>
                <select
                  id="taxSystem"
                  name="taxSystem"
                  value={formData.taxSystem}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-700 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="default">Default</option>
                  <option value="us">US Tax System</option>
                  <option value="eu">EU VAT System</option>
                  <option value="uk">UK Tax System</option>
                  <option value="au">Australian Tax System</option>
                  <option value="ca">Canadian Tax System</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
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
              disabled={!formData.fullName || !formData.accountName || isSubmitting}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                formData.fullName && formData.accountName && !isSubmitting
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

export default AccountSetupScreen;
