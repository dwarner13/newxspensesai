import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { Reveal } from './PrimeChatV2/Reveal';

const T = { bg:'#0b1220', surface:'#111a2e', border:'#1e2d4a', text:'#e8ecf4', muted:'#7b8ba5', dim:'#475569', accent:'#c8a64e', green:'#34d399', cyan:'#22d3ee', red:'#f87171', amber:'#fbbf24' };

export default function ReceiptsPage() {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'matched' | 'pending' | 'no_match'>('all');
  const [byteMessage, setByteMessage] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const fetchReceipts = useCallback(async () => {
    const sb = getSupabase(); if (!sb || !userId) return;
    setLoading(true);
    let q = sb.from('receipts').select('*').eq('user_id', userId);
    if (filter !== 'all') q = q.eq('match_status', filter);
    const { data } = await q.order('created_at', { ascending: false }).limit(50);
    setReceipts(data || []);
    setLoading(false);
  }, [userId, filter]);

  useEffect(() => { void fetchReceipts(); }, [fetchReceipts]);

  const handleUpload = async (file: File) => {
    setByteMessage('Reading receipt...');
    try {
      const sb = getSupabase(); if (!sb) return;
      const { data: { session } } = await sb.auth.getSession(); if (!session) return;
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await fetch('/.netlify/functions/receipt-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ image_base64: base64, mime_type: file.type, filename: file.name }),
        });
        const data = await res.json();
        setByteMessage(data.ok ? data.reply : 'Something went wrong — try again.');
        void fetchReceipts();
      };
      reader.readAsDataURL(file);
    } catch { setByteMessage('Upload failed — try again.'); }
  };

  const handleMatchAll = async () => {
    setMatching(true);
    try {
      const sb = getSupabase(); if (!sb) return;
      const { data: { session } } = await sb.auth.getSession(); if (!session) return;
      const res = await fetch('/.netlify/functions/receipt-match', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: '{"scan_all":true}' });
      const data = await res.json();
      if (data.ok) { toast.success(`Matched ${data.matched} receipt${data.matched !== 1 ? 's' : ''}`); void fetchReceipts(); }
    } catch { toast.error('Match scan failed'); }
    finally { setMatching(false); }
  };

  const handleDelete = async (r: any) => {
    if (!window.confirm('Delete this receipt?')) return;
    const sb = getSupabase(); if (!sb) return;
    await sb.from('receipts').delete().eq('id', r.id);
    if (r.transaction_id) await sb.from('transactions').update({ receipt_id: null, has_receipt: false }).eq('id', r.transaction_id);
    void fetchReceipts(); toast.success('Receipt deleted');
  };

  const matchedCount = receipts.filter(r => r.match_status === 'matched').length;
  const pendingCount = receipts.filter(r => r.match_status === 'pending').length;
  const isImg = (url: string) => /\.(jpg|jpeg|png|webp)$/i.test(url || '');

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", maxWidth: 1100, margin: '0 auto', padding: '28px 24px', color: T.text }}>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) void handleUpload(e.target.files[0]); e.target.value = ''; }} />
      <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) void handleUpload(e.target.files[0]); e.target.value = ''; }} />

      <Reveal delay={0}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' as const, gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: 'white' }}>Receipts</h1>
            <p style={{ fontSize: 14, color: T.muted, marginTop: 4 }}>Byte reads your receipts and links them to transactions automatically</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleMatchAll} disabled={matching} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: T.surface, border: `1px solid ${T.border}`, color: matching ? T.dim : T.muted, cursor: matching ? 'default' : 'pointer' }}>{'\uD83D\uDD04'} {matching ? 'Scanning...' : 'Match All'}</button>
            <button onClick={() => cameraRef.current?.click()} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: T.surface, border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer' }}>{'\uD83D\uDCF7'} Photo</button>
            <button onClick={() => fileRef.current?.click()} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: `linear-gradient(135deg, ${T.accent}, #a08030)`, border: 'none', color: '#0b1220', cursor: 'pointer' }}>+ Add Receipt</button>
          </div>
        </div>
      </Reveal>

      {byteMessage && (
        <div style={{ display: 'flex', gap: 10, padding: '14px 18px', borderRadius: 14, background: `${T.green}06`, border: `1px solid ${T.green}18`, marginBottom: 20 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${T.green}15`, border: `1px solid ${T.green}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: T.green, flexShrink: 0 }}>B</div>
          <div style={{ flex: 1, fontSize: 14, color: '#c8d0e0', lineHeight: 1.6 }}>
            {byteMessage.split('**').map((part, j) => j % 2 === 1 ? <strong key={j} style={{ color: T.green }}>{part}</strong> : <span key={j}>{part}</span>)}
          </div>
          <button onClick={() => setByteMessage(null)} style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer', fontSize: 16, alignSelf: 'flex-start' }}>{'\u00d7'}</button>
        </div>
      )}

      <Reveal delay={50}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[{ label: 'Total', value: receipts.length, color: T.text }, { label: 'Matched', value: matchedCount, color: T.green }, { label: 'Pending', value: pendingCount, color: T.amber }].map(s => (
            <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.4, color: T.dim, fontWeight: 700, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </Reveal>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {([['all', 'All'], ['matched', '\u2713 Matched'], ['pending', '\u23F3 Pending'], ['no_match', '\u26A0 No Match']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: filter === id ? `${T.accent}15` : T.surface, border: `1px solid ${filter === id ? T.accent : T.border}`, color: filter === id ? T.accent : T.muted, cursor: 'pointer' }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.dim }}>Loading receipts...</div>
      ) : receipts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{'\uD83E\uDDFE'}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginBottom: 8 }}>No receipts yet</div>
          <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.6, maxWidth: 360, margin: '0 auto 24px' }}>Upload receipts to attach proof to your transactions. Byte reads them and matches automatically.</div>
          <button onClick={() => fileRef.current?.click()} style={{ padding: '12px 28px', borderRadius: 12, fontSize: 14, fontWeight: 700, background: `linear-gradient(135deg, ${T.accent}, #a08030)`, border: 'none', color: '#0b1220', cursor: 'pointer' }}>{'\uD83D\uDCF7'} Add Your First Receipt</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {receipts.map(r => (
            <div key={r.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: 'hidden', position: 'relative' }}>
              {isImg(r.file_url || r.image_url) ? (
                <img src={r.file_url || r.image_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ height: 140, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', background: `${T.border}33` }}>
                  <span style={{ fontSize: 32 }}>{'\uD83D\uDCC4'}</span>
                  <span style={{ fontSize: 10, color: T.dim, marginTop: 4 }}>{r.original_filename || 'Document'}</span>
                </div>
              )}
              <div style={{ position: 'absolute', top: 8, right: 8, padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700, background: r.match_status === 'matched' ? `${T.green}20` : r.match_status === 'pending' ? `${T.amber}20` : `${T.red}20`, color: r.match_status === 'matched' ? T.green : r.match_status === 'pending' ? T.amber : T.red, border: `1px solid ${(r.match_status === 'matched' ? T.green : r.match_status === 'pending' ? T.amber : T.red) + '33'}` }}>
                {r.match_status === 'matched' ? '\u2713 Matched' : r.match_status === 'pending' ? '\u23F3 Pending' : '\u26A0 No Match'}
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>{r.merchant_name || 'Unknown merchant'}</div>
                {r.amount && <div style={{ fontSize: 20, fontWeight: 800, color: T.accent, marginBottom: 4 }}>${Number(r.amount).toFixed(2)}</div>}
                {r.receipt_date && <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>{r.receipt_date}</div>}
                {r.suggested_category && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: `${T.cyan}12`, border: `1px solid ${T.cyan}20`, color: T.cyan }}>{r.suggested_category}</span>}
                {r.match_status === 'matched' && r.transaction_id && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: T.green }}>{'\u2713'} Linked</span>
                    <button onClick={() => navigate('/dashboard/transactions')} style={{ fontSize: 11, fontWeight: 600, color: T.cyan, background: 'none', border: 'none', cursor: 'pointer' }}>View {'\u2192'}</button>
                  </div>
                )}
                {r.match_status === 'pending' && <div style={{ marginTop: 8, fontSize: 11, color: T.amber }}>Waiting for matching statement</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
                  <button onClick={() => handleDelete(r)} style={{ fontSize: 11, color: T.dim, background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                  {(r.file_url || r.image_url) && <button onClick={() => window.open(r.file_url || r.image_url, '_blank')} style={{ fontSize: 11, fontWeight: 600, color: T.cyan, background: 'none', border: 'none', cursor: 'pointer' }}>View file {'\u2192'}</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
