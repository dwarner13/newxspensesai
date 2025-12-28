import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { isDemoMode, setGuestSession } from '../lib/demoAuth';
import Logo from '../components/common/Logo';
import { AppBackground } from '../components/layout/AppBackground';
import { Button } from '../components/ui/button';
import styles from './LoginPage.module.css';

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
      <AppBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
      </AppBackground>
    );
  }

  const hasError = searchParams.get('error') || error;
  const intendedPath = sessionStorage.getItem('xspensesai-intended-path');

  return (
    <AppBackground className={styles.loginCompact}>
      {/* Fade-in animation on page load */}
      <div 
        className="min-h-[100dvh] w-full overflow-y-auto"
        style={{ animation: 'fadeIn 250ms ease-out forwards' }}
      >
      {/* Top navigation - Logo and Back to Home */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 sm:px-6 lg:px-8 pt-6 md:pt-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo size="md" showText={true} linkTo="/" />
          {/* Back to Home Chip - Icon-only on desktop, expands on hover */}
          <Link
            to="/"
            className="group relative inline-flex items-center rounded-full px-2 md:px-2 md:group-hover:px-3 py-1.5 bg-white/5 border border-white/10 backdrop-blur-sm text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent shadow-sm hover:shadow-md"
            title="Back to Home"
          >
            <ArrowLeft className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:block text-xs font-medium whitespace-nowrap max-w-0 md:group-hover:max-w-[50px] overflow-hidden opacity-0 md:group-hover:opacity-100 transition-all duration-200 ml-0 md:group-hover:ml-1.5">
              Back
            </span>
            <span className="md:hidden text-xs font-medium ml-1.5">Back</span>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="relative min-h-[100dvh] w-full flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 md:py-0 pb-16 md:pb-20">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            
            {/* Left Panel - Brand Messaging (Desktop Only) */}
            <div className="hidden md:block space-y-6 md:space-y-8 pr-8">
              <div className="space-y-4 md:space-y-6">
                <h1 className={`text-5xl lg:text-6xl font-bold text-white leading-tight ${styles.heroTitle}`}>
                  AI that handles money{' '}
                  <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                    safely
                  </span>
                </h1>
                <p className={`text-lg md:text-xl text-white/70 leading-relaxed ${styles.heroText}`}>
                  Your intelligent financial assistant. Automate expense tracking, get insights, and make smarter decisions with AI-powered finance management.
                </p>
              </div>
              
              <div className={`space-y-3 md:space-y-4 pt-6 md:pt-8 ${styles.featureList}`}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Bank-level Security</h3>
                    <p className="text-white/60">Your data is encrypted and protected with enterprise-grade security.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">AI-Powered Insights</h3>
                    <p className="text-white/60">Get intelligent recommendations and automated expense categorization.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Save Time & Money</h3>
                    <p className="text-white/60">Automate your financial workflows and focus on what matters most.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Login Card */}
            <div className="w-full flex items-center justify-center">
              <div className="w-full max-w-md max-h-[calc(100vh-120px)] md:max-h-none overflow-auto md:overflow-visible">
                {/* Glass Card - Matching Dashboard Style */}
                <div className="relative">
                  {/* Glass effect - matching dashboard cards */}
                  <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"></div>
                  
                  {/* Content */}
                  <div className={`relative p-6 lg:p-8 space-y-6 md:space-y-8 ${styles.authCard}`}>
                    {/* Header */}
                    <div className="space-y-2 md:space-y-3 text-center md:text-left">
                      <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                        {isRegister ? 'Create your account' : 'Welcome back'}
                      </h2>
                      <p className="text-white/70 text-sm md:text-base">
                        {isRegister 
                          ? 'Join thousands of users managing their finances' 
                          : 'Sign in to continue to XspensesAI'}
                      </p>
                      
                      {intendedPath && intendedPath !== '/' && (
                        <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                          <p className="text-sm text-cyan-400">
                            Sign in to continue to your previous page
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Error Message */}
                    {hasError && (
                      <div className="bg-red-500/10 border border-red-500/20 text-white p-4 rounded-xl flex items-start gap-3">
                        <AlertTriangle size={20} className="flex-shrink-0 mt-0.5 text-red-400" />
                        <div>
                          <p className="font-medium text-red-300">Sign in failed</p>
                          <p className="text-sm mt-1 text-red-200/80">
                            {typeof hasError === 'string' ? hasError : 'Please try signing in again. If the problem persists, contact support.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* SSO Buttons */}
                    <div className={`space-y-2 md:space-y-3 ${styles.buttonStack}`}>
                      {isDemoMode() ? (
                        <button
                          className="w-full flex justify-center items-center px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-transparent"
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
                            className="w-full flex justify-center items-center gap-3 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/8 border border-white/10 text-white font-medium transition-all duration-200 hover:scale-[1.02] hover:border-white/20 hover:shadow-lg hover:shadow-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
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
                            className="w-full flex justify-center items-center gap-3 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/8 border border-white/10 text-white font-medium transition-all duration-200 hover:scale-[1.02] hover:border-white/20 hover:shadow-lg hover:shadow-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                          >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
                            </svg>
                            Continue with Apple
                          </button>
                        </>
                      )}
                    </div>

                    {/* Divider */}
                    <div className={`relative ${styles.dividerSpacing}`}>
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-transparent text-white/60">OR</span>
                      </div>
                    </div>

                    {/* Email/Password Form */}
                    <form className={`space-y-4 md:space-y-5 ${styles.formStack}`} onSubmit={handleEmailSignIn}>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
                          Email address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail size={18} className="text-white/40" />
                          </div>
                          <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full pl-12 pr-4 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400/50 transition-all text-sm"
                            placeholder="you@example.com"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label htmlFor="password" className="block text-sm font-medium text-white/70">
                            Password
                          </label>
                          {!isRegister && (
                            <Link
                              to="/reset-password"
                              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                            >
                              Forgot password?
                            </Link>
                          )}
                        </div>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock size={18} className="text-white/40" />
                          </div>
                          <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete={isRegister ? "new-password" : "current-password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full pl-12 pr-12 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400/50 transition-all text-sm"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-white/70 focus:outline-none transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {isRegister && (
                        <>
                          <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/70 mb-2">
                              Confirm Password
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock size={18} className="text-white/40" />
                              </div>
                              <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="block w-full pl-12 pr-4 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400/50 transition-all text-sm"
                                placeholder="••••••••"
                              />
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <input
                              id="stayUpdated"
                              name="stayUpdated"
                              type="checkbox"
                              checked={stayUpdated}
                              onChange={(e) => setStayUpdated(e.target.checked)}
                              className="h-5 w-5 mt-0.5 text-cyan-600 focus:ring-cyan-400 border-white/20 rounded bg-white/5 focus:ring-2 focus:ring-offset-0"
                            />
                            <label htmlFor="stayUpdated" className="block text-sm text-white/70 leading-relaxed">
                              Keep me updated with news and updates
                            </label>
                          </div>
                        </>
                      )}

                      <div>
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          size="lg"
                          className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/30 transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0 border-0"
                        >
                          {isSubmitting ? (
                            <>
                              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </>
                          ) : isRegister ? (
                            <>
                              Create an account
                              <ArrowRight size={18} />
                            </>
                          ) : (
                            <>
                              Sign in
                              <ArrowRight size={18} />
                            </>
                          )}
                        </Button>
                      </div>
                    </form>

                    {/* Toggle Register/Login */}
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setIsRegister(!isRegister)}
                        className="text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                      </button>
                    </div>

                    {/* Terms */}
                    <div className="pt-4 border-t border-white/10">
                      <div className="text-center text-xs text-white/60 leading-relaxed">
                        <p>
                          By signing in, you agree to our{' '}
                          <Link to="/terms" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                            Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link to="/privacy" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                            Privacy Policy
                          </Link>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </AppBackground>
  );
}
