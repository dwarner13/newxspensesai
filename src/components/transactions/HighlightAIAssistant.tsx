import React, { useEffect, useRef, useState } from 'react';
import { analyzeHighlightedContext } from '../../agents/contextAnalyzerAgent';
import { X, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

function isValidSelection(text: string) {
  return text && text.trim().length > 1 && /[\w\d]/.test(text);
}

export const HighlightAIAssistant: React.FC<{ transactions: any[], refresh?: () => void }> = ({ transactions, refresh }) => {
  const [showIcon, setShowIcon] = useState(false);
  const [iconPos, setIconPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);
  const [runLoading, setRunLoading] = useState<number | null>(null);
  const [runSuccess, setRunSuccess] = useState<{ [k: number]: boolean }>({});

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setShowIcon(false);
        setShowTooltip(false);
        return;
      }
      const text = selection.toString();
      if (!isValidSelection(text)) {
        setShowIcon(false);
        setShowTooltip(false);
        return;
      }
      // Find the closest tr (desktop) or mobile row (div with data-hash-id)
      let node = selection.anchorNode as HTMLElement | null;
      while (node && node.nodeType !== 1) node = node.parentElement;
      let row: HTMLElement | null = node;
      while (row && !row.getAttribute('data-hash-id') && row.tagName !== 'TR') {
        row = row.parentElement;
      }
      if (!row) {
        setShowIcon(false);
        setShowTooltip(false);
        return;
      }
      // Find the transaction by hash_id
      const hashId = row.getAttribute('data-hash-id') || row.getAttribute('data-key');
      const tx = transactions.find(t => t.hash_id === hashId);
      if (!tx) {
        setShowIcon(false);
        setShowTooltip(false);
        return;
      }
      // Get bounding rect of selection
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setIconPos({ x: rect.right + window.scrollX, y: rect.top + window.scrollY});
      setSelectedText(text);
      setSelectedRow(tx);
      setShowIcon(true);
      setShowTooltip(false);
      setSuggestions(null);
      setError(null);
      setFeedback(null);
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [transactions]);

  const handleIconClick = async () => {
    setShowTooltip(true);
    setLoading(true);
    setSuggestions(null);
    setError(null);
    try {
      const result = await analyzeHighlightedContext({
        highlightedText: selectedText,
        fullRowContext: selectedRow,
      });
      setSuggestions(result.suggestions || []);
      setError(result.error || null);
    } catch (err: any) {
      setError(err.message || 'AI error');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (type: 'up' | 'down') => {
    setFeedback(type);
    setFeedbackLoading(true);
    // Save feedback to Supabase
    try {
      const userId = selectedRow?.user_id || null;
      const transactionId = selectedRow?.id || null;
      const highlightedText = selectedText;
      const suggestion = suggestions && suggestions[0] ? suggestions[0] : '';
      const feedbackType = type === 'up' ? 'thumbs_up' : 'thumbs_down';
      await supabase.from('ai_feedback').insert([
        {
          user_id: userId,
          transaction_id: transactionId,
          highlighted_text: highlightedText,
          suggestion,
          feedback: feedbackType,
        }
      ]);
      toast.success('Feedback saved – thanks!');
    } catch (err) {
      toast.error('Failed to save feedback');
    } finally {
      setFeedbackLoading(false);
      setTimeout(() => setShowTooltip(false), 1000);
    }
  };

  // Helper: parse suggestion and run action
  const handleRunSuggestion = async (suggestion: string, idx: number) => {
    setRunLoading(idx);
    try {
      const userId = selectedRow?.user_id;
      const transactionId = selectedRow?.id;
      const vendor = selectedRow?.description;
      // Auto-categorize
      if (/auto-?categorize/i.test(suggestion) && vendor && userId) {
        // Try to extract category from suggestion
        const match = suggestion.match(/as ([\w &]+)/i);
        const category = match ? match[1] : 'Uncategorized';
        await supabase.from('categorization_rules').insert([
          {
            user_id: userId,
            keyword: vendor,
            category,
            rule_type: 'auto',
            subcategory: null,
            match_count: 0,
            last_matched: null,
          }
        ]);
        toast.success('Auto-rule saved ✅');
      }
      // Mark as recurring
      else if (/recurring|subscription|repeat/i.test(suggestion) && transactionId) {
        await supabase.from('transactions').update({ is_recurring: true }).eq('id', transactionId);
        toast.success('Transaction marked as recurring ✅');
      }
      // Re-categorize
      else if (/re-?categorize|set category|change category/i.test(suggestion) && transactionId) {
        // Try to extract category
        const match = suggestion.match(/to ([\w &]+)/i);
        const category = match ? match[1] : 'Uncategorized';
        await supabase.from('transactions').update({ category }).eq('id', transactionId);
        toast.success('Transaction updated ✅');
      }
      // Show all transactions for vendor
      else if (/show all.*transactions.*vendor/i.test(suggestion) && vendor) {
        // Could trigger a filter or navigation in the future
        toast.success('Would filter transactions for this vendor');
      } else {
        toast('No action implemented for this suggestion');
      }
      setRunSuccess(s => ({ ...s, [idx]: true }));
      if (refresh) refresh();
    } catch (err) {
      toast.error('Failed to run action');
    } finally {
      setRunLoading(null);
    }
  };

  // Hide on scroll or click outside
  useEffect(() => {
    const hide = () => {
      setShowIcon(false);
      setShowTooltip(false);
    };
    window.addEventListener('scroll', hide, true);
    document.addEventListener('mousedown', (e) => {
      if (
        iconRef.current &&
        !iconRef.current.contains(e.target as Node)
      ) {
        setShowIcon(false);
        setShowTooltip(false);
      }
    });
    return () => {
      window.removeEventListener('scroll', hide, true);
    };
  }, []);

  return (
    <>
      {showIcon && iconPos && (
        <div
          ref={iconRef}
          style={{
            position: 'absolute',
            left: iconPos.x + 8,
            top: iconPos.y - 8,
            zIndex: 1000,
            transition: 'opacity 0.2s',
          }}
        >
          <button
            className="bg-white rounded-full shadow-lg border border-gray-200 p-1 hover:bg-primary-50 transition"
            onClick={handleIconClick}
            title="Ask AI about this context"
          >
            <span role="img" aria-label="AI">💡</span>
          </button>
        </div>
      )}
      {showTooltip && iconPos && (
        <div
          className="fixed z-50"
          style={{
            left: iconPos.x + 32,
            top: iconPos.y - 8,
            minWidth: 280,
            maxWidth: 340,
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            padding: 16,
            animation: 'fadeIn 0.2s',
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-primary-700 flex items-center">
              <span role="img" aria-label="AI">🤖</span> AI Suggestions
            </span>
            <button onClick={() => setShowTooltip(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="animate-spin text-primary-500" size={28} />
            </div>
          ) : error ? (
            <div className="text-error-600">{error}</div>
          ) : suggestions && suggestions.length > 0 ? (
            <ul className="space-y-2 mb-2">
              {suggestions.map((s, i) => (
                <li key={i} className="flex items-center justify-between text-gray-800 text-sm bg-gray-50 rounded px-3 py-2 shadow-sm">
                  <span>{s}</span>
                  <button
                    className={`ml-2 px-2 py-1 text-xs rounded bg-primary-100 hover:bg-primary-200 text-primary-700 flex items-center ${runSuccess[i] ? 'opacity-60 cursor-not-allowed' : ''}`}
                    disabled={runLoading === i || runSuccess[i]}
                    onClick={() => handleRunSuggestion(s, i)}
                  >
                    {runLoading === i ? <Loader2 className="animate-spin" size={16} /> : runSuccess[i] ? 'Done' : 'Run'}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex items-center space-x-3 mt-2">
            <button
              className={`p-2 rounded-full hover:bg-green-100 ${feedback === 'up' ? 'bg-green-200' : ''}`}
              onClick={() => handleFeedback('up')}
              title="Helpful"
              disabled={feedbackLoading}
            >
              <ThumbsUp size={18} className="text-green-600" />
            </button>
            <button
              className={`p-2 rounded-full hover:bg-red-100 ${feedback === 'down' ? 'bg-red-200' : ''}`}
              onClick={() => handleFeedback('down')}
              title="Not helpful"
              disabled={feedbackLoading}
            >
              <ThumbsDown size={18} className="text-red-600" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}; 
