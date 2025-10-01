import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, ThumbsUp, ThumbsDown, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const FEEDBACK_LABELS = {
  thumbs_up: <span className="text-green-600 flex items-center"><ThumbsUp size={16} className="mr-1" />Accepted</span>,
  thumbs_down: <span className="text-red-600 flex items-center"><ThumbsDown size={16} className="mr-1" />Rejected</span>,
  null: <span className="text-gray-400">None</span>,
  undefined: <span className="text-gray-400">None</span>
};

export default function InsightHistoryPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'thumbs_up' | 'thumbs_down' | 'none'>('all');
  const [search, setSearch] = useState('');
  const [runLoading, setRunLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchRows();
  }, []);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ai_feedback')
      .select('*')
      .order('created_at', { ascending: false});
    if (error) {
      toast.error('Failed to load suggestions');
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  const filteredRows = rows.filter(row => {
    if (filter === 'thumbs_up' && row.feedback !== 'thumbs_up') return false;
    if (filter === 'thumbs_down' && row.feedback !== 'thumbs_down') return false;
    if (filter === 'none' && row.feedback) return false;
    if (search && !(
      row.suggestion?.toLowerCase().includes(search.toLowerCase()) ||
      row.highlighted_text?.toLowerCase().includes(search.toLowerCase())
    )) return false;
    return true;
  });

  // Optional: Run Again handler (stub)
  const handleRunAgain = async (row: any) => {
    setRunLoading(row.id);
    try {
      // Here you could re-use the logic from HighlightAIAssistant
      toast.success('Run Again: Not implemented (stub)');
    } catch (err) {
      toast.error('Failed to run action');
    } finally {
      setRunLoading(null);
    }
  };

  return (
    <div className="max-w-3xl  px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">AI Suggestions History</h1>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search by keyword or vendor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input px-3 py-2 rounded border border-gray-300 focus:ring-primary-500 focus:border-primary-500"
          />
          <select
            className="input px-2 py-2 rounded border border-gray-300"
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="thumbs_up">Accepted</option>
            <option value="thumbs_down">Rejected</option>
            <option value="none">No Feedback</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary-500" size={32} />
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center text-gray-500 py-12">No suggestions found.</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredRows.map(row => (
            <div key={row.id} className="bg-white rounded-xl shadow p-5 flex flex-col gap-2 border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-700">{row.highlighted_text ? <b>{row.highlighted_text}</b> : <span className="text-gray-400">(No highlight)</span>}</span>
                <span className="text-xs text-gray-400 ml-2">{new Date(row.created_at).toLocaleString()}</span>
              </div>
              <div className="text-gray-800 mb-2">{row.suggestion}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs">Feedback:</span>
                <span>{FEEDBACK_LABELS[row.feedback as keyof typeof FEEDBACK_LABELS]}</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                {row.transaction_id && (
                  <Link to={`/transactions/${row.transaction_id}`} className="text-primary-600 hover:underline flex items-center text-xs">
                    View Transaction <ExternalLink size={14} className="ml-1" />
                  </Link>
                )}
                {/* Optional: Run Again button */}
                <button
                  className="ml-auto flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary-100 hover:bg-primary-200 text-primary-700 disabled:opacity-60"
                  disabled={runLoading === row.id}
                  onClick={() => handleRunAgain(row)}
                >
                  {runLoading === row.id ? <Loader2 className="animate-spin" size={14} /> : <><RefreshCw size={14} /> Run Again}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 
