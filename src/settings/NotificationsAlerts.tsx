import React, { useState } from "react";

const TRIGGERS = ["Large Transaction", "Low Balance", "Payment Due"];
const METHODS = ["Email", "SMS", "Push Notification"];

export default function NotificationsAlerts() {
  const [alerts, setAlerts] = useState([
    { id: 1, trigger: "Large Transaction", method: "Email" },
    { id: 2, trigger: "Payment Due", method: "SMS" }
  ]);
  const [newTrigger, setNewTrigger] = useState(TRIGGERS[0]);
  const [newMethod, setNewMethod] = useState(METHODS[0]);

  const addAlert = () => {
    setAlerts([...alerts, { id: Date.now(), trigger: newTrigger, method: newMethod }]);
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Notifications & Alerts</h1>
      <p className="mb-6 text-gray-600">Create alerts for important financial events.</p>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Add New Alert</h2>
        <div className="flex gap-2 mb-2">
          <select value={newTrigger} onChange={e => setNewTrigger(e.target.value)} className="border rounded px-2 py-1">
            {TRIGGERS.map(trigger => (
              <option key={trigger} value={trigger}>{trigger}</option>
            ))}
          </select>
          <select value={newMethod} onChange={e => setNewMethod(e.target.value)} className="border rounded px-2 py-1">
            {METHODS.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
          <button onClick={addAlert} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
        </div>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Current Alerts</h2>
        <ul className="list-disc pl-6">
          {alerts.map(alert => (
            <li key={alert.id} className="mb-1">
              <span className="font-semibold">{alert.trigger}</span> — {alert.method}
            </li>
          ))}
        </ul>
      </div>
      <button className="mt-6 bg-green-600 text-white px-6 py-2 rounded">Save</button>
    </div>
  );
} 