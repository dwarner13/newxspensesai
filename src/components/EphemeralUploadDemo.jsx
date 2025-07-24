import React, { useState } from 'react';
import EphemeralUploadComponent from './EphemeralUploadComponent';

const EphemeralUploadDemo = () => {
    const [demoStats, setDemoStats] = useState({
        totalProcessed: 0,
        totalDeleted: 0,
        privacyVerified: 0
    });

    const handleProcessingComplete = (result) => {
        setDemoStats(prev => ({
            ...prev,
            totalProcessed: prev.totalProcessed + 1,
            totalDeleted: prev.totalDeleted + 1
        }));
    };

    const verifyPrivacy = async () => {
        try {
            const response = await fetch('/api/verify-privacy');
            const compliance = await response.json();
            
            if (compliance.complianceStatus === '✅ PRIVACY COMPLIANT') {
                setDemoStats(prev => ({
                    ...prev,
                    privacyVerified: prev.privacyVerified + 1
                }));
                alert('✅ Privacy compliance verified!\n\nAll systems are operating with zero-storage guarantees.');
            }
        } catch (error) {
            alert('❌ Privacy verification failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        🔒 Ephemeral Upload Demo
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Experience the future of privacy-first document processing. 
                        Upload any financial document and watch as it's processed in memory only, 
                        then permanently deleted within seconds.
                    </p>
                </div>

                {/* Demo Stats */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                            {demoStats.totalProcessed}
                        </div>
                        <div className="text-gray-600">Documents Processed</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                        <div className="text-3xl font-bold text-red-600 mb-2">
                            {demoStats.totalDeleted}
                        </div>
                        <div className="text-gray-600">Data Deleted</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                            {demoStats.privacyVerified}
                        </div>
                        <div className="text-gray-600">Privacy Verified</div>
                    </div>
                </div>

                {/* Privacy Verification Button */}
                <div className="text-center mb-8">
                    <button
                        onClick={verifyPrivacy}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg"
                    >
                        🔍 Verify Privacy Compliance
                    </button>
                </div>

                {/* Ephemeral Upload Component */}
                <div className="mb-8">
                    <EphemeralUploadComponent onProcessingComplete={handleProcessingComplete} />
                </div>

                {/* How It Works */}
                <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                        🔒 How Ephemeral Processing Works
                    </h2>
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

                {/* Privacy Benefits */}
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            🛡️ Privacy Benefits
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                                    <span className="text-green-600 text-xs">✓</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">Zero Data Storage</h4>
                                    <p className="text-sm text-gray-600">No data is ever written to disk or databases</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                                    <span className="text-green-600 text-xs">✓</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">Memory-Only Processing</h4>
                                    <p className="text-sm text-gray-600">All analysis happens in RAM and is cleared immediately</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                                    <span className="text-green-600 text-xs">✓</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">Automatic Cleanup</h4>
                                    <p className="text-sm text-gray-600">Guaranteed deletion of all temporary data</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-1">
                                    <span className="text-green-600 text-xs">✓</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">Session Isolation</h4>
                                    <p className="text-sm text-gray-600">Each processing session is completely isolated</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            🔐 Security Features
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                                    <span className="text-blue-600 text-xs">🔒</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">GDPR Compliant</h4>
                                    <p className="text-sm text-gray-600">Right to be forgotten guaranteed</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                                    <span className="text-blue-600 text-xs">🔒</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">CCPA Compliant</h4>
                                    <p className="text-sm text-gray-600">California privacy standards met</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                                    <span className="text-blue-600 text-xs">🔒</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">HIPAA Ready</h4>
                                    <p className="text-sm text-gray-600">Healthcare data protection standards</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-1">
                                    <span className="text-blue-600 text-xs">🔒</span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-gray-900">Zero Trust</h4>
                                    <p className="text-sm text-gray-600">No persistent data storage anywhere</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Demo Instructions */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        🎯 Demo Instructions
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6 text-sm">
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">1. Test Privacy</h4>
                            <p className="text-gray-600">Click "Verify Privacy Compliance" to see compliance status</p>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">2. Upload Document</h4>
                            <p className="text-gray-600">Upload any financial document to test ephemeral processing</p>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-2">3. Monitor Cleanup</h4>
                            <p className="text-gray-600">Watch as data is automatically deleted after processing</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-12">
                    <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg p-6">
                        <h3 className="text-xl font-bold mb-2">
                            🔒 Your Privacy is Our Priority
                        </h3>
                        <p className="text-green-100">
                            Experience the most secure document processing available. 
                            Zero storage, instant deletion, complete privacy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EphemeralUploadDemo; 