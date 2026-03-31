// Shared Agent Chat UI Constants
// Used by TagCopilotPanel (Transactions), TagCopilotPanel (Categories), and future panels
export const CHAT_STYLES = {
  panel: {
    width: 520,
    bg: '#080f1e',
    borderLeft: '1px solid rgba(34,211,153,0.15)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
  },
  avatar: (color: string) => ({
    width: 28, height: 28, borderRadius: '50%',
    background: `${color}20`, border: `1px solid ${color}40`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 800, color, flexShrink: 0, marginTop: 2,
  }),
  bubble: (isUser: boolean) => ({
    maxWidth: '85%',
    padding: '11px 15px',
    borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
    background: isUser ? 'rgba(34,211,153,0.15)' : 'rgba(255,255,255,0.04)',
    border: `1px solid ${isUser ? 'rgba(34,211,153,0.25)' : 'rgba(255,255,255,0.06)'}`,
    fontSize: 15, color: '#e8ecf4', lineHeight: 1.7,
    wordBreak: 'break-word' as const, overflowWrap: 'break-word' as const,
    whiteSpace: 'pre-wrap' as const,
    animation: 'chatMsgIn 0.18s ease forwards',
  }),
  input: {
    flex: 1, background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '12px 14px',
    fontSize: 14, color: '#e8ecf4', outline: 'none',
    fontFamily: 'inherit', resize: 'none' as const,
    lineHeight: 1.6, minHeight: 52,
  },
  sendBtn: (active: boolean) => ({
    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
    background: active ? 'rgba(34,211,153,0.2)' : 'rgba(34,211,153,0.08)',
    border: `1px solid ${active ? 'rgba(34,211,153,0.35)' : 'rgba(34,211,153,0.15)'}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: active ? 'pointer' : 'default', color: '#22d3ee',
  }),
  thinkingDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: '#22d3ee', opacity: 0.5,
  },
};

export const CHAT_KEYFRAMES = `@keyframes chatMsgIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}`;
