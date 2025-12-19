import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, Mail, Lock, Eye, EyeOff, Check, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { isDemoMode, setGuestSession } from '../lib/demoAuth';

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInWithApple } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [stayUpdated, setStayUpdated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      // Check for intended destination
      const intendedPath = sessionStorage.getItem('xspensesai-intended-path');
      const from = location.state?.from?.pathname;
      
      if (intendedPath && intendedPath !== '/login') {
        sessionStorage.removeItem('xspensesai-intended-path');
        navigate(intendedPath, { replace: true});
      } else if (from && from !== '/login') {
        navigate(from, { replace: true});
      } else {
        navigate('/', { replace: true});
      }
    }
  }, [user, navigate, location.state]);

  useEffect(() => {
    // Check for error parameters and show appropriate messages
    const error = searchParams.get('error');
    if (error) {
      let errorMessage = 'An error occurred during sign in.';
      
      switch (error) {
        case 'auth_failed':
          errorMessage = 'Authentication failed. Please try signing in again.';
          break;
        case 'no_session':
          errorMessage = 'Session could not be established. Please try again.';
          break;
        case 'unexpected':
          errorMessage = 'An unexpected error occurred. Please try again.';
          break;
        case 'redirect':
          errorMessage = 'Login redirect failed. Please try again.';
          break;
        case 'session_expired':
          errorMessage = 'Your session has expired. Please sign in again.';
          break;
      }
      
      toast.error(errorMessage);
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      console.log('Starting Google sign in...');
      await signInWithGoogle();
      // The redirect will happen automatically via the AuthContext
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to sign in with Google. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsSubmitting(true);
      console.log('Starting Apple sign in...');
      await signInWithApple();
      // The redirect will happen automatically via the AuthContext
    } catch (error) {
      console.error('Apple sign in error:', error);
      toast.error('Apple sign in failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      if (isRegister) {
        // Sign up with email
        console.log('Signing up with email:', email);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        
        if (error) throw error;
        
        if (data.user) {
          toast.success('Account created! Please check your email to confirm your account.');
          // Don't redirect yet - wait for email confirmation
        } else {
          toast.error('Failed to create account. Please try again.');
        }
      } else {
        // Sign in with email
        console.log('Signing in with email:', email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password});
        
        if (error) throw error;
        
        if (data.user) {
          toast.success('Signed in successfully!');
          // Redirect will happen via the useEffect above
        }
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
      toast.error('Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const hasError = searchParams.get('error') || error;
  const intendedPath = sessionStorage.getItem('xspensesai-intended-path');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div
        className=" w-full space-y-8 bg-gray-800 p-8 rounded-xl shadow-xl border border-gray-700"
      >
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6L18 18M18 6L6 18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <h2 className="mt-2 text-3xl font-extrabold text-white">
            {isRegister ? 'Create your account' : 'Sign in to XspensesAI'}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {isRegister 
              ? 'Join thousands of users managing their finances' 
              : 'Welcome back! Please enter your details'}
          </p>
          
          {intendedPath && intendedPath !== '/' && (
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-300">
                Sign in to continue to your previous page
              </p>
            </div>
          )}
        </div>

        {hasError && (
          <div
            className="bg-error-900 border border-error-800 text-white p-4 rounded-lg flex items-start space-x-3"
          >
            <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Sign in failed</p>
              <p className="text-sm mt-1">
                {typeof hasError === 'string' ? hasError : 'Please try signing in again. If the problem persists, contact support.'}
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-6">
          {/* Social Sign In Buttons */}
          <div className="grid grid-cols-1 gap-3">
            {isDemoMode() ? (
              <button
                className="w-full flex justify-center items-center px-4 py-3 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-primary-500 transition-colors"
                onClick={() => {
                  setGuestSession();
                  navigate('/dashboard', { replace: true });
                }}
              >
                Continue as Guest
              </button>
            ) : (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center px-4 py-3 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-primary-500 transition-colors"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  {isSubmitting && searchParams.get('provider') === 'google' ? 'Signing in...' : 'Sign in with Google'}
                </button>
                <button
                  onClick={handleAppleSignIn}
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center px-4 py-3 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-primary-500 transition-colors"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
                  </svg>
                  Continue with Apple
                </button>
              </>
            )}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">OR</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form className="space-y-6" onSubmit={handleEmailSignIn}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={16} className="text-gray-500" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                {!isRegister && (
                  <Link
                    to="/reset-password"
                    className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} className="text-gray-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-700 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="••••••••"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="text-gray-500 hover:text-gray-300 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {isRegister && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                  Confirm Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-gray-500" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-700 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {isRegister && (
              <div className="flex items-center">
                <input
                  id="stayUpdated"
                  name="stayUpdated"
                  type="checkbox"
                  checked={stayUpdated}
                  onChange={(e) => setStayUpdated(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-700 rounded"
                />
                <label htmlFor="stayUpdated" className="ml-2 block text-sm text-gray-300">
                  Keep me updated with news and updates
                </label>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-primary-500 transition-colors"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : isRegister ? (
                  <span className="flex items-center">
                    Create an account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                ) : (
                  <span className="flex items-center">
                    Log in
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                )}
              </button>
            </div>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm font-medium text-primary-400 hover:text-primary-300"
            >
              {isRegister ? 'Log in to XspensesAI instead' : 'Create an account'}
            </button>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-700 pt-6">
          <div className="text-center text-sm text-gray-400">
            <p>
              By signing in, you agree to our{' '}
              <Link to="/terms" className="text-primary-400 hover:text-primary-300">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-primary-400 hover:text-primary-300">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      <div
        className="mt-8 text-center"
      >
        <p className="text-sm text-gray-400">
          Don't have an account yet?{' '}
          <Link to="/signup" className="font-medium text-primary-400 hover:text-primary-300">
            Sign up for free
          </Link>
        </p>
        <p className="mt-2 text-xs text-gray-500">
          <Link to="/home" className="hover:text-gray-400 transition-colors">
            ← Back to homepage
          </Link>
        </p>
      </div>
    </div>
  );
}
