import React, { useState } from "react";

export default function BillingUsage() {
  const [plan, setPlan] = useState("Pro");
  const [usage] = useState({ receipts: 120, aiInsights: 45, teamMembers: 3 });
  const [invoices] = useState([
    { id: 1, date: "2024-06-01", amount: 29.99, status: "Paid" },
    { id: 2, date: "2024-05-01", amount: 29.99, status: "Paid" }
  ]);

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Billing & Usage</h1>
      <p className="mb-6 text-gray-600">Track plan usage and view billing history.</p>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Current Plan</h2>
        <div className="flex items-center gap-4 mb-2">
          <span className="font-bold text-lg">{plan}</span>
          <button className="bg-blue-600 text-white px-4 py-2 rounded">Upgrade</button>
        </div>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Usage Stats</h2>
        <ul className="list-disc pl-6">
          <li>Receipts processed: {usage.receipts}</li>
          <li>AI Insights: {usage.aiInsights}</li>
          <li>Team members: {usage.teamMembers}</li>
        </ul>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Invoice History</h2>
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Date</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(inv => (
              <tr key={inv.id} className="border-t">
                <td className="p-2">{inv.date}</td>
                <td className="p-2">${inv.amount.toFixed(2)}</td>
                <td className="p-2">{inv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="mt-6 bg-green-600 text-white px-6 py-2 rounded">Save</button>
    </div>
  );
} 
