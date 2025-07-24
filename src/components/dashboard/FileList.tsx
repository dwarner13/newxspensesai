import { useEffect, useState } from 'react';
import { FileText, File, Download, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getUploadedFiles, getFileUrl, supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/formatters';

interface UploadedFile {
  id: string;
  file_name: string;
  upload_date: string;
  original_type: 'CSV' | 'PDF';
  file_path: string;
}

const FileList = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const data = await getUploadedFiles();
      setFiles(data);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: UploadedFile) => {
    try {
      const url = await getFileUrl(file.file_path);
      
      if (url) {
        window.open(url, '_blank');
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
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        No files uploaded yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {files.map((file) => (
        <motion.div
          key={file.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow p-4 flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            {file.original_type === 'CSV' ? (
              <FileText className="text-primary-500\" size={24} />
            ) : (
              <File className="text-primary-500" size={24} />
            )}
            <div>
              <h3 className="font-medium text-gray-900">{file.file_name}</h3>
              <p className="text-sm text-gray-500">
                Uploaded {formatDate(file.upload_date)}
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
        </motion.div>
      ))}
    </div>
  );
};

export default FileList;
