/**
 * AI Employee Document Processor Component
 * React component for the complete AI Employee Document Processing & Categorization System
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileText, 
  Brain, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Download,
  Eye,
  Edit3,
  MessageSquare,
  TrendingUp,
  Target,
  Zap
} from 'lucide-react';
import { documentProcessingPipeline, PipelineResult, PipelineProgress } from '../../lib/documentProcessingPipeline';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface AIEmployeeDocumentProcessorProps {
  onComplete?: (result: PipelineResult) => void;
  onClose?: () => void;
}

const AIEmployeeDocumentProcessor: React.FC<AIEmployeeDocumentProcessorProps> = ({
  onComplete,
  onClose
}) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<PipelineProgress | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setResult(null);
    setCurrentProgress(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const processDocument = useCallback(async () => {
    if (!selectedFile || !user) return;

    setIsProcessing(true);
    setCurrentProgress(null);
    setResult(null);

    try {
      const pipelineResult = await documentProcessingPipeline.processDocument(selectedFile, {
        enableOCR: true,
        enableAI: true,
        enableLearning: true,
        enableBytePersonality: true,
        userPreferences: {
          userId: user.id,
          customCategories: [],
          spendingPatterns: {},
          goals: []
        },
        bankSpecific: true,
        onProgress: (progress) => {
          setCurrentProgress(progress);
        },
        onError: (error, stage) => {
          console.error(`Pipeline error in ${stage}:`, error);
          toast.error(`Error in ${stage}: ${error.message}`);
        }
      });

      setResult(pipelineResult);
      setIsProcessing(false);
      
      if (pipelineResult.success) {
        toast.success('Document processed successfully!');
        onComplete?.(pipelineResult);
      } else {
        toast.error('Document processing failed');
      }

    } catch (error) {
      console.error('Document processing error:', error);
      toast.error('Failed to process document');
      setIsProcessing(false);
    }
  }, [selectedFile, user, onComplete]);

  const getFileIcon = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-500" />;
      case 'csv':
        return <FileText className="w-8 h-8 text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileText className="w-8 h-8 text-blue-500" />;
      default:
        return <FileText className="w-8 h-8 text-gray-500" />;
    }
  };

  const getProgressIcon = (stage: string) => {
    switch (stage) {
      case 'upload':
        return <Upload className="w-5 h-5" />;
      case 'ocr':
        return <Eye className="w-5 h-5" />;
      case 'parsing':
        return <FileText className="w-5 h-5" />;
      case 'categorization':
        return <Brain className="w-5 h-5" />;
      case 'learning':
        return <TrendingUp className="w-5 h-5" />;
      case 'ai-response':
        return <MessageSquare className="w-5 h-5" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'upload':
        return 'bg-blue-500';
      case 'ocr':
        return 'bg-purple-500';
      case 'parsing':
        return 'bg-green-500';
      case 'categorization':
        return 'bg-yellow-500';
      case 'learning':
        return 'bg-indigo-500';
      case 'ai-response':
        return 'bg-pink-500';
      case 'complete':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Employee Document Processor</h2>
            <p className="text-gray-600">Powered by Byte - Your Document Processing Wizard</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* File Upload Area */}
      {!selectedFile && !isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Drop your document here
          </h3>
          <p className="text-gray-600 mb-4">
            Supports PDF, CSV, JPG, PNG, GIF, and TXT files up to 10MB
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Choose File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.csv,.jpg,.jpeg,.png,.gif,.txt"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </motion.div>
      )}

      {/* Selected File */}
      {selectedFile && !isProcessing && !result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-gray-200 rounded-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getFileIcon(selectedFile)}
              <div>
                <h3 className="font-semibold text-gray-900">{selectedFile.name}</h3>
                <p className="text-sm text-gray-600">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type || 'Unknown type'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedFile(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <button
            onClick={processDocument}
            className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Zap className="w-5 h-5" />
            <span>Process with Byte AI</span>
          </button>
        </motion.div>
      )}

      {/* Processing Progress */}
      {isProcessing && currentProgress && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-gray-200 rounded-lg p-6 mb-6"
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className={`w-8 h-8 rounded-full ${getStageColor(currentProgress.stage)} flex items-center justify-center text-white`}>
              {getProgressIcon(currentProgress.stage)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{currentProgress.message}</h3>
              <p className="text-sm text-gray-600">Stage: {currentProgress.stage}</p>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <motion.div
              className={`h-2 rounded-full ${getStageColor(currentProgress.stage)}`}
              initial={{ width: 0 }}
              animate={{ width: `${currentProgress.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          <p className="text-sm text-gray-600">
            {currentProgress.progress}% complete
          </p>
        </motion.div>
      )}

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* AI Employee Response */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Byte's Response</h3>
                <p className="text-sm text-gray-600">AI Employee Analysis</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-gray-800 whitespace-pre-line">{result.aiResponse.response}</p>
            </div>

            {/* Technical Analysis */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{result.metadata.totalTransactions}</div>
                <div className="text-sm text-gray-600">Transactions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{result.metadata.categoriesFound}</div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(result.metadata.averageConfidence * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{result.metadata.flaggedForReview}</div>
                <div className="text-sm text-gray-600">Need Review</div>
              </div>
            </div>

            {/* Insights */}
            {result.aiResponse.insights && (
              <div className="space-y-3">
                {result.aiResponse.insights.spendingPatterns && result.aiResponse.insights.spendingPatterns.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Spending Patterns</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {result.aiResponse.insights.spendingPatterns.map((pattern, index) => (
                        <li key={index}>• {pattern}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.aiResponse.insights.recommendations && result.aiResponse.insights.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {result.aiResponse.insights.recommendations.map((rec, index) => (
                        <li key={index}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Questions */}
          {result.aiResponse.userQuestions && result.aiResponse.userQuestions.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Questions from Byte</h3>
              <div className="space-y-3">
                {result.aiResponse.userQuestions.map((question, index) => (
                  <div key={index} className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-blue-800">{question}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setSelectedFile(null);
                setResult(null);
                setCurrentProgress(null);
              }}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Process Another Document
            </button>
            <button
              onClick={() => {
                // Export results
                const dataStr = JSON.stringify(result, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `document-processing-result-${Date.now()}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Results</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AIEmployeeDocumentProcessor;
