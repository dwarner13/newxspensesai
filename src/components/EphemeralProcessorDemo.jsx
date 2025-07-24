import React, { useState } from 'react';
import EphemeralDocumentProcessor from './EphemeralDocumentProcessor';

const EphemeralProcessorDemo = () => {
    const [demoUser] = useState({
        id: 1,
        name: 'Demo User',
        tier: 'premium'
    });

    const [processingHistory, setProcessingHistory] = useState([]);

    const handleProcessingComplete = (result) => {
        const historyItem = {
            id: Date.now(),
            timestamp: new Date(),
            sessionId: result.sessionId,
            documentType: result.documentType || 'unknown',
            privacyStatus: result.privacyStatus
        };
        
        setProcessingHistory(prev => [historyItem, ...prev.slice(0, 4)]);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        🔒 Ephemeral Document Processor Demo
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Experience the future of privacy-first financial document processing. 
                        All data is processed in memory only and permanently deleted after analysis.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Ephemeral Processor */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            🔒 Secure Processing
                        </h2>
                        <EphemeralDocumentProcessor 
                            onProcessingComplete={handleProcessingComplete}
                            user={demoUser}
                        />
                    </div>

                    {/* Demo Info & Privacy Features */}
                    <div className="space-y-6">
                        {/* Privacy Features */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                🛡️ Privacy-First Features
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-sm">1</div>
                                    <div>
                                        <div className="font-medium text-gray-900">Memory-Only Processing</div>
                                        <div className="text-sm text-gray-600">All data processed in RAM, never written to disk</div>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">2</div>
                                    <div>
                                        <div className="font-medium text-gray-900">Automatic Cleanup</div>
                                        <div className="text-sm text-gray-600">Guaranteed deletion of all temporary data</div>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-sm">3</div>
                                    <div>
                                        <div className="font-medium text-gray-900">Session Isolation</div>
                                        <div className="text-sm text-gray-600">Each processing session is completely isolated</div>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">4</div>
                                    <div>
                                        <div className="font-medium text-gray-900">No Data Retention</div>
                                        <div className="text-sm text-gray-600">Zero data stored after processing completes</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security Benefits */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                🔐 Security Benefits
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center space-x-2">
                                    <span className="text-green-600">✅</span>
                                    <span>No data breaches</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-green-600">✅</span>
                                    <span>GDPR compliant</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-green-600">✅</span>
                                    <span>CCPA compliant</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-green-600">✅</span>
                                    <span>HIPAA ready</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-green-600">✅</span>
                                    <span>SOX compliant</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-green-600">✅</span>
                                    <span>Zero trust</span>
                                </div>
                            </div>
                        </div>

                        {/* Processing History */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                📋 Processing History
                            </h3>
                            <div className="space-y-3">
                                {processingHistory.length === 0 ? (
                                    <div className="text-center text-gray-500 py-4">
                                        <div className="text-2xl mb-2">📄</div>
                                        <p>No documents processed yet</p>
                                        <p className="text-sm">Upload a document to see processing history</p>
                                    </div>
                                ) : (
                                    processingHistory.map((item) => (
                                        <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-medium text-gray-900 capitalize">
                                                        {item.documentType.replace('_', ' ')}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        {item.timestamp.toLocaleTimeString()}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-green-600 text-sm">✅ Deleted</div>
                                                    <div className="text-xs text-gray-500">
                                                        {item.sessionId.slice(-8)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* How It Works */}
                <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
                        🔒 How Ephemeral Processing Works
                    </h3>
                    <div className="grid md:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl">📄</span>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-2">1. Upload</h4>
                            <p className="text-sm text-gray-600">Document uploaded to memory only</p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl">🤖</span>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-2">2. Process</h4>
                            <p className="text-sm text-gray-600">AI analysis in isolated memory</p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl">📊</span>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-2">3. Results</h4>
                            <p className="text-sm text-gray-600">Insights generated and returned</p>
                        </div>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-2xl">🗑️</span>
                            </div>
                            <h4 className="font-medium text-gray-900 mb-2">4. Delete</h4>
                            <p className="text-sm text-gray-600">All data permanently deleted</p>
                        </div>
                    </div>
                </div>

                {/* Privacy Compliance */}
                <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                        🛡️ Privacy Compliance
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-lg p-4 text-center">
                            <div className="text-2xl mb-2">🇪🇺</div>
                            <h4 className="font-medium text-gray-900 mb-2">GDPR Compliant</h4>
                            <p className="text-sm text-gray-600">Right to be forgotten guaranteed</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center">
                            <div className="text-2xl mb-2">🇺🇸</div>
                            <h4 className="font-medium text-gray-900 mb-2">CCPA Compliant</h4>
                            <p className="text-sm text-gray-600">California privacy standards met</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center">
                            <div className="text-2xl mb-2">🏥</div>
                            <h4 className="font-medium text-gray-900 mb-2">HIPAA Ready</h4>
                            <p className="text-sm text-gray-600">Healthcare data protection</p>
                        </div>
                    </div>
                </div>

                {/* Demo Instructions */}
                <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        🎯 Demo Instructions
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6 text-sm">
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">1. Test Privacy</h4>
                            <p className="text-gray-600">Click "Verify Privacy" to see compliance status</p>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">2. Upload Document</h4>
                            <p className="text-gray-600">Upload any financial document to test processing</p>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">3. Monitor Cleanup</h4>
                            <p className="text-gray-600">Watch as data is automatically deleted after processing</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EphemeralProcessorDemo; 