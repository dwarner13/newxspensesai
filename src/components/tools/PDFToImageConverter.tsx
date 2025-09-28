import { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFToImageConverterProps {
  onImageGenerated: (imageData: string, fileName: string) => void;
  onError: (error: string) => void;
}

export default function PDFToImageConverter({ onImageGenerated, onError }: PDFToImageConverterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convertPDFToImages = async (pdfFile: File) => {
    setLoading(true);
    setProgress('Loading PDF...');
    
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const images: string[] = [];
      const totalPages = pdf.numPages;
      
      setProgress(`Converting ${totalPages} page(s) to images...`);
      
      // Convert each page to an image
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setProgress(`Processing page ${pageNum} of ${totalPages}...`);
        
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
        
        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render PDF page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Convert canvas to image data URL
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        images.push(imageDataUrl);
      }
      
      setPreviewImages(images);
      setProgress(`Successfully converted ${totalPages} page(s) to images!`);
      
      // If only one page, automatically use it
      if (images.length === 1) {
        const fileName = pdfFile.name.replace('.pdf', '_page1.jpg');
        onImageGenerated(images[0], fileName);
      }
      
    } catch (error) {
      console.error('PDF conversion error:', error);
      onError(error instanceof Error ? error.message : 'Failed to convert PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setPreviewImages([]);
        convertPDFToImages(selectedFile);
      } else {
        onError('Please select a PDF file');
      }
    }
  };

  const handleImageSelect = (imageData: string, index: number) => {
    const fileName = file ? file.name.replace('.pdf', `_page${index + 1}.jpg`) : `page${index + 1}.jpg`;
    onImageGenerated(imageData, fileName);
  };

  const reset = () => {
    setFile(null);
    setPreviewImages([]);
    setProgress('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4 p-6 bg-white rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900">PDF to Image Converter</h3>
      <p className="text-sm text-gray-600">
        Convert PDF pages to images for OCR processing. Each page will be converted to a high-quality image.
      </p>
      
      <div className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept=".pdf"
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-700">{progress}</span>
            </div>
          </div>
        )}
        
        {previewImages.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-md font-medium text-gray-900">
                Converted Images ({previewImages.length} page{previewImages.length > 1 ? 's' : ''})
              </h4>
              <button
                onClick={reset}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Reset
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previewImages.map((imageData, index) => (
                <div key={index} className="border rounded-lg overflow-hidden">
                  <div className="p-2 bg-gray-50 border-b">
                    <span className="text-sm font-medium text-gray-700">
                      Page {index + 1}
                    </span>
                  </div>
                  <div className="p-2">
                    <img
                      src={imageData}
                      alt={`Page ${index + 1}`}
                      className="w-full h-auto max-h-64 object-contain border rounded"
                    />
                    <button
                      onClick={() => handleImageSelect(imageData, index)}
                      className="mt-2 w-full px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Use This Page for OCR
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-700">
                ✅ PDF successfully converted to {previewImages.length} image{previewImages.length > 1 ? 's' : ''}. 
                Click "Use This Page for OCR" to process with the OCR system.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
