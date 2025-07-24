import React, { useState } from "react";

const FORMATS = ["CSV", "XLSX", "PDF"];

export default function ExportBackup() {
  const [format, setFormat] = useState("CSV");
  const [monthlyBackup, setMonthlyBackup] = useState(true);

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Export & Backup</h1>
      <p className="mb-6 text-gray-600">Export financial data or set up automatic backups.</p>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Export Format</h2>
        <select value={format} onChange={e => setFormat(e.target.value)} className="border rounded px-2 py-1">
          {FORMATS.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Export Now</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Export</button>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Monthly Backup</h2>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={monthlyBackup} onChange={e => setMonthlyBackup(e.target.checked)} className="accent-blue-600" />
          Enable monthly backup
        </label>
      </div>
      <button className="mt-6 bg-green-600 text-white px-6 py-2 rounded">Save</button>
    </div>
  );
} 