import { useRouter } from 'next/router';
import { XCircle, ArrowLeft, Mail, RefreshCw } from 'lucide-react';

export default function CancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8 text-center">
        {/* Cancel Icon */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle size={40} className="text-red-600" />
        </div>

        {/* Cancel Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Payment Canceled
        </h1>
        
        <p className="text-gray-600 mb-6">
          No worries! Your payment was canceled and you haven't been charged. 
          You can try again anytime or continue with the free plan.
        </p>

        {/* Reassurance */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            💡 <strong>Still interested?</strong> Premium features include unlimited receipt scanning, 
            AI categorization, and advanced analytics to help you master your finances.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/pricing')}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <RefreshCw size={16} className="mr-2" />
            Try Again
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            <ArrowLeft size={16} className="mr-2" />
            Continue with Free Plan
          </button>
        </div>

        {/* Support */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-3">
            Have questions about our plans?
          </p>
          <a 
            href="mailto:support@xspensesai.com" 
            className="inline-flex items-center text-sm text-blue-600 hover:underline"
          >
            <Mail size={14} className="mr-1" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}