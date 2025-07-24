import React, { useState, useEffect } from 'react';
import DocumentUpload from './DocumentUpload';
import ReceiptCamera from './ReceiptCamera';

const SmartDocumentUpload = ({ onUploadComplete, user }) => {
    const [uploadMode, setUploadMode] = useState('choose'); // 'choose', 'file', 'camera'
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Detect if mobile device
        const checkMobile = () => {
            const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobile(mobile);
        };
        checkMobile();
    }, []);

    const handleUploadComplete = (data) => {
        onUploadComplete(data);
        setUploadMode('choose');
    };

    if (uploadMode === 'choose') {
        return (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 text-center">
                    <h2 className="text-3xl font-bold mb-2">📊 Add Your Financial Data</h2>
                    <p className="text-blue-100 text-lg">Choose how you'd like to upload your financial information</p>
                </div>

                {/* Upload Options */}
                <div className="p-8">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* File Upload Option */}
                        <div 
                            className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 cursor-pointer hover:shadow-lg"
                            onClick={() => setUploadMode('file')}
                        >
                            <div className="text-center mb-4">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <span className="text-3xl">📄</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Bank Statement</h3>
                                <p className="text-gray-600 mb-4">PDF, CSV, or Excel files</p>
                            </div>
                            
                            <div className="space-y-2 mb-6">
                                <div className="flex items-center text-sm text-gray-700">
                                    <span className="text-green-600 mr-2">✅</span>
                                    Multiple transactions
                                </div>
                                <div className="flex items-center text-sm text-gray-700">
                                    <span className="text-green-600 mr-2">✅</span>
                                    Complete monthly data
                                </div>
                                <div className="flex items-center text-sm text-gray-700">
                                    <span className="text-green-600 mr-2">✅</span>
                                    Fastest processing
                                </div>
                            </div>
                            
                            <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                                Choose Files
                            </button>
                        </div>

                        {/* Camera Upload Option - Mobile Only */}
                        {isMobile && (
                            <div 
                                className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 hover:border-green-400 transition-all duration-300 cursor-pointer hover:shadow-lg"
                                onClick={() => setUploadMode('camera')}
                            >
                                <div className="text-center mb-4">
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="text-3xl">📸</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Scan Receipt</h3>
                                    <p className="text-gray-600 mb-4">Take photo with camera</p>
                                </div>
                                
                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center text-sm text-gray-700">
                                        <span className="text-green-600 mr-2">✅</span>
                                        Instant capture
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <span className="text-green-600 mr-2">✅</span>
                                        Single transactions
                                    </div>
                                    <div className="flex items-center text-sm text-gray-700">
                                        <span className="text-green-600 mr-2">✅</span>
                                        On-the-go scanning
                                    </div>
                                </div>
                                
                                <button className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                                    Open Camera
                                </button>
                            </div>
                        )}

                        {/* Manual Entry Option */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200 hover:border-purple-400 transition-all duration-300 cursor-pointer hover:shadow-lg">
                            <div className="text-center mb-4">
                                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <span className="text-3xl">✏️</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Manual Entry</h3>
                                <p className="text-gray-600 mb-4">Type transaction details</p>
                            </div>
                            
                            <div className="space-y-2 mb-6">
                                <div className="flex items-center text-sm text-gray-700">
                                    <span className="text-green-600 mr-2">✅</span>
                                    Complete control
                                </div>
                                <div className="flex items-center text-sm text-gray-700">
                                    <span className="text-green-600 mr-2">✅</span>
                                    Add custom notes
                                </div>
                                <div className="flex items-center text-sm text-gray-700">
                                    <span className="text-green-600 mr-2">✅</span>
                                    No documents needed
                                </div>
                            </div>
                            
                            <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                                Enter Manually
                            </button>
                        </div>
                    </div>

                    {/* Pro Tips */}
                    <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <span className="text-2xl mr-2">💡</span>
                            Pro Tips:
                        </h4>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg p-4">
                                <div className="flex items-start">
                                    <span className="text-blue-600 text-xl mr-3">📄</span>
                                    <div>
                                        <strong className="text-gray-900">Bank Statements:</strong>
                                        <p className="text-sm text-gray-600 mt-1">Download from your bank's website for best results</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg p-4">
                                <div className="flex items-start">
                                    <span className="text-green-600 text-xl mr-3">📸</span>
                                    <div>
                                        <strong className="text-gray-900">Receipts:</strong>
                                        <p className="text-sm text-gray-600 mt-1">Ensure good lighting and text is clearly visible</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg p-4">
                                <div className="flex items-start">
                                    <span className="text-purple-600 text-xl mr-3">✏️</span>
                                    <div>
                                        <strong className="text-gray-900">Manual Entry:</strong>
                                        <p className="text-sm text-gray-600 mt-1">Perfect for cash transactions or quick additions</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (uploadMode === 'file') {
        return (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gray-50 p-4 border-b">
                    <button 
                        onClick={() => setUploadMode('choose')}
                        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <span className="text-xl mr-2">←</span>
                        Back to Options
                    </button>
                </div>
                <DocumentUpload onUploadComplete={handleUploadComplete} />
            </div>
        );
    }

    if (uploadMode === 'camera') {
        return (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gray-50 p-4 border-b">
                    <button 
                        onClick={() => setUploadMode('choose')}
                        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <span className="text-xl mr-2">←</span>
                        Back to Options
                    </button>
                </div>
                <ReceiptCamera 
                    onReceiptProcessed={handleUploadComplete}
                    user={user}
                />
            </div>
        );
    }

    return null;
};

export default SmartDocumentUpload; 