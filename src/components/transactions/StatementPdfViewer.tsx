/**
 * StatementPdfViewer
 *
 * Renders a bank statement PDF inline using PDF.js (loaded from CDN).
 * - Skips page 1 (contains personal info: name, account number, address)
 * - Renders pages 2+ on canvas elements
 * - Redacts the top header band on each page (bank logo / account number area)
 * - Works on mobile (pinch zoom via CSS) and desktop
 * - PDF is never uploaded to any server - blob URL stays in browser memory only
 *
 * Usage:
 *   <StatementPdfViewer url={fileUrl} label="BMO Aug 2025" onClose={() => {}} />
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface StatementPdfViewerProps {
  url: string;
  label: string;
  onClose: () => void;
}

// Height in px to black out at the top of each page (account number / bank header area)
const REDACT_HEADER_PX = 80;

// PDF.js CDN - no npm install required
const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

function loadPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    const script = document.createElement('script');
    script.src = PDFJS_CDN;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js from CDN'));
    document.head.appendChild(script);
  });
}

interface PageCanvasProps {
  pdf: any;
  pageNumber: number;
  scale: number;
}

function PageCanvas({ pdf, pageNumber, scale }: PageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!canvasRef.current) return;
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;

        // Redact header band - black rectangle over top portion
        ctx.fillStyle = '#0b1220';
        ctx.fillRect(0, 0, canvas.width, REDACT_HEADER_PX * scale);

        // Subtle "Redacted for privacy" label
        ctx.fillStyle = 'rgba(100,116,139,0.6)';
        ctx.font = `${Math.round(11 * scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(
          '\u2014 Account details redacted for privacy \u2014',
          canvas.width / 2,
          (REDACT_HEADER_PX * scale) / 2 + 4
        );

        setRendered(true);
      } catch (err) {
        console.error(`PDF page ${pageNumber} render error:`, err);
        setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [pdf, pageNumber, scale]);

  return (
    <div style={{ marginBottom: 16, borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}>
      {error ? (
        <div style={{ padding: 24, background: '#111a2e', color: '#64748b', fontSize: 13, textAlign: 'center' }}>
          Could not render page {pageNumber}
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            opacity: rendered ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
      {!rendered && !error && (
        <div style={{ height: 300, background: '#111a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 24, height: 24, border: '2px solid #22d3ee', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </div>
  );
}

export function StatementPdfViewer({ url, label, onClose }: StatementPdfViewerProps) {
  const [pdf, setPdf] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1.4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const pdfjs = await loadPdfJs();
        const loadingTask = pdfjs.getDocument(url);
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setPageCount(pdfDoc.numPages);
      } catch (err: any) {
        setError(err.message || 'Could not load PDF');
      } finally {
        setLoading(false);
      }
    })();
  }, [url]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 280);
  }, [onClose]);

  // Pages to render - skip page 1 (personal info)
  const pagesToRender = Array.from(
    { length: Math.max(0, pageCount - 1) },
    (_, i) => i + 2
  );

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const content = (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1200,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(4px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.28s ease',
        }}
      />

      {/* Viewer panel */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: isMobile ? '100%' : 680,
        zIndex: 1201,
        background: '#0b1220',
        borderLeft: '1px solid #1e2d4a',
        display: 'flex',
        flexDirection: 'column',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e2d4a',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}>
          <button
            onClick={handleClose}
            style={{ width: 36, height: 36, borderRadius: 8, background: '#111a2e', border: '1px solid #1e2d4a', color: '#9ba8bc', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >{"\u2190"}</button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e8ecf4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {"\uD83D\uDCC4"} {label}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
              {pageCount > 1
                ? `Showing pages 2\u2013${pageCount} \u00b7 Page 1 hidden (personal info)`
                : 'Loading\u2026'}
            </div>
          </div>

          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => setScale(s => Math.max(0.6, parseFloat((s - 0.2).toFixed(1))))}
              style={{ width: 30, height: 30, borderRadius: 6, background: '#111a2e', border: '1px solid #1e2d4a', color: '#9ba8bc', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >{"\u2212"}</button>
            <span style={{ fontSize: 12, color: '#64748b', minWidth: 36, textAlign: 'center' }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(s => Math.min(3.0, parseFloat((s + 0.2).toFixed(1))))}
              style={{ width: 30, height: 30, borderRadius: 6, background: '#111a2e', border: '1px solid #1e2d4a', color: '#9ba8bc', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >+</button>
          </div>
        </div>

        {/* Privacy notice */}
        <div style={{
          padding: '8px 20px',
          background: 'rgba(52,211,153,0.04)',
          borderBottom: '1px solid rgba(52,211,153,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13 }}>{"\uD83D\uDD12"}</span>
          <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>
            Viewed locally only {"\u2014"} never uploaded to any server
          </span>
        </div>

        {/* Scrollable page area */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            padding: '16px 16px 40px',
            WebkitOverflowScrolling: 'touch' as any,
          }}
        >
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 16 }}>
              <div style={{ width: 32, height: 32, border: '2px solid #22d3ee', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <span style={{ fontSize: 13, color: '#64748b' }}>Loading statement{"\u2026"}</span>
            </div>
          )}

          {error && (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{"\u26A0\uFE0F"}</div>
              <div style={{ fontSize: 14, color: '#fb923c', fontWeight: 600, marginBottom: 8 }}>
                Could not load statement
              </div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                {error}
              </div>
            </div>
          )}

          {!loading && !error && pagesToRender.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              This statement only has 1 page (hidden for privacy).
            </div>
          )}

          {!loading && !error && pdf && pagesToRender.map(pageNum => (
            <PageCanvas
              key={`${url}-p${pageNum}-s${scale}`}
              pdf={pdf}
              pageNumber={pageNum}
              scale={scale}
            />
          ))}
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
