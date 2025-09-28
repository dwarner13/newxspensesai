import { useState } from 'react';

export default function OCRTester() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');

  async function handleRun() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setStep('Starting OCR processing...');

    try {
      setStep('Converting file to base64...');
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data:image/jpeg;base64, prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      setStep('Running OCR with Tesseract...');
      const res = await fetch('/.netlify/functions/ocr-ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          fileData: base64, 
          fileName: file.name,
          fileType: file.type,
          userId: 'demo-user' 
        })
      });

      setStep('Processing with AI...');
      const json = await res.json();
      
      setStep('Complete!');
      setResult(json);
      
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
    <div className="space-y-4 p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900">OCR Parser Test</h2>
      <p className="text-gray-600">Upload an image (JPG/PNG) to test OCR + AI parsing</p>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">PDF Processing Notice</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>PDF processing is temporarily disabled. Please convert your PDF to images (JPG/PNG) and upload those instead.</p>
            </div>
          </div>
        </div>
      </div>
      
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

        {result && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Results:</h3>
            <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-xl overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}














