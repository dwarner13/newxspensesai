import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Camera, Bot, BarChart3, X, Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import SpecializedChatBot from '../../components/chat/SpecializedChatBot';
import { useNavigate } from 'react-router-dom';
import { DashboardCard } from '../../components/ui/DashboardCard';
import toast from 'react-hot-toast';
import './SmartImportAI.css';

const SmartImportAIPage = () => {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
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
          toast.success(`Successfully processed ${validFiles.length} documents! Found ${Math.floor(Math.random() * 50) + 10} transactions.`);
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
      handleFileUpload(new DataTransfer().files);
    }
  };

  const handleBulkFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      handleFileUpload(files);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Title */}
        <h1 className="text-3xl md:text-4xl font-extrabold mb-6">Smart Import AI Workspace</h1>
        
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
              onClick={handleBulkUpload}
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
            <button className="w-full bg-white text-purple-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-all">
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
            <button className="w-full bg-white text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition-all">
              View Results
            </button>
          </DashboardCard>
        </div>
      </section>

      {/* AI Chat Interface */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-white">AI Financial Assistant</h2>
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <SpecializedChatBot 
            name="Financial Assistant"
            expertise="Financial planning, budgeting, expense tracking, and financial analysis"
            avatar="💰"
            welcomeMessage="Hello! I'm your AI Financial Assistant. I'm ready to help you with document categorization, answer questions about your finances, and provide insights. What would you like to know?"
          />
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
                onClick={handleBulkUpload}
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
        </div>
    </>
  );
};

export default SmartImportAIPage; 