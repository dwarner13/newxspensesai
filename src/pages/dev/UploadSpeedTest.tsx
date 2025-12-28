/**
 * Upload Speed Test Page
 * 
 * Tests upload speed by uploading generated test files (5MB and 20MB)
 * Measures throughput (Mbps) and latency.
 * Auto-deletes test objects after success.
 */

import { useState } from 'react';
import { Upload, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SpeedTestResult {
  fileSize: number; // bytes
  uploadTime: number; // milliseconds
  speed: number; // Mbps
  latency: number; // milliseconds
  timestamp: string;
}

const TEST_SIZES = [
  { name: '5MB', size: 5 * 1024 * 1024 },
  { name: '20MB', size: 20 * 1024 * 1024 },
];

export default function UploadSpeedTest() {
  const { supabase } = useAuth();
  const [results, setResults] = useState<SpeedTestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load last result from localStorage (SSR-safe)
  const loadLastResult = () => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('upload_speed_test_last_result');
      if (stored) {
        return JSON.parse(stored) as SpeedTestResult[];
      }
    } catch (e) {
      console.warn('[UploadSpeedTest] Failed to load last result:', e);
    }
    return null;
  };

  const [lastResult] = useState<SpeedTestResult[] | null>(loadLastResult());

  const generateTestFile = (size: number): Blob => {
    // Generate random binary data
    const buffer = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      buffer[i] = Math.floor(Math.random() * 256);
    }
    return new Blob([buffer], { type: 'application/octet-stream' });
  };

  const testUpload = async (size: number, name: string): Promise<SpeedTestResult> => {
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Generate test file
    const testFile = generateTestFile(size);
    const fileName = `speed-test-${name.toLowerCase()}-${Date.now()}.bin`;

    // Step 1: Initialize upload
    const initStart = Date.now();
    const initRes = await fetch('/.netlify/functions/smart-import-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        filename: fileName,
        mime: 'application/octet-stream',
        source: 'speed-test',
      }),
    });

    if (!initRes.ok) {
      throw new Error(`Init failed: ${initRes.statusText}`);
    }

    const init = await initRes.json();
    const initLatency = Date.now() - initStart;

    // Step 2: Upload file with timing
    const uploadStart = Date.now();
    const uploadRes = await fetch(init.url, {
      method: 'PUT',
      headers: {
        'x-upsert': 'true',
        'authorization': `Bearer ${init.token}`,
        'content-type': 'application/octet-stream',
      },
      body: testFile,
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed: ${uploadRes.statusText}`);
    }

    const uploadTime = Date.now() - uploadStart;
    const totalTime = Date.now() - initStart;

    // Calculate speed (Mbps)
    const bitsUploaded = size * 8;
    const secondsElapsed = uploadTime / 1000;
    const speed = secondsElapsed > 0 ? bitsUploaded / (secondsElapsed * 1024 * 1024) : 0;

    // Step 3: Cleanup - delete test file
    try {
      await supabase.storage
        .from('docs')
        .remove([init.path]);
    } catch (cleanupError) {
      console.warn('[UploadSpeedTest] Failed to cleanup test file:', cleanupError);
      // Don't fail test if cleanup fails
    }

    // Step 4: Delete document record
    try {
      await supabase
        .from('user_documents')
        .delete()
        .eq('id', init.docId);
    } catch (cleanupError) {
      console.warn('[UploadSpeedTest] Failed to cleanup document record:', cleanupError);
    }

    return {
      fileSize: size,
      uploadTime,
      speed,
      latency: initLatency,
      timestamp: new Date().toISOString(),
    };
  };

  const runTests = async () => {
    setTesting(true);
    setError(null);
    setResults([]);

    try {
      const testResults: SpeedTestResult[] = [];

      for (const test of TEST_SIZES) {
        setCurrentTest(test.name);
        try {
          const result = await testUpload(test.size, test.name);
          testResults.push(result);
          setResults([...testResults]);
        } catch (testError: any) {
          console.error(`[UploadSpeedTest] Test ${test.name} failed:`, testError);
          setError(`Test ${test.name} failed: ${testError.message}`);
          break;
        }
      }

      // Store results in localStorage (SSR-safe)
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('upload_speed_test_last_result', JSON.stringify(testResults));
        } catch (e) {
          console.warn('[UploadSpeedTest] Failed to store results:', e);
        }
      }

    } catch (err: any) {
      setError(err.message || 'Speed test failed');
    } finally {
      setTesting(false);
      setCurrentTest(null);
    }
  };

  const formatSpeed = (mbps: number): string => {
    if (mbps >= 1000) {
      return `${(mbps / 1000).toFixed(2)} Gbps`;
    }
    return `${mbps.toFixed(2)} Mbps`;
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Upload Speed Test</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          This test uploads generated test files (5MB and 20MB) to measure your upload speed.
          Test files are automatically deleted after the test completes.
        </p>

        <button
          onClick={runTests}
          disabled={testing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {testing ? (
            <>
              <Loader className="animate-spin" size={16} />
              Testing {currentTest}...
            </>
          ) : (
            <>
              <Upload size={16} />
              Run Speed Test
            </>
          )}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded flex items-center gap-2">
            <XCircle className="text-red-600" size={20} />
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        )}
      </div>

      {/* Current Results */}
      {results.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{formatSize(result.fileSize)}</span>
                  <CheckCircle className="text-green-600" size={20} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Speed:</span>
                    <span className="ml-2 font-semibold">{formatSpeed(result.speed)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Upload Time:</span>
                    <span className="ml-2 font-semibold">{formatTime(result.uploadTime)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Latency:</span>
                    <span className="ml-2 font-semibold">{formatTime(result.latency)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Timestamp:</span>
                    <span className="ml-2 font-semibold text-xs">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Result */}
      {lastResult && lastResult.length > 0 && results.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Last Test Results</h2>
          <div className="space-y-4">
            {lastResult.map((result, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{formatSize(result.fileSize)}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(result.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Speed:</span>
                    <span className="ml-2 font-semibold">{formatSpeed(result.speed)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Upload Time:</span>
                    <span className="ml-2 font-semibold">{formatTime(result.uploadTime)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

