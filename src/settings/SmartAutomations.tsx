import React, { useState } from "react";

export default function SmartAutomations() {
  const [rules, setRules] = useState([
    { id: 1, if: "Vendor = Amazon", then: "Category = Shopping" },
    { id: 2, if: "Amount > $500", then: "Alert" }
  ]);
  const [newIf, setNewIf] = useState("");
  const [newThen, setNewThen] = useState("");

  const addRule = () => {
    if (newIf && newThen) {
      setRules([...rules, { id: Date.now(), if: newIf, then: newThen }]);
      setNewIf("");
      setNewThen("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Smart Automations</h1>
      <p className="mb-6 text-gray-600">Set up rules to automate expense categorization.</p>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Add New Rule</h2>
        <div className="flex gap-2 mb-2">
          <input value={newIf} onChange={e => setNewIf(e.target.value)} placeholder="If..." className="border rounded px-2 py-1 flex-1" />
          <input value={newThen} onChange={e => setNewThen(e.target.value)} placeholder="Then..." className="border rounded px-2 py-1 flex-1" />
          <button onClick={addRule} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
        </div>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Saved Rules</h2>
        <ul className="list-disc pl-6">
          {rules.map(rule => (
            <li key={rule.id} className="mb-1">If <span className="font-semibold">{rule.if}</span> then <span className="font-semibold">{rule.then}</span></li>
          ))}
        </ul>
      </div>
      <button className="mt-6 bg-green-600 text-white px-6 py-2 rounded">Save</button>
    </div>
  );
} 