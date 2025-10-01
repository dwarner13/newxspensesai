import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, FileText, CheckCircle, Loader2, Sparkles, Upload, Send, MessageCircle } from 'lucide-react';
import { MockDocumentProcessor, ProcessingStep, ProcessingResult } from '../../services/MockDocumentProcessor';

interface MockProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: ProcessingResult) => void;
  fileName: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'byte';
  content: string;
  timestamp: Date;
}

export function MockProcessingModal({ isOpen, onClose, onComplete, fileName }: MockProcessingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [byteMessages, setByteMessages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processor = new MockDocumentProcessor();

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setCurrentStep(0);
      setProcessingSteps([]);
      setByteMessages([]);
      setIsProcessing(false);
      setShowDownload(false);
      setChatMessages([]);
      setShowChat(false);
      
      // Start processing after a brief delay
      setTimeout(() => {
        startProcessing();
      }, 100);
    }
  }, [isOpen]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Auto-scroll processing content to bottom
  useEffect(() => {
    const contentArea = document.querySelector('.processing-content-area');
    if (contentArea) {
      contentArea.scrollTop = contentArea.scrollHeight;
    }
  }, [byteMessages, processingSteps]);

  const startProcessing = async () => {
    setIsProcessing(true);
    setCurrentStep(0);
    setByteMessages([]);
    setShowDownload(false);

    try {
      // Create a mock file for processing
      const mockFile = new File(['mock content'], fileName, { type: 'text/csv' });
      
      // Get the processing steps but don't set them all at once
      const result = await processor.processDocument(mockFile);
      
      // Process steps one by one with delays to show the action
      for (let i = 0; i < result.processingSteps.length; i++) {
        const step = result.processingSteps[i];
        
        // Update overall progress
        const progress = ((i + 1) / result.processingSteps.length) * 100;
        setOverallProgress(progress);
        
        // Add the step to the list
        setProcessingSteps(prev => [...prev, { ...step, status: 'processing' }]);
        
        // Add Byte's message for this step
        if (result.byteMessages[i]) {
          setByteMessages(prev => [...prev, result.byteMessages[i]]);
        }
        
        // Show processing animation for longer
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mark step as completed with dramatic effect
        setProcessingSteps(prev => 
          prev.map((s, idx) => 
            idx === i ? { ...s, status: 'completed' } : s
          )
        );
        
        // Add a completion message for this step
        const stepCompletionMessages = [
          `✅ ${step.title} completed successfully!`,
          `🎉 ${step.title} is now finished!`,
          `✨ ${step.title} has been processed!`,
          `🚀 ${step.title} is complete!`
        ];
        const randomMessage = stepCompletionMessages[Math.floor(Math.random() * stepCompletionMessages.length)];
        setByteMessages(prev => [...prev, randomMessage]);
        
        // Wait before moving to next step
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
      
      // Add remaining Byte messages
      const remainingMessages = result.byteMessages.slice(result.processingSteps.length);
      for (const message of remainingMessages) {
        setByteMessages(prev => [...prev, message]);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setShowDownload(true);
      
      // Complete processing
      setTimeout(() => {
        setIsProcessing(false);
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

  const downloadSamplePDF = () => {
    // Generate PDF content using jsPDF or similar library
    // For now, we'll create a simple text-based PDF-like structure
    const pdfContent = generateSamplePDFContent();
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-bank-statement.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const generateSamplePDFContent = () => {
    // This is a simplified PDF content generation
    // In a real implementation, you'd use a library like jsPDF
    const csvContent = processor.generateSampleCSV();
    const pdfHeader = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 750 Td
(Sample Bank Statement) Tj
/F1 10 Tf
50 720 Td
${csvContent.split('\n').map(line => `(${line}) Tj 0 -15 Td`).join('\n')}
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000184 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
300
%%EOF`;
    
    return pdfHeader;
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    // Simulate Byte's response
    setTimeout(() => {
      const byteResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'byte',
        content: generateByteResponse(userMessage.content),
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, byteResponse]);
      setIsChatLoading(false);
    }, 1000 + Math.random() * 1000);
  };

  const generateByteResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('upload') || input.includes('file') || input.includes('document')) {
      return "Absolutely! I can help you upload more documents. Just click the upload button or drag and drop files into the upload area. I support PDFs, CSVs, images, and more!";
    }
    
    if (input.includes('categor') || input.includes('organize')) {
      return "Great question! I automatically categorize your transactions based on merchant names, amounts, and patterns. I've already organized your recent upload - would you like me to explain any specific categories?";
    }
    
    if (input.includes('duplicate') || input.includes('repeat')) {
      return "I'm excellent at finding duplicates! I check for matching amounts, dates, and merchant names. In your recent upload, I found and handled any duplicates automatically.";
    }
    
    if (input.includes('help') || input.includes('how')) {
      return "I'm here to help with all your document processing needs! I can upload files, categorize transactions, find duplicates, and answer questions about your financial data. What would you like to know?";
    }
    
    if (input.includes('thank') || input.includes('thanks')) {
      return "You're very welcome! I love helping organize financial data - it's what I do best! Feel free to upload more documents or ask me anything else.";
    }
    
    // Default responses
    const responses = [
      "That's a great question! I'm here to help with all your document processing needs. What specific aspect would you like to know more about?",
      "I'm processing your data with precision! Is there anything specific about your transactions you'd like me to explain?",
      "I love talking about data organization! What would you like to know about your processed documents?",
      "I'm here to help! Whether it's uploading more files, explaining categories, or answering questions about your data - just ask!"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    // Simulate processing
    setTimeout(() => {
      setUploadProgress(100);
      setIsUploading(false);
      
      // Add Byte's response about the new upload
      const byteMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'byte',
        content: `Excellent! I just processed ${files.length} new file(s). I'm analyzing the data now and will have everything organized for you shortly!`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, byteMessage]);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 3000);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div
        className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ position: 'relative', zIndex: 10000 }}
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
               {isProcessing && (
                 <div className="mt-2">
                   <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                     <span>Overall Progress</span>
                     <span>{Math.round(overallProgress)}%</span>
                   </div>
                   <div className="w-full bg-slate-700 rounded-full h-1.5">
                     <div 
                       className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                       style={{ width: `${overallProgress}%` }}
                     />
                   </div>
                 </div>
               )}
             </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className={`p-2 rounded-lg transition-colors ${
                showChat ? 'bg-blue-600 text-white' : 'hover:bg-slate-700 text-slate-400'
              }`}
              title="Chat with Byte"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              disabled={isProcessing}
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
                     {/* Left Column - Processing Results */}
           <div className="flex-1 p-6 space-y-6 overflow-y-auto processing-content-area">
          {/* Byte's Messages */}
          
            {byteMessages.map((message, index) => (
              <div
                key={index}
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
              </div>
            ))}
          

          {/* Processing Steps */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Processing Steps
            </h3>
            
            {processingSteps.map((step, index) => (
              <div
                key={step.step}
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
              </div>
            ))}
          </div>

          {/* Download Sample */}
          {showDownload && (
            <div
              className="bg-slate-700/50 border border-slate-600 rounded-lg p-4"
            >
              <div>
                <h4 className="font-medium text-white mb-3">Want to try with your own data?</h4>
                <p className="text-sm text-slate-400 mb-4">Download our sample files to see how it works</p>
                
                <div className="flex gap-3">
                  <button
                    onClick={downloadSampleCSV}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </button>
                  
                  <button
                    onClick={downloadSamplePDF}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Right Column - Chat Interface */}
          {showChat && (
            <div className="w-80 border-l border-slate-700 flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-sm">🤖</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Chat with Byte</h3>
                    <p className="text-xs text-slate-400">Your AI processing assistant</p>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-2xl mb-2">🤖</div>
                    <p className="text-slate-400 text-sm">Start a conversation with Byte!</p>
                    <p className="text-slate-500 text-xs mt-1">Ask about your data or upload more files</p>
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-white border border-slate-600'
                        }`}
                      >
                        {message.role === 'byte' && (
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs">🤖</span>
                            <span className="text-xs text-blue-300 font-medium">Byte</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                    </div>
                  ))
                )}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700 text-white border border-slate-600 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-xs">Byte is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Upload Area */}
              <div className="p-4 border-t border-slate-700">
                <div className="mb-3">
                  <button
                    onClick={handleFileUpload}
                    disabled={isUploading}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600 rounded-lg transition-colors"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Uploading... {uploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Upload More Files</span>
                      </>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.csv,.xlsx,.jpg,.png,.jpeg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Chat Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Ask Byte anything..."
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500"
                    disabled={isChatLoading}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
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
                  // Pass the actual processed data from the processor
                  const processedData = processor.getLastProcessedData();
                  onComplete({
                    success: true,
                    transactions: processedData?.transactions || [],
                    processingSteps: processedData?.processingSteps || [],
                    byteMessages: processedData?.byteMessages || [],
                    totalProcessed: processedData?.totalProcessed || 30,
                    categoriesFound: processedData?.categoriesFound || [],
                    insights: processedData?.insights || []
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
      </div>
    </div>,
    document.body
  );
}
