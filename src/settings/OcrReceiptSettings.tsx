import React, { useState } from "react";

export default function OcrReceiptSettings() {
  const [threshold, setThreshold] = useState(80);
  const [fallback, setFallback] = useState(true);
  const [emailRules, setEmailRules] = useState("@amazon.com: Shopping\n@uber.com: Transport");

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">OCR & Receipt Settings</h1>
      <p className="mb-6 text-gray-600">Customize how receipts are scanned and categorized.</p>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">OCR Threshold</h2>
        <input type="range" min={50} max={100} value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="w-full" />
        <div className="text-sm text-gray-500">Current: {threshold}%</div>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Fallback Mode</h2>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={fallback} onChange={e => setFallback(e.target.checked)} className="accent-blue-600" />
          Enable fallback if OCR fails
        </label>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Email Tagging Rules</h2>
        <textarea value={emailRules} onChange={e => setEmailRules(e.target.value)} rows={3} className="border rounded w-full px-2 py-1" />
        <div className="text-xs text-gray-400 mt-1">Format: one rule per line, e.g. <code>@amazon.com: Shopping</code></div>
      </div>
      <button className="mt-6 bg-green-600 text-white px-6 py-2 rounded">Save</button>
    </div>
  );
} 
