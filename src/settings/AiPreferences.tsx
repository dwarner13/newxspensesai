import React, { useState } from "react";

const AI_TONES = ["strict", "optimistic", "neutral"];
const FREQUENCIES = ["weekly", "monthly"];
const AGENTS = ["categorizer", "goalAdvisor", "forecast", "receiptParser"];

export default function AiPreferences() {
  const [aiTone, setAiTone] = useState("neutral");
  const [insightFrequency, setInsightFrequency] = useState("monthly");
  const [feedbackLearning, setFeedbackLearning] = useState(true);
  const [enabledAgents, setEnabledAgents] = useState(["categorizer", "goalAdvisor"]);

  const toggleAgent = (agent: string) => {
    setEnabledAgents(agents =>
      agents.includes(agent)
        ? agents.filter(a => a !== agent)
        : [...agents, agent]
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">AI Preferences</h1>
      <p className="mb-6 text-gray-600">Customize how your AI assistant interacts with you.</p>
      <div className="mb-6">
        <h2 className="font-semibold mb-2">AI Tone</h2>
        <select value={aiTone} onChange={e => setAiTone(e.target.value)} className="border rounded px-2 py-1">
          {AI_TONES.map(tone => (
            <option key={tone} value={tone}>{tone.charAt(0).toUpperCase() + tone.slice(1)}</option>
          ))}
        </select>
      </div>
      <div className="mb-6">
        <h2 className="font-semibold mb-2">Insight Frequency</h2>
        <select value={insightFrequency} onChange={e => setInsightFrequency(e.target.value)} className="border rounded px-2 py-1">
          {FREQUENCIES.map(freq => (
            <option key={freq} value={freq}>{freq.charAt(0).toUpperCase() + freq.slice(1)}</option>
          ))}
        </select>
      </div>
      <div className="mb-6">
        <h2 className="font-semibold mb-2">Feedback Learning</h2>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={feedbackLearning} onChange={e => setFeedbackLearning(e.target.checked)} className="accent-blue-600" />
          Enable feedback learning
        </label>
      </div>
      <div className="mb-6">
        <h2 className="font-semibold mb-2">Active AI Agents</h2>
        {AGENTS.map(agent => (
          <label key={agent} className="block">
            <input
              type="checkbox"
              checked={enabledAgents.includes(agent)}
              onChange={() => toggleAgent(agent)}
              className="mr-2 accent-blue-600"
            />
            {agent}
          </label>
        ))}
      </div>
      <button className="mt-6 bg-green-600 text-white px-6 py-2 rounded">Save</button>
    </div>
  );
} 