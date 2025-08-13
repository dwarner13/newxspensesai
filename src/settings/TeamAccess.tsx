import React, { useState } from "react";

const ROLES = ["Admin", "Editor", "Viewer"];

export default function TeamAccess() {
  const [members, setMembers] = useState([
    { id: 1, email: "alice@company.com", role: "Admin" },
    { id: 2, email: "bob@company.com", role: "Viewer" }
  ]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState(ROLES[2]);

  const invite = () => {
    if (inviteEmail) {
      setMembers([...members, { id: Date.now(), email: inviteEmail, role: inviteRole }]);
      setInviteEmail("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Team Access</h1>
      <p className="mb-6 text-gray-600">Invite collaborators and assign access roles.</p>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Invite Member</h2>
        <div className="flex gap-2 mb-2">
          <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Email" className="border rounded px-2 py-1 flex-1" />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="border rounded px-2 py-1">
            {ROLES.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
          <button onClick={invite} className="bg-blue-600 text-white px-4 py-2 rounded">Invite</button>
        </div>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Current Members</h2>
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} className="border-t">
                <td className="p-2">{m.email}</td>
                <td className="p-2">{m.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="mt-6 bg-green-600 text-white px-6 py-2 rounded">Save</button>
    </div>
  );
} 
