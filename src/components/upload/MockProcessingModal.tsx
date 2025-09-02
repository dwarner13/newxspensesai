import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { MockDocumentProcessor, ProcessingStep, ProcessingResult } from '../../services/MockDocumentProcessor';

interface MockProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: ProcessingResult) => void;
  fileName: string;
}

export function MockProcessingModal({ isOpen, onClose, onComplete, fileName }: MockProcessingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [byteMessages, setByteMessages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDownload, setShowDownload] = useState(false);

  const processor = new MockDocumentProcessor();

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setCurrentStep(0);
      setProcessingSteps([]);
      setByteMessages([]);
      setIsProcessing(false);
      setShowDownload(false);
      
      // Start processing after a brief delay
      setTimeout(() => {
        startProcessing();
      }, 100);
    }
  }, [isOpen]);

  const startProcessing = async () => {
    setIsProcessing(true);
    setCurrentStep(0);
    setByteMessages([]);
    setShowDownload(false);

    try {
      // Create a mock file for processing
      const mockFile = new File(['mock content'], fileName, { type: 'text/csv' });
      const result = await processor.processDocument(mockFile);
      
      setProcessingSteps(result.processingSteps);
      setByteMessages(result.byteMessages);
      setShowDownload(true);
      
      // Complete processing - wait longer before auto-closing
      setTimeout(() => {
        setIsProcessing(false);
        // Don't auto-close, let user click "View Results"
      }, 2000);
      
    } catch (error) {
      console.error('Processing error:', error);
      setIsProcessing(false);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = processor.generateSampleCSV();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-bank-statement.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Byte's Document Processing</h2>
              <p className="text-sm text-slate-400">Processing: {fileName}</p>
            </div>
          </div>
                     <button
             onClick={onClose}
             className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
             disabled={isProcessing}
           >
             <X className="w-5 h-5 text-slate-400" />
           </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Byte's Messages */}
          <AnimatePresence>
            {byteMessages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.5 }}
                className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🤖</span>
                  </div>
                  <div>
                    <p className="text-blue-300 font-medium">Byte says:</p>
                    <p className="text-white mt-1">{message}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Processing Steps */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Processing Steps
            </h3>
            
            {processingSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.2 }}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  step.status === 'completed' 
                    ? 'bg-green-500/10 border-green-500/20' 
                    : step.status === 'processing'
                    ? 'bg-blue-500/10 border-blue-500/20'
                    : 'bg-slate-700/50 border-slate-600'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.status === 'completed' 
                    ? 'bg-green-500' 
                    : step.status === 'processing'
                    ? 'bg-blue-500'
                    : 'bg-slate-600'
                }`}>
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : step.status === 'processing' ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <span className="text-sm">{step.icon}</span>
                  )}
                </div>
                
                <div className="flex-1">
                  <p className={`font-medium ${
                    step.status === 'completed' ? 'text-green-300' : 
                    step.status === 'processing' ? 'text-blue-300' : 'text-slate-300'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-sm text-slate-400">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Download Sample */}
          {showDownload && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-700/50 border border-slate-600 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-white">Want to try with your own data?</h4>
                  <p className="text-sm text-slate-400">Download our sample CSV to see how it works</p>
                </div>
                <button
                  onClick={downloadSampleCSV}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Sample
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              {isProcessing ? 'Processing your document...' : 'Processing complete! Ready to view results.'}
            </div>
            {!isProcessing && (
              <button
                onClick={() => {
                  onComplete({
                    success: true,
                    transactions: [],
                    processingSteps: [],
                    byteMessages: [],
                    totalProcessed: 30,
                    categoriesFound: [],
                    insights: []
                  });
                  onClose();
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                View Results
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
