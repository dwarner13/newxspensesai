import { useState, useRef } from 'react';
import { extractPdfTextFromFile } from '../../client/pdf/extractText';

interface PDFToImageConverterProps {
  onImageGenerated: (imageData: string, fileName: string) => void;
  onError: (error: string) => void;
}

interface PDFAnalysis {
  hasTextLayer: boolean;
  textSample: string;
  pages: number;
  textByPage: string[];
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    pages: number;
  };
}

export default function PDFToImageConverter({ onImageGenerated, onError }: PDFToImageConverterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [pdfAnalysis, setPdfAnalysis] = useState<PDFAnalysis | null>(null);
  const [showTextOption, setShowTextOption] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzePDF = async (pdfFile: File): Promise<PDFAnalysis> => {
    setProgress('Analyzing PDF for text content...');
    
    try {
      const result = await extractPdfTextFromFile(pdfFile, 5);
      return {
        hasTextLayer: result.hasTextLayer,
        textSample: result.textSample,
        pages: result.pages,
        textByPage: result.textByPage,
        metadata: undefined // Metadata not available in the new function
      };
    } catch (error) {
      console.warn('PDF text analysis failed:', error);
      return {
        hasTextLayer: false,
        textSample: '',
        pages: 0,
        textByPage: [],
        metadata: undefined
      };
    }
  };

  const convertPDFToImages = async (pdfFile: File) => {
    setLoading(true);
    setProgress('Loading PDF...');
    
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      
      // First, analyze the PDF for text content
      const analysis = await analyzePDF(pdfFile);
      setPdfAnalysis(analysis);
      
      // If PDF has text layer, show text extraction option
      if (analysis.hasTextLayer) {
        setShowTextOption(true);
        setProgress(`PDF has ${analysis.pages} page(s) with text layer. Choose extraction method below.`);
        setLoading(false);
        return;
      }
      
      // Continue with image conversion for scanned PDFs
      setProgress('Converting PDF pages to images (scanned PDF detected)...');
      
      // For now, show a message that image conversion is not available
      // In a full implementation, you would use pdfjs-dist for rendering
      setProgress('Image conversion for scanned PDFs is not yet implemented. Please convert to images manually.');
      setLoading(false);
      onError('Scanned PDF detected. Please convert to images manually or use a PDF with selectable text.');
      
    } catch (error) {
      console.error('PDF conversion error:', error);
      
      // If worker failed, try without worker as fallback
      if (error instanceof Error && error.message.includes('worker')) {
        try {
          setProgress('Retrying without worker...');
          pdfjsLib.GlobalWorkerOptions.workerSrc = '';
          
          const arrayBuffer = await pdfFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ 
            data: arrayBuffer,
            disableWorker: true
          }).promise;
          
          const images: string[] = [];
          const totalPages = pdf.numPages;
          
          setProgress(`Converting ${totalPages} page(s) to images...`);
          
          // Convert each page to an image
          for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            setProgress(`Processing page ${pageNum} of ${totalPages}...`);
            
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (!context) {
              throw new Error('Could not get canvas context');
            }
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
              canvasContext: context,
              viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            images.push(imageDataUrl);
          }
          
          setPreviewImages(images);
          setProgress(`Successfully converted ${totalPages} page(s) to images!`);
          
          if (images.length === 1) {
            const fileName = pdfFile.name.replace('.pdf', '_page1.jpg');
            onImageGenerated(images[0], fileName);
          }
          
          return; // Success with fallback
          
        } catch (fallbackError) {
          console.error('Fallback conversion also failed:', fallbackError);
          onError('PDF conversion failed. Please try converting to images manually or use a different PDF file.');
          return;
        }
      }
      
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

  const handleTextExtraction = async () => {
    if (!file || !pdfAnalysis) return;
    
    setLoading(true);
    setProgress('Extracting text from PDF...');
    
    try {
      // Send the extracted text directly to the OCR function with isTextData flag
      const textData = pdfAnalysis.textByPage.join('\n\n');
      const fileName = file.name.replace('.pdf', '_text.txt');
      
      // Send text data to the OCR function with isTextData flag
      onImageGenerated(textData, fileName);
      
    } catch (error) {
      console.error('Text extraction error:', error);
      onError('Failed to extract text from PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (imageData: string, index: number) => {
    const fileName = file ? file.name.replace('.pdf', `_page${index + 1}.jpg`) : `page${index + 1}.jpg`;
    onImageGenerated(imageData, fileName);
  };

  const reset = () => {
    setFile(null);
    setPreviewImages([]);
    setPdfAnalysis(null);
    setShowTextOption(false);
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
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> If PDF conversion fails, the system will automatically retry without the worker. 
            For best results, ensure your PDF has selectable text or high-quality images.
          </p>
        </div>
        
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-blue-700">{progress}</span>
            </div>
          </div>
        )}
        
        {showTextOption && pdfAnalysis && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-md font-medium text-green-800 mb-2">
                ✅ PDF with Text Layer Detected
              </h4>
              <p className="text-sm text-green-700 mb-3">
                This PDF contains {pdfAnalysis.pages} page(s) with selectable text. 
                You can extract text directly without OCR processing.
              </p>
              
              {pdfAnalysis.metadata && (
                <div className="mb-3 p-2 bg-white border rounded">
                  <p className="text-xs text-green-600 font-medium mb-1">PDF Metadata:</p>
                  <div className="text-xs text-gray-600 space-y-1">
                    {pdfAnalysis.metadata.title && <div><strong>Title:</strong> {pdfAnalysis.metadata.title}</div>}
                    {pdfAnalysis.metadata.author && <div><strong>Author:</strong> {pdfAnalysis.metadata.author}</div>}
                    {pdfAnalysis.metadata.subject && <div><strong>Subject:</strong> {pdfAnalysis.metadata.subject}</div>}
                    {pdfAnalysis.metadata.keywords && <div><strong>Keywords:</strong> {pdfAnalysis.metadata.keywords}</div>}
                  </div>
                </div>
              )}
              
              {pdfAnalysis.textSample && (
                <div className="mb-3">
                  <p className="text-xs text-green-600 font-medium mb-1">Text Sample:</p>
                  <div className="bg-white border rounded p-2 text-xs text-gray-700 max-h-20 overflow-y-auto">
                    {pdfAnalysis.textSample}...
                  </div>
                </div>
              )}
              
              <button
                onClick={handleTextExtraction}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                Extract Text Directly (Recommended)
              </button>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-md font-medium text-yellow-800 mb-2">
                Alternative: Convert to Images
              </h4>
              <p className="text-sm text-yellow-700">
                If you prefer to use OCR processing, you can convert the PDF to images first.
                However, direct text extraction is faster and more accurate.
              </p>
              <button
                onClick={() => setShowTextOption(false)}
                className="mt-2 px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Convert to Images Instead
              </button>
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
