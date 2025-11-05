import React, { useMemo, useRef, useState } from 'react';

export interface ImageAttachmentMeta {
  name: string;
  type: string;
  size: number;
  dataURL: string;
}

interface FileUploaderProps {
  agent?: 'prime';
  messages?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  onImageAttachment?: (meta: ImageAttachmentMeta) => void;
  onSystemMessage?: (content: string) => void;
  accept?: string;
  children: React.ReactNode;
  className?: string;
}

export default function FileUploader({ agent = 'prime', messages = [], onImageAttachment, onSystemMessage, accept, children, className }: FileUploaderProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<Array<{ name: string; type: string; url?: string }>>([]);

  const acceptAttr = useMemo(() => accept || '.pdf,.csv,.xlsx,.jpg,.jpeg,.png', [accept]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);

    for (const file of list) {
      if (file.type.startsWith('image/')) {
        const dataURL = await readAsDataURL(file);
        setPreviews(prev => [...prev, { name: file.name, type: file.type, url: dataURL }]);
        onImageAttachment && onImageAttachment({ name: file.name, type: file.type, size: file.size, dataURL });
      } else if (isDocType(file)) {
        try {
          await uploadDocument(agent, messages, file);
          onSystemMessage && onSystemMessage(`uploaded ${file.name}`);
          setPreviews(prev => [...prev, { name: file.name, type: file.type }]);
        } catch (e) {
          onSystemMessage && onSystemMessage(`failed to upload ${file.name}`);
        }
      }
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center"
      >
        {children}
      </button>
      <input
        ref={ref}
        type="file"
        className="hidden"
        accept={acceptAttr}
        multiple
        capture="environment"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {previews.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {previews.map((p, i) => (
            <div key={`${p.name}-${i}`} className="flex items-center gap-2 bg-white/5 rounded-xl px-2 py-1 min-w-[140px]">
              {p.url ? (
                <img src={p.url} alt={p.name} className="w-8 h-8 rounded-md object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-xs">DOC</div>
              )}
              <div className="text-xs text-white/80 truncate max-w-[100px]" title={p.name}>{p.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function isDocType(file: File) {
  const t = file.type;
  const name = file.name.toLowerCase();
  return t === 'application/pdf' ||
    t === 'text/csv' ||
    t === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    name.endsWith('.pdf') || name.endsWith('.csv') || name.endsWith('.xlsx');
}

async function uploadDocument(agent: 'prime', messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>, file: File) {
  const buf = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(buf);
  const body = {
    agent,
    messages,
    attachments: [{ name: file.name, type: file.type, data: base64 }],
    stream: false
  };
  const res = await fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`upload failed ${res.status}`);
  return await res.json();
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}


