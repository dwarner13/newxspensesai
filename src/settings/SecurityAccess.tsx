import React, { useState } from "react";

export default function SecurityAccess() {
  const [twoFA, setTwoFA] = useState(true);
  const [sessionHistory] = useState([
    { ip: "192.168.1.10", location: "Edmonton", timestamp: "2025-07-09T10:00:00Z" },
    { ip: "192.168.1.12", location: "Toronto", timestamp: "2025-07-08T15:00:00Z" }
  ]);
  const [teamEmail, setTeamEmail] = useState("");
  const [teamRole, setTeamRole] = useState("viewer");

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Security & Access</h1>
      <p className="mb-6 text-gray-600">Manage 2FA, session history, and user roles.</p>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Two-Factor Authentication</h2>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={twoFA} onChange={e => setTwoFA(e.target.checked)} className="accent-blue-600" />
          Enable 2FA
        </label>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Session History</h2>
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">IP</th>
              <th className="p-2">Location</th>
              <th className="p-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {sessionHistory.map((s, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{s.ip}</td>
                <td className="p-2">{s.location}</td>
                <td className="p-2">{new Date(s.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Add Team Member</h2>
        <div className="flex gap-2 mb-2">
          <input type="email" value={teamEmail} onChange={e => setTeamEmail(e.target.value)} placeholder="Email" className="border rounded px-2 py-1 flex-1" />
          <select value={teamRole} onChange={e => setTeamRole(e.target.value)} className="border rounded px-2 py-1">
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
      </div>
      <button className="mt-6 bg-green-600 text-white px-6 py-2 rounded">Save</button>
    </div>
  );
} 
