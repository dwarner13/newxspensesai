import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Check, X, AlertTriangle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const UploadTestPage = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
    url?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const startProgressSimulation = () => {
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    
    // Start at 0%
    setUploadProgress(0);
    
    // Simulate progress up to 95% (the last 5% will be set when the operation completes)
    let currentProgress = 0;
    const interval = window.setInterval(() => {
      currentProgress += 5;
      if (currentProgress >= 95) {
        clearInterval(interval);
        progressIntervalRef.current = null;
      } else {
        setUploadProgress(currentProgress);
      }
    }, 200);
    
    progressIntervalRef.current = interval;
  };

  const stopProgressSimulation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const handleUpload = async () => {
    if (!file || !user) {
      toast.error('Please select a file first');
      return;
    }

    try {
      setIsUploading(true);
      startProgressSimulation();
      
      // Create a unique file path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = `${user.id}/${timestamp}-${file.name}`;
      
      console.log('Uploading to path:', filePath);
      console.log('File size:', file.size, 'bytes');
      console.log('File type:', file.type);
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('receipts') // Use the receipts bucket
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      stopProgressSimulation();
      
      if (error) {
        console.error('Upload error:', error);
        setUploadResult({
          success: false,
          message: `Upload failed: ${error.message}`,
          details: JSON.stringify(error, null, 2)
        });
        setUploadProgress(0);
        toast.error(`Upload failed: ${error.message}`);
      } else {
        console.log('Upload successful:', data);
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);
          
        setUploadResult({
          success: true,
          message: 'Upload successful!',
          details: JSON.stringify(data, null, 2),
          url: urlData.publicUrl
        });
        setUploadProgress(100);
        toast.success('Upload successful!');
      }
    } catch (error) {
      console.error('Unexpected error during upload:', error);
      stopProgressSimulation();
      setUploadResult({
        success: false,
        message: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      setUploadProgress(0);
      toast.error('An unexpected error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl ">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-3 mb-8"
      >
        <Upload size={32} className="text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold">Upload Test Tool</h1>
          <p className="text-gray-600">Test file uploads to Supabase Storage</p>
        </div>
      </motion.div>

      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">1. Select a File to Upload</h2>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center  cursor-pointer"
          >
            <Upload size={48} className="text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">
              {file ? file.name : 'Click to select a file'}
            </p>
            <p className="text-sm text-gray-500">
              {file ? `${(file.size / 1024).toFixed(2)} KB` : 'Any file type for testing'}
            </p>
          </button>
        </div>
        
        {file && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="btn-primary flex items-center"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-2" />
                  Upload to Supabase
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">2. Upload Progress</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-medium text-gray-700">
              <span>Uploading to Supabase Storage...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-primary-600 to-secondary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            
            <div className="text-xs text-gray-500 bg-primary-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <FileText size={14} className="text-primary-600" />
                <span>Uploading {file?.name} ({(file?.size || 0) / 1024} KB) to receipts/{user?.id}/...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`card mb-6 ${
            uploadResult.success ? 'bg-success-50 border-success-200' : 'bg-error-50 border-error-200'
          }`}
        >
          <div className="flex items-start space-x-3">
            {uploadResult.success ? (
              <Check size={24} className="text-success-600 flex-shrink-0 mt-1" />
            ) : (
              <AlertTriangle size={24} className="text-error-600 flex-shrink-0 mt-1" />
            )}
            <div>
              <h3 className={`font-medium mb-2 ${
                uploadResult.success ? 'text-success-900' : 'text-error-900'
              }`}>
                {uploadResult.message}
              </h3>
              
              {uploadResult.url && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">File URL:</p>
                  <div className="bg-white p-2 rounded border text-sm break-all">
                    <a 
                      href={uploadResult.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      {uploadResult.url}
                    </a>
                  </div>
                </div>
              )}
              
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-1">Response Details:</p>
                <pre className="bg-white p-3 rounded border text-xs overflow-auto max-h-40">
                  {uploadResult.details}
                </pre>
              </div>
              
              {uploadResult.success && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-success-200">
                  <h4 className="font-medium text-gray-900 mb-2">Storage Policy Check Passed ✅</h4>
                  <p className="text-sm text-gray-600">
                    Your Supabase storage bucket and RLS policies are correctly configured.
                  </p>
                </div>
              )}
              
              {!uploadResult.success && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-error-200">
                  <h4 className="font-medium text-gray-900 mb-2">Troubleshooting</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Check that the 'receipts' bucket exists in Supabase</li>
                    <li>• Verify RLS policies allow authenticated users to upload</li>
                    <li>• Ensure your Supabase URL and anon key are correct</li>
                    <li>• Check network tab for more detailed error information</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Environment Check */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h2 className="text-lg font-semibold mb-4">Environment Check</h2>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">VITE_SUPABASE_URL</span>
            <span className={`text-sm ${import.meta.env.VITE_SUPABASE_URL ? 'text-success-600' : 'text-error-600'}`}>
              {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-700">VITE_SUPABASE_ANON_KEY</span>
            <span className={`text-sm ${import.meta.env.VITE_SUPABASE_ANON_KEY ? 'text-success-600' : 'text-error-600'}`}>
              {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-700">User Authenticated</span>
            <span className={`text-sm ${user ? 'text-success-600' : 'text-error-600'}`}>
              {user ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-700">User ID</span>
            <span className="text-sm text-gray-600 font-mono">
              {user?.id ? user.id.substring(0, 8) + '...' : 'N/A'}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UploadTestPage;
