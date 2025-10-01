import { useState, useEffect } from 'react';
import { FileText, Upload, Download, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format, parse, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';

interface UploadedFile {
  id: string;
  file_name: string;
  upload_date: string;
  original_type: 'CSV' | 'PDF';
  file_path: string;
}

interface UploadedFilesListProps {
  month: string;
  className?: string;
}

const UploadedFilesList = ({ month, className = '' }: UploadedFilesListProps) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && month) {
      fetchFiles(month);
    }
  }, [user, month]);

  const fetchFiles = async (monthName: string) => {
    try {
      setLoading(true);
      
      // Get all files
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user?.id)
        .order('upload_date', { ascending: false});
      
      if (error) throw error;
      
      // Filter files for the specific month
      const currentYear = new Date().getFullYear();
      const monthDate = parse(monthName, 'MMMM', new Date());
      const monthIndex = monthDate.getMonth();
      
      const startDate = startOfMonth(new Date(currentYear, monthIndex));
      const endDate = endOfMonth(new Date(currentYear, monthIndex));
      
      const filteredFiles = data.filter(file => {
        const fileDate = new Date(file.upload_date);
        return isWithinInterval(fileDate, { start: startDate, end: endDate});
      });
      
      setFiles(filteredFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    try {
      const { data } = await supabase.storage
        .from('bank-statements')
        .createSignedUrl(file.file_path, 60); // 1 minute expiry
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        throw new Error('Failed to generate download URL');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleDelete = async (file: UploadedFile) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('bank-statements')
        .remove([file.file_path]);

      if (storageError) throw storageError;

      // Delete metadata from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      setFiles(files.filter(f => f.id !== file.id));
      toast.success('File deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
    }
  };

  if (loading) {
    return (
      <div
        className={`card ${className}`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Uploaded Files</h2>
        </div>
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card ${className}`}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Uploaded Files</h2>
        <Link to="/upload" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
          Upload New
        </Link>
      </div>
      
      {files.length > 0 ? (
        <div className="space-y-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-lg shadow p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                {file.original_type === 'CSV' ? (
                  <FileText className="text-primary-500" size={24} />
                ) : (
                  <FileText className="text-error-500" size={24} />
                )}
                <div>
                  <h3 className="font-medium text-gray-900">{file.file_name}</h3>
                  <p className="text-sm text-gray-500">
                    Uploaded {format(new Date(file.upload_date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleDownload(file)}
                  className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
                  title="Download file"
                >
                  <Download size={20} />
                </button>
                <button
                  onClick={() => handleDelete(file)}
                  className="p-2 text-gray-600 hover:text-error-600 transition-colors"
                  title="Delete file"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <FileText size={48} className=" text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No files uploaded for {month}</h3>
          <p className="text-gray-500 mb-6">
            Upload bank statements or receipts to see them here.
          </p>
          <Link to="/upload" className="btn-primary inline-flex items-center">
            <Upload size={16} className="mr-2" />
            Upload Files
          </Link>
        </div>
      )}
    </div>
  );
};

export default UploadedFilesList;
