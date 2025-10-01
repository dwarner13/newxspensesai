import React, { useState, useEffect } from 'react';
import { AIService } from '../services/AIService';

const AIIntegrationTest = () => {
    const [status, setStatus] = useState('checking');
    const [testResult, setTestResult] = useState(null);

    useEffect(() => {
        runIntegrationTest();
    }, []);

    const runIntegrationTest = async () => {
        try {
            // Test 1: Health Check
            const isHealthy = await AIService.healthCheck();
            if (!isHealthy) {
                setStatus('failed');
                setTestResult('AI Backend is not connected');
                return;
            }

            // Test 2: Categorization
            const categorizationResult = await AIService.categorizeTransaction({
                description: 'STARBUCKS COFFEE',
                amount: -5.50,
                date: '2024-01-15'
            });

            setStatus('success');
            setTestResult({
                category: categorizationResult.category,
                confidence: categorizationResult.confidence,
                reasoning: categorizationResult.reasoning});

        } catch (error) {
            setStatus('failed');
            setTestResult(error.message);
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'success': return 'text-green-600 bg-green-100';
            case 'failed': return 'text-red-600 bg-red-100';
            default: return 'text-yellow-600 bg-yellow-100';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'success': return '✅';
            case 'failed': return '❌';
            default: return '⏳';
        }
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                🔧 AI Integration Test
            </h3>
            
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
                <span>{getStatusIcon()}</span>
                <span>
                    {status === 'checking' && 'Testing AI Connection...'}
                    {status === 'success' && 'AI Integration Working'}
                    {status === 'failed' && 'AI Integration Failed'}
                </span>
            </div>

            {testResult && status === 'success' && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Test Results:</h4>
                    <div className="space-y-1 text-sm text-green-800">
                        <div><strong>Category:</strong> {testResult.category}</div>
                        <div><strong>Confidence:</strong> {Math.round(testResult.confidence * 100)}%</div>
                        <div><strong>Reasoning:</strong> {testResult.reasoning}</div>
                    </div>
                </div>
            )}

            {testResult && status === 'failed' && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <h4 className="font-semibold text-red-900 mb-2">Error:</h4>
                    <p className="text-red-800 text-sm">{testResult}</p>
                </div>
            )}

            <button
                onClick={runIntegrationTest}
                className="mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
            >
                🔄 Re-run Test
            </button>
        </div>
    );
};

export default AIIntegrationTest; 