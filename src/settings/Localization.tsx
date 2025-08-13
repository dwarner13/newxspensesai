import React, { useState } from "react";

const LANGUAGES = ["English", "French", "Spanish"];
const TIMEZONES = ["UTC-8", "UTC-5", "UTC+0", "UTC+1", "UTC+8"];
const CURRENCIES = ["USD", "CAD", "EUR", "GBP"];

export default function Localization() {
  const [language, setLanguage] = useState("English");
  const [timezone, setTimezone] = useState("UTC-5");
  const [currency, setCurrency] = useState("USD");

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Localization</h1>
      <p className="mb-6 text-gray-600">Set your language, currency, and time zone.</p>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Language</h2>
        <select value={language} onChange={e => setLanguage(e.target.value)} className="border rounded px-2 py-1">
          {LANGUAGES.map(lang => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </select>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Time Zone</h2>
        <select value={timezone} onChange={e => setTimezone(e.target.value)} className="border rounded px-2 py-1">
          {TIMEZONES.map(tz => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>
      <div className="mb-8">
        <h2 className="font-semibold mb-2">Currency</h2>
        <select value={currency} onChange={e => setCurrency(e.target.value)} className="border rounded px-2 py-1">
          {CURRENCIES.map(cur => (
            <option key={cur} value={cur}>{cur}</option>
          ))}
        </select>
      </div>
      <button className="mt-6 bg-green-600 text-white px-6 py-2 rounded">Save</button>
    </div>
  );
} 
