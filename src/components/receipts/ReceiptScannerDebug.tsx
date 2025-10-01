import { useState, useRef } from 'react';
import { Camera, Upload, X, Check, AlertTriangle, Brain, Zap, FileImage, Eye, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ReceiptScannerDebugProps {
  onClose?: () => void;
}

const ReceiptScannerDebug = ({ onClose }: ReceiptScannerDebugProps) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [ocrApiKey, setOcrApiKey] = useState<string>('K88142274288957'); // Default OCR.space API key
  const [uploadProgress, setUploadProgress] = useState(0);
  const progressIntervalRef = useRef<number | null>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('Image must be smaller than 10MB');
      return;
    }

    setSelectedImage(file);
    setRawOcrText('');
    setOcrError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const startProgressSimulation = () => {
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Start at 0%
    setUploadProgress(0);
    
    // Simulate progress up to 95% (the last 5% will be set when the operation completes)
    let currentProgress = 0;
    const interval = window.setInterval(() => {
      currentProgress += 5;
      if (currentProgress >= 95) {
        clearInterval(interval);
        progressIntervalRef.current = null;
      } else {
        setUploadProgress(currentProgress);
      }
    }, 200);
    
    progressIntervalRef.current = interval;
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const processReceipt = async () => {
    if (!selectedImage || !user) return;

    try {
      setIsProcessing(true);
      setProcessingMessage('📤 Preparing image for OCR processing...');
      startProgressSimulation();

      // Test upload to Supabase Storage
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${user.id}/${timestamp}-${selectedImage.name}`;
      
      console.log('Attempting to upload to path:', fileName);
      
      try {
        const { data, error } = await supabase.storage
          .from('receipts')
          .upload(fileName, selectedImage, {
            cacheControl: '3600',
            upsert: false});
          
        if (error) {
          console.error('Storage upload error:', error);
          throw error;
        }
        
        console.log('Storage upload successful:', data);
        
        // Get public URL for debugging
        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);
          
        console.log('Public URL:', urlData.publicUrl);
      } catch (uploadError) {
        console.error('Failed to upload to Supabase storage:', uploadError);
        toast.error(`Storage upload failed: ${uploadError.message}`);
      }
      
      setProcessingMessage('🔍 Sending to OCR.space for text extraction...');
      
      // Convert image to base64
      const base64Image = await convertFileToBase64(selectedImage);
      
      // Call OCR.space API
      const formData = new FormData();
      formData.append("base64Image", base64Image.split(',')[1]);
      formData.append("language", "eng");
      formData.append("isOverlayRequired", "false");
      formData.append("scale", "true");
      formData.append("OCREngine", "2"); // More accurate engine
      
      const response = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: {
          "apikey": ocrApiKey,
        },
        body: formData});

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OCR API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('OCR API response:', result);
      
      if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage || 'OCR processing failed');
      }

      const extractedText = result?.ParsedResults?.[0]?.ParsedText || "";
      
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text was extracted from the image');
      }

      setRawOcrText(extractedText);
      setProcessingMessage('✅ OCR processing complete!');
      setUploadProgress(100);

    } catch (error) {
      console.error('OCR extraction error:', error);
      setOcrError(error instanceof Error ? error.message : 'Unknown OCR error');
      setProcessingMessage('❌ OCR processing failed');
      setUploadProgress(0);
    } finally {
      stopProgressSimulation();
      setIsProcessing(false);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const resetScanner = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setRawOcrText('');
    setOcrError(null);
    setIsProcessing(false);
    setProcessingMessage('');
    stopProgressSimulation();
    setUploadProgress(0);
  };

  return (
    <div className="max-w-2xl ">
      <div
        className="card"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Camera size={24} className="text-primary-600" />
            <h2 className="text-xl font-semibold">Receipt Scanner Debug</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {!selectedImage ? (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center  mb-4">
                <Camera size={32} className="text-primary-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Debug OCR Processing
              </h3>
              <p className="text-gray-600 mb-6">
                Upload a receipt image to test OCR processing and diagnose issues with text extraction.
                This mode shows raw OCR output and detailed error information.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center p-6 border-2 border-dashed border-primary-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors"
              >
                <Camera size={32} className="text-primary-600 mb-3" />
                <span className="font-medium text-gray-900">Take Photo</span>
                <span className="text-sm text-gray-500">Use your camera</span>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraCapture}
                  className="hidden"
                />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <Upload size={32} className="text-gray-600 mb-3" />
                <span className="font-medium text-gray-900">Upload Image</span>
                <span className="text-sm text-gray-500">Choose from gallery</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info size={20} className="text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">OCR Troubleshooting</h4>
                  <p className="text-sm text-blue-700">
                    This tool helps diagnose OCR issues by showing the raw text extracted from your receipt images.
                    If OCR fails, try improving image quality with better lighting and a flat surface.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-2">OCR API Configuration</h4>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={ocrApiKey}
                  onChange={(e) => setOcrApiKey(e.target.value)}
                  placeholder="OCR.space API Key"
                  className="input flex-1"
                />
                <button 
                  className="btn-outline"
                  onClick={() => setOcrApiKey('K88142274288957')}
                >
                  Reset
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Default key is provided, but you can use your own from <a href="https://ocr.space/ocrapi" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">OCR.space</a>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Image Preview */}
            <div className="relative">
              <img
                src={imagePreview!}
                alt="Receipt preview"
                className="w-full max-h-64 object-contain rounded-lg border"
              />
              {!isProcessing && (
                <button
                  onClick={resetScanner}
                  className="absolute top-2 right-2 w-8 h-8 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Processing Status */}
            {isProcessing ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                  <div className="flex items-center space-x-2">
                    <FileImage size={20} className="animate-pulse text-primary-600" />
                    <span>{processingMessage}</span>
                  </div>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary-600 to-secondary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                
                <div className="text-xs text-gray-500 bg-primary-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <FileImage size={14} className="text-primary-600" />
                    <span>Using OCR.space API to extract text from your receipt image...</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex space-x-3">
                <button
                  onClick={resetScanner}
                  className="btn-outline flex-1"
                >
                  Choose Different Image
                </button>
                <button
                  onClick={processReceipt}
                  className="btn-primary flex-1 flex items-center justify-center"
                >
                  <FileImage size={16} className="mr-2" />
                  Process with OCR
                </button>
              </div>
            )}

            {/* OCR Results */}
            {rawOcrText && (
              <div
                className="bg-success-50 border border-success-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Check size={20} className="text-success-600" />
                    <h4 className="font-medium text-success-900">OCR Successful!</h4>
                  </div>
                  <button
                    onClick={() => setShowRawText(!showRawText)}
                    className="text-xs text-success-700 hover:text-success-800 flex items-center space-x-1"
                  >
                    {showRawText ? <Eye size={12} /> : <Eye size={12} />}
                    <span>{showRawText ? 'Hide' : 'Show'} Raw Text</span>
                  </button>
                </div>
                
                
                  {showRawText && (
                    <div
                      className="mt-3"
                    >
                      <div className="bg-white p-3 rounded border border-success-200 max-h-64 overflow-y-auto">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">{rawOcrText}</pre>
                      </div>
                    </div>
                  )}
                
                
                <div className="mt-3 text-sm text-success-700">
                  <p>OCR extracted {rawOcrText.length} characters of text.</p>
                  <p className="mt-1">You can now proceed with parsing this text into structured data.</p>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      // In a real app, this would send the text to your parsing function
                      toast.success('Text sent to parser!');
                    }}
                    className="btn-primary text-sm flex items-center"
                  >
                    <Brain size={14} className="mr-2" />
                    Parse Receipt Data
                  </button>
                </div>
              </div>
            )}

            {/* OCR Error */}
            {ocrError && (
              <div
                className="bg-error-50 border border-error-200 rounded-lg p-4"
              >
                <div className="flex items-start space-x-3">
                  <AlertTriangle size={20} className="text-error-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-error-900 mb-2">OCR Processing Failed</h4>
                    <p className="text-sm text-error-700 mb-4">{ocrError}</p>
                    
                    <div className="bg-white p-4 rounded-lg border border-error-200">
                      <h5 className="font-medium text-gray-900 mb-3">Troubleshooting Tips:</h5>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-start space-x-2">
                          <div className="w-5 h-5 bg-error-100 rounded-full flex items-center justify-center text-error-600 mt-0.5">1</div>
                          <div>
                            <p className="font-medium text-gray-900">Check Image Quality</p>
                            <p className="text-gray-600">Ensure good lighting, no shadows, and a flat surface.</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-2">
                          <div className="w-5 h-5 bg-error-100 rounded-full flex items-center justify-center text-error-600 mt-0.5">2</div>
                          <div>
                            <p className="font-medium text-gray-900">Try Different Background</p>
                            <p className="text-gray-600">Place receipt on a dark, contrasting background.</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-2">
                          <div className="w-5 h-5 bg-error-100 rounded-full flex items-center justify-center text-error-600 mt-0.5">3</div>
                          <div>
                            <p className="font-medium text-gray-900">Check API Key</p>
                            <p className="text-gray-600">Verify your OCR.space API key is valid and has sufficient credits.</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-2">
                          <div className="w-5 h-5 bg-error-100 rounded-full flex items-center justify-center text-error-600 mt-0.5">4</div>
                          <div>
                            <p className="font-medium text-gray-900">Try Manual Entry</p>
                            <p className="text-gray-600">If OCR consistently fails, consider manual transaction entry.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptScannerDebug;
