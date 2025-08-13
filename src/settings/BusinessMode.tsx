import React, { useState } from "react";

const TAXES = ["None", "GST", "PST", "GST + PST"];

export default function BusinessMode() {
  const [businessMode, setBusinessMode] = useState(false);
  const [client, setClient] = useState("");
  const [tax, setTax] = useState("None");

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Business Mode</h1>
      <p className="mb-6 text-gray-600">Enable business features like client tagging and tax settings.</p>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Enable Business Mode</h2>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={businessMode} onChange={e => setBusinessMode(e.target.checked)} className="accent-blue-600" />
          Business Mode
        </label>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Client/Project</h2>
        <input value={client} onChange={e => setClient(e.target.value)} placeholder="Client or Project Name" className="border rounded px-2 py-1 w-full" />
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Tax Settings</h2>
        <select value={tax} onChange={e => setTax(e.target.value)} className="border rounded px-2 py-1">
          {TAXES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      <button className="mt-6 bg-green-600 text-white px-6 py-2 rounded">Save</button>
    </div>
  );
} 
