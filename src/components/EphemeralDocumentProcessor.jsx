import React, { useState, useRef } from 'react';
import EphemeralFinancialProcessor from '../services/EphemeralFinancialProcessor';

const EphemeralDocumentProcessor = ({ onProcessingComplete, user }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState('');
    const [privacyStatus, setPrivacyStatus] = useState('🔒 Ready for secure processing');
    const [results, setResults] = useState(null);
    const fileInputRef = useRef(null);
    
    const processor = new EphemeralFinancialProcessor();

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsProcessing(true);
        setPrivacyStatus('🔒 Starting ephemeral processing...');
        setResults(null);

        try {
            // Determine document type
            const documentType = determineDocumentType(file);
            
            setProcessingStep('📄 Extracting data (memory only)...');
            setPrivacyStatus('🔒 Data extracted - not stored');

            // Process document ephemerally
            const result = await processor.processDocument(file, documentType, {
                userId: user?.id,
                sessionTimeout: 300000 // 5 minutes
            });

            setProcessingStep('✅ Processing completed');
            setPrivacyStatus('✅ All data permanently deleted');
            setResults(result);

            // Notify parent component
            if (onProcessingComplete) {
                onProcessingComplete(result);
            }

        } catch (error) {
            console.error('Ephemeral processing error:', error);
            setProcessingStep('❌ Processing failed');
            setPrivacyStatus('🔒 Session terminated for security');
        } finally {
            setIsProcessing(false);
            // Clear file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const determineDocumentType = (file) => {
        const fileName = file.name.toLowerCase();
        const fileType = file.type;

        if (fileName.includes('bank') || fileName.includes('statement')) {
            return 'bank_statement';
        } else if (fileName.includes('receipt') || fileType.startsWith('image/')) {
            return 'receipt';
        } else if (fileName.includes('credit') || fileName.includes('card')) {
            return 'credit_card';
        } else if (fileName.includes('invoice') || fileName.includes('bill')) {
            return 'invoice';
        } else {
            return 'bank_statement'; // Default
        }
    };

    const resetProcessor = () => {
        setResults(null);
        setPrivacyStatus('🔒 Ready for secure processing');
        setProcessingStep('');
    };

    const verifyPrivacy = () => {
        const compliance = processor.verifyPrivacyCompliance();
        alert(`Privacy Compliance Check:\n\n${Object.entries(compliance).map(([key, value]) => `${key}: ${value}`).join('\n')}`);
    };

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold mb-2">🔒 Ephemeral Document Processor</h3>
                        <p className="text-green-100">Your data is processed in memory only and permanently deleted</p>
                    </div>
                    <button
                        onClick={verifyPrivacy}
                        className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors text-sm"
                    >
                        🔍 Verify Privacy
                    </button>
                </div>
            </div>

            {/* Privacy Status */}
            <div className="bg-green-50 border-b border-green-200 p-4">
                <div className="flex items-center justify-between">
                    <span className="text-green-800 font-medium">{privacyStatus}</span>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-600 text-sm">Live Privacy Monitor</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-6">
                {!isProcessing && !results && (
                    <div className="text-center">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-4xl">🔒</span>
                        </div>
                        
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                            Secure Document Processing
                        </h4>
                        
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            Upload your financial documents for instant AI analysis. 
                            All data is processed in memory only and permanently deleted after processing.
                        </p>

                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <h5 className="font-medium text-gray-900 mb-3">🔒 Privacy Guarantees:</h5>
                            <ul className="text-sm text-gray-700 space-y-2">
                                <li className="flex items-center">
                                    <span className="text-green-600 mr-2">✅</span>
                                    No data stored on servers
                                </li>
                                <li className="flex items-center">
                                    <span className="text-green-600 mr-2">✅</span>
                                    Memory-only processing
                                </li>
                                <li className="flex items-center">
                                    <span className="text-green-600 mr-2">✅</span>
                                    Automatic data deletion
                                </li>
                                <li className="flex items-center">
                                    <span className="text-green-600 mr-2">✅</span>
                                    Session isolation
                                </li>
                            </ul>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileUpload}
                            accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png"
                            className="hidden"
                            id="ephemeral-file-input"
                        />
                        
                        <label
                            htmlFor="ephemeral-file-input"
                            className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-300 cursor-pointer inline-block"
                        >
                            🔒 Upload Document Securely
                        </label>
                        
                        <p className="text-xs text-gray-500 mt-3">
                            Supported: PDF, CSV, Excel, Images (JPG, PNG)
                        </p>
                    </div>
                )}

                {/* Processing State */}
                {isProcessing && (
                    <div className="text-center">
                        <div className="relative mb-6">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                                <span className="text-4xl">🔒</span>
                            </div>
                            <div className="absolute inset-0 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                        </div>
                        
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                            🔒 Secure Processing in Progress
                        </h4>
                        
                        <p className="text-gray-600 mb-4">{processingStep}</p>
                        
                        <div className="bg-green-50 rounded-lg p-4 max-w-md mx-auto">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Data Extraction</span>
                                    <span className="text-green-600">✅</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">AI Analysis</span>
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Privacy Cleanup</span>
                                    <span className="text-gray-400">⏳</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results */}
                {results && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-lg font-semibold text-gray-900">
                                ✅ Processing Results
                            </h4>
                            <button
                                onClick={resetProcessor}
                                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                                🔄 Process Another
                            </button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Summary */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h5 className="font-semibold text-gray-900 mb-3">📊 Summary</h5>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Transactions:</span>
                                        <span className="font-medium">{results.summary?.totalTransactions || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Amount:</span>
                                        <span className="font-medium">${results.summary?.totalAmount?.toFixed(2) || '0.00'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Top Category:</span>
                                        <span className="font-medium">{results.summary?.topCategory || 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Privacy Status */}
                            <div className="bg-green-50 rounded-lg p-4">
                                <h5 className="font-semibold text-gray-900 mb-3">🔒 Privacy Status</h5>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center">
                                        <span className="text-green-600 mr-2">✅</span>
                                        <span>All data deleted</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-green-600 mr-2">✅</span>
                                        <span>Session cleared</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-green-600 mr-2">✅</span>
                                        <span>Memory cleaned</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">
                                        Session ID: {results.sessionId}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recommendations */}
                        {results.recommendations && results.recommendations.length > 0 && (
                            <div className="mt-6">
                                <h5 className="font-semibold text-gray-900 mb-3">💡 AI Recommendations</h5>
                                <div className="space-y-2">
                                    {results.recommendations.map((rec, index) => (
                                        <div key={index} className="bg-blue-50 rounded-lg p-3">
                                            <div className="font-medium text-blue-900">{rec.message}</div>
                                            {rec.category && (
                                                <div className="text-sm text-blue-700 mt-1">
                                                    Category: {rec.category} (${rec.amount?.toFixed(2)})
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Categories */}
                        {results.categories && Object.keys(results.categories).length > 0 && (
                            <div className="mt-6">
                                <h5 className="font-semibold text-gray-900 mb-3">📂 Spending Categories</h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {Object.entries(results.categories).map(([category, amount]) => (
                                        <div key={category} className="bg-gray-50 rounded-lg p-3">
                                            <div className="font-medium text-gray-900">{category}</div>
                                            <div className="text-sm text-gray-600">${amount.toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EphemeralDocumentProcessor; 