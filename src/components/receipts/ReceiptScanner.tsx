import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, AlertTriangle, Brain, FileImage, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { extractTextFromImage, parseReceiptText, ParsedReceiptData } from '../../utils/ocrService';
import { parseReceiptWithAI } from '../../utils/parseReceiptWithAI';
import toast from 'react-hot-toast';

interface ReceiptScannerProps {
  onReceiptProcessed?: (receiptData: any) => void;
  onClose?: () => void;
}

const ReceiptScanner = ({ onReceiptProcessed, onClose }: ReceiptScannerProps) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<'upload' | 'ocr' | 'ai' | 'save' | 'complete' | 'error'>('upload');
  const [progress, setProgress] = useState(0);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ParsedReceiptData | null>(null);
  const [receiptInfo, setReceiptInfo] = useState<any>(null);
  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [showRawText, setShowRawText] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [ocrError, setOcrError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const retryCount = useRef(0);
  const MAX_RETRIES = 3;

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

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

  const startProgressSimulation = (startAt: number, endAt: number, duration: number) => {
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Start at the specified percentage
    setProgress(startAt);
    
    // Calculate steps
    const steps = 20; // Number of steps to take
    const increment = (endAt - startAt) / steps;
    const intervalTime = duration / steps;
    
    let currentProgress = startAt;
    const interval = window.setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= endAt) {
        clearInterval(interval);
        setProgress(endAt);
        progressIntervalRef.current = null;
      } else {
        setProgress(Math.min(currentProgress, endAt));
      }
    }, intervalTime);
    
    progressIntervalRef.current = interval;
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${user.id}/${timestamp}-${file.name}`;
    
    const uploadToast = toast.loading('Uploading receipt image...', { id: 'upload-toast' });
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Upload failed: ${uploadError.message}`, { id: uploadToast });
        throw uploadError;
      }

      toast.success('Image uploaded successfully!', { id: uploadToast });
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);
        
      return urlData.publicUrl;
    } catch (error) {
      // If this is a retry attempt, throw the error to be handled by the caller
      if (retryCount.current > 0) {
        throw error;
      }
      
      // Otherwise, retry the upload
      retryCount.current++;
      if (retryCount.current <= MAX_RETRIES) {
        toast.error(`Upload failed, retrying (${retryCount.current}/${MAX_RETRIES})...`, { id: uploadToast });
        return uploadImage(file); // Recursive retry
      } else {
        toast.error(`Upload failed after ${MAX_RETRIES} attempts`, { id: uploadToast });
        throw error;
      }
    }
  };

  const processReceipt = async () => {
    if (!selectedImage || !user) return;

    try {
      setIsProcessing(true);
      setProcessingStep('upload');
      setProgress(0);
      setProcessingMessage('📤 Preparing to upload receipt image...');
      setOcrError(null);
      retryCount.current = 0;
      
      // Start progress simulation for upload phase (0% to 30%)
      startProgressSimulation(0, 30, 2000);

      // Upload image to Supabase Storage
      const imageUrl = await uploadImage(selectedImage);
      
      // Stop upload progress simulation and set to 30%
      stopProgressSimulation();
      setProgress(30);
      setProcessingStep('ocr');
      setProcessingMessage('🔍 Extracting text with OCR.space...');
      
      // Start progress simulation for OCR phase (30% to 60%)
      startProgressSimulation(30, 60, 3000);

      // Extract text using OCR.space
      try {
        const ocrToast = toast.loading('Processing with OCR...', { id: 'ocr-toast' });
        const ocrResult = await extractTextFromImage(imageUrl);
        setRawOcrText(ocrResult.text);
        
        if (!ocrResult.text || ocrResult.text.trim().length === 0) {
          throw new Error('OCR failed to extract any text from the image');
        }

        toast.success('Text extracted successfully!', { id: ocrToast });
        
        // Stop OCR progress simulation and set to 60%
        stopProgressSimulation();
        setProgress(60);
        setProcessingStep('ai');
        setProcessingMessage('🤖 AI is analyzing receipt data...');
        
        // Start progress simulation for AI phase (60% to 80%)
        startProgressSimulation(60, 80, 2000);

        // Parse the extracted text with AI
        setProcessingMessage('🤖 AI is analyzing receipt data...');
        const aiResult = await parseReceiptWithAI(ocrResult.text);
        setReceiptInfo(aiResult);
        
        if (aiResult) {
          // Convert AI result to our expected format
          const parsedData: ParsedReceiptData = {
            vendor: aiResult.title || 'Unknown Vendor',
            amount: aiResult.amount || 0,
            date: aiResult.date || new Date().toISOString().split('T')[0],
            category: aiResult.category || 'Uncategorized',
            confidence: Math.min(0.9, ocrResult.confidence) // AI parsing is more reliable
          };
          setExtractedData(parsedData);
          
          // Log AI parsing results for debugging
          console.log('AI Parsing Result:', aiResult);
          console.log('Converted to ParsedData:', parsedData);
        } else {
          // Fallback to basic parsing if AI fails
          const parsedData = parseReceiptText(ocrResult.text);
          parsedData.confidence = Math.min(parsedData.confidence || 0.5, ocrResult.confidence);
          setExtractedData(parsedData);
          
          // Log fallback parsing results for debugging
          console.log('Fallback Parsing Result:', parsedData);
          console.log('Raw OCR Text Lines:', ocrResult.text.split('\n'));
        }

        // Stop AI progress simulation and set to 80%
        stopProgressSimulation();
        setProgress(80);
        setProcessingStep('save');
        setProcessingMessage('💾 Saving receipt data...');
        
        // Start progress simulation for save phase (80% to 95%)
        startProgressSimulation(80, 95, 1500);

        // Save receipt record to database
        const saveToast = toast.loading('Saving receipt data...', { id: 'save-toast' });
        const { data: receiptRecord, error: dbError } = await supabase
          .from('receipts')
          .insert({
            user_id: user.id,
            image_url: imageUrl,
            original_filename: selectedImage.name,
            processing_status: 'completed',
            extracted_data: {
              ...parsedData,
              raw_ocr_text: ocrResult.text,
              ocr_confidence: ocrResult.confidence
            }
          })
          .select()
          .single();

        if (dbError) throw dbError;

        toast.success('Receipt saved successfully!', { id: saveToast });
        
        // Stop save progress simulation and set to 100%
        stopProgressSimulation();
        setProgress(100);
        setProcessingStep('complete');
        setProcessingMessage('✅ Receipt processed successfully!');

        toast.success('Receipt scanned and processed successfully!');
        
        if (onReceiptProcessed) {
          onReceiptProcessed({
            receipt: receiptRecord,
            extractedData: parsedData
          });
        }
      } catch (ocrError) {
        console.error('OCR processing error:', ocrError);
        toast.error('OCR processing failed', { id: 'ocr-toast' });
        setOcrError(ocrError instanceof Error ? ocrError.message : 'Unknown OCR error');
        setProcessingStep('error');
        setProcessingMessage('❌ OCR processing failed');
        
        // Still save the receipt record, but mark as failed
        await supabase
          .from('receipts')
          .insert({
            user_id: user.id,
            image_url: imageUrl,
            original_filename: selectedImage.name,
            processing_status: 'failed',
            extracted_data: {
              error: ocrError instanceof Error ? ocrError.message : 'Unknown OCR error'
            }
          });
          
        throw new Error('OCR processing failed: ' + (ocrError instanceof Error ? ocrError.message : 'Unknown error'));
      }

    } catch (error) {
      console.error('Receipt processing error:', error);
      stopProgressSimulation();
      
      let errorMessage = 'Failed to process receipt. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('OCR')) {
          errorMessage = 'OCR processing failed. Please ensure the image is clear and try again.';
        } else if (error.message.includes('API')) {
          errorMessage = 'OCR service temporarily unavailable. Please try again later.';
        } else if (error.message.includes('storage')) {
          errorMessage = 'Failed to upload image. Please check your connection and try again.';
        }
      }
      
      toast.error(errorMessage);
      setIsProcessing(false);
      setProcessingStep('error');
      setProcessingMessage(errorMessage);
    } finally {
      stopProgressSimulation();
      setIsProcessing(false);
    }
  };

  const createTransactionFromReceipt = async () => {
    if (!extractedData || !user) return;

    try {
      // Get the receipt image URL for linking
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(`${user.id}/${new Date().toISOString().replace(/[:.]/g, '-')}-${selectedImage?.name}`);

      const transaction = {
        user_id: user.id,
        date: extractedData.date || new Date().toISOString().split('T')[0],
        description: extractedData.vendor || 'Receipt Purchase',
        amount: extractedData.total || 0,
        type: 'Debit' as const,
        category: extractedData.category || 'Uncategorized',
        subcategory: null,
        file_name: 'Receipt Scan',
        hash_id: `receipt-${Date.now()}`,
        categorization_source: 'ai' as const,
        receipt_url: urlData.publicUrl // Link transaction to receipt image
      };

      const { error } = await supabase
        .from('transactions')
        .insert([transaction]);

      if (error) throw error;

      toast.success('Transaction created from receipt!');
      
      if (onClose) onClose();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast.error('Failed to create transaction from receipt');
    }
  };

  const resetScanner = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setExtractedData(null);
    setReceiptInfo(null);
    setRawOcrText('');
    setShowRawText(false);
    setIsProcessing(false);
    setProgress(0);
    setProcessingStep('upload');
    setProcessingMessage('');
    setOcrError(null);
    stopProgressSimulation();
    retryCount.current = 0;
  };

  const getStepIcon = () => {
    switch (processingStep) {
      case 'upload':
        return <Upload className="animate-bounce" />;
      case 'ocr':
        return <FileImage className="animate-pulse" />;
      case 'ai':
        return <Brain className="animate-pulse text-primary-600" />;
      case 'save':
        return <Check className="animate-pulse" />;
      case 'complete':
        return <Check className="text-success-600" />;
      case 'error':
        return <AlertTriangle className="text-error-600" />;
      default:
        return <Camera />;
    }
  };

  return (
    <div className="max-w-2xl ">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Camera size={24} className="text-primary-600" />
            <h2 className="text-xl font-semibold">Receipt Scanner</h2>
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
                Scan Your Receipt
              </h3>
              <p className="text-gray-600 mb-6">
                Take a photo or upload an image of your receipt. Our OCR technology will automatically extract the details and create a transaction.
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

            <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Brain size={20} className="text-primary-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">OCR.space Powered Processing</h4>
                  <p className="text-sm text-gray-600">
                    Using OCR.space's advanced text recognition to extract vendor, date, amount, and automatically categorize your purchase. 
                    Free and reliable OCR processing.
                  </p>
                </div>
              </div>
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
            {isProcessing && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                  <div className="flex items-center space-x-2">
                    {getStepIcon()}
                    <span>{processingMessage}</span>
                  </div>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary-600 to-secondary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                
                {processingStep === 'ocr' && (
                  <div className="text-xs text-gray-500 bg-primary-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileImage size={14} className="text-primary-600" />
                      <span>Using OCR.space API to extract text from your receipt image...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* OCR Error */}
            {processingStep === 'error' && ocrError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
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
                            <p className="font-medium text-gray-900">Check Receipt Condition</p>
                            <p className="text-gray-600">Faded thermal receipts may be difficult to scan.</p>
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
              </motion.div>
            )}

            {/* Extracted Data Preview */}
            {extractedData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-success-50 border border-success-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Check size={20} className="text-success-600" />
                    <h4 className="font-medium text-success-900">Receipt Processed Successfully!</h4>
                  </div>
                  {rawOcrText && (
                    <button
                      onClick={() => setShowRawText(!showRawText)}
                      className="text-xs text-success-700 hover:text-success-800 flex items-center space-x-1"
                    >
                      <Eye size={12} />
                      <span>{showRawText ? 'Hide' : 'Show'} Raw Text</span>
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Vendor:</span>
                    <p className="font-medium">{extractedData.vendor}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <p className="font-medium">{extractedData.date}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <p className="font-medium text-lg">${extractedData.total?.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Category:</span>
                    <p className="font-medium">{extractedData.category}</p>
                  </div>
                </div>

                {extractedData.items && extractedData.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-success-200">
                    <span className="text-xs text-success-700 font-medium">Items Found:</span>
                    <div className="mt-1 max-h-20 overflow-y-auto">
                      {extractedData.items.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex justify-between text-xs text-success-700">
                          <span className="truncate mr-2">{item.description}</span>
                          <span>${item.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      {extractedData.items.length > 5 && (
                        <div className="text-xs text-success-600">
                          +{extractedData.items.length - 5} more items
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {extractedData.confidence && (
                  <div className="mt-3 pt-3 border-t border-success-200">
                    <span className="text-xs text-success-700">
                      OCR Confidence: {(extractedData.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}

                {/* Raw OCR Text */}
                <AnimatePresence>
                  {showRawText && rawOcrText && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-success-200"
                    >
                      <span className="text-xs text-success-700 font-medium">Raw OCR Text:</span>
                      <div className="mt-1 p-2 bg-white rounded text-xs text-gray-600 max-h-32 overflow-y-auto font-mono">
                        {rawOcrText}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* AI Receipt Details */}
            {receiptInfo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-white text-black p-4 rounded-lg border border-gray-200 shadow-sm"
              >
                <h2 className="text-xl font-bold mb-3 text-gray-800">🤖 AI Receipt Analysis</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">🧾 Title:</p>
                    <p className="font-medium text-gray-800">{receiptInfo.title}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">💸 Amount:</p>
                    <p className="font-medium text-gray-800">${receiptInfo.amount}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">📅 Date:</p>
                    <p className="font-medium text-gray-800">{receiptInfo.date}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">📂 Category:</p>
                    <p className="font-medium text-gray-800">{receiptInfo.category}</p>
                  </div>
                </div>
                
                {/* Debug Section */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium">
                    🔍 Debug: Show OCR Text & Parsing Details
                  </summary>
                  <div className="mt-3 p-3 bg-gray-50 rounded border">
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Raw OCR Text (what the scanner saw):</p>
                      <div className="p-2 bg-white rounded text-xs font-mono max-h-32 overflow-y-auto border">
                        {rawOcrText}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Parsed Data Structure:</p>
                      <div className="p-2 bg-white rounded text-xs font-mono border">
                        <pre>{JSON.stringify(extractedData, null, 2)}</pre>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 mb-1">OCR Confidence: {(extractedData?.confidence || 0) * 100}%</p>
                      <p className="text-xs text-gray-500">Lines Detected: {rawOcrText.split('\n').length}</p>
                      <p className="text-xs text-gray-500">Items Found: {extractedData?.items?.length || 0}</p>
                    </div>
                  </div>
                </details>
              </motion.div>
            )}

            {/* Tips for Better Results */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">💡 Tips for Better Receipt Recognition:</h3>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Ensure good lighting and flat surface</li>
                <li>• Avoid shadows and glare on the receipt</li>
                <li>• Make sure text is clear and readable</li>
                <li>• Hold camera steady and parallel to receipt</li>
                <li>• Clean receipt surface if possible</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {!isProcessing && !extractedData && (
                <>
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
                    <Brain size={16} className="mr-2" />
                    Process with OCR
                  </button>
                </>
              )}

              {extractedData && !isProcessing && (
                <>
                  <button
                    onClick={resetScanner}
                    className="btn-outline flex-1"
                  >
                    Scan Another
                  </button>
                  <button
                    onClick={createTransactionFromReceipt}
                    className="btn-primary flex-1 flex items-center justify-center"
                  >
                    <Check size={16} className="mr-2" />
                    Create Transaction
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ReceiptScanner;
