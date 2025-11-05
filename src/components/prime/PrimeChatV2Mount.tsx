import React, { useMemo, useState } from 'react';
import PrimeChatV2 from './PrimeChatV2';

export default function PrimeChatV2Mount() {
  const [open, setOpen] = useState(false);
  const userId = useMemo(() => localStorage.getItem('uid') || 'demo-user', []);
  const sessionId = undefined;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open Prime Assistant"
          className="fixed z-40 rounded-full shadow-lg transition-transform"
          style={{
            bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            right: 'calc(24px + env(safe-area-inset-right, 0px))',
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, #f7b731, #f59e0b)'
          }}
        >
          <span style={{ fontSize: 24 }}>👑</span>
        </button>
      )}

      <PrimeChatV2 open={open} onClose={() => setOpen(false)} userId={userId} sessionId={sessionId} />
    </>
  );
}





