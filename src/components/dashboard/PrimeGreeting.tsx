import React from 'react';
import { useNavigate } from 'react-router-dom';
import { emitBus } from '../../lib/bus';
import { Upload, BarChart3, FileText, Target, Zap, Dice6 } from 'lucide-react';

interface Suggestion {
  label: string;
  action?: string;
  route?: string;
  event?: { type: string; payload: any };
  icon?: React.ReactNode;
}

interface PrimeGreetingProps {
  greeting: string;
  suggestions: Suggestion[];
}

// Icon map for suggestions
const getIconForLabel = (label: string): React.ReactNode => {
  if (label.includes('Upload')) return <Upload size={16} />;
  if (label.includes('spending') || label.includes('insights')) return <BarChart3 size={16} />;
  if (label.includes('transactions')) return <FileText size={16} />;
  if (label.includes('goals')) return <Target size={16} />;
  if (label.includes('Roast')) return <Zap size={16} />;
  if (label.includes('Surprise')) return <Dice6 size={16} />;
  return null;
};

export default function PrimeGreeting({ greeting, suggestions }: PrimeGreetingProps) {
  const navigate = useNavigate();

  const handleSuggestion = (suggestion: Suggestion) => {
    if (suggestion.route) {
      navigate(suggestion.route);
    } else if (suggestion.event) {
      emitBus(suggestion.event.type as any, suggestion.event.payload);
    } else if (suggestion.action === 'random') {
      // Pick a random suggestion (excluding itself)
      const others = suggestions.filter(s => s.action !== 'random');
      if (others.length > 0) {
        const randomSuggestion = others[Math.floor(Math.random() * others.length)];
        handleSuggestion(randomSuggestion);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Greeting text */}
      <div className="text-sm text-gray-200 leading-relaxed">
        {greeting}
      </div>

      {/* Suggestion chips */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Quick actions</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestion(suggestion)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-xs font-medium transition-colors border border-purple-500/30 hover:border-purple-500/50"
            >
              {suggestion.icon || getIconForLabel(suggestion.label)}
              {suggestion.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}






