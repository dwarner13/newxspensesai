import React, { useState } from 'react';
import { Upload, FileText, Camera, Bot, BarChart3, X, Loader2 } from 'lucide-react';
import SpecializedChatBot from '../../components/chat/SpecializedChatBot';
import { useNavigate } from 'react-router-dom';
import { DashboardCard } from '../../components/ui/DashboardCard';

const SmartImportAIPage = () => {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleCameraUpload = () => {
    navigate('/scan-receipt');
  };

  const handleEmailUpload = () => {
    console.log('Email import coming soon!');
  };

  const handleBulkUpload = () => {
    setShowUploadModal(true);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    setIsUploading(true);
    const fileArray = Array.from(files);
    
    // Simulate upload process
    setTimeout(() => {
      setIsUploading(false);
      setShowUploadModal(false);
    }, 2000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
            
            {/* Drag & Drop Area */}
            <div 
              className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center mb-6"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-white mb-2">Drag & drop files here</p>
              <p className="text-gray-400 text-sm">or</p>
              <input
                type="file"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id="file-upload"
                accept=".pdf,.csv,.jpg,.jpeg,.png"
              />
              <label 
                htmlFor="file-upload"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg cursor-pointer hover:bg-blue-700 transition-all"
              >
                Browse Files
              </label>
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
                <div className="flex items-center gap-3">
                  <Loader2 size={20} className="text-blue-400 animate-spin" />
                  <span className="text-white">Processing files...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
        </div>
    </>
  );
};

export default SmartImportAIPage; 