import { useState } from 'react';
import PDFToImageConverter from './PDFToImageConverter';
import { OCRService } from '@/client/services/ocrService';

export default function OCRTester() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');
  const [showPDFConverter, setShowPDFConverter] = useState(false);

  const handleImageFromPDF = (imageData: string, fileName: string) => {
    // Check if this is text data (from PDF text extraction)
    const isTextData = !imageData.startsWith('data:');
    
    if (isTextData) {
      // This is text data from PDF text extraction
      const mockFile = new File([], fileName, { type: 'text/plain' });
      setFile(mockFile);
      processTextData(imageData, fileName);
    } else {
      // This is image data (from PDF to image conversion)
      const base64Data = imageData.split(',')[1];
      const mockFile = new File([], fileName, { type: 'image/jpeg' });
      setFile(mockFile);
      processImage(base64Data, fileName);
    }
  };

  const processTextData = async (textData: string, fileName: string) => {
    setLoading(true);
    setResult(null);
    setStep('Processing extracted text...');

    try {
      setStep('Sending text to AI for parsing...');
      const res = await fetch('/.netlify/functions/ocr-ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          fileData: textData, 
          fileName: fileName,
          fileType: 'text/plain',
          userId: 'demo-user',
          isTextData: true
        })
      });

      setStep('Processing with AI...');
      const json = await res.json();
      
      setStep('Complete!');
      setResult(json);
      
    } catch (error) {
      console.error('Text processing error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setStep('Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const processImage = async (base64Data: string, fileName: string) => {
    setLoading(true);
    setResult(null);
    setStep('Starting OCR processing...');

    try {
      // Create a mock File object for the OCR service
      const blob = await fetch(`data:image/jpeg;base64,${base64Data}`).then(r => r.blob());
      const mockFile = new File([blob], fileName, { type: 'image/jpeg' });
      
      setStep('Running OCR with Tesseract...');
      const result = await OCRService.processImage(mockFile);
      
      if (result.success) {
        setStep('Complete!');
        setResult({
          success: true,
          text: result.text,
          confidence: result.confidence,
          parsed: result.parsed});
        console.log('OCR successful, confidence:', result.confidence);
        
        // Show parsed data
        if (result.parsed) {
          console.log('Parsed expense data:', result.parsed);
        }
      } else {
        setResult({
          success: false,
          error: result.error || 'OCR processing failed'
        });
        setStep('Error occurred');
      }
      
    } catch (error) {
      console.error('OCR Error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setStep('Error occurred');
    } finally {
      setLoading(false);
    }
  };

  async function handleRun() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setStep('Starting OCR processing...');

    try {
      // Validate image first
      const isValid = await OCRService.validateImage(file);
      if (!isValid) {
        throw new Error('Selected file is not a valid image');
      }
      
      setStep('Running OCR with Tesseract...');
      const result = await OCRService.processImage(file);
      
      if (result.success) {
        setStep('Complete!');
        setResult({
          success: true,
          text: result.text,
          confidence: result.confidence,
          parsed: result.parsed});
        console.log('OCR successful, confidence:', result.confidence);
        
        // Show parsed data
        if (result.parsed) {
          console.log('Parsed expense data:', result.parsed);
        }
      } else {
        setResult({
          success: false,
          error: result.error || 'OCR processing failed'
        });
        setStep('Error occurred');
      }
      
    } catch (error) {
      console.error('OCR Error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setStep('Error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* PDF Converter Section */}
      <PDFToImageConverter 
        onImageGenerated={handleImageFromPDF}
        onError={(error) => setResult({ success: false, error })}
      />
      
      {/* Divider */}
      <div className="flex items-center">
        <div className="flex-1 border-t border-gray-300"></div>
        <span className="px-3 text-sm text-gray-500 bg-white">OR</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>
      
      {/* Direct Image Upload Section */}
      <div className="space-y-4 p-6 bg-white rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900">Direct Image Upload</h2>
        <p className="text-gray-600">Upload an image (JPG/PNG) directly for OCR + AI parsing</p>
      
        <div className="space-y-4">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            accept=".jpg,.jpeg,.png"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
        
          <button
            onClick={handleRun}
            disabled={!file || loading}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Processing…' : 'Run OCR + AI'}
          </button>

          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-700">{step}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="p-6 bg-white rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Results:</h3>
          <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-xl overflow-x-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}














