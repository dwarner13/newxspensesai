import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Crown, Star, ArrowRight, Gift } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const SuccessPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId && user) {
      verifySession();
    } else {
      setLoading(false);
    }
  }, [sessionId, user]);

  const verifySession = async () => {
    try {
      setLoading(true);
      
      // Verify the session with Stripe via our edge function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'x-user-id': user?.id || '',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify checkout session');
      }

      const data = await response.json();
      if (data.success) {
        setSessionData(data);
        toast.success('Payment successful! Your account has been upgraded.');
      } else {
        throw new Error(data.error || 'Session verification failed');
      }
    } catch (error) {
      console.error('Error verifying session:', error);
      toast.error('Could not verify your payment. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-success-50 to-primary-50 flex items-center justify-center py-12 px-4">
      <div
        className=" w-full bg-white rounded-xl shadow-xl p-8 text-center"
      >
        {/* Success Icon */}
        <div
          className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center  mb-6"
        >
          <CheckCircle size={40} className="text-success-600" />
        </div>

        {/* Success Message */}
        <div
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            🎉 Payment Successful!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Thank you for upgrading to {sessionData?.planName || 'Premium'}! 
            Your account has been updated with all the new features.
          </p>
        </div>

        {/* Premium Features Unlocked */}
        <div
          className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-lg p-4 mb-6"
        >
          <div className="flex items-center justify-center space-x-2 mb-3">
            <Crown size={20} className="text-yellow-600" />
            <span className="font-semibold text-gray-900">Premium Features Unlocked!</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
            <div className="flex items-center space-x-2">
              <Star size={14} className="text-primary-600" />
              <span>Unlimited receipts</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star size={14} className="text-primary-600" />
              <span>AI categorization</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star size={14} className="text-primary-600" />
              <span>Advanced analytics</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star size={14} className="text-primary-600" />
              <span>Priority support</span>
            </div>
          </div>
        </div>

        {/* XP Bonus */}
        <div
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
        >
          <div className="flex items-center justify-center space-x-2">
            <Gift size={20} className="text-yellow-600" />
            <span className="font-medium text-yellow-800">
              Bonus: +100 XP for upgrading!
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className="space-y-3"
        >
          <Link
            to="/"
            className="w-full btn-primary flex items-center justify-center"
          >
            <span>Explore Premium Features</span>
            <ArrowRight size={16} className="ml-2" />
          </Link>
          
          <Link
            to="/settings/profile"
            className="w-full btn-outline text-sm"
          >
            Manage Subscription
          </Link>
        </div>

        {/* Support */}
        <div
          className="mt-6 pt-6 border-t border-gray-200"
        >
          <p className="text-xs text-gray-500">
            Need help? Contact us at{' '}
            <a 
              href="mailto:support@xspensesai.com" 
              className="text-primary-600 hover:underline"
            >
              support@xspensesai.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;
