import React from "react";
import { useDevTools } from "@/contexts/DevToolsContext";

function truncate(s?: string, n = 220) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + " …" : s;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest opacity-70 mb-1">
        {title}
      </div>
      <div className="rounded-xl bg-white/5 p-2">{children}</div>
    </div>
  );
}

function KV({ rows }: { rows?: Record<string, string> }) {
  if (!rows) {
    return <div className="text-xs opacity-70">No headers yet.</div>;
  }

  const entries = Object.entries(rows);
  if (!entries.length) {
    return <div className="text-xs opacity-70">No headers yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-1 text-xs">
      {entries.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2">
          <span className="opacity-70">{k}</span>
          <span className="font-mono">{v}</span>
        </div>
      ))}
    </div>
  );
}

export default function DevPanel() {
  const devTools = useDevTools();

  // Only show in dev mode and if provider is mounted
  if (import.meta.env.PROD || !devTools) return null;

  const {
    open,
    setOpen,
    lastHeaders,
    sse,
    guardrails,
    memory,
  } = devTools;

  return (
    <div className={`fixed right-3 bottom-3 z-50`}>
      {/* Toggle */}
      <button
        className="px-3 py-2 rounded-xl shadow bg-gray-800 text-white text-sm hover:bg-gray-700 transition-colors"
        onClick={() => setOpen(!open)}
      >
        🛡️ Dev • {open ? "Hide" : "Show"}
      </button>

      {/* Drawer */}
      {open && (
        <div className="mt-2 w-[420px] max-h-[75vh] overflow-auto rounded-2xl shadow-lg bg-gray-900 text-gray-100 p-4 space-y-4">
          <Section title="Headers">
            <KV rows={lastHeaders} />
          </Section>

          <Section title="SSE">
            <div className="text-sm">
              Chunks: <b>{sse.chunks ?? 0}</b>
            </div>
            {sse.lastEvent && (
              <div className="text-xs opacity-80">
                Last event: {sse.lastEvent}
              </div>
            )}
            {sse.lastText && (
              <pre className="text-xs bg-black/40 p-2 rounded mt-2 overflow-auto">
                {truncate(sse.lastText)}
              </pre>
            )}
          </Section>

          <Section title="Guardrails (latest 10)">
            {guardrails.length > 0 ? (
              <ul className="text-xs space-y-1">
                {guardrails.slice(0, 10).map((g, i) => (
                  <li key={i}>
                    <b>{g.stage}</b> • {g.action} •{" "}
                    <span className="opacity-70">{g.severity ?? "n/a"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs opacity-70">No guardrail events yet.</div>
            )}
          </Section>

          <Section title="Memory">
            <div className="text-sm">
              Hit: <b>{memory.hit ?? "—"}</b> • Count:{" "}
              <b>{memory.count ?? "—"}</b>
            </div>
            {memory.recalls?.length ? (
              <ul className="text-xs mt-2 space-y-1">
                {memory.recalls.map((r, i) => (
                  <li key={i}>
                    ({typeof r.score === "number" ? r.score.toFixed(2) : r.score}) {truncate(r.text)}
                  </li>
                ))}
              </ul>
            ) : null}
            {memory.lastFacts?.length ? (
              <div className="mt-2">
                <div className="text-xs opacity-80 mb-1">
                  Last extracted facts:
                </div>
                <ul className="text-xs space-y-1">
                  {memory.lastFacts.map((f, i) => (
                    <li key={i}>• {truncate(f)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Section>
        </div>
      )}
    </div>
  );
}

