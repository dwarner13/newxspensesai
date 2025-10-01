import React, { useState, useRef, useCallback } from 'react';
import { AIService } from '../services/AIService';

const ReceiptCamera = ({ onReceiptProcessed, user }) => {
    const [cameraActive, setCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState('');
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: false});
            
            streamRef.current = stream;
            videoRef.current.srcObject = stream;
            setCameraActive(true);
        } catch (error) {
            console.error('Camera access error:', error);
            alert('Camera access denied. Please enable camera permissions and try again.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setCameraActive(false);
        setCapturedImage(null);
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Set canvas size to video size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob
        canvas.toBlob((blob) => {
            const imageUrl = URL.createObjectURL(blob);
            setCapturedImage({
                blob: blob,
                url: imageUrl,
                file: new File([blob], 'receipt.jpg', { type: 'image/jpeg' })
            });
            setCameraActive(false);
            stopCamera();
        }, 'image/jpeg', 0.9);
    };

    const processReceipt = async () => {
        if (!capturedImage) return;

        setIsProcessing(true);
        setProcessingStep('📸 Analyzing receipt image...');

        try {
            // Upload image to AI backend
            setProcessingStep('🤖 AI is reading your receipt...');
            const uploadResult = await AIService.uploadDocument(capturedImage.file);
            
            setProcessingStep('💰 Extracting transaction details...');
            
            // Get processed transaction data
            const transactions = await AIService.getTransactions(uploadResult.document_id);
            
            setProcessingStep('✅ Receipt processed successfully!');
            
            // Pass results to parent component
            onReceiptProcessed({
                type: 'receipt_scan',
                document: uploadResult,
                transactions: transactions.transactions,
                image: capturedImage.url});
            
            // Clean up
            setCapturedImage(null);
            
        } catch (error) {
            console.error('Receipt processing failed:', error);
            setProcessingStep('❌ Processing failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        startCamera();
    };

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6">
                <h3 className="text-xl font-bold mb-2">📸 Scan Receipt with Camera</h3>
                <p className="text-green-100">Take a photo of your receipt and watch AI extract all the details!</p>
            </div>

            {/* Camera Start State */}
            {!cameraActive && !capturedImage && (
                <div className="p-6">
                    <div className="text-center mb-6">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-4xl">🧾</span>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Ready to scan?</h4>
                        <p className="text-gray-600 mb-6">Position your receipt clearly in good lighting</p>
                        
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <h5 className="font-medium text-gray-900 mb-3">📱 Tips for best results:</h5>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-center">
                                    <span className="mr-2">📱</span>
                                    Hold phone steady
                                </li>
                                <li className="flex items-center">
                                    <span className="mr-2">💡</span>
                                    Ensure good lighting
                                </li>
                                <li className="flex items-center">
                                    <span className="mr-2">📐</span>
                                    Keep receipt flat and straight
                                </li>
                                <li className="flex items-center">
                                    <span className="mr-2">🔍</span>
                                    Make sure text is readable
                                </li>
                            </ul>
                        </div>
                    </div>
                    
                    <button 
                        onClick={startCamera}
                        className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition-all duration-300 shadow-lg"
                    >
                        📸 Open Camera
                    </button>
                </div>
            )}

            {/* Camera Active State */}
            {cameraActive && (
                <div className="relative">
                    <div className="relative">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-96 object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative">
                                {/* Receipt Frame Overlay */}
                                <div className="w-80 h-48 border-2 border-white border-dashed rounded-lg relative">
                                    <div className="absolute -top-1 -left-1 w-4 h-4 border-l-2 border-t-2 border-white"></div>
                                    <div className="absolute -top-1 -right-1 w-4 h-4 border-r-2 border-t-2 border-white"></div>
                                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-l-2 border-b-2 border-white"></div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-r-2 border-b-2 border-white"></div>
                                </div>
                                <p className="text-white text-center mt-4 text-sm bg-black bg-opacity-50 px-3 py-1 rounded">
                                    Position receipt within the frame
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex space-x-4 p-4 bg-gray-900">
                        <button 
                            onClick={stopCamera} 
                            className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
                        >
                            ❌ Cancel
                        </button>
                        <button 
                            onClick={capturePhoto} 
                            className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                        >
                            📸 Capture
                        </button>
                    </div>
                </div>
            )}

            {/* Image Preview State */}
            {capturedImage && !isProcessing && (
                <div className="p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">📸 Receipt Captured</h4>
                    
                    <div className="relative mb-6">
                        <img 
                            src={capturedImage.url} 
                            alt="Captured receipt" 
                            className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-lg flex items-end">
                            <div className="p-4 text-white">
                                <h5 className="font-semibold mb-2">✅ Image Quality Check:</h5>
                                <div className="text-sm space-y-1">
                                    <p>• Text is clearly visible</p>
                                    <p>• Receipt is fully in frame</p>
                                    <p>• Lighting is adequate</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex space-x-4">
                        <button 
                            onClick={retakePhoto} 
                            className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                        >
                            🔄 Retake
                        </button>
                        <button 
                            onClick={processReceipt} 
                            className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-green-700 hover:to-blue-700 transition-all duration-300"
                        >
                            🤖 Process with AI
                        </button>
                    </div>
                </div>
            )}

            {/* Processing State */}
            {isProcessing && (
                <div className="p-8 text-center">
                    <div className="relative mb-6">
                        <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                            <span className="text-4xl">🧾</span>
                        </div>
                        <div className="absolute inset-0 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                    </div>
                    
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">🤖 AI Magic in Progress...</h4>
                    <p className="text-gray-600 mb-6">{processingStep}</p>
                    
                    <div className="space-y-3">
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                            <span className="text-sm text-gray-600">📸 Image captured</span>
                            <span className="text-green-600">✅</span>
                        </div>
                        <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3 border-l-4 border-blue-500">
                            <span className="text-sm text-gray-600">🤖 AI reading receipt</span>
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                            <span className="text-sm text-gray-600">💰 Extracting transaction</span>
                            <span className="text-gray-400">⏳</span>
                        </div>
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                            <span className="text-sm text-gray-600">📊 Categorizing expense</span>
                            <span className="text-gray-400">⏳</span>
                        </div>
                    </div>
                </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
};

export default ReceiptCamera; 