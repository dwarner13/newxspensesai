import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { File, FileText, Upload, Check, AlertTriangle, Brain, Zap, Camera, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import FileUploader from '../components/upload/FileUploader';
import AICategorizationStatus from '../components/upload/AICategorizationStatus';
import ByteProcessingModal from '../components/upload/ByteProcessingModal';
import { parseCSVWithAI } from '../utils/enhancedCsvParser';
import { parsePDF } from '../utils/pdfParser';
import { generateTransactionHash } from '../utils/hashGenerator';
import { uploadFile, saveTransactions, getCurrentUser } from '../lib/supabase';
import { Transaction, ParsedFileData } from '../types/database.types';
import { motion } from 'framer-motion';
import { awardFileUploadXP } from '../utils/xpTriggers';
import { useAuth } from '../contexts/AuthContext';
import { runCategorizer } from '../utils/runCategorizer';
import PageHeader from '../components/layout/PageHeader';

const UploadPage = () => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parseProgress, setParseProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'idle' | 'uploading' | 'parsing' | 'ai-processing' | 'saving' | 'complete' | 'error' | 'orchestration'>('idle');
  const [parsedData, setParsedData] = useState<ParsedFileData | null>(null);
  const [processingMessage, setProcessingMessage] = useState('');
  const [aiStatus, setAiStatus] = useState({
    isProcessing: false,
    progress: 0,
    currentStep: 'parsing' as 'parsing' | 'categorizing' | 'learning' | 'complete' | 'error',
    processedCount: 0,
    totalCount: 0,
    message: ''
  });
  const [showByteModal, setShowByteModal] = useState(false);
  const [orchestrationResult, setOrchestrationResult] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const navigate = useNavigate();

  // Byte Modal Handlers
  const handleByteModalComplete = (result: any) => {
    setOrchestrationResult(result);
    setShowByteModal(false);
    
    if (result.view === 'story') {
      // Navigate to story view
      navigate('/dashboard', { state: { showStory: true, storyData: result } });
    } else if (result.view === 'podcasts') {
      // Navigate to podcast view
      navigate('/dashboard', { state: { showPodcasts: true, podcastData: result } });
    } else {
      // Default: show transactions
      setCurrentStep('complete');
      setParsedData({
        transactions: result.executiveSummary.keyMetrics.documentsProcessed || 0,
        fileName: uploadedFiles[0]?.name || 'Unknown',
        fileType: 'pdf' as const
      });
    }
    
    toast.success('🎉 Your financial story is ready!');
  };

  const handleByteModalError = (error: string) => {
    setShowByteModal(false);
    setCurrentStep('error');
    toast.error(error);
  };

  const handleByteModalClose = () => {
    setShowByteModal(false);
    setCurrentStep('idle');
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser?.id) {
        throw new Error('Please log in to upload files.');
      }

      // Check if we should use the new orchestration system
      const useOrchestration = files.length === 1 && (files[0].type.includes('pdf') || files[0].name.toLowerCase().endsWith('.csv'));
      
      if (useOrchestration) {
        // Use the new Byte Processing Modal with Orchestration
        setUploadedFiles(files);
        setShowByteModal(true);
        setCurrentStep('orchestration');
        return;
      }

      // Fall back to existing upload flow
      setIsUploading(true);
      setCurrentStep('uploading');
      setUploadProgress(0);
      setProcessingMessage('Uploading file to secure storage...');
      
      for (const file of files) {
        const fileType = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'pdf';
        
        // Upload to storage
        setUploadProgress(20);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filePath = `${currentUser.id}/${timestamp}-${file.name}`;
        await uploadFile(file, filePath);
        
        setUploadProgress(40);
        setCurrentStep('parsing');
        setParseProgress(0);
        
        let transactions: Transaction[] = [];
        
        if (fileType === 'csv') {
          setProcessingMessage('🤖 AI is analyzing your CSV...');
          setAiStatus({
            isProcessing: true,
            progress: 0,
            currentStep: 'parsing',
            processedCount: 0,
            totalCount: 0,
            message: 'Parsing CSV structure...'
          });

          const result = await parseCSVWithAI(file, {
            useAI: true,
            batchSize: 15,
            onProgress: (progress, message) => {
              setAiStatus(prev => ({
                ...prev,
                progress,
                message,
                currentStep: progress < 30 ? 'parsing' : progress < 90 ? 'categorizing' : 'learning'
              }));
            }
          });
          
          setAiStatus(prev => ({
            ...prev,
            progress: 100,
            currentStep: 'complete',
            message: 'AI categorization complete!'
          }));
          
          transactions = result.map(item => ({
            ...item,
            user_id: currentUser.id,
            file_name: file.name,
            hash_id: generateTransactionHash(item),
          })) as Transaction[];

        } else if (fileType === 'pdf') {
          setCurrentStep('ai-processing');
          setProcessingMessage('🧠 AI is reading your PDF statement...');
          setParseProgress(20);
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          setProcessingMessage('🔍 Extracting text from PDF...');
          setParseProgress(40);
          
          await new Promise(resolve => setTimeout(resolve, 1500));
          setProcessingMessage('🤖 AI is identifying transactions...');
          setParseProgress(60);
          
          transactions = await parsePDF(file);
          setParseProgress(80);
          setProcessingMessage('✨ Structuring transaction data...');
          
          transactions = transactions.map(item => ({
            ...item,
            user_id: currentUser.id,
            file_name: file.name,
            hash_id: generateTransactionHash(item),
          })) as Transaction[];
        }
        
        setParseProgress(100);
        
        if (transactions.length === 0) {
          throw new Error('No transactions could be parsed from the file. Please check the file format and try again.');
        }
        
        setParsedData({
          transactions,
          fileName: file.name,
          fileType: fileType as 'csv' | 'pdf'
        });
        
        setCurrentStep('saving');
        setProcessingMessage('Saving transactions to your account...');
        
        await saveTransactions(transactions);
        
        // Run AI categorizer on the newly uploaded transactions
        try {
          console.log('Running AI categorizer on new transactions...');
          const categorizationResult = await runCategorizer();
          if (categorizationResult.categorized > 0) {
            toast.success(`AI categorized ${categorizationResult.categorized} transactions automatically!`);
          }
        } catch (categorizerError) {
          console.error('Categorizer failed:', categorizerError);
          // Don't fail the upload if categorizer fails
        }
        
        // Award XP for file upload
        if (user) {
          await awardFileUploadXP(user.id, fileType.toUpperCase());
        }
        
        setCurrentStep('complete');
        setProcessingMessage('🎉 Upload complete!');
        
        const aiMessage = fileType === 'csv' ? ' with AI categorization' : ' using AI';
        toast.success(
          `Successfully processed ${transactions.length} transactions from ${file.name}${aiMessage}`
        );
        
        setTimeout(() => {
          navigate('/transactions');
        }, 2000);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setCurrentStep('error');
      setAiStatus(prev => ({
        ...prev,
        currentStep: 'error',
        message: 'AI processing failed'
      }));
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setProcessingMessage(`Error: ${errorMessage}`);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 'uploading':
        return <Upload className="animate-bounce" />;
      case 'parsing':
        return <FileText className="animate-pulse" />;
      case 'ai-processing':
        return <Brain className="animate-pulse text-primary-600" />;
      case 'saving':
        return <Zap className="animate-pulse" />;
      case 'complete':
        return <Check className="text-success-600" />;
      case 'error':
        return <AlertTriangle className="text-error-600" />;
      default:
        return <Upload />;
    }
  };

  const getProgressValue = () => {
    switch (currentStep) {
      case 'uploading':
        return uploadProgress;
      case 'parsing':
      case 'ai-processing':
        return parseProgress;
      case 'saving':
        return 95;
      case 'complete':
        return 100;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader />
      <div className="max-w-4xl">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold mb-6"
        >
          Upload Bank Statements
        </motion.h1>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8 sticky top-16 z-10"
        >
          <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6 border border-primary-100 shadow-sm">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                <Brain size={24} className="text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  AI-Powered Processing Options
                </h3>
                <p className="text-gray-600 mb-3">
                  Choose how you want to add your financial data. Upload bank statements or scan receipts 
                  with our AI-powered processing for automatic categorization.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                    <FileText size={12} className="mr-1" />
                    CSV Auto-Import + AI
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-700">
                    <Brain size={12} className="mr-1" />
                    PDF AI Processing
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent-100 text-accent-700">
                    <Camera size={12} className="mr-1" />
                    Receipt Scanning
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700">
                    <Zap size={12} className="mr-1" />
                    +10 XP per upload
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Upload Options */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
        >
          {/* Bank Statements Upload */}
          <div className="card bg-white overflow-hidden">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <FileText size={20} className="text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Bank Statements</h3>
                  <p className="text-sm text-gray-600">Upload CSV or PDF statements</p>
                </div>
              </div>
              
              {currentStep !== 'complete' ? (
                <FileUploader 
                  onFilesSelected={handleFileUpload} 
                  isUploading={isUploading} 
                  acceptedFileTypes={['.csv', '.pdf']}
                  multiple={false}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center text-success-600 mb-4">
                    <Check size={30} />
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Upload Complete!</h3>
                  <p className="text-gray-600 mb-4">
                    Successfully processed {parsedData?.transactions.length} transactions from {parsedData?.fileName}
                    {parsedData?.fileType === 'pdf' && (
                      <span className="inline-flex items-center ml-2 px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                        <Brain size={12} className="mr-1" />
                        AI Processed
                      </span>
                    )}
                  </p>
                  <div className="flex items-center space-x-2 mb-4">
                    <Zap size={16} className="text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-700">+10 XP earned!</span>
                  </div>
                  <button 
                    className="btn-primary" 
                    onClick={() => navigate('/transactions')}
                  >
                    View Transactions
                  </button>
                </div>
              )}
              
              {currentStep !== 'idle' && currentStep !== 'complete' && (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center space-x-2">
                      {getStepIcon()}
                      <span>{processingMessage}</span>
                    </div>
                    <span>{getProgressValue()}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentStep === 'error' ? 'bg-error-600' : 
                        currentStep === 'ai-processing' ? 'bg-gradient-to-r from-primary-600 to-secondary-600' :
                        'bg-primary-600'
                      }`}
                      style={{ width: `${getProgressValue()}%` }}
                    ></div>
                  </div>
                  
                  {currentStep === 'ai-processing' && (
                    <div className="mt-3 text-xs text-gray-500 bg-primary-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Brain size={14} className="text-primary-600" />
                        <span>Our AI is analyzing your PDF statement to identify and extract transaction data automatically.</span>
                      </div>
                    </div>
                  )}
                  
                  {currentStep === 'error' && (
                    <div className="mt-4 text-sm text-error-600 bg-error-50 p-3 rounded-lg flex items-start">
                      <AlertTriangle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Processing failed</p>
                        <p className="mt-1">
                          {processingMessage.includes('OpenAI') || processingMessage.includes('AI') ? (
                            <>
                              AI processing is temporarily unavailable. Please try uploading your statement as a CSV file, 
                              or try again later when our AI service is restored.
                            </>
                          ) : (
                            <>
                              Please check that your file is a valid bank statement and try again. 
                              For best results, use CSV format or ensure your PDF contains clear transaction data.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* AI Categorization Status */}
              {aiStatus.isProcessing && (
                <div className="mt-6">
                  <AICategorizationStatus
                    isProcessing={aiStatus.isProcessing}
                    progress={aiStatus.progress}
                    currentStep={aiStatus.currentStep}
                    processedCount={aiStatus.processedCount}
                    totalCount={aiStatus.totalCount}
                    message={aiStatus.message}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Receipt Scanner */}
          <div className="card bg-gradient-to-br from-accent-50 to-secondary-50 border-accent-200">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
                  <Camera size={20} className="text-accent-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Receipt Scanner</h3>
                  <p className="text-sm text-gray-600">Take photos of receipts</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Receipt size={16} className="text-accent-600" />
                  <span>Instant OCR text extraction</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Brain size={16} className="text-accent-600" />
                  <span>AI-powered categorization</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-600">
                  <Zap size={16} className="text-accent-600" />
                  <span>+20 XP per receipt scanned</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => navigate('/scan-receipt')}
                  className="btn-primary w-full flex items-center justify-center mt-6"
                >
                  <Camera size={16} className="mr-2" />
                  Scan Receipt
                </button>
              </div>
            </div>
          </div>
        </motion.div>
        
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 rounded-b-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Supported Formats</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex">
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 mr-3">
                <FileText size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-900">CSV Files</p>
                <p className="text-sm text-gray-500">Standard bank export format - instant processing</p>
              </div>
            </div>
            <div className="flex">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center text-primary-600 mr-3">
                <div className="relative">
                  <File size={20} />
                  <Brain size={12} className="absolute -top-1 -right-1 text-secondary-600" />
                </div>
              </div>
              <div>
                <p className="font-medium text-gray-900">PDF Statements</p>
                <p className="text-sm text-gray-500">AI-powered extraction and categorization</p>
              </div>
            </div>
            <div className="flex">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-100 to-secondary-100 flex items-center justify-center text-accent-600 mr-3">
                <Camera size={20} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Receipt Photos</p>
                <p className="text-sm text-gray-500">OCR scanning with smart categorization</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Byte Processing Modal */}
      {showByteModal && (
        <ByteProcessingModal
          files={uploadedFiles}
          onComplete={handleByteModalComplete}
          onError={handleByteModalError}
          onClose={handleByteModalClose}
        />
      )}
    </div>
  );
};

export default UploadPage;
