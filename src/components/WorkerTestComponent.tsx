import React, { useState } from 'react';
import { AIService } from '../services/AIService';
import { workerService } from '../services/WorkerService';

interface TestResult {
  status: 'idle' | 'testing' | 'success' | 'error';
  message: string;
  details?: any;
}

export const WorkerTestComponent: React.FC = () => {
  const [testResult, setTestResult] = useState<TestResult>({ status: 'idle', message: 'Ready to test' });
  const [isTesting, setIsTesting] = useState(false);

  const testWorkerConnection = async () => {
    setIsTesting(true);
    setTestResult({ status: 'testing', message: 'Testing worker connection...' });

    try {
      // Test 1: Health check
      setTestResult({ status: 'testing', message: 'Checking worker health...' });
      const isHealthy = await AIService.checkWorkerHealth();
      
      if (!isHealthy) {
        throw new Error('Worker is not responding to health checks');
      }

      // Test 2: Queue stats
      setTestResult({ status: 'testing', message: 'Getting queue statistics...' });
      const queueStats = await workerService.getQueueStats();

      setTestResult({
        status: 'success',
        message: 'Worker backend is connected and healthy!',
        details: {
          health: 'OK',
          queueStats
        }
      });

    } catch (error) {
      setTestResult({
        status: 'error',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    } finally {
      setIsTesting(false);
    }
  };

  const testFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsTesting(true);
    setTestResult({ status: 'testing', message: `Testing file upload: ${file.name}...` });

    try {
      // Test file upload
      const result = await AIService.uploadDocument(file, 'test-user', 'bank_statement', true);
      
      setTestResult({
        status: 'success',
        message: `File uploaded successfully! Job ID: ${result.document_id}`,
        details: result
      });

      // Test polling (just once to see if it works)
      setTestResult({ status: 'testing', message: 'Testing job status polling...' });
      
      const jobStatus = await AIService.getJobStatus(result.document_id);
      
      setTestResult({
        status: 'success',
        message: 'File upload and polling working!',
        details: {
          upload: result,
          initialStatus: jobStatus
        }
      });

    } catch (error) {
      setTestResult({
        status: 'error',
        message: `File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Worker Backend Test</h2>
      
      {/* Connection Test */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">1. Connection Test</h3>
        <button
          onClick={testWorkerConnection}
          disabled={isTesting}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isTesting ? 'Testing...' : 'Test Worker Connection'}
        </button>
      </div>

      {/* File Upload Test */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">2. File Upload Test</h3>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.csv"
          onChange={testFileUpload}
          disabled={isTesting}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
        <p className="text-sm text-gray-600 mt-1">
          Upload a PDF bank statement or image to test the complete pipeline
        </p>
      </div>

      {/* Results */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Test Results</h3>
        <div className={`p-4 rounded-lg ${
          testResult.status === 'success' ? 'bg-green-100 text-green-800' :
          testResult.status === 'error' ? 'bg-red-100 text-red-800' :
          testResult.status === 'testing' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          <p className="font-medium">{testResult.message}</p>
          {testResult.details && (
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify(testResult.details, null, 2)}
            </pre>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600">
        <h4 className="font-semibold mb-2">Instructions:</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>Make sure your worker backend is running on port 8080</li>
          <li>Click "Test Worker Connection" to verify the API is accessible</li>
          <li>Upload a PDF or image file to test the complete processing pipeline</li>
          <li>Check the browser console for detailed logs</li>
        </ol>
      </div>
    </div>
  );
};
