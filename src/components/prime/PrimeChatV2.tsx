import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Shield, Mic, Paperclip, Image as ImageIcon } from 'lucide-react';
import { usePrimeChat } from '../../hooks/usePrimeChat';

type Props = {
  userId: string;
  sessionId?: string;
  open: boolean;
  onClose: () => void;
};

export default function PrimeChatV2({ userId, sessionId, open, onClose }: Props) {
  const {
    messages,
    input,
    setInput,
    isStreaming,
    uploads,
    addUploadFiles,
    removeUpload,
    send,
    stop,
  } = usePrimeChat(userId, sessionId);

  const dropRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Drag & Drop
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const enter = (e: DragEvent) => { prevent(e); setIsDragging(true); };
    const leave = (e: DragEvent) => { prevent(e); setIsDragging(false); };
    const over = (e: DragEvent) => { prevent(e); };
    const drop = (e: DragEvent) => {
      prevent(e); setIsDragging(false);
      const files = e.dataTransfer?.files;
      if (files && files.length) addUploadFiles(files);
    };
    el.addEventListener('dragenter', enter);
    el.addEventListener('dragleave', leave);
    el.addEventListener('dragover', over);
    el.addEventListener('drop', drop);
    return () => {
      el.removeEventListener('dragenter', enter);
      el.removeEventListener('dragleave', leave);
      el.removeEventListener('dragover', over);
      el.removeEventListener('drop', drop);
    };
  }, [addUploadFiles]);

  const onPickFiles = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    await addUploadFiles(e.target.files);
    e.target.value = '';
  }, [addUploadFiles]);

  // Voice input via Web Speech API (browser support)
  const startListening = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    setIsListening(true);
    let finalText = '';
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
      }
      if (finalText) setInput(prev => `${prev ? prev + ' ' : ''}${finalText}`);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
  }, [setInput]);

  const accent = '#f7b731';

  // Return null when closed to prevent blocking clicks
  if (!open) return null;

  // Responsive: slide-out right on desktop, bottom drawer on mobile
  return (
    <div
      ref={dropRef}
      className={[
        'fixed z-40 transition-transform duration-300 prime-chat-panel',
        'bg-neutral-900/95 backdrop-blur-xl shadow-2xl border border-neutral-800',
        'text-neutral-100',
        'md:top-0 md:right-0 md:h-full md:w-[420px]',
        'md:translate-x-0',
        'translate-y-0 md:translate-x-0',
        'bottom-0 left-0 right-0 h-[72vh] rounded-t-2xl md:rounded-none',
      ].join(' ')}
      style={{ borderColor: 'rgba(247,183,49,0.18)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: accent }} />
          <span className="font-semibold">Prime Chat</span>
        </div>
        <button
          onClick={onClose}
          className="px-2 py-1 rounded hover:bg-neutral-800"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ height: 'calc(100% - 132px)' }}>
        {messages.map(m => (
          <div key={m.id} className="text-sm">
            <div className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <span
                className={[
                  'inline-block px-3 py-2 rounded-lg whitespace-pre-wrap',
                  m.role === 'user' ? 'bg-neutral-800 text-neutral-100' : 'bg-neutral-800/60 text-neutral-200',
                ].join(' ')}
                style={m.role === 'assistant' ? { borderLeft: `3px solid ${accent}` } : undefined}
              >
                {m.content}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Upload previews */}
      {!!uploads.length && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {uploads.map(u => (
            <div key={u.id} className="flex items-center gap-2 px-2 py-1 rounded bg-neutral-800 border border-neutral-700">
              {u.previewUrl ? (
                <img src={u.previewUrl} alt={u.name} className="w-8 h-8 object-cover rounded" />
              ) : (
                <div className="w-8 h-8 flex items-center justify-center text-xs bg-neutral-700 rounded">{u.type.split('/')[1] || 'file'}</div>
              )}
              <div className="text-xs truncate max-w-[140px]">{u.name}</div>
              <button onClick={() => removeUpload(u.id)} className="text-xs text-neutral-400 hover:text-neutral-200">Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="px-3 pb-3 pt-2 border-t border-neutral-800">
        <div className={['flex items-end gap-2 rounded-xl px-3 py-2 bg-neutral-800 border', isDragging ? 'border-amber-400' : 'border-neutral-700'].join(' ')}>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-2 py-2 rounded hover:bg-neutral-700"
            title="Upload files"
            aria-label="Upload files"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={onPickFiles} accept=".pdf,.csv,image/*" />

          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message Prime…"
            className="flex-1 bg-transparent outline-none resize-none text-sm placeholder-neutral-500"
          />

          <button
            onClick={() => (isListening ? undefined : startListening())}
            className={['px-2 py-2 rounded', isListening ? 'opacity-60' : 'hover:bg-neutral-700'].join(' ')}
            title="Voice input"
            aria-label="Voice input"
          >
            <Mic className="h-5 w-5" />
          </button>

          {isStreaming ? (
            <button onClick={stop} className="px-3 py-2 rounded text-neutral-900" style={{ background: accent }}>Stop</button>
          ) : (
            <button onClick={() => send()} className="px-3 py-2 rounded text-neutral-900" style={{ background: accent }}>Send</button>
          )}
        </div>
        <div className="mt-1 text-[11px] text-neutral-500">Drag and drop files anywhere in this panel.</div>
      </div>
    </div>
  );
}


