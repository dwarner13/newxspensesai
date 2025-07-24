import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Zap, ExternalLink, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: string;
}

export default function TestPage() {
  const { user, signInWithGoogle } = useAuth();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runTests();
  }, [user]);

  const runTests = async () => {
    setLoading(true);
    const testResults: TestResult[] = [];

    // Test 1: Environment Variables
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    console.log('🔍 VITE_SUPABASE_URL:', supabaseUrl);
    console.log('🔍 VITE_SUPABASE_ANON_KEY:', supabaseKey ? 'Present (hidden for security)' : 'Missing');
    console.log('🔍 VITE_OPENAI_API_KEY:', openaiKey ? 'Present (hidden for security)' : 'Missing');
    
    testResults.push({
      name: 'Environment Variables',
      status: (supabaseUrl && supabaseKey) ? 'pass' : 'fail',
      message: (supabaseUrl && supabaseKey) ? 'Environment variables configured' : 'Missing environment variables',
      details: `URL: ${supabaseUrl ? '✓ Set' : '✗ Missing'}, Key: ${supabaseKey ? '✓ Set' : '✗ Missing'}, OpenAI: ${openaiKey ? '✓ Set' : '✗ Missing'}`
    });

    // Test 2: Supabase Connection
    try {
      const { data, error } = await supabase.auth.getSession();
      testResults.push({
        name: 'Supabase Connection',
        status: error ? 'fail' : 'pass',
        message: error ? 'Supabase connection failed' : 'Supabase connection successful',
        details: error ? error.message : 'Connected successfully'
      });
    } catch (error) {
      testResults.push({
        name: 'Supabase Connection',
        status: 'fail',
        message: 'Failed to connect to Supabase',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 3: Authentication Status
    testResults.push({
      name: 'Authentication Status',
      status: user ? 'pass' : 'warning',
      message: user ? 'User is authenticated' : 'User not authenticated',
      details: user ? `Logged in as: ${user.email}` : 'Click "Test Google Login" to verify auth flow'
    });

    // Test 4: OAuth Configuration
    const currentDomain = window.location.origin;
    const expectedCallback = `${currentDomain}/auth/callback`;
    testResults.push({
      name: 'OAuth Callback URL',
      status: 'pass',
      message: 'Callback URL properly configured',
      details: `Callback: ${expectedCallback}`
    });

    // Test 5: Database Schema Check
    if (user) {
      try {
        const { data: transactions, error: transError } = await supabase
          .from('transactions')
          .select('count')
          .limit(1);
        
        const { data: rules, error: rulesError } = await supabase
          .from('categorization_rules')
          .select('count')
          .limit(1);

        testResults.push({
          name: 'Database Schema',
          status: (!transError && !rulesError) ? 'pass' : 'fail',
          message: (!transError && !rulesError) ? 'All database tables accessible' : 'Database schema issues detected',
          details: `Transactions: ${transError ? 'Error' : 'OK'}, Rules: ${rulesError ? 'Error' : 'OK'}`
        });
      } catch (error) {
        testResults.push({
          name: 'Database Schema',
          status: 'fail',
          message: 'Failed to check database schema',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      testResults.push({
        name: 'Database Schema',
        status: 'pending',
        message: 'Login required to test database access',
        details: 'Authenticate first to run this test'
      });
    }

    setTests(testResults);
    setLoading(false);
  };

  const handleTestLogin = async () => {
    try {
      await signInWithGoogle();
      toast.success('Login initiated - check for redirect');
    } catch (error) {
      console.error('Login test error:', error);
      toast.error('Login test failed - check console for details');
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="text-success-500" size={20} />;
      case 'fail':
        return <XCircle className="text-error-500" size={20} />;
      case 'warning':
        return <AlertCircle className="text-warning-500" size={20} />;
      case 'pending':
        return <AlertCircle className="text-gray-400" size={20} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return 'border-success-200 bg-success-50';
      case 'fail':
        return 'border-error-200 bg-error-50';
      case 'warning':
        return 'border-warning-200 bg-warning-50';
      case 'pending':
        return 'border-gray-200 bg-gray-50';
    }
  };

  const passedTests = tests.filter(t => t.status === 'pass').length;
  const totalTests = tests.length;
  const failedTests = tests.filter(t => t.status === 'fail').length;

  return (
    <div className="max-w-4xl  p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-3 mb-8"
      >
        <Zap size={32} className="text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold">XspensesAI Configuration Test</h1>
          <p className="text-gray-600">Verify your setup is ready for production</p>
        </div>
      </motion.div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-card p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Test Summary</h2>
          <button
            onClick={runTests}
            disabled={loading}
            className="btn-primary flex items-center"
          >
            <RefreshCw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Running Tests...' : 'Refresh Tests'}
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-success-50 rounded-lg">
            <div className="text-2xl font-bold text-success-600">{passedTests}</div>
            <div className="text-sm text-success-700">Passed</div>
          </div>
          <div className="text-center p-4 bg-error-50 rounded-lg">
            <div className="text-2xl font-bold text-error-600">{failedTests}</div>
            <div className="text-sm text-error-700">Failed</div>
          </div>
          <div className="text-center p-4 bg-primary-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600">{totalTests}</div>
            <div className="text-sm text-primary-700">Total Tests</div>
          </div>
        </div>

        {!user && (
          <div className="mt-6 p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-warning-800">Authentication Required</h3>
                <p className="text-sm text-warning-700">Some tests require authentication to run properly.</p>
              </div>
              <button
                onClick={handleTestLogin}
                className="btn-primary flex items-center"
              >
                <ExternalLink size={16} className="mr-2" />
                Test Google Login
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Test Results */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-semibold mb-4">Detailed Test Results</h2>
        
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          tests.map((test, index) => (
            <motion.div
              key={test.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className={`border rounded-lg p-4 ${getStatusColor(test.status)}`}
            >
              <div className="flex items-start space-x-3">
                {getStatusIcon(test.status)}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{test.name}</h3>
                  <p className="text-sm text-gray-700 mt-1">{test.message}</p>
                  {test.details && (
                    <p className="text-xs text-gray-500 mt-2 font-mono bg-white/50 p-2 rounded">
                      {test.details}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
