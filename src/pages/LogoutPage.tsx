import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Zap, LogOut } from 'lucide-react';

export default function LogoutPage() {
  const { signOut } = useAuth();

  useEffect(() => {
    // Automatically sign out when this page loads
    const performLogout = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error('Logout error:', error);
        // Even if there's an error, redirect to login
        window.location.href = '/login';
      }
    };

    // Small delay to show the logout message
    const timer = setTimeout(performLogout, 1500);
    
    return () => clearTimeout(timer);
  }, [signOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center   p-8"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center  mb-6"
        >
          <LogOut size={32} className="text-primary-600" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-semibold mb-3 text-gray-800"
        >
          Signing You Out
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 text-gray-600"
        >
          Thanks for using XspensesAI! You're being signed out securely.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center space-x-2"
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
          <span className="text-sm text-gray-500">Clearing your session...</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg flex items-center justify-center space-x-2"
        >
          <Zap size={16} className="text-primary-500" />
          <span>See you next time!</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
