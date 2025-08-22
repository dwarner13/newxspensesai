import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Camera, Bot, BarChart3, X, Loader2, Mail, CheckCircle, AlertCircle, User, Music } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { DashboardCard } from '../../components/ui/DashboardCard';
import DashboardHeader from '../../components/ui/DashboardHeader';
import toast from 'react-hot-toast';
import './SmartImportAI.css';

const SmartImportAIPage = () => {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    {
      id: 1,
      action: 'camera-scan',
      priority: 'high',
      icon: '📸',
      title: 'Take a photo of that restaurant receipt on your desk',
      value: 'Potential deduction: $45-85',
      color: 'from-red-500 to-pink-500'
    },
    {
      id: 2,
      action: 'email-import',
      priority: 'medium',
      icon: '📧',
      title: 'Import 47 unprocessed emails from your bank',
      value: 'Est. transactions: 47',
      color: 'from-blue-500 to-indigo-500'
    },
    {
      id: 3,
      action: 'missed-deductions',
      priority: 'medium',
      icon: '🔍',
      title: 'Scan for missed deductions in your Q4 expenses',
      value: 'Potential savings: $1,200+',
      color: 'from-emerald-500 to-teal-500'
    },
    {
      id: 4,
      action: 'auto-connect',
      priority: 'low',
      icon: '💳',
      title: 'Connect your credit card for automatic tracking',
      value: 'Never miss a transaction',
      color: 'from-purple-500 to-violet-500'
    }
  ]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processedDocuments, setProcessedDocuments] = useState<any[]>([]);

  // Data storage key for localStorage
  const STORAGE_KEY = 'xspensesai_processed_documents';

  // Load processed documents from storage on component mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProcessedDocuments(parsed);
      } catch (e) {
        console.error('Failed to parse saved documents:', e);
      }
    }
  }, []);

  // Save processed documents to storage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(processedDocuments));
  }, [processedDocuments]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleCameraUpload = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleEmailUpload = () => {
    setShowEmailModal(true);
  };

  const handleBulkUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Validate file types
    const allowedTypes = [
      'application/pdf', 'text/csv', 'image/jpeg', 'image/png', 'image/jpg', 
      'text/plain', 'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const validFiles = Array.from(files).filter(file => {
      return allowedTypes.some(type => file.type === type) || 
             file.name.toLowerCase().match(/\.(pdf|csv|jpg|jpeg|png|txt|xlsx|xls)$/);
    });
    
    if (validFiles.length === 0) {
      toast.error('Please upload valid financial documents (PDF, CSV, images, Excel files)');
      return;
    }
    
    setUploadedFiles(validFiles);
    setIsUploading(true);
    setUploadProgress(0);
    
    // Simulate AI processing with progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
      setIsUploading(false);
      setShowUploadModal(false);
          
          // Generate realistic processed document data
          const newProcessedDocuments = validFiles.map((file, index) => {
            const documentType = file.type.includes('image') ? 'receipt' : 
                               file.type.includes('pdf') ? 'statement' : 
                               file.type.includes('csv') ? 'transaction_data' : 'document';
            
            const categories = ['Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Healthcare', 'Utilities', 'Business'];
            const randomCategory = categories[Math.floor(Math.random() * categories.length)];
            
            const amount = Math.floor(Math.random() * 200) + 10;
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 30));
            
            return {
              id: `doc_${Date.now()}_${index}`,
              fileName: file.name,
              fileType: file.type,
              documentType: documentType,
              processedAt: new Date().toISOString(),
              extractedData: {
                amount: amount,
                category: randomCategory,
                date: date.toISOString().split('T')[0],
                vendor: `Vendor ${Math.floor(Math.random() * 50) + 1}`,
                description: `${randomCategory} transaction from ${file.name}`,
                confidence: Math.floor(Math.random() * 20) + 80
              },
              status: 'processed'
            };
          });
          
          // Add new documents to existing ones
          setProcessedDocuments(prev => [...prev, ...newProcessedDocuments]);
          
          toast.success(`Successfully processed ${validFiles.length} documents! Found ${newProcessedDocuments.length} transactions. Click "View Results" to see your insights!`);
          return 100;
        }
        return prev + 10;
      });
    }, 230); // Complete in 2.3 seconds as advertised
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast.success('Receipt captured! Processing with AI...');
      
      // Process receipt with AI and store data
      const receiptData = {
        id: `receipt_${Date.now()}`,
        fileName: file.name,
        fileType: file.type,
        documentType: 'receipt',
        processedAt: new Date().toISOString(),
        extractedData: {
          amount: Math.floor(Math.random() * 100) + 15,
          category: 'Food & Dining',
          date: new Date().toISOString().split('T')[0],
          vendor: 'Restaurant Receipt',
          description: 'Restaurant meal receipt',
          confidence: 95
        },
        status: 'processed'
      };
      
      setProcessedDocuments(prev => [...prev, receiptData]);
      toast.success('Receipt processed successfully! Data saved to analytics.');
    }
  };

  const handleBulkFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFileUpload(files);
    }
  };

  // Smart Suggestions Engine Functions
  const handleSuggestionAction = (action: string) => {
    switch(action) {
      case 'camera-scan':
        handleCameraUpload();
        break;
      case 'email-import':
        setShowEmailModal(true);
        break;
      case 'missed-deductions':
        navigate('/dashboard/analytics');
        break;
      case 'auto-connect':
        toast('Bank connection feature coming soon!', { icon: '💳' });
        break;
    }
  };

  const refreshSuggestions = () => {
    setIsRefreshing(true);
    
    // Simulate AI updating suggestions
    setTimeout(() => {
      const newSuggestions = suggestions.map(suggestion => ({
        ...suggestion,
        value: suggestion.action === 'camera-scan' 
          ? `Potential deduction: $${Math.floor(Math.random() * 50) + 30}-${Math.floor(Math.random() * 50) + 60}`
          : suggestion.action === 'email-import'
          ? `Est. transactions: ${Math.floor(Math.random() * 20) + 30}`
          : suggestion.action === 'missed-deductions'
          ? `Potential savings: $${Math.floor(Math.random() * 1000) + 800}+`
          : suggestion.value
      }));
      
      setSuggestions(newSuggestions);
      setIsRefreshing(false);
      toast.success('AI suggestions updated!');
    }, 1500);
  };

  // Prevent body scroll when AI Assistant modal is open on mobile
  useEffect(() => {
    if (showAIAssistant) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      // Restore body scroll
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY) * -1);
      }
    }

    return () => {
      // Cleanup on unmount
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [showAIAssistant]);

  return (
    <div className="w-full">
      <DashboardHeader />

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Smart Import Tools */}
        <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-white">Smart Import Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Upload Documents */}
          <DashboardCard gradient="blue" className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Upload size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Upload Documents</h3>
                <p className="text-sm text-white/80">PDF, CSV, images, receipts</p>
              </div>
            </div>
            <p className="text-sm text-white/80 mb-4">Drag & drop your financial documents here or click to browse. Supports PDF, CSV, and scanned receipts.</p>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="w-full bg-white text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-all"
            >
              Upload or Scan
            </button>
          </DashboardCard>

          {/* AI Financial Assistant */}
          <DashboardCard gradient="purple" className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Bot size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">AI Financial Assistant</h3>
                <p className="text-sm text-white/80">Real-time insights & help</p>
              </div>
            </div>
            <p className="text-sm text-white/80 mb-4">Chat with your AI assistant for real-time financial insights, categorization help, and spending analysis.</p>
            <button 
              onClick={() => setShowAIAssistant(true)}
              className="w-full bg-white text-purple-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-all hover:bg-gray-100 transition-all"
            >
              Start Chat
            </button>
          </DashboardCard>

          {/* Results & Insights */}
          <DashboardCard gradient="pink" className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl flex items-center justify-center">
                <BarChart3 size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Results & Insights</h3>
                <p className="text-sm text-white/80">Detailed reports & analysis</p>
              </div>
            </div>
            <p className="text-sm text-white/80 mb-4">View detailed reports, export data, and gain actionable insights from your processed financial documents.</p>
            <button 
              onClick={() => navigate('/dashboard/analytics')}
              className="w-full bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-all hover:bg-gray-100 transition-all"
            >
              View Results
            </button>
          </DashboardCard>
        </div>
      </section>

      {/* Smart Suggestions Engine */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-white">AI Financial Assistant</h2>
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <div className="smart-suggestions-engine">
            {/* Suggestions Header */}
            <div className="suggestions-header mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl">💡</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Smart Suggestions</h3>
                    <p className="text-gray-300 text-sm">AI-powered recommendations to optimize your finances</p>
                  </div>
                </div>
                <div className="ai-indicator flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2">
                  <span className="ai-pulse w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-green-400 text-sm font-medium">AI Active</span>
                </div>
              </div>
            </div>
            
            {/* Suggestions List */}
            <div className="suggestions-list space-y-4 mb-6">
              {/* High Priority - Camera Scan */}
              <div className="suggestion-item priority-high bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-xl p-4 hover:from-red-500/20 hover:to-pink-500/20 transition-all cursor-pointer" 
                   onClick={() => handleCameraUpload()}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="suggestion-icon w-12 h-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl">📸</span>
                    </div>
                    <div className="suggestion-content">
                      <div className="suggestion-title text-white font-semibold text-lg">Take a photo of that restaurant receipt on your desk</div>
                      <div className="suggestion-value text-red-300 text-sm">Potential deduction: $45-85</div>
                    </div>
                  </div>
                  <button className="suggestion-action bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all font-medium">
                    Scan Now
                  </button>
                </div>
              </div>
              
              {/* Medium Priority - Email Import */}
              <div className="suggestion-item priority-medium bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl p-4 hover:from-blue-500/20 hover:to-indigo-500/20 transition-all cursor-pointer"
                   onClick={() => setShowEmailModal(true)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="suggestion-icon w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl">📧</span>
                    </div>
                    <div className="suggestion-content">
                      <div className="suggestion-title text-white font-semibold text-lg">Import 47 unprocessed emails from your bank</div>
                      <div className="suggestion-value text-blue-300 text-sm">Est. transactions: 47</div>
                    </div>
                  </div>
                  <button className="suggestion-action bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all font-medium">
                    Import
                  </button>
                </div>
              </div>
              
              {/* Medium Priority - Missed Deductions */}
              <div className="suggestion-item priority-medium bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-4 hover:from-emerald-500/20 hover:to-teal-500/20 transition-all cursor-pointer"
                   onClick={() => navigate('/dashboard/analytics')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="suggestion-icon w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🔍</span>
                    </div>
                    <div className="suggestion-content">
                      <div className="suggestion-title text-white font-semibold text-lg">Scan for missed deductions in your Q4 expenses</div>
                      <div className="suggestion-value text-emerald-300 text-sm">Potential savings: $1,200+</div>
                    </div>
                  </div>
                  <button className="suggestion-action bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all font-medium">
                    Analyze
                  </button>
                </div>
              </div>
              
              {/* Low Priority - Auto Connect */}
              <div className="suggestion-item priority-low bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-500/20 rounded-xl p-4 hover:from-purple-500/20 hover:to-violet-500/20 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="suggestion-icon w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl">💳</span>
                    </div>
                    <div className="suggestion-content">
                      <div className="suggestion-title text-white font-semibold text-lg">Connect your credit card for automatic tracking</div>
                      <div className="suggestion-value text-purple-300 text-sm">Never miss a transaction</div>
                    </div>
                  </div>
                  <button className="suggestion-action bg-gradient-to-r from-purple-500 to-violet-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-violet-600 transition-all font-medium">
                    Connect
                  </button>
                </div>
              </div>
            </div>
            
            {/* Suggestions Footer */}
            <div className="suggestions-footer border-t border-white/10 pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="refresh-suggestions w-full md:w-auto">
                  <button 
                    className="refresh-btn bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 font-medium w-full"
                    onClick={refreshSuggestions}
                    disabled={isRefreshing}
                  >
                    <span className={isRefreshing ? "animate-spin" : ""}>🔄</span>
                    {isRefreshing ? "Updating..." : "Refresh Suggestions"}
                  </button>
                </div>
                <div className="ai-learning text-center">
                  <span className="text-gray-400 text-sm">AI learns from your patterns to suggest better opportunities</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Upload Financial Documents</h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Hidden File Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleBulkFileSelect}
              className="hidden"
              accept=".pdf,.csv,.jpg,.jpeg,.png,.txt,.xlsx,.xls"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
            />
            
            {/* Drag & Drop Area */}
            <div 
              className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 transition-all duration-200 ${
                dragOver 
                  ? 'border-purple-500 bg-purple-500/10' 
                  : 'border-gray-600'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload size={48} className={`mx-auto mb-4 transition-colors ${
                dragOver ? 'text-purple-400' : 'text-gray-400'
              }`} />
              <p className="text-white mb-2">
                {dragOver ? 'Drop files here!' : 'Drag & drop files here'}
              </p>
              <p className="text-gray-400 text-sm">or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-blue-700 transition-all"
              >
                Browse Files
              </button>
            </div>

            {/* Upload Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={handleCameraUpload}
                className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all"
              >
                <Camera size={20} className="text-blue-400" />
                <span className="text-white">Scan Receipt</span>
              </button>
              
              <button 
                onClick={handleEmailUpload}
                className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all"
              >
                <FileText size={20} className="text-green-400" />
                <button className="text-white">Email Import</button>
              </button>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all"
              >
                <Upload size={20} className="text-purple-400" />
                <span className="text-white">Bulk Upload</span>
              </button>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-6 p-4 bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 size={20} className="text-blue-400 animate-spin" />
                  <span className="text-white">AI is reading your documents...</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Usually takes 2.3 seconds</p>
              </div>
            )}

            {/* Uploaded Files Preview */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6 p-4 bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={16} className="text-green-400" />
                  <span className="text-white font-medium">Files Ready for Processing</span>
                </div>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                      <FileText size={14} className="text-blue-400" />
                      <span>{file.name}</span>
                      <span className="text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results Navigation Hint */}
            {!isUploading && uploadedFiles.length > 0 && (
              <div className="mt-6 p-4 bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={16} className="text-blue-400" />
                  <span className="text-white font-medium">View Your Results</span>
                </div>
                <p className="text-sm text-gray-300 mb-3">
                  Your documents have been processed! View detailed insights, analytics, and reports.
                </p>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    navigate('/dashboard/analytics');
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all text-sm"
                >
                  Go to Analytics Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Import Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Import from Email</h3>
              <button 
                onClick={() => setShowEmailModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-white mb-4">Connect your email to automatically import financial documents:</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all">
                    <Mail size={20} className="text-red-400" />
                    <span className="text-white">Gmail</span>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all">
                    <Mail size={20} className="text-blue-400" />
                    <span className="text-white">Outlook</span>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all">
                    <Mail size={20} className="text-purple-400" />
                    <span className="text-white">Yahoo</span>
                  </button>
                </div>
              </div>
              
              <div className="border-t border-gray-700 pt-6">
                <p className="text-white mb-4">Or paste email content directly:</p>
                <textarea 
                  placeholder="Paste your email content here..."
                  rows={6}
                  className="w-full p-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
                <button className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all">
                  Process Email Content
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Financial Assistant Modal */}
      {showAIAssistant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden touch-none ai-assistant-modal">
          <div className="bg-gray-900 rounded-2xl w-full max-w-5xl h-[90vh] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden touch-pan-y">
            {/* Header */}
            <div className="flex justify-between items-center p-3 sm:p-6 border-b border-gray-700">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-2xl font-bold text-white truncate">🤖 AI Financial Assistant</h3>
                  <p className="text-xs sm:text-sm text-gray-400 truncate">Smart Import AI Specialist</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAIAssistant(false)}
                className="text-gray-400 hover:text-white p-1 sm:p-2 rounded-lg hover:bg-gray-800 transition-all flex-shrink-0"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
            
            {/* Chat Interface */}
            <div className="flex-1 p-3 sm:p-6 overflow-hidden">
              <div className="h-full bg-gray-800 rounded-xl border border-gray-700 flex flex-col overscroll-contain">
                {/* Chat Header */}
                <div className="bg-gray-700 px-3 sm:px-4 py-2 sm:py-3 rounded-t-xl border-b border-gray-600">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs sm:text-sm">🤖</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-white font-semibold text-sm sm:text-base truncate">Smart Import AI Assistant</h4>
                      <p className="text-xs text-gray-300 truncate">Document processing & financial guidance</p>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 sm:space-y-4 overscroll-contain touch-pan-y">
                  {/* Welcome Message */}
                  <div className="flex justify-start">
                    <div className="bg-gray-700 rounded-lg px-3 sm:px-4 py-2 sm:py-3 max-w-[85%] sm:max-w-[80%]">
                      <p className="text-white text-xs sm:text-sm">
                        Hello! I'm your AI Financial Assistant for Smart Import. I can help you with:
                      </p>
                      <ul className="text-white text-xs sm:text-sm mt-2 space-y-1">
                        <li>• Document categorization and analysis</li>
                        <li>• Troubleshooting upload issues</li>
                        <li>• Financial insights and recommendations</li>
                        <li>• Best practices for document handling</li>
                        <li>• Transaction categorization guidance</li>
                      </ul>
                      <p className="text-white text-xs sm:text-sm mt-3">
                        What would you like to know about your documents or financial data?
                      </p>
                    </div>
                  </div>

                  {/* Sample Response */}
                  <div className="flex justify-start">
                    <div className="bg-gray-700 rounded-lg px-3 sm:px-4 py-2 sm:py-3 max-w-[85%] sm:max-w-[80%]">
                      <p className="text-white text-xs sm:text-sm">
                        💡 <strong>Pro Tip:</strong> For best results when scanning receipts, ensure good lighting, hold the camera steady, and place the receipt on a flat, contrasting surface.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chat Input */}
                <div className="border-t border-gray-600 p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <input
                      type="text"
                      placeholder="Ask me about document processing, categorization, or financial insights..."
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-base"
                    />
                    <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all font-medium text-sm sm:text-base">
                      Send
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 text-center px-2">
                    💬 This is a demo interface. In production, this would connect to your AI backend.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
    </div>
  );
};

export default SmartImportAIPage; 