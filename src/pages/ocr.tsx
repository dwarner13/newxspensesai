import React from "react";
import OCRDropzone from "../components/OCRDropzone";

/**
 * OCR Page
 * 
 * Simple page that renders the OCR dropzone component
 * for uploading receipts/invoices and processing them via OCR
 */
export default function OCRPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            OCR Document Scanner
          </h1>
          <p className="text-gray-600">
            Upload receipts, invoices, or bank statements to extract and categorize transactions
          </p>
        </div>
        
        <OCRDropzone />
      </div>
    </div>
  );
}

