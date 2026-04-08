import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Eye, FileText, Image as ImageIcon, AlertCircle, Bot, Send, CheckCircle, Brain, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSupabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetryOcr?: (docId: string) => void;
  isRetryingOcr?: boolean;
  mode?: 'full' | 'preview';
  documentData: {
    id: string;
    imageUrl?: string | null;
    downloadUrl?: string | null;
    originalFilename?: string;
    mimeType?: string;
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
  onRetryOcr,
  isRetryingOcr = false,
  mode = 'full',
  documentData
}) => {
  const [byteChatOpen, setByteChatOpen] = useState(false);
  const [byteMessages, setByteMessages] = useState<Array<{type: 'user' | 'byte', text: string, timestamp: string}>>([]);
  const [byteInput, setByteInput] = useState('');
  const [isByteProcessing, setIsByteProcessing] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [byteSuggestions, setByteSuggestions] = useState<{
    category?: string;
    subcategory?: string;
    tags?: string[];
    confidence?: number;
  } | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { openChat } = useUnifiedChatLauncher();

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [byteMessages, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setPreviewFailed(false);
  }, [isOpen, documentData?.imageUrl]);

  useEffect(() => {
    if (!isOpen || !documentData) {
      setPdfBlobUrl(null);
      setPdfLoadError(false);
      setIsPdfLoading(false);
      return;
    }
    const fileName = documentData.originalFilename || '';
    const fileExt = fileName.split('.').pop()?.toLowerCase();
    const isPdf = documentData.mimeType === 'application/pdf' || fileExt === 'pdf';
    const url = documentData.downloadUrl || documentData.imageUrl || null;
    if (!isPdf || !url) {
      setPdfBlobUrl(null);
      setPdfLoadError(false);
      setIsPdfLoading(false);
      return;
    }

    let cancelled = false;
    if (url.startsWith('blob:')) {
      setPdfBlobUrl(url);
      setIsPdfLoading(false);
      setPdfLoadError(false);
      return;
    }
    setIsPdfLoading(true);
    setPdfLoadError(false);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('PDF fetch failed');
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(objectUrl);
        setIsPdfLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setPdfLoadError(true);
        setIsPdfLoading(false);
      });

    return () => {
      cancelled = true;
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [isOpen, documentData?.imageUrl, documentData?.downloadUrl, documentData?.mimeType, documentData?.originalFilename]);

  // Initialize Byte AI when modal opens
  useEffect(() => {
    if (!isOpen || !documentData) return;
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
    const url = documentData?.imageUrl || documentData?.downloadUrl || null;
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = documentData.originalFilename || 'document';
      link.click();
    }
  };

  const handlePurgeSource = async () => {
    if (!documentData?.id) return;
    if (!window.confirm('Delete the original document + OCR text? Transactions will be kept.')) {
      return;
    }

    setIsPurging(true);
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase not available');
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }
      const response = await fetch('/.netlify/functions/purge-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ uploadId: documentData.id }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to purge document');
      }
      toast.success('Source document deleted. Transactions kept.');
      onClose();
    } catch (err: any) {
      toast.error(`Failed to delete source document: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsPurging(false);
    }
  };

  const handleOpenInNewTab = () => {
    const url = documentData?.imageUrl || documentData?.downloadUrl || null;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleContinueInPrime = () => {
    const fileLabel = documentData?.originalFilename || 'this document';
    onClose();
    navigate('/dashboard/prime-chat');
    openChat({
      initialEmployeeSlug: 'prime-boss',
      force: true,
      routeHint: '/dashboard/prime-chat',
      initialQuestion: `I just reviewed ${fileLabel}. Continue from this upload and walk me through the key findings, categories, and what I should review next.`,
      context: {
        page: 'smart-import-ai',
        data: {
          source: 'document-viewer',
          documentId: documentData?.id,
          fileName: documentData?.originalFilename,
          mimeType: documentData?.mimeType,
        },
      },
    });
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

  if (!isOpen || !documentData) return null;

  const fileName = documentData.originalFilename || 'Document';
  const fileExt = fileName.split('.').pop()?.toLowerCase();
  const isPdf = documentData.mimeType === 'application/pdf' || fileExt === 'pdf';
  const previewUrl = documentData.downloadUrl || documentData.imageUrl || null;
  const summaryLines: string[] = [];
  const normalizedFields = documentData.extractedData?.fields || documentData.extractedData || null;
  const normalizedConfidence = documentData.extractedData?.confidence?.overall;
  if (documentData.extractedData) {
    if (documentData.extractedData.docType) {
      summaryLines.push(`Type: ${documentData.extractedData.docType}`);
    }
    if (normalizedFields?.merchant) {
      summaryLines.push(`Merchant: ${normalizedFields.merchant}`);
    }
    if (normalizedFields?.total) {
      summaryLines.push(`Total: $${normalizedFields.total}`);
    }
    if (normalizedFields?.date) {
      summaryLines.push(`Date: ${normalizedFields.date}`);
    }
    if (typeof normalizedConfidence === 'number') {
      summaryLines.push(`Confidence: ${(normalizedConfidence * 100).toFixed(1)}%`);
    }
    if (documentData.extractedData.needsUserConfirmation) {
      summaryLines.push('Needs confirmation: yes');
    }
  } else if (documentData.ocrText) {
    const trimmed = documentData.ocrText.trim();
    const preview = trimmed.length > 140 ? `${trimmed.slice(0, 140)}...` : trimmed;
    summaryLines.push(`OCR captured ${trimmed.length} characters`);
    if (preview) {
      summaryLines.push(`Preview: ${preview}`);
    }
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
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
                    {fileName}
                  </h2>
                  <p className="text-gray-400 text-sm">
                    {documentData.createdAt && formatDate(documentData.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleContinueInPrime}
                  className="px-3 py-1.5 text-xs rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 transition-colors"
                  title="Continue this in Prime chat"
                >
                  Continue in Prime
                </button>
                {previewUrl && (
                  <>
                    <button
                      onClick={handleOpenInNewTab}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                      title="Open in new tab"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleDownload}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                      title="Download Document"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </>
                )}
                <button
                  onClick={handlePurgeSource}
                  disabled={isPurging}
                  className={`p-2 text-red-300 hover:text-red-100 hover:bg-red-900/20 rounded-lg transition-colors ${
                    isPurging ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Delete source document (keep transactions)"
                >
                  <AlertCircle className="w-5 h-5" />
                </button>
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
              {mode === 'preview' ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Document Preview
                  </h3>
                  <div className="bg-gray-800 rounded-xl p-4">
                    {previewUrl && !previewFailed ? (
                      isPdf ? (
                        pdfBlobUrl ? (
                          <iframe
                            src={pdfBlobUrl}
                            title={fileName}
                            className="w-full rounded-lg shadow-lg"
                            style={{ height: '480px' }}
                          />
                        ) : isPdfLoading ? (
                          <div className="text-sm text-gray-300">Loading preview...</div>
                        ) : (
                          <div className="text-sm text-gray-300">
                            Preview blocked. Use the eye icon to open in a new tab.
                          </div>
                        )
                      ) : (
                        <img
                          src={previewUrl}
                          alt={fileName}
                          className="w-full h-auto rounded-lg shadow-lg"
                          style={{ maxHeight: '480px', objectFit: 'contain' }}
                          onError={() => setPreviewFailed(true)}
                        />
                      )
                    ) : (
                      <div className="text-sm text-gray-400">
                        Preview not available yet. Try again after processing completes.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Document Preview */}
                {previewUrl && !previewFailed ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Document Preview
                    </h3>
                    <div className="bg-gray-800 rounded-xl p-4">
                      {isPdf ? (
                        pdfBlobUrl ? (
                          <iframe
                            src={pdfBlobUrl}
                            title={fileName}
                            className="w-full rounded-lg shadow-lg"
                            style={{ height: '400px' }}
                          />
                        ) : isPdfLoading ? (
                          <div className="text-sm text-gray-300">Loading preview...</div>
                        ) : (
                          <div className="text-sm text-gray-300">
                            Preview blocked. Use the eye icon to open in a new tab.
                          </div>
                        )
                      ) : (
                        <img
                          src={previewUrl}
                          alt={fileName}
                          className="w-full h-auto rounded-lg shadow-lg"
                          style={{ maxHeight: '400px', objectFit: 'contain' }}
                          onError={() => setPreviewFailed(true)}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <ImageIcon className="w-5 h-5" />
                      Document Preview
                    </h3>
                    <div className="bg-gray-800 rounded-xl p-4 text-sm text-gray-400">
                      Preview not available yet. Try again after processing completes.
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
                      {(documentData.processingStatus === 'rejected' || documentData.processingStatus === 'failed') && onRetryOcr && (
                        <button
                          onClick={() => onRetryOcr(documentData.id)}
                          disabled={isRetryingOcr}
                          className={`w-full mt-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                            isRetryingOcr
                              ? 'bg-blue-500/30 text-blue-200 cursor-not-allowed'
                              : 'bg-blue-500/20 text-blue-100 hover:bg-blue-500/30'
                          }`}
                        >
                          {isRetryingOcr ? 'Retrying OCR...' : 'Retry OCR'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Byte Summary */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <Bot className="w-5 h-5 text-blue-400" />
                      Byte Summary
                    </h3>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
                      <p className="text-sm text-blue-100">
                        Here's what I found in your upload:
                      </p>
                      {summaryLines.length > 0 ? (
                        <ul className="text-sm text-blue-200 space-y-1">
                          {summaryLines.map((line, idx) => (
                            <li key={idx}>- {line}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-blue-200">
                          I'm still processing this document. Check back in a moment.
                        </p>
                      )}
                      <button
                        onClick={() => {
                          setByteChatOpen(true);
                          if (!byteInput) {
                            setByteInput('Summarize this document and highlight any issues.');
                          }
                        }}
                        className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-100 hover:bg-blue-500/30 transition-colors text-sm"
                      >
                        <Bot className="w-4 h-4" />
                        Ask Byte about this document
                      </button>
                    </div>
                  </div>

                  {/* Extracted Data */}
                  {documentData.extractedData ? (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Extracted Information</h3>
                      <div className="bg-gray-800 rounded-xl p-4 space-y-3">
                        {normalizedFields?.merchant && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Merchant:</span>
                            <span className="text-white text-sm">{normalizedFields.merchant}</span>
                          </div>
                        )}
                        {normalizedFields?.total && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Total:</span>
                            <span className="text-white text-sm">${normalizedFields.total}</span>
                          </div>
                        )}
                        {normalizedFields?.date && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Date:</span>
                            <span className="text-white text-sm">{normalizedFields.date}</span>
                          </div>
                        )}
                        {documentData.extractedData.docType && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Doc Type:</span>
                            <span className="text-white text-sm">{documentData.extractedData.docType}</span>
                          </div>
                        )}
                        {typeof normalizedConfidence === 'number' && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Confidence:</span>
                            <span className="text-white text-sm">{(normalizedConfidence * 100).toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">
                      No extracted data available yet.
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
              )}
            </div>
          </div>
        </div>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
};

export default DocumentViewerModal;
