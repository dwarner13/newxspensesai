import React, { useState } from "react";

export default function GoalSettings() {
  const [goals, setGoals] = useState([
    { id: 1, name: "Save $5,000 Emergency Fund", target: 5000, current: 1200, due: "2026-01-01", xp: true }
  ]);
  const [newGoal, setNewGoal] = useState({ name: "", target: 0, due: "", xp: false });

  const addGoal = () => {
    if (newGoal.name && newGoal.target && newGoal.due) {
      setGoals([...goals, { ...newGoal, id: Date.now(), current: 0 }]);
      setNewGoal({ name: "", target: 0, due: "", xp: false });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Goal Settings</h1>
      <p className="mb-6 text-gray-600">Track personal or business financial goals.</p>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Create Goal</h2>
        <div className="flex gap-2 mb-2">
          <input value={newGoal.name} onChange={e => setNewGoal(g => ({ ...g, name: e.target.value }))} placeholder="Goal name" className="border rounded px-2 py-1 flex-1" />
          <input type="number" value={newGoal.target} onChange={e => setNewGoal(g => ({ ...g, target: Number(e.target.value) }))} placeholder="Target amount" className="border rounded px-2 py-1 w-32" />
          <input type="date" value={newGoal.due} onChange={e => setNewGoal(g => ({ ...g, due: e.target.value }))} className="border rounded px-2 py-1 w-40" />
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={newGoal.xp} onChange={e => setNewGoal(g => ({ ...g, xp: e.target.checked }))} className="accent-blue-600" /> XP
          </label>
          <button onClick={addGoal} className="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
        </div>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Current Goals</h2>
        <ul className="list-disc pl-6">
          {goals.map(goal => (
            <li key={goal.id} className="mb-1">
              <span className="font-semibold">{goal.name}</span> — Target: ${goal.target} — Due: {goal.due} — XP: {goal.xp ? "Yes" : "No"}
            </li>
          ))}
        </ul>
      </div>
      <button className="mt-6 bg-green-600 text-white px-6 py-2 rounded">Save</button>
    </div>
  );
} 