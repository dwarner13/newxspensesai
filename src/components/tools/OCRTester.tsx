import { useState } from 'react';

export default function OCRTester() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleRun() {
    if (!file) return;
    setLoading(true);

    const url = URL.createObjectURL(file);
    const res = await fetch('/.netlify/functions/ocr-ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileUrl: url, userId: 'demo-user' })
    });

    const json = await res.json();
    setResult(json);
    setLoading(false);
  }

  return (
    <div className="space-y-4 p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900">OCR Parser Test</h2>
      <p className="text-gray-600">Upload a receipt or bank statement to test OCR + AI parsing</p>
      
      <div className="space-y-4">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          accept=".pdf,.jpg,.jpeg,.png"
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
        
        <button
          onClick={handleRun}
          disabled={!file || loading}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing…' : 'Run OCR + AI'}
        </button>

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












