import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Send, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  X, 
  Bot, 
  User, 
  Loader2,
  Eye,
  Download,
  CheckCircle,
  AlertCircle,
  Brain,
  Sparkles,
  UploadCloud,
  FileCheck,
  DollarSign,
  Calendar,
  Tag,
  MessageCircle,
  Plus,
  History,
  FolderOpen
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { AIEmployeeOrchestrator } from '../../../systems/AIEmployeeOrchestrator';
import { getEmployeePersonality, generateEmployeeResponse } from '../../../systems/EmployeePersonalities';
import { processImageWithSmartOCR, SmartOCRResult } from '../../../utils/smartOCRManager';
import { redactDocument, generateAIEmployeeNotification } from '../../../utils/documentRedaction';
import { processLargeFile, getFileRecommendations, ProcessingProgress } from '../../../utils/largeFileProcessor';
import { AIService } from '../../../services/AIService';
import { WorkerJobResult } from '../../../services/WorkerService';
import { BYTE_KNOWLEDGE_BASE, BYTE_RESPONSES } from '../../../ai-knowledge/byte-knowledge-base';
import { CRYSTAL_KNOWLEDGE_BASE, CRYSTAL_RESPONSES, CRYSTAL_PERSONALITY } from '../../../ai-knowledge/crystal-knowledge-base';
import { CHAT_ENDPOINT, verifyChatBackend } from '../../../lib/chatEndpoint';
import toast from 'react-hot-toast';
import type { SmartDocType, NormalizedTransaction, ProcessedDocument as SmartProcessedDocument } from '../../../types/smartImport';
import { buildDocumentSummary, buildCompletionMessage } from '../../../types/smartImport';
import { buildByteReviewMessage, getUncategorizedTransactions, buildCategorizationHelpMessage } from '../../../utils/byteReview';
import type { ProcessedDocumentContext, PrimeAction } from '../../../types/processedDocument';
import { getDocTypeLabel, formatCurrency } from '../../../types/processedDocument';
import { buildPrimeFollowUpMessage, handleAddToTransactions, handleAnalyzePeriod, handleImproveRules, handleAskQuestion, saveCategorizationRules } from '../../../utils/primeFlows';
import { 
  buildVendorCategorizationState, 
  updateVendorCategory, 
  buildVendorCategorizationPrompt,
  buildCategorizationCompleteMessage,
  STANDARD_CATEGORIES,
  type VendorCategorizationState 
} from '../../../utils/categorizationFlow';
import {
  getOrCreateSmartImportConversation,
  getRecentSmartImportDocuments,
  buildDocumentContextMessage,
  buildWelcomeMessage,
  saveDocumentMemory,
  updateConversationTimestamp,
  loadSessionMessages,
  type SmartImportDocument,
} from '../../../services/smartImportConversation';
import { DEMO_USER_ID, getUserId } from '../../../constants/demoUser';

// Smart Import Phase 2: Import All Button Component
interface ImportAllButtonProps {
  importId?: string;
  transactionCount: number;
  userId: string;
}

const ImportAllButton: React.FC<ImportAllButtonProps> = ({ importId, transactionCount, userId }) => {
  const [isImporting, setIsImporting] = useState(false);
  const navigate = useNavigate();

  const handleImportAll = async () => {
    if (!importId) {
      toast.error('Import ID not available. Please try uploading the document again.');
      return;
    }

    setIsImporting(true);

    try {
      // SECURITY: Send userId in header, not in body
      // Backend will validate this matches the authenticated user
      const response = await fetch('/.netlify/functions/commit-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId, // Send userId in header for secure auth
        },
        body: JSON.stringify({
          importId, // Only send importId in body
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        // Handle specific error codes
        const errorMessage = data.error === 'already_committed'
          ? 'These transactions have already been imported.'
          : data.error === 'no_transactions_in_staging'
          ? 'No transactions found to import.'
          : data.error === 'no_import_found'
          ? 'Import not found. Please try uploading again.'
          : data.message || 'Failed to import transactions. Please try again.';
        
        toast.error(errorMessage);
        console.error('[ImportAllButton] Commit import failed:', data);
        return;
      }

      // Success
      const committedCount = data.insertedCount || data.committed || transactionCount;
      toast.success(`Imported ${committedCount} transaction${committedCount !== 1 ? 's' : ''} into your XspensesAI Transactions.`);
      
      // Dispatch event to refresh Transactions page
      // DashboardTransactionsPage listens for this event and will refresh automatically
      window.dispatchEvent(new CustomEvent('transactionsImported', {
        detail: { 
          count: committedCount, 
          importId: data.importId,
          documentId: data.documentId 
        }
      }));
      
      // Optionally navigate to transactions page after a short delay
      setTimeout(() => {
        navigate('/dashboard/transactions');
      }, 1500);

    } catch (error) {
      console.error('[ImportAllButton] Error calling commit-import:', error);
      toast.error('Failed to import transactions. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!importId) {
    return (
      <button 
        disabled
        className="px-3 py-1 bg-gray-500 text-white rounded text-xs font-medium opacity-50 cursor-not-allowed"
        title="Import ID not available"
      >
        ✅ Import All
      </button>
    );
  }

  return (
    <button
      onClick={handleImportAll}
      disabled={isImporting}
      className="px-3 py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
    >
      {isImporting ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          Importing...
        </>
      ) : (
        '✅ Import All'
      )}
    </button>
  );
};

interface ProcessedDocument {
  id: string;
  filename: string;
  type: 'image' | 'pdf' | 'csv';
  uploadDate: string;
  extractedText?: string;
  transactions?: {
    id: string;
    date: string;
    description: string;
    amount: number;
    category: string;
  }[];
  analysis?: any;
  fileUrl?: string;
  processingMethod?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'prime' | 'byte' | 'crystal' | 'tag' | 'ledger' | 'blitz' | 'goalie' | 'system';
  content: string;
  timestamp: string;
  attachments?: {
    type: 'image' | 'document';
    url: string;
    filename: string;
    extractedText?: string;
    redactedText?: string;
    analysis?: any;
  }[];
  hasAction?: boolean;
  actionType?: 'crystal_handoff';
  actions?: PrimeAction[]; // Prime action buttons
  transactions?: {
    id: string;
    date: string;
    description: string;
    amount: number;
    category: string;
  }[];
  processing?: boolean;
  documentId?: string; // Link to processed document
  importId?: string; // Smart Import Phase 2: importId for commit-import
  documentContext?: ProcessedDocumentContext; // Store document context for Prime actions
}

interface ByteDocumentChatProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentProcessed?: (doc: SmartProcessedDocument) => void; // Callback to notify parent
  defaultDocType?: SmartDocType; // Default docType for uploads from this chat
}

export const ByteDocumentChat: React.FC<ByteDocumentChatProps> = ({
  isOpen,
  onClose,
  onDocumentProcessed,
  defaultDocType = 'generic_document'
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploadProcessing, setIsUploadProcessing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  // Upload state machine: "idle" | "uploading" | "processing" | "error"
  type UploadState = "idle" | "uploading" | "processing" | "error";
  // Upload queue: track multiple files being processed concurrently
  interface UploadJob {
    id: string;
    fileName: string;
    state: 'uploading' | 'processing' | 'completed' | 'error';
    progress?: number;
    messageId?: string; // ID of the chat message showing this upload
    error?: string;
  }
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [currentProcessingFileName, setCurrentProcessingFileName] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<UploadJob[]>([]);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  // activeAI is now defined above with URL integration
  const [hasShownCrystalSummary, setHasShownCrystalSummary] = useState(false);
  const [uploadedFileCount, setUploadedFileCount] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0});
  const [dragActive, setDragActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [processedDocuments, setProcessedDocuments] = useState<ProcessedDocument[]>([]);
  const [showDocumentHistory, setShowDocumentHistory] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ProcessedDocument | null>(null);
  const [activeDocumentContext, setActiveDocumentContext] = useState<ProcessedDocumentContext | null>(null); // Current document context for Prime actions
  const [categorizationState, setCategorizationState] = useState<VendorCategorizationState[] | null>(null); // Vendor categorization flow state
  const [currentVendorIndex, setCurrentVendorIndex] = useState<number>(0); // Current vendor being categorized
  const [categorizedVendorsMap, setCategorizedVendorsMap] = useState<Map<string, { category: string; count: number }>>(new Map()); // Track categorized vendors
  // ============================================================================
  // SHARED SESSION MANAGEMENT (Phase 1 - All Employees Share Same Session)
  // ============================================================================
  // All employees (Prime, Byte, Crystal, Tag) share the same chat session and history.
  // Only the speaker (employeeSlug) changes when switching tabs.
  // Session is persisted in localStorage and URL query param.
  // URL integration: /dashboard/smart-import-ai?employee=prime&chatSession=<sessionId>
  // ============================================================================
  
  type EmployeeId = 'prime' | 'byte' | 'crystal' | 'tag' | 'ledger' | 'blitz' | 'goalie';
  
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Initialize activeAI from URL or default to 'prime'
  const urlEmployee = searchParams.get('employee') as EmployeeId | null;
  const initialEmployee = (urlEmployee && ['prime', 'byte', 'crystal', 'tag', 'ledger', 'blitz', 'goalie'].includes(urlEmployee)) 
    ? urlEmployee 
    : 'prime';
  
  const [activeAI, setActiveAI] = useState<EmployeeId>(initialEmployee);
  
  // SHARED SESSION: Single sessionId for all employees
  const [sharedSessionId, setSharedSessionId] = useState<string | null>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false); // Track if welcome message was shown
  const [recentDocuments, setRecentDocuments] = useState<SmartImportDocument[]>([]); // Recent documents for context
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const orchestrator = useRef(new AIEmployeeOrchestrator());

  // Privacy notice session tracking
  const SESSION_KEY = 'smartImport.redactionNoticeShown';
  const [hasShownRedactionNotice, setHasShownRedactionNotice] = useState(
    typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1'
  );

  const markRedactionNoticeShown = () => {
    setHasShownRedactionNotice(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, '1');
    }
  };

  const showPrivacyNotice = () => {
    if (hasShownRedactionNotice) {
      return; // Already shown in this session
    }

    const privacyNotice: ChatMessage = {
      id: `privacy-notice-${Date.now()}`,
      type: 'prime',
      content: "🔒 **Privacy notice**\n\nOur AI employee team has automatically redacted personal information (such as account numbers, addresses, and phone numbers) from your document.\n\nOnly normalized transaction data and non-identifying details are stored and used going forward in this session.",
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, privacyNotice]);
    markRedactionNoticeShown();
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close plus menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPlusMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.plus-menu-container')) {
          setShowPlusMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPlusMenu]);

  // Load shared sessionId from localStorage or URL on mount
  const hasLoadedSessionRef = useRef(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && !hasLoadedSessionRef.current) {
      // Check URL first (for deep linking)
      const urlSessionId = searchParams.get('chatSession');
      if (urlSessionId) {
        setSharedSessionId(urlSessionId);
        hasLoadedSessionRef.current = true;
        return;
      }
      
      // Fall back to localStorage
      const stored = localStorage.getItem('smartImport_sharedSessionId');
      if (stored) {
        setSharedSessionId(stored);
        hasLoadedSessionRef.current = true;
      } else {
        hasLoadedSessionRef.current = true;
      }
    }
  }, [searchParams]);

  // Save shared sessionId to localStorage and URL whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && sharedSessionId) {
      localStorage.setItem('smartImport_sharedSessionId', sharedSessionId);
      
      // Update URL without page reload
      const newParams = new URLSearchParams(searchParams);
      newParams.set('chatSession', sharedSessionId);
      setSearchParams(newParams, { replace: true });
    }
  }, [sharedSessionId, searchParams, setSearchParams]);

  // Sync activeAI with URL changes (e.g., browser back/forward)
  // Note: This effect only responds to external URL changes, not our own updates
  useEffect(() => {
    const urlEmployee = searchParams.get('employee') as EmployeeId | null;
    if (urlEmployee && ['prime', 'byte', 'crystal', 'tag', 'ledger', 'blitz', 'goalie'].includes(urlEmployee) && urlEmployee !== activeAI) {
      // Only switch if URL changed externally (not by our own handleEmployeeSwitch)
      handleEmployeeSwitch(urlEmployee);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Handle employee tab click - switch active employee WITHOUT resetting messages
  const handleEmployeeSwitch = async (employeeId: EmployeeId) => {
    // Don't switch if already on this employee
    if (employeeId === activeAI) return;
    
    // Simply change the active employee - messages stay the same
    setActiveAI(employeeId);
    
    // Update URL without page reload
    const newParams = new URLSearchParams(searchParams);
    newParams.set('employee', employeeId);
    // Keep chatSession in URL if it exists
    if (sharedSessionId) {
      newParams.set('chatSession', sharedSessionId);
    }
    setSearchParams(newParams, { replace: true });
    
    // No need to load different messages - we're sharing the same session!
    // The backend will use the same sessionId but route to the new employeeSlug
  };

  // Initialize shared conversation when component opens
  // NOTE: This only runs when isOpen changes or on initial mount, NOT when activeAI changes
  // (activeAI changes are handled by handleEmployeeSwitch and don't reset messages)
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (isOpen && !hasInitializedRef.current && user && hasLoadedSessionRef.current) {
      hasInitializedRef.current = true;
      const initializeConversation = async () => {
        try {
          const userId = getUserId(user?.id);
          
          // Use existing shared sessionId if available, otherwise create new one
          let sessionId = sharedSessionId;
          
          if (!sessionId) {
            // Create new shared session (use 'prime' as default employee for session creation)
            sessionId = await getOrCreateSmartImportConversation(userId, 'prime');
            setSharedSessionId(sessionId);
          }
          
          // Load messages for this shared session
          const loadedMessages = await loadSessionMessages(sessionId);
          
          if (loadedMessages.length > 0) {
            // Convert loaded messages to ChatMessage format
            const chatMessages: ChatMessage[] = loadedMessages.map(msg => ({
              id: msg.id,
              type: msg.type as ChatMessage['type'],
              content: msg.content,
              timestamp: msg.timestamp,
            }));
            setMessages(chatMessages);
            setHasShownWelcome(true);
          } else {
            // No history - only show welcome if we don't have any messages
            if (messages.length === 0) {
              const recentDocs = await getRecentSmartImportDocuments(userId, 3);
              setRecentDocuments(recentDocs);
              
              const welcomeText = buildWelcomeMessage(recentDocs);
              const welcomeMessage: ChatMessage = {
                id: `welcome-${activeAI}-${Date.now()}`,
                type: activeAI,
                content: welcomeText,
                timestamp: new Date().toISOString()
              };
              setMessages([welcomeMessage]);
              setHasShownWelcome(true);
            }
          }
        } catch (error) {
          console.error('[ByteDocumentChat] Failed to initialize conversation:', error);
          // Fallback: show default welcome only if no messages
          if (messages.length === 0) {
            const welcomeMessage: ChatMessage = {
              id: `fallback-${activeAI}-${Date.now()}`,
              type: activeAI,
              content: `👑 Hello! I'm ${activeAI === 'prime' ? 'Prime' : activeAI}, your AI assistant. How can I help you today?`,
              timestamp: new Date().toISOString()
            };
            setMessages([welcomeMessage]);
          }
        }
      };
      
      initializeConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user, sharedSessionId]); // Only run when isOpen changes, NOT when activeAI changes

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) {
      console.log('Message blocked: No message content');
      return;
    }

    // Check if we're in question mode (activeDocumentContext is set)
    if (activeDocumentContext) {
      await handleUserQuestion(inputMessage.trim());
      setInputMessage('');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Use the AI Employee Orchestrator for proper routing
      console.log('Message routing debug:', {
        activeAI,
        inputMessage: inputMessage.substring(0, 50)
      });
      
      // Route the message through the orchestrator
      const response = await orchestrator.current.routeMessage(inputMessage, { messages, user});
      
      if (response.shouldHandoff && response.handoff) {
        // Execute handoff to another employee
        orchestrator.current.executeHandoff(response.handoff);
        setActiveAI(response.handoff.to as any);
        
        // Show handoff message
        const handoffMessage: ChatMessage = {
          id: `handoff-${Date.now()}`,
          type: response.handoff.to as any,
          content: response.message,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, handoffMessage]);
        
        // Get the new employee's response (uses shared sessionId)
        const newEmployeeResponse = await getEmployeeResponse(response.handoff.to, inputMessage);
        const messageId = (Date.now() + 1).toString();
        await typewriterResponse(newEmployeeResponse.content, messageId, newEmployeeResponse.employeeSlug);
      } else {
        // Handle response from current employee (uses shared sessionId)
        const employeeResponse = await getEmployeeResponse(activeAI, inputMessage);
        const messageId = (Date.now() + 1).toString();
        await typewriterResponse(employeeResponse.content, messageId, employeeResponse.employeeSlug);
      }
      
      setIsProcessing(false);
    } catch (error) {
      console.error('Message handling error:', error);
      
      // Fallback to current employee
      const fallbackResponse = await getEmployeeResponse(activeAI, inputMessage);
      const messageId = (Date.now() + 1).toString();
      await typewriterResponse(fallbackResponse.content, messageId, fallbackResponse.employeeSlug);
      setIsProcessing(false);
    }
  };

  // Map employee IDs to canonical employee slugs
  const mapEmployeeIdToSlug = (employeeId: string): string => {
    const mapping: Record<string, string> = {
      'prime': 'prime-boss',
      'byte': 'byte-doc',
      'crystal': 'crystal-ai',
      'tag': 'tag-ai',
      'ledger': 'ledger-tax',
      'goalie': 'goalie-coach',
      'blitz': 'blitz-debt',
    };
    return mapping[employeeId.toLowerCase()] || 'prime-boss';
  };

  // Get employee-specific response by calling the guarded chat endpoint
  // POST /.netlify/functions/chat with employeeSlug, message, userId, sessionId
  // Uses SHARED sessionId for all employees - only employeeSlug changes
  const getEmployeeResponse = async (employeeId: string, userMessage: string): Promise<{ content: string; employeeSlug: string }> => {
    const personality = getEmployeePersonality(employeeId);
    if (!personality) return { content: "I'm here to help!", employeeSlug: 'prime-boss' };

    // Map employee ID to canonical slug (e.g., 'prime' -> 'prime-boss')
    const employeeSlug = mapEmployeeIdToSlug(employeeId);
    
    // Get userId from auth context or use default
    const userId = getUserId(user?.id);
    
    // Use SHARED sessionId for all employees (create if needed)
    let sessionId = sharedSessionId;
    
    if (!sessionId) {
      // Create new shared session (use 'prime' as default)
      sessionId = await getOrCreateSmartImportConversation(userId, 'prime');
      setSharedSessionId(sessionId);
    }
    
    // Build context from recent documents for Prime
    let contextMessage = '';
    if (employeeSlug === 'prime-boss' && recentDocuments.length > 0) {
      contextMessage = buildDocumentContextMessage(recentDocuments);
    }
    
    // Update conversation timestamp
    if (sessionId) {
      await updateConversationTimestamp(sessionId);
    }
    
    try {
      console.log('[ByteDocumentChat] Calling chat endpoint:', CHAT_ENDPOINT, {
        employeeSlug,
        userId,
        sessionId,
        messageLength: userMessage.length,
        hasContext: contextMessage.length > 0
      });
      
      // Call the guarded chat endpoint
      // Request: POST /.netlify/functions/chat
      // Body: { userId, employeeSlug, message, sessionId, stream: true }
      const response = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          employeeSlug,
          message: contextMessage ? `${contextMessage}\n\n${userMessage}` : userMessage,
          sessionId,
          stream: true, // Enable streaming for real-time responses
        }),
      });
      
      // Verify we're hitting the correct backend
      verifyChatBackend(response);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('[ByteDocumentChat] Chat endpoint error:', response.status, errorText);
        throw new Error(`Chat failed: ${response.status} ${errorText}`);
      }
      
      // Extract employee from response header (X-Employee)
      const responseEmployeeHeader = response.headers.get('X-Employee') || employeeSlug;
      // Map header back to employeeId if needed
      const responseEmployeeId = responseEmployeeHeader.includes('prime') ? 'prime' :
                                  responseEmployeeHeader.includes('byte') ? 'byte' :
                                  responseEmployeeHeader.includes('crystal') ? 'crystal' :
                                  responseEmployeeHeader.includes('tag') ? 'tag' :
                                  responseEmployeeHeader.includes('ledger') ? 'ledger' :
                                  responseEmployeeHeader.includes('goalie') ? 'goalie' :
                                  responseEmployeeHeader.includes('blitz') ? 'blitz' :
                                  employeeId;
      
      // Handle streaming response (SSE format)
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') || contentType.includes('application/x-ndjson')) {
        // Stream the response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          throw new Error('No response body');
        }
        
        let buffer = '';
        let assembledContent = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Parse SSE lines
          let idx;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const rawEvent = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 2);
            
            // Only handle "data:" lines
            const dataLine = rawEvent.split('\n').find(l => l.startsWith('data:'));
            if (!dataLine) continue;
            
            try {
              const payload = JSON.parse(dataLine.replace(/^data:\s*/, ''));
              
              // Save sessionId if returned from backend (shared for all employees)
              if (payload.sessionId && !sharedSessionId) {
                setSharedSessionId(payload.sessionId);
              }
              
              if (payload.type === 'token' && payload.token) {
                assembledContent += payload.token;
              } else if (payload.type === 'done') {
                // Stream complete
                break;
              }
            } catch (parseErr) {
              console.warn('[ByteDocumentChat] SSE parse error:', parseErr);
            }
          }
        }
        
        return { 
          content: assembledContent || "I'm here to help!", 
          employeeSlug: responseEmployeeHeader 
        };
      } else {
        // Non-streaming response (shouldn't happen, but handle it)
        const data = await response.json().catch(() => ({}));
        
        // Save sessionId if returned from backend (shared for all employees)
        if (data.sessionId && !sharedSessionId) {
          setSharedSessionId(data.sessionId);
        }
        
        return { 
          content: data.content || data.message || "I'm here to help!", 
          employeeSlug: responseEmployeeHeader 
        };
      }
    } catch (error) {
      console.error('[ByteDocumentChat] Error calling chat endpoint:', error);
      
      // Fallback to local response generation if API fails
      const fallbackContent = generateEmployeeResponse(employeeId, userMessage, { messages, user});
      return { content: fallbackContent, employeeSlug };
    }
  };

  // Typewriter effect for AI responses
  // employeeSlugFromResponse: The actual employee that responded (from X-Employee header)
  const typewriterResponse = async (text: string, messageId: string, employeeSlugFromResponse?: string) => {
    const words = text.split(' ');
    let currentText = '';
    
    // Determine which employee actually responded (from header or fallback to activeAI)
    let respondingEmployeeId: EmployeeId = activeAI;
    if (employeeSlugFromResponse) {
      // Map employee slug back to employeeId
      if (employeeSlugFromResponse.includes('prime')) respondingEmployeeId = 'prime';
      else if (employeeSlugFromResponse.includes('byte')) respondingEmployeeId = 'byte';
      else if (employeeSlugFromResponse.includes('crystal')) respondingEmployeeId = 'crystal';
      else if (employeeSlugFromResponse.includes('tag')) respondingEmployeeId = 'tag';
      else if (employeeSlugFromResponse.includes('ledger')) respondingEmployeeId = 'ledger';
      else if (employeeSlugFromResponse.includes('goalie')) respondingEmployeeId = 'goalie';
      else if (employeeSlugFromResponse.includes('blitz')) respondingEmployeeId = 'blitz';
    }
    
    const typingMessage: ChatMessage = {
      id: messageId,
      type: respondingEmployeeId, // Tag message with actual responding employee
      content: `${getEmployeePersonality(respondingEmployeeId)?.emoji || '🤖'} ${getEmployeePersonality(respondingEmployeeId)?.name || 'AI'} is thinking...`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, typingMessage]);
    
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: currentText + (i < words.length - 1 ? '|' : '') }
          : msg
      ));
      const delay = Math.random() * 150 + 50;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Final update - ensure message is tagged with correct employee
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: currentText, type: respondingEmployeeId }
        : msg
    ));
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  // Process files with OCR
  const processFiles = async (files: File[], docType?: SmartDocType) => {
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'text/csv'];
      return validTypes.includes(file.type) || file.name.toLowerCase().endsWith('.csv') && file.size <= 10 * 1024 * 1024; // 10MB limit
    });

    if (validFiles.length === 0) {
      toast.error('Please upload valid files (JPG, PNG, PDF, CSV) under 10MB');
      return;
    }

    // Add user message for each file
    validFiles.forEach(file => {
      const userMessage: ChatMessage = {
        id: `upload-${Date.now()}-${file.name}`,
        type: 'user',
        content: `📄 Uploaded: ${file.name}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
    });

    // Process each file with OCR, using the provided docType or defaultDocType
    for (const file of validFiles) {
      try {
        await processFileWithOCR(file, docType);
      } catch (error) {
        // Error handling is done inside processFileWithOCR, but ensure state resets
        console.error('Error processing file:', error);
      } finally {
        // Always reset to idle after each file completes (success or failure)
        setUploadState("idle");
        setCurrentProcessingFileName(null);
      }
    }
  };

  // Save processed document to history
  const saveProcessedDocument = (file: File, transactions: any[], extractedText?: string, processingMethod?: string) => {
    const document: ProcessedDocument = {
      id: `doc-${Date.now()}-${file.name}`,
      filename: file.name,
      type: file.type === 'application/pdf' ? 'pdf' : file.type.startsWith('image/') ? 'image' : 'csv',
      uploadDate: new Date().toISOString(),
      extractedText,
      transactions,
      processingMethod,
      fileUrl: URL.createObjectURL(file) // Create local URL for viewing
    };
    
    setProcessedDocuments(prev => [document, ...prev]);
    return document.id;
  };

  // Process single file with worker backend (now supports concurrent processing)
  const processFileWithOCR = async (file: File, docType?: SmartDocType, jobId?: string) => {
    // Use provided docType, or defaultDocType, or infer from file
    const finalDocType: SmartDocType = docType || defaultDocType || 
      (file.type === 'application/pdf' ? 'bank_statement' : 
       file.name.toLowerCase().endsWith('.csv') ? 'csv' : 
       file.type.startsWith('image/') ? 'receipt' : // Images default to receipt
       'receipt');
    
    // Map SmartDocType to worker docType (worker only supports 'receipt' | 'bank_statement')
    const workerDocType: 'receipt' | 'bank_statement' = 
      finalDocType === 'receipt' ? 'receipt' : 'bank_statement';
    
    // Find or create upload job
    const job = jobId ? uploadQueue.find(j => j.id === jobId) : null;
    const messageId = `processing-${Date.now()}-${Math.random()}`;
    
    // Update job state to uploading
    if (job) {
      setUploadQueue(prev => prev.map(j => 
        j.id === jobId 
          ? { ...j, state: 'uploading', messageId }
          : j
      ));
    }
    
    // Add processing message
    const processingMessage: ChatMessage = {
      id: messageId,
      type: 'byte',
      content: `🔍 Analyzing ${file.name}...`,
      processing: true,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, processingMessage]);

    try {
      const userId = getUserId(user?.id);

      // Upload to worker backend
      const uploadResult = await AIService.uploadDocument(file, userId, workerDocType, true);
      
      // Transition to "processing" state once file is uploaded and job is created
      if (jobId) {
        setUploadQueue(prev => prev.map(j => 
          j.id === jobId 
            ? { ...j, state: 'processing', progress: 10 }
            : j
        ));
      }
      
      // Start polling for progress
      let progressMessage = processingMessage;
      
      await AIService.pollJobProgress(
        uploadResult.document_id,
        // Progress callback
        (progress: ProcessingProgress) => {
          const progressUpdate: ChatMessage = {
            ...progressMessage,
            content: `🔍 ${progress.message} (${progress.progress}%)`,
            processing: progress.stage !== 'complete'
          };
          
          setMessages(prev => prev.map(msg => 
            msg.id === progressMessage.id ? progressUpdate : msg
          ));
          
          // Update job progress
          if (jobId) {
            setUploadQueue(prev => prev.map(j => 
              j.id === jobId 
                ? { ...j, progress: progress.progress, state: 'processing' }
                : j
            ));
          }
          
          progressMessage = progressUpdate;
        },
        // Complete callback
        async (result: WorkerJobResult) => {
          try {
            const DEMO_MODE = import.meta.env.VITE_SMART_IMPORT_DEMO === 'true';
            
            // Get transactions from result (worker now includes transactions array)
            const parsedTransactions: NormalizedTransaction[] = result.transactions || [];
            const mockTransactions = DEMO_MODE ? await AIService.getTransactions(result.documentId) : [];
            
            // Determine which transactions to show
            const transactionsToShow = DEMO_MODE
              ? (parsedTransactions.length > 0 ? parsedTransactions : mockTransactions)
              : parsedTransactions;
            
            // Use parsed transaction count, not mock count
            const transactionCount = parsedTransactions.length || result.transactionCount || 0;
            
            // Save document to history (legacy format for chat component)
            const documentId = saveProcessedDocument(file, transactionsToShow, undefined, 'Worker Backend Processing');

            // Show privacy notice FIRST (only once per session) before transaction results
            showPrivacyNotice();

            // Build Byte's review message with analysis and summary (if available)
            let reviewMessage: string;
            if (result.analysis && result.transactionCount > 0) {
              // Use the comprehensive review message with analysis
              reviewMessage = buildByteReviewMessage(finalDocType, file.name, result);
            } else if (result.transactionCount === 0) {
              // Zero transactions - use the zero-transaction message
              reviewMessage = buildByteReviewMessage(finalDocType, file.name, result);
            } else {
              // Fallback to simple completion message if analysis not available
              reviewMessage = buildCompletionMessage(finalDocType, file.name, transactionCount);
            }

            // Update with final results - use review message instead of simple completion
            // Include importId from worker result for Smart Import Phase 2 commit-import
            const resultMessage: ChatMessage = {
              id: `result-${Date.now()}`,
              type: 'byte',
              content: reviewMessage,
              transactions: transactionsToShow,
              documentId: documentId,
              importId: (result as any).importId, // Smart Import Phase 2: importId from worker
              timestamp: new Date().toISOString()
            };

            setMessages(prev => prev.map(msg => 
              msg.id === progressMessage.id ? resultMessage : msg
            ));
            
            // Mark job as completed
            if (jobId) {
              setUploadQueue(prev => prev.map(j => 
                j.id === jobId 
                  ? { ...j, state: 'completed', progress: 100 }
                  : j
              ));
              
              // Remove completed job from queue after 3 seconds
              setTimeout(() => {
                setUploadQueue(prev => prev.filter(j => j.id !== jobId));
              }, 3000);
            }

            // Check for uncategorized transactions and add help message
            const uncategorized = getUncategorizedTransactions(result);
            
            // Create ProcessedDocumentContext for Prime actions
            let documentContext: ProcessedDocumentContext | null = null;
            if (result.analysis && transactionCount > 0) {
              documentContext = {
                docId: uploadResult.document_id || `job-${Date.now()}`,
                fileName: file.name,
                docType: finalDocType,
                uploadedAt: new Date().toISOString(),
                transactions: transactionsToShow,
                analysis: result.analysis,
              };
              
              // Store as active context for Prime actions
              setActiveDocumentContext(documentContext);
              
              // Trigger Prime's follow-up message with action buttons
              setTimeout(() => {
                const primeFollowUp = buildPrimeFollowUpMessage(documentContext!);
                const primeMessage: ChatMessage = {
                  id: `prime-followup-${Date.now()}`,
                  type: 'prime',
                  content: primeFollowUp.content,
                  actions: primeFollowUp.actions,
                  documentContext: documentContext!,
                  timestamp: new Date().toISOString(),
                };
                setMessages(prev => [...prev, primeMessage]);
              }, 1000); // Small delay after Byte's message
            }
            
            // Show categorization help message if needed
            if (uncategorized && uncategorized.count > 0 && documentContext) {
              setTimeout(() => {
                const helpMessage: ChatMessage = {
                  id: `categorization-help-${Date.now()}`,
                  type: 'byte',
                  content: buildCategorizationHelpMessage(uncategorized),
                  actions: [
                    { type: 'prime_ask_question', label: 'Yes, let\'s categorize now', docId: documentId },
                    { type: 'prime_skip_rules', label: 'Skip for now', docId: documentId },
                  ],
                  documentContext: documentContext,
                  timestamp: new Date().toISOString(),
                };
                setMessages(prev => [...prev, helpMessage]);
              }, 2000); // Show after Prime's message
            }

            // Create ProcessedDocument for Smart Import AI page
            const processedDoc: SmartProcessedDocument = {
              id: uploadResult.document_id || `job-${Date.now()}`,
              fileName: file.name,
              docType: finalDocType,
              uploadedAt: new Date().toISOString(),
              transactionCount,
              transactions: transactionsToShow,
              summary: buildDocumentSummary(finalDocType, transactionCount, file.name),
              jobId: uploadResult.document_id,
              documentId: result.documentId,
              // Duplicate detection info
              isDuplicate: result.isDuplicate || false,
              existingDocumentId: result.existingDocumentId,
              // Debug data
              redactedText: result.redactedText,
            };

            // Notify parent component about processed document
            if (onDocumentProcessed) {
              onDocumentProcessed(processedDoc);
            }
            
            // Show duplicate warning if detected
            if (result.isDuplicate && result.existingDocumentId) {
              toast(`This document appears to be a duplicate of one you already uploaded.`, { 
                icon: '⚠️',
                duration: 5000,
              });
            }

            // Save document memory for future recall
            if (conversationId && result.analysis) {
              const topCategories = result.analysis.byCategory
                ?.slice(0, 5)
                .map((cat: any) => cat.category)
                .filter((cat: string) => cat && cat !== 'Uncategorized') || [];
              
              await saveDocumentMemory({
                userId,
                conversationId,
                documentId: uploadResult.document_id || processedDoc.id,
                fileName: file.name,
                docType: finalDocType,
                transactionCount,
                totalDebits: result.analysis.totalDebits || 0,
                totalCredits: result.analysis.totalCredits || 0,
                periodStart: result.analysis.period?.startDate || null,
                periodEnd: result.analysis.period?.endDate || null,
                summary: result.summary || null,
                topCategories,
              });
              
              // Refresh recent documents list
              const updatedDocs = await getRecentSmartImportDocuments(userId, 3);
              setRecentDocuments(updatedDocs);
            }

            if (transactionCount > 0) {
              toast.success(`Processed ${file.name} - found ${transactionCount} transactions`);
            } else {
              toast(`Processed ${file.name} - no transactions found`, { icon: 'ℹ️' });
            }
            
            // Success: Reset upload state to idle
            setUploadState("idle");
            setCurrentProcessingFileName(null);
          } catch (error) {
            console.error('Error getting transactions:', error);
            // Reset state even on error
            setUploadState("error");
            setTimeout(() => {
              setUploadState("idle");
              setCurrentProcessingFileName(null);
            }, 2000); // Brief error state, then back to idle
            throw error;
          }
        },
        // Error callback
        (error: string) => {
          const errorMessage: ChatMessage = {
            id: `error-${Date.now()}`,
            type: 'byte',
            content: `❌ Failed to process ${file.name}. ${error}`,
            timestamp: new Date().toISOString()
          };

          setMessages(prev => prev.map(msg => 
            msg.id === progressMessage.id ? errorMessage : msg
          ));

          toast.error(`Failed to process ${file.name}`);
          
          // Error: Set to error state, then reset to idle after brief delay
          setUploadState("error");
          setTimeout(() => {
            setUploadState("idle");
            setCurrentProcessingFileName(null);
          }, 2000);
        }
      );

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'byte',
        content: `❌ Failed to upload ${file.name}. ${error instanceof Error ? error.message : 'Please try again.'}`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => prev.map(msg => 
        msg.id === processingMessage.id ? errorMessage : msg
      ));
      
      // Upload error: Set to error state, then reset to idle
      setUploadState("error");
      setTimeout(() => {
        setUploadState("idle");
        setCurrentProcessingFileName(null);
      }, 2000);
    }
  };

  // Smart PDF processing: Text extraction first, then OCR if needed
  const processPDFSmart = async (file: File) => {
    try {
      // Step 1: Try to extract text directly from PDF
      const text = await extractTextFromPDF(file);
      
      if (text && text.length > 100) {
        // Text extraction successful
        const transactions = extractTransactionsFromText(text);
        return {
          transactions,
          method: 'PDF Text Extraction'
        };
      } else {
        // Step 2: Convert PDF to images and OCR
        const images = await convertPDFToImages(file);
        let allTransactions: any[] = [];
        
        for (const image of images) {
          const transactions = await processImageOCR(image);
          allTransactions = [...allTransactions, ...transactions];
        }
        
        return {
          transactions: allTransactions,
          method: 'PDF → Image → OCR'
        };
      }
    } catch (error) {
      throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Extract text from PDF using PDF.js
  const extractTextFromPDF = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // Dynamic import PDF.js
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
          
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
          }
          
          resolve(fullText);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Convert PDF to images using PDF.js
  const convertPDFToImages = async (file: File): Promise<File[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
          
          const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          
          const images: File[] = [];
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) { // Limit to 5 pages for memory
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            await page.render({
              canvasContext: ctx!,
              viewport: viewport
            }).promise;
            
            // Convert canvas to blob
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
              const imageFile = new File([blob], `page-${i}.png`, { type: 'image/png' });
              images.push(imageFile);
            }
          }
          
          resolve(images);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Process image with Tesseract.js OCR
  const processImageOCR = async (file: File) => {
    try {
      const Tesseract = await import('tesseract.js');
      
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      return extractTransactionsFromText(text);
    } catch (error) {
      throw new Error(`Image OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Process CSV/Excel files
  const processDataFile = async (file: File) => {
    // This would parse CSV/Excel files
    // For now, return mock data
    return [
      {
        id: `txn-${Date.now()}-1`,
        date: new Date().toLocaleDateString(),
        description: 'CSV Transaction',
        amount: 25.00,
        category: 'Business'
      }
    ];
  };

  // Extract transactions from text (from Local OCR Tester)
  const extractTransactionsFromText = (text: string): any[] => {
    const transactions: any[] = [];
    const seenAmounts = new Set();
    
    // Clean text
    const cleaned = text.replace(/\s+/g, ' ').trim().slice(0, 6000);
    
    // Find dollar amounts
    const dollarAmounts = cleaned.match(/\$(\d+[\d,]*\.?\d*)/g);
    
    if (dollarAmounts) {
      const sortedAmounts = dollarAmounts.sort((a, b) => {
        const amountA = parseFloat(a.replace(/[$,]/g, ''));
        const amountB = parseFloat(b.replace(/[$,]/g, ''));
        return amountB - amountA;
      });
      
      sortedAmounts.forEach((match) => {
        const amount = parseFloat(match.replace(/[$,]/g, ''));
        
        if (amount > 0.01 && amount < 10000 && !seenAmounts.has(amount)) {
          seenAmounts.add(amount);
          
          // Find context around this amount
          const amountIndex = cleaned.indexOf(match);
          const beforeText = cleaned.substring(Math.max(0, amountIndex - 80), amountIndex).trim();
          
          // Extract description
          const words = beforeText.split(/\s+/).filter(word => 
            word.length > 2 && 
            !word.match(/^[^\w]*$/) && 
            !word.match(/^\d+$/)
          );
          
          const description = words.length > 0 
            ? words.slice(-3).join(' ') 
            : `Transaction - $${amount}`;
          
          transactions.push({
            id: `txn-${Date.now()}-${transactions.length}`,
            date: new Date().toLocaleDateString(),
            description: description,
            amount: amount,
            category: 'Uncategorized'
          });
        }
      });
    }
    
    return transactions.slice(0, 20); // Limit to 20 transactions
  };

  const handleFileUpload = async (files: FileList, docType?: SmartDocType) => {
    const fileArray = Array.from(files);
    
    // Create upload jobs for each file
    const newJobs: UploadJob[] = fileArray.map(file => ({
      id: `upload-${Date.now()}-${Math.random()}`,
      fileName: file.name,
      state: 'uploading',
      progress: 0,
    }));
    
    // Add jobs to queue
    setUploadQueue(prev => [...prev, ...newJobs]);
    
    // Process all files concurrently (don't await - let them run in parallel)
    fileArray.forEach((file, index) => {
      processFileWithOCR(file, docType, newJobs[index].id).catch(error => {
        console.error(`[ByteDocumentChat] Failed to process ${file.name}:`, error);
        setUploadQueue(prev => prev.map(job => 
          job.id === newJobs[index].id 
            ? { ...job, state: 'error', error: error.message || 'Processing failed' }
            : job
        ));
      });
    });
  };

  // Helper to update category breakdown after categorization
  const updateCategoryBreakdown = (
    currentBreakdown: Array<{ category: string; count: number; totalAmount: number }>,
    newCategory: string,
    transactionCount: number
  ): Array<{ category: string; count: number; totalAmount: number }> => {
    const breakdown = [...currentBreakdown];
    const existingIndex = breakdown.findIndex(c => c.category === newCategory);
    
    if (existingIndex >= 0) {
      breakdown[existingIndex] = {
        ...breakdown[existingIndex],
        count: breakdown[existingIndex].count + transactionCount,
      };
    } else {
      breakdown.push({
        category: newCategory,
        count: transactionCount,
        totalAmount: 0, // Would need to calculate from transactions
      });
    }
    
    return breakdown.sort((a, b) => b.count - a.count);
  };

  // Handle Prime action button clicks
  const handlePrimeAction = async (action: PrimeAction, message: ChatMessage) => {
    const context = message.documentContext || activeDocumentContext;
    if (!context) {
      console.error('[PrimeAction] No document context available');
      return;
    }

    const userId = getUserId(user?.id);
    let responseMessage: string = '';
    let followUpActions: PrimeAction[] | undefined;

    try {
      switch (action.type) {
        case 'prime_add_to_transactions':
          responseMessage = await handleAddToTransactions(context, userId);
          break;

        case 'prime_analyze_period':
          responseMessage = await handleAnalyzePeriod(context, userId);
          break;

        case 'prime_improve_rules':
          const rulesResult = handleImproveRules(context);
          responseMessage = rulesResult.message;
          if (rulesResult.candidateRules.length > 0) {
            followUpActions = [
              {
                type: 'prime_save_rules',
                label: 'Yes, save these rules',
                docId: context.docId,
                payload: rulesResult.candidateRules,
              },
              {
                type: 'prime_skip_rules',
                label: 'No, skip',
                docId: context.docId,
              },
            ];
          }
          break;

        case 'prime_save_rules':
          if (action.payload) {
            const success = await saveCategorizationRules(action.payload, userId);
            responseMessage = success
              ? `Great. I've saved these rules and will apply them automatically on your future imports.`
              : `I encountered an issue saving the rules. Please try again.`;
          }
          break;

        case 'prime_skip_rules':
          responseMessage = `No problem. I'll keep using your existing categories without adding new rules.`;
          break;

        case 'prime_ask_question':
          // Check if this is actually a categorization request
          if (action.label?.includes('categorize now')) {
            // Start interactive categorization flow
            const uncategorized = getUncategorizedTransactions({
              transactionCount: context.transactions.length,
              transactions: context.transactions,
            } as any);
            
            if (uncategorized && uncategorized.count > 0) {
              const vendorStates = buildVendorCategorizationState(context.transactions);
              if (vendorStates.length > 0) {
                setCategorizationState(vendorStates);
                setCurrentVendorIndex(0);
                setCategorizedVendorsMap(new Map()); // Reset tracking
                
                const firstVendor = vendorStates[0];
                responseMessage = buildVendorCategorizationPrompt(firstVendor);
                followUpActions = [
                  ...STANDARD_CATEGORIES.slice(0, 6).map(cat => ({
                    type: 'prime_categorize_vendor' as const,
                    label: cat,
                    docId: context.docId,
                    payload: { vendor: firstVendor.vendor, category: cat, transactionIds: firstVendor.transactionIds },
                  })),
                  {
                    type: 'prime_categorize_vendor' as const,
                    label: 'Other / Custom',
                    docId: context.docId,
                    payload: { vendor: firstVendor.vendor, category: 'CUSTOM', transactionIds: firstVendor.transactionIds },
                  },
                ];
              } else {
                responseMessage = `All transactions are already categorized!`;
              }
            } else {
              responseMessage = `All transactions are already categorized!`;
            }
          } else {
            // Set active context for questions
            setActiveDocumentContext(context);
            responseMessage = `Sure. Ask me anything about this document — for example:
- "Why was this month more expensive than usual?"
- "How much did I spend on Restaurants?"
- "Show me all transactions over $200."`;
          }
          break;

        case 'prime_categorize_vendor':
          if (action.payload && categorizationState) {
            const { vendor, category, transactionIds } = action.payload;
            const userId = getUserId(user?.id);
            
            // Handle custom category input
            let finalCategory = category;
            if (category === 'CUSTOM') {
              // For now, use "Other" - in future could prompt for custom input
              finalCategory = 'Other';
            }
            
            // Update vendor category
            const updateResult = await updateVendorCategory(
              userId,
              context.docId,
              vendor,
              finalCategory,
              transactionIds
            );
            
            if (updateResult.success) {
              // Track this vendor's categorization
              setCategorizedVendorsMap(prev => {
                const newMap = new Map(prev);
                newMap.set(vendor, { category: finalCategory, count: updateResult.updatedCount });
                return newMap;
              });
              
              // Update local transactions
              const updatedTransactions = context.transactions.map(txn => {
                if (transactionIds.includes(txn.id || '')) {
                  return { ...txn, category: finalCategory };
                }
                return txn;
              });
              
              // Update context
              const updatedContext = {
                ...context,
                transactions: updatedTransactions,
                analysis: {
                  ...context.analysis,
                  byCategory: updateCategoryBreakdown(context.analysis.byCategory, finalCategory, transactionIds.length),
                },
              };
              setActiveDocumentContext(updatedContext);
              
              // Move to next vendor or complete
              const nextIndex = currentVendorIndex + 1;
              if (nextIndex < categorizationState.length) {
                setCurrentVendorIndex(nextIndex);
                const nextVendor = categorizationState[nextIndex];
                responseMessage = `Got it — I'll categorize **${vendor}** as **${finalCategory}** from now on.\n\nI've updated ${updateResult.updatedCount} transaction${updateResult.updatedCount !== 1 ? 's' : ''} in this document.\n\n${buildVendorCategorizationPrompt(nextVendor)}`;
                followUpActions = [
                  ...STANDARD_CATEGORIES.slice(0, 6).map(cat => ({
                    type: 'prime_categorize_vendor' as const,
                    label: cat,
                    docId: context.docId,
                    payload: { vendor: nextVendor.vendor, category: cat, transactionIds: nextVendor.transactionIds },
                  })),
                  {
                    type: 'prime_categorize_vendor' as const,
                    label: 'Other / Custom',
                    docId: context.docId,
                    payload: { vendor: nextVendor.vendor, category: 'CUSTOM', transactionIds: nextVendor.transactionIds },
                  },
                ];
              } else {
                // All vendors categorized - build summary with tracked categories
                const categorizedVendors: Array<{ vendor: string; category: string; count: number }> = [];
                
                // Use tracked categories
                categorizationState.forEach(vs => {
                  const tracked = categorizedVendorsMap.get(vs.vendor);
                  if (tracked) {
                    categorizedVendors.push({
                      vendor: vs.vendor,
                      category: tracked.category,
                      count: tracked.count,
                    });
                  } else if (vs.vendor === vendor) {
                    // Fallback for current vendor
                    categorizedVendors.push({
                      vendor: vs.vendor,
                      category: finalCategory,
                      count: updateResult.updatedCount,
                    });
                  }
                });
                
                setCategorizationState(null);
                setCurrentVendorIndex(0);
                setCategorizedVendorsMap(new Map());
                responseMessage = buildCategorizationCompleteMessage(categorizedVendors);
              }
            } else {
              responseMessage = `I encountered an issue updating the category. Please try again.`;
            }
          }
          break;

        default:
          responseMessage = `I'm not sure how to handle that action. Please try again.`;
      }

      // Add Prime's response message
      const primeResponse: ChatMessage = {
        id: `prime-response-${Date.now()}`,
        type: 'prime',
        content: responseMessage,
        actions: followUpActions,
        documentContext: context,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, primeResponse]);
    } catch (error) {
      console.error('[PrimeAction] Error handling action:', error);
      const errorMessage: ChatMessage = {
        id: `prime-error-${Date.now()}`,
        type: 'prime',
        content: `I encountered an issue processing that request. Please try again.`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Handle user questions when activeDocumentContext is set
  const handleUserQuestion = async (question: string) => {
    if (!activeDocumentContext) {
      return; // Not in question mode
    }

    const userId = getUserId(user?.id);
    const answer = await handleAskQuestion(question, activeDocumentContext, userId);

    const primeAnswer: ChatMessage = {
      id: `prime-answer-${Date.now()}`,
      type: 'prime',
      content: answer,
      documentContext: activeDocumentContext,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, primeAnswer]);
  };

  // Handle quick action button clicks
  const handleChatWithByte = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    
    setIsProcessing(true);
    
    // Simulate Byte's response
    setTimeout(() => {
      const byteMessage: ChatMessage = {
        id: `byte-${Date.now()}`,
        type: 'byte',
        content: `Got it! I'm ready to help with ${message.toLowerCase().includes('transaction') ? 'your transactions' : 'document processing'}. What would you like me to do?`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, byteMessage]);
      setIsProcessing(false);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-2 sm:p-4">
      <div className={`bg-gray-900 rounded-lg w-full flex flex-col ${
        isMobile ? 'h-[95vh] max-w-full' : 'h-[90vh] max-w-4xl'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Sparkles size={isMobile ? 16 : 20} className="text-white font-bold" />
            </div>
            <h2 className={`font-bold text-white ${isMobile ? 'text-lg' : 'text-xl'}`}>AI Employee Team</h2>
          </div>
          
          {/* AI Employee Switcher */}
          <div className="flex items-center gap-1 sm:gap-2">
              <div 
                className={`flex bg-gray-800 rounded-lg p-1 employee-tabs ${
                  isMobile ? 'max-w-[200px]' : ''
                }`}
                style={{
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <style>
                  {`
                    .employee-tabs::-webkit-scrollbar {
                      display: none;
                    }
                  `}
                </style>
                <button
                  onClick={() => handleEmployeeSwitch('prime')}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    activeAI === 'prime'
                      ? 'bg-yellow-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
                  {isMobile ? 'P' : 'Prime'}
                </button>
                <button
                  onClick={() => handleEmployeeSwitch('byte')}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    activeAI === 'byte'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
                  {isMobile ? 'B' : 'Byte'}
                </button>
                <button
                  onClick={() => handleEmployeeSwitch('crystal')}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    activeAI === 'crystal'
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
                  {isMobile ? 'C' : 'Crystal'}
                </button>
                <button
                  onClick={() => handleEmployeeSwitch('tag')}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    activeAI === 'tag'
                      ? 'bg-green-500 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  <Tag className="w-3 h-3 sm:w-4 sm:h-4" />
                  {isMobile ? 'T' : 'Tag'}
                </button>
                {!isMobile && (
                  <>
                    <button
                      onClick={() => handleEmployeeSwitch('ledger')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                        activeAI === 'ledger'
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Ledger
                    </button>
                    <button
                      onClick={() => handleEmployeeSwitch('blitz')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                        activeAI === 'blitz'
                          ? 'bg-red-500 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Blitz
                    </button>
                    <button
                      onClick={() => handleEmployeeSwitch('goalie')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                        activeAI === 'goalie'
                          ? 'bg-indigo-500 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      Goalie
                    </button>
                  </>
                )}
              </div>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Messages with Drag & Drop */}
        <div 
          className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 relative ${
            dragActive ? 'bg-blue-500/10' : ''
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Subtle Drag & Drop Hint */}
          {messages.length <= 1 && !dragActive && (
            <div className="text-center py-12">
              <div className="text-gray-500">
                <UploadCloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Drop documents here or use the + button below</p>
              </div>
            </div>
          )}

          {/* Drag Overlay */}
          {dragActive && (
            <div className="absolute inset-0 bg-blue-500/20 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-10">
              <div className="text-center">
                <UploadCloud className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                <p className="text-blue-300 font-medium">Drop your documents here!</p>
                <p className="text-blue-200 text-sm">I'll process them instantly</p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.type === 'prime'
                    ? 'bg-yellow-500/20 text-yellow-100 border border-yellow-500/30'
                    : message.type === 'byte'
                    ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30'
                    : message.type === 'crystal'
                    ? 'bg-purple-500/20 text-purple-100 border border-purple-500/30'
                    : message.type === 'tag'
                    ? 'bg-green-500/20 text-green-100 border border-green-500/30'
                    : message.type === 'ledger'
                    ? 'bg-orange-500/20 text-orange-100 border border-orange-500/30'
                    : message.type === 'blitz'
                    ? 'bg-red-500/20 text-red-100 border border-red-500/30'
                    : message.type === 'goalie'
                    ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30'
                    : 'bg-gray-700 text-gray-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {message.type !== 'user' && (
                    <span className="text-xs sm:text-sm font-medium">
                      {getEmployeePersonality(message.type)?.emoji || '🤖'} {getEmployeePersonality(message.type)?.name || 'AI'}
                    </span>
                  )}
                  <span className="text-xs opacity-70">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</div>
                
                {/* Prime Action Buttons */}
                {message.actions && message.actions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.actions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePrimeAction(action, message)}
                        className="w-full px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 rounded-lg text-left text-sm text-yellow-100 transition-colors"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Transaction Results */}
                {message.transactions && message.transactions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium text-green-300 mb-2">
                      📊 Found {message.transactions.length} transactions:
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {message.transactions.map((txn) => (
                        <div key={txn.id} className="flex items-center justify-between bg-white/10 rounded p-2 text-xs">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{txn.description}</div>
                            <div className="text-gray-300 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {txn.date}
                              <Tag className="w-3 h-3 ml-2" />
                              {txn.category}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-green-300 font-bold">
                            <DollarSign className="w-3 h-3" />
                            {txn.amount.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <ImportAllButton 
                        importId={message.importId}
                        transactionCount={message.transactions?.length || 0}
                        userId={getUserId(user?.id)}
                      />
                      <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors">
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                )}

                {/* Processing Indicator */}
                {message.processing && (
                  <div className="mt-2 flex items-center gap-2 text-blue-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Processing...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.xls,.txt"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          className="hidden"
        />

        {/* Multiple Upload Status Indicators */}
        {uploadQueue.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-700 bg-gray-800/50">
            <div className="max-w-4xl mx-auto space-y-2">
              {uploadQueue.map((job) => (
                <div key={job.id} className="flex items-center gap-2 text-sm text-gray-300">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="flex-1">
                    {job.state === "uploading" 
                      ? `Uploading ${job.fileName}...`
                      : job.state === "processing"
                      ? `Processing ${job.fileName}... ${job.progress ? `(${job.progress}%)` : ''}`
                      : job.state === "error"
                      ? `❌ ${job.fileName}: ${job.error || 'Failed'}`
                      : `✅ ${job.fileName} completed`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ChatGPT-Style Input Area */}
        <div className="p-4 border-t border-gray-700 bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <div className="relative plus-menu-container">
              {/* Main Input Container */}
              <div className="flex items-end gap-3 bg-gray-800 rounded-2xl border border-gray-600 hover:border-gray-500 transition-colors p-3">
                {/* Plus Button */}
                <button
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  className="flex-shrink-0 w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
                  title="Attach file (you can upload multiple files and chat while they process)"
                >
                  <Plus className="w-4 h-4 text-gray-300" />
                </button>

                {/* Text Input */}
                <div className="flex-1 min-w-0">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && !isProcessing) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Message ${getEmployeePersonality(activeAI)?.name || 'AI'}...`}
                    className="w-full bg-transparent text-white placeholder-gray-400 resize-none border-none outline-none text-sm leading-6 max-h-32"
                    rows={1}
                    disabled={isProcessing}
                    style={{
                      height: 'auto',
                      minHeight: '24px'
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendMessage}
                  disabled={isProcessing || !inputMessage.trim()}
                  className="flex-shrink-0 w-8 h-8 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>

              {/* Plus Menu Dropdown */}
              {showPlusMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-800 border border-gray-600 rounded-xl shadow-xl z-10 min-w-64">
                  <div className="p-2">
                    <div className="text-xs text-gray-400 mb-2 px-2">Upload & Actions</div>
                    
                    {/* Upload Options */}
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <UploadCloud className="w-5 h-5 text-blue-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Upload Documents</div>
                        <div className="text-gray-400 text-xs">PDF, JPG, PNG, CSV files</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveAI('byte');
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <FileText className="w-5 h-5 text-green-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Process Receipts</div>
                        <div className="text-gray-400 text-xs">OCR & extract transactions</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveAI('crystal');
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <Brain className="w-5 h-5 text-purple-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Get Insights</div>
                        <div className="text-gray-400 text-xs">Analyze spending patterns</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveAI('tag');
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <Tag className="w-5 h-5 text-orange-400" />
                      <div>
                        <div className="text-white text-sm font-medium">Auto-Categorize</div>
                        <div className="text-gray-400 text-xs">Smart transaction tagging</div>
                      </div>
                    </button>

                    <div className="border-t border-gray-600 my-2"></div>

                    <button
                      onClick={() => {
                        handleChatWithByte("Show me my recent transactions");
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <DollarSign className="w-5 h-5 text-green-400" />
                      <div>
                        <div className="text-white text-sm font-medium">View Transactions</div>
                        <div className="text-gray-400 text-xs">Browse your financial data</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveAI('prime');
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                      <div>
                        <div className="text-white text-sm font-medium">AI Team Overview</div>
                        <div className="text-gray-400 text-xs">Meet all AI employees</div>
                      </div>
                    </button>

                    <div className="border-t border-gray-600 my-2"></div>

                    <button
                      onClick={() => {
                        setShowDocumentHistory(true);
                        setShowPlusMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
                    >
                      <History className="w-5 h-5 text-indigo-400" />
                      <div>
                        <div className="text-white text-sm font-medium">View Documents</div>
                        <div className="text-gray-400 text-xs">Browse processed files ({processedDocuments.length})</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Subtle Hint */}
            <div className="text-center mt-2">
              <span className="text-xs text-gray-500">
                Drag files anywhere in the chat or use the + button
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Document History Modal */}
      {showDocumentHistory && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <FolderOpen className="w-6 h-6 text-indigo-400" />
                <h2 className="text-xl font-semibold text-white">Processed Documents</h2>
                <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-full text-sm">
                  {processedDocuments.length} files
                </span>
              </div>
              <button
                onClick={() => setShowDocumentHistory(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document List */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {processedDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">No documents processed yet</h3>
                  <p className="text-gray-500">Upload some files to see them here</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {processedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:bg-gray-750 transition-colors cursor-pointer"
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                            {doc.type === 'pdf' ? (
                              <FileText className="w-5 h-5 text-indigo-400" />
                            ) : doc.type === 'image' ? (
                              <ImageIcon className="w-5 h-5 text-indigo-400" />
                            ) : (
                              <FileCheck className="w-5 h-5 text-indigo-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-white font-medium">{doc.filename}</h3>
                            <p className="text-gray-400 text-sm">
                              {doc.transactions?.length || 0} transactions • {doc.processingMethod} • 
                              {new Date(doc.uploadDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (doc.fileUrl) {
                                window.open(doc.fileUrl, '_blank');
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                            title="View original file"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDocument(doc);
                            }}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Detail Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl max-w-6xl max-h-[90vh] w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-indigo-400" />
                <h2 className="text-xl font-semibold text-white">{selectedDocument.filename}</h2>
                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-sm">
                  {selectedDocument.transactions?.length || 0} transactions
                </span>
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Document Info */}
                <div className="space-y-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-3">Document Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Type:</span>
                        <span className="text-white">{selectedDocument.type.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Processing Method:</span>
                        <span className="text-white">{selectedDocument.processingMethod}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Upload Date:</span>
                        <span className="text-white">{new Date(selectedDocument.uploadDate).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Transactions Found:</span>
                        <span className="text-white">{selectedDocument.transactions?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Original File */}
                  {selectedDocument.fileUrl && (
                    <div className="bg-gray-800 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-white mb-3">Original File</h3>
                      <button
                        onClick={() => window.open(selectedDocument.fileUrl, '_blank')}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Original File
                      </button>
                    </div>
                  )}
                </div>

                {/* Transactions */}
                <div className="space-y-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-white mb-3">Extracted Transactions</h3>
                    {selectedDocument.transactions && selectedDocument.transactions.length > 0 ? (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {selectedDocument.transactions.map((transaction, index) => (
                          <div key={index} className="bg-gray-700 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-white font-medium">{transaction.description}</span>
                              <span className="text-green-400 font-semibold">${transaction.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-400">
                              <span>{transaction.date}</span>
                              <span className="bg-gray-600 px-2 py-1 rounded text-xs">{transaction.category}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-center py-8">No transactions found in this document</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/*
 * ============================================================================
 * STEP 1 IMPLEMENTATION SUMMARY - Per-Employee Chat Sessions
 * ============================================================================
 * 
 * Changes Made:
 * 1. Added per-employee session management with EmployeeSessionMap state
 * 2. Updated getOrCreateSmartImportConversation to accept employeeId parameter
 * 3. Added loadSessionMessages function to load chat history from Supabase
 * 4. Implemented handleEmployeeSwitch to switch between employees and load their sessions
 * 5. Added URL integration (?employee=prime) for deep linking
 * 6. Added localStorage persistence for employee sessions
 * 7. Updated all employee tab buttons to call handleEmployeeSwitch
 * 8. Updated initialization logic to load messages when switching employees
 * 
 * Testing Checklist:
 * [ ] Open /dashboard/smart-import-ai
 * [ ] Talk to Prime (send a couple of messages)
 * [ ] Click Byte tab - verify Byte's responses and Prime's messages are preserved
 * [ ] Switch back to Prime - verify previous Prime conversation is restored
 * [ ] Navigate to Transactions page and back - verify last active employee is restored
 * [ ] Reload page - verify sessions persist via localStorage
 * [ ] Test URL deep linking: /dashboard/smart-import-ai?employee=byte
 * 
 * ============================================================================
 */
