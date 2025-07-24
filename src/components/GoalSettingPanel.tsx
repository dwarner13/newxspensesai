import React, { useState } from "react";

const SUGGESTED_GOALS = [
  "Reduce dining expenses by 20%",
  "Save $500 for travel",
  "Spend less than $100 on subscriptions",
  "Increase savings by $200",
  "No impulse shopping this month"
];

export default function GoalSettingPanel() {
  const [input, setInput] = useState("");
  const [goals, setGoals] = useState<string[]>([]);

  const addGoal = (goal: string) => {
    if (!goal.trim() || goals.includes(goal)) return;
    setGoals([goal, ...goals]);
    setInput("");
  };

  return (
    <section className="bg-white rounded-xl shadow p-6 mb-6 max-w-2xl w-full ">
      <h2 className="text-lg font-bold mb-4">Set a Financial Goal</h2>
      <div className="flex gap-2 mb-4 flex-col sm:flex-row">
        <input
          className="flex-1 border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          placeholder="Set a Financial Goal"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addGoal(input)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition mt-2 sm:mt-0"
          onClick={() => addGoal(input)}
        >
          Add Goal
        </button>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Suggested Goals</h3>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_GOALS.map((goal) => (
            <button
              key={goal}
              className="bg-gray-100 hover:bg-blue-100 text-gray-700 px-3 py-1 rounded-full text-xs border border-gray-200 transition"
              onClick={() => addGoal(goal)}
            >
              {goal}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Your Goals</h3>
        <div className="flex flex-wrap gap-2">
          {goals.length === 0 && <span className="text-gray-400 text-xs">No goals yet.</span>}
          {goals.map((goal, idx) => (
            <span key={idx} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs border border-blue-200">
              {goal}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
} 
