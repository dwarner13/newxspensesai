import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, Mail, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const CancelPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-red-50 flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className=" w-full bg-white rounded-xl shadow-xl p-8 text-center"
      >
        {/* Cancel Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center  mb-6"
        >
          <XCircle size={40} className="text-red-600" />
        </motion.div>

        {/* Cancel Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Canceled
          </h1>
          
          <p className="text-gray-600 mb-6">
            No worries! Your payment was canceled and you haven't been charged. 
            You can try again anytime or continue with the free plan.
          </p>
        </motion.div>

        {/* Reassurance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
        >
          <p className="text-sm text-blue-800">
            💡 <strong>Still interested?</strong> Premium features include unlimited receipt scanning, 
            AI categorization, and advanced analytics to help you master your finances.
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <Link
            to="/pricing"
            className="w-full btn-primary flex items-center justify-center"
          >
            <RefreshCw size={16} className="mr-2" />
            Try Again
          </Link>
          
          <Link
            to="/"
            className="w-full btn-outline flex items-center justify-center"
          >
            <ArrowLeft size={16} className="mr-2" />
            Continue with Free Plan
          </Link>
        </motion.div>

        {/* Support */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 pt-6 border-t border-gray-200"
        >
          <p className="text-xs text-gray-500 mb-3">
            Have questions about our plans?
          </p>
          <a 
            href="mailto:support@xspensesai.com" 
            className="inline-flex items-center text-sm text-primary-600 hover:underline"
          >
            <Mail size={14} className="mr-1" />
            Contact Support
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CancelPage;
