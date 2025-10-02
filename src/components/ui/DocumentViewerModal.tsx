import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Eye, FileText, Image as ImageIcon, AlertCircle, Bot, Send, CheckCircle, Brain, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: {
    id: string;
    imageUrl?: string;
    originalFilename?: string;
    extractedData?: any;
    processingStatus?: string;
    createdAt?: string;
    ocrText?: string;
    redactedText?: string;
    redactionSummary?: string;
    ocrEngine?: string;
    ocrConfidence?: number;
  } | null;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  documentData
}) => {
  const [byteChatOpen, setByteChatOpen] = useState(false);
  const [byteMessages, setByteMessages] = useState<Array<{type: 'user' | 'byte', text: string, timestamp: string}>>([]);
  const [byteInput, setByteInput] = useState('');
  const [isByteProcessing, setIsByteProcessing] = useState(false);
  const [byteSuggestions, setByteSuggestions] = useState<{
    category?: string;
    subcategory?: string;
    tags?: string[];
    confidence?: number;
  } | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  if (!documentData) return null;

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [byteMessages]);

  // Initialize Byte AI when modal opens
  useEffect(() => {
    if (isOpen && documentData) {
      // Add welcome message from Byte
      const welcomeMessage = {
        type: 'byte' as const,
        text: `Hello! I'm Byte, your document processing AI. I can see you've uploaded a ${documentData.originalFilename || 'document'}. I can help you categorize this transaction, extract additional insights, and optimize your financial data. What would you like me to analyze?`,
        timestamp: new Date().toISOString()
      };
      setByteMessages([welcomeMessage]);
      
      // Auto-generate suggestions if we have extracted data
      if (documentData.extractedData) {
        generateByteSuggestions();
      }
    }
  }, [isOpen, documentData]);

  const generateByteSuggestions = () => {
    if (!documentData?.extractedData) return;
    
    const data = documentData.extractedData;
    const suggestions = {
      category: data.category || 'Food & Dining',
      subcategory: data.subcategory || 'Restaurant',
      tags: [data.vendor, data.category].filter(Boolean),
      confidence: 0.85
    };
    setByteSuggestions(suggestions);
  };

  const handleByteSubmit = async () => {
    if (!byteInput.trim() || isByteProcessing) return;

    const userMessage = {
      type: 'user' as const,
      text: byteInput,
      timestamp: new Date().toISOString()
    };

    setByteMessages(prev => [...prev, userMessage]);
    setByteInput('');
    setIsByteProcessing(true);

    // Simulate Byte AI response
    setTimeout(() => {
      const responses = [
        "I can see this is a receipt from a restaurant. Based on the amount and vendor, I suggest categorizing this as 'Food & Dining' with subcategory 'Restaurant'.",
        "Looking at the transaction data, I notice this could be tagged as 'Business Meal' if it's for work purposes, or 'Personal Dining' for personal use.",
        "I can help you set up automatic categorization rules for similar transactions from this vendor in the future.",
        "Would you like me to analyze the spending pattern and suggest budget optimizations?",
        "I can extract additional insights like tax amount, tip percentage, and spending trends if you'd like."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const byteResponse = {
        type: 'byte' as const,
        text: randomResponse,
        timestamp: new Date().toISOString()
      };

      setByteMessages(prev => [...prev, byteResponse]);
      setIsByteProcessing(false);
    }, 1500);
  };

  const handleApproveByteWork = async () => {
    if (!byteSuggestions) return;

    setIsApproving(true);
    toast.loading('Byte is processing your approval...', { id: 'byte-approval' });

    try {
      // Simulate Byte processing the approval
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update the document with Byte's suggestions
      const updatedSuggestions = {
        ...byteSuggestions,
        processedBy: 'byte',
        processedAt: new Date().toISOString(),
        status: 'approved'
      };

      setByteSuggestions(updatedSuggestions);
      
      toast.success('Byte has successfully processed and categorized your document!', { id: 'byte-approval' });
      
      // Add Byte's confirmation message
      const confirmationMessage = {
        type: 'byte' as const,
        text: `✅ Approved! I've successfully categorized this transaction as "${updatedSuggestions.category}" with ${updatedSuggestions.confidence! * 100}% confidence. The data has been updated in your financial records.`,
        timestamp: new Date().toISOString()
      };
      setByteMessages(prev => [...prev, confirmationMessage]);

    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error('Failed to process approval. Please try again.', { id: 'byte-approval' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDownload = () => {
    if (documentData.imageUrl) {
      const link = document.createElement('a');
      link.href = documentData.imageUrl;
      link.download = documentData.originalFilename || 'document';
      link.click();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <div
            className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl max-w-6xl max-h-[90vh] w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {documentData.originalFilename || 'Document'}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {documentData.createdAt && formatDate(documentData.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {documentData.imageUrl && (
                  <button
                    onClick={handleDownload}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    title="Download Document"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Document Image */}
                {documentData.imageUrl && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Document Image
                    </h3>
                    <div className="bg-gray-800 rounded-xl p-4">
                      <img
                        src={documentData.imageUrl}
                        alt={documentData.originalFilename || 'Document'}
                        className="w-full h-auto rounded-lg shadow-lg"
                        style={{ maxHeight: '400px', objectFit: 'contain' }}
                      />
                    </div>
                  </div>
                )}

                {/* Document Details */}
                <div className="space-y-6">
                  {/* Processing Status */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Processing Information</h3>
                    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          documentData.processingStatus === 'completed' 
                            ? 'bg-green-500/20 text-green-400' 
                            : documentData.processingStatus === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {documentData.processingStatus || 'Unknown'}
                        </span>
                      </div>
                      
                      {documentData.ocrEngine && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">OCR Engine:</span>
                          <span className="text-white text-sm">{documentData.ocrEngine}</span>
                        </div>
                      )}
                      
                      {documentData.ocrConfidence && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Confidence:</span>
                          <span className="text-white text-sm">
                            {(documentData.ocrConfidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Extracted Data */}
                  {documentData.extractedData && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Extracted Information</h3>
                      <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                        {documentData.extractedData.vendor && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Vendor:</span>
                            <span className="text-white text-sm">{documentData.extractedData.vendor}</span>
                          </div>
                        )}
                        {documentData.extractedData.total && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Total:</span>
                            <span className="text-white text-sm">${documentData.extractedData.total}</span>
                          </div>
                        )}
                        {documentData.extractedData.date && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Date:</span>
                            <span className="text-white text-sm">{documentData.extractedData.date}</span>
                          </div>
                        )}
                        {documentData.extractedData.category && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Category:</span>
                            <span className="text-white text-sm">{documentData.extractedData.category}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Byte AI Suggestions */}
                  {byteSuggestions && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-blue-400" />
                        Byte AI Suggestions
                      </h3>
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-blue-300">Category:</span>
                          <span className="text-white text-sm">{byteSuggestions.category}</span>
                        </div>
                        {byteSuggestions.subcategory && (
                          <div className="flex items-center justify-between">
                            <span className="text-blue-300">Subcategory:</span>
                            <span className="text-white text-sm">{byteSuggestions.subcategory}</span>
                          </div>
                        )}
                        {byteSuggestions.tags && byteSuggestions.tags.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-blue-300">Tags:</span>
                            <div className="flex gap-1">
                              {byteSuggestions.tags.map((tag, index) => (
                                <span key={index} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-blue-300">Confidence:</span>
                          <span className="text-white text-sm">
                            {((byteSuggestions.confidence || 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                        
                        {/* Approval Button */}
                        <button
                          onClick={handleApproveByteWork}
                          disabled={isApproving || byteSuggestions.status === 'approved'}
                          className={`w-full mt-3 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                            byteSuggestions.status === 'approved'
                              ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                              : isApproving
                              ? 'bg-blue-500/50 text-blue-300 cursor-not-allowed'
                              : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-105'
                          }`}
                        >
                          {byteSuggestions.status === 'approved' ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle className="w-4 h-4" />
                              Approved by Byte
                            </div>
                          ) : isApproving ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Processing...
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <Zap className="w-4 h-4" />
                              Approve Byte's Work
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Byte AI Chat */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Bot className="w-5 h-5 text-blue-400" />
                      Byte AI Assistant
                    </h3>
                    <button
                      onClick={() => setByteChatOpen(!byteChatOpen)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      {byteChatOpen ? <X className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </button>
                  </div>

                  {byteChatOpen && (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 h-96 flex flex-col">
                      {/* Chat Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {byteMessages.map((message, index) => (
                          <div
                            key={index}
                            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] p-3 rounded-lg ${
                                message.type === 'user'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-700 text-gray-200'
                              }`}
                            >
                              <p className="text-sm">{message.text}</p>
                              <p className="text-xs opacity-70 mt-1">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                        {isByteProcessing && (
                          <div className="flex justify-start">
                            <div className="bg-gray-700 text-gray-200 p-3 rounded-lg">
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                                Byte is thinking...
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Chat Input */}
                      <div className="p-4 border-t border-gray-700">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={byteInput}
                            onChange={(e) => setByteInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleByteSubmit()}
                            placeholder="Ask Byte about this document..."
                            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                            disabled={isByteProcessing}
                          />
                          <button
                            onClick={handleByteSubmit}
                            disabled={!byteInput.trim() || isByteProcessing}
                            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentViewerModal;
