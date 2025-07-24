import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle, Crown, Star, ArrowRight, Gift } from 'lucide-react';

export default function SuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;
  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    if (session_id) {
      // Verify the session with Stripe
      verifySession(session_id);
    }
  }, [session_id]);

  const verifySession = async (sessionId) => {
    try {
      setLoading(true);
      
      // You can call your backend to verify the session
      // For now, we'll just show a success message
      setSessionData({
        planName: 'Premium',
        success: true
      });
    } catch (error) {
      console.error('Error verifying session:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🎉 Payment Successful!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Thank you for upgrading to {sessionData?.planName || 'Premium'}! 
          Your account has been updated with all the new features.
        </p>

        {/* Premium Features Unlocked */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <Crown size={20} className="text-yellow-600" />
            <span className="font-semibold text-gray-900">Premium Features Unlocked!</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
            <div className="flex items-center space-x-2">
              <Star size={14} className="text-blue-600" />
              <span>Unlimited receipts</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star size={14} className="text-blue-600" />
              <span>AI categorization</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star size={14} className="text-blue-600" />
              <span>Advanced analytics</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star size={14} className="text-blue-600" />
              <span>Priority support</span>
            </div>
          </div>
        </div>

        {/* XP Bonus */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center space-x-2">
            <Gift size={20} className="text-yellow-600" />
            <span className="font-medium text-yellow-800">
              Bonus: +100 XP for upgrading!
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <span>Explore Premium Features</span>
            <ArrowRight size={16} className="ml-2" />
          </button>
          
          <button
            onClick={() => router.push('/settings')}
            className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Manage Subscription
          </button>
        </div>

        {/* Support */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Need help? Contact us at{' '}
            <a 
              href="mailto:support@xspensesai.com" 
              className="text-blue-600 hover:underline"
            >
              support@xspensesai.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}