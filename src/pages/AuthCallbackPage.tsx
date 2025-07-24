import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

// Flag to enable mock mode - set to true when testing without Supabase
const useMock = true;

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Signing you in...');
  const [longWait, setLongWait] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔍 Auth callback page loaded');
        console.log('🔍 Current URL:', window.location.href);

        // If mock mode is enabled, skip Supabase auth and redirect to dashboard
        if (useMock) {
          console.log('🔍 Mock mode enabled, redirecting to dashboard');
          setMessage('Mock mode enabled. Redirecting to dashboard...');
          
          // Short delay to show the message
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1000);
          
          return;
        }

        // Set a timeout to show a message if auth takes too long
        const timeoutId = setTimeout(() => {
          setLongWait(true);
          setMessage('Still signing in... hang tight.');
        }, 5000);

        // Check for session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('🔐 Session:', session);
        console.log('⚠️ Error:', error);

        clearTimeout(timeoutId);

        if (error) {
          console.error('❌ Session error:', error);
          setError('Authentication failed. Please try again.');
          toast.error('Authentication failed. Please try again.');
          setTimeout(() => {
            navigate('/login?error=auth_failed', { replace: true });
          }, 2000);
          return;
        }

        if (session?.user) {
          console.log('✅ Authentication successful:', session.user.email);
          
          // Update user profile
          try {
            await supabase
              .from('profiles')
              .upsert({
                id: session.user.id,
                last_login_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'id'
              });
          } catch (profileError) {
            console.error('Error updating profile:', profileError);
          }
          
          // Get intended path or go to dashboard
          const intendedPath = sessionStorage.getItem('xspensesai-intended-path');
          
          setMessage('Success! Redirecting to dashboard...');
          
          // Small delay to show success message
          setTimeout(() => {
            // Navigate to the intended path or dashboard
            navigate(intendedPath || '/dashboard', { replace: true });
          }, 1000);
        } else {
          console.log('⚠️ No session found');
          setError('No session found. Please try signing in again.');
          toast.error('No session found. Please try signing in again.');
          setTimeout(() => {
            navigate('/login?error=no_session', { replace: true });
          }, 2000);
        }

        // Fallback timeout - redirect to dashboard after 5 seconds regardless
        const fallbackTimeoutId = setTimeout(() => {
          console.log('⚠️ Fallback timeout triggered, redirecting to dashboard');
          navigate('/dashboard', { replace: true });
        }, 5000);

        return () => {
          clearTimeout(fallbackTimeoutId);
        };
      } catch (err) {
        console.error('❌ Callback error:', err);
        setError('An unexpected error occurred. Please try again.');
        toast.error('An unexpected error occurred. Please try again.');
        setTimeout(() => {
          navigate('/login?error=unexpected', { replace: true });
        }, 2000);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-8  w-full bg-white rounded-xl shadow-xl"
      >
        {error ? (
          <>
            <div className="text-error-600 text-5xl mb-6">⚠️</div>
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Authentication Error
            </h2>
            <p className="text-gray-600 mb-4">
              {error}
            </p>
            <div className="animate-pulse">
              Redirecting to login...
            </div>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500  mb-6"></div>
            
            <h2 className="text-xl font-semibold mb-2 text-gray-900">
              {message}
            </h2>
            
            <p className="text-gray-600">
              This should only take a moment.
            </p>

            {longWait && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-700"
              >
                <p className="font-medium mb-2">Taking longer than expected?</p>
                <p>This can happen on slower connections or when using mobile data.</p>
                <button 
                  onClick={() => navigate('/dashboard', { replace: true })}
                  className="mt-3 text-primary-600 font-medium hover:underline"
                >
                  Go to Dashboard
                </button>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
