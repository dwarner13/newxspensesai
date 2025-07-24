import React, { useState } from "react";

export default function IntegrationsApis() {
  const [apiKey, setApiKey] = useState("sk-test-123456");
  const [webhook, setWebhook] = useState("");

  const generateKey = () => {
    setApiKey("sk-test-" + Math.random().toString(36).slice(2, 12));
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Integrations & APIs</h1>
      <p className="mb-6 text-gray-600">Connect third-party apps and generate API keys.</p>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">API Key</h2>
        <div className="flex gap-2 mb-2">
          <input value={apiKey} readOnly className="border rounded px-2 py-1 flex-1" />
          <button onClick={generateKey} className="bg-blue-600 text-white px-4 py-2 rounded">Generate</button>
        </div>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Webhook URL</h2>
        <input value={webhook} onChange={e => setWebhook(e.target.value)} placeholder="https://yourdomain.com/webhook" className="border rounded px-2 py-1 w-full" />
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">OAuth Connections</h2>
        <div className="flex gap-4">
          <button className="bg-gray-200 px-4 py-2 rounded">Connect Google</button>
          <button className="bg-gray-200 px-4 py-2 rounded">Connect Xero</button>
          <button className="bg-gray-200 px-4 py-2 rounded">Connect QuickBooks</button>
        </div>
      </div>
      <button className="mt-6 bg-green-600 text-white px-6 py-2 rounded">Save</button>
    </div>
  );
} 