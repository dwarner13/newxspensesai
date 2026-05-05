import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { THEME } from "./categoryConfig";
import { Reveal } from "../PrimeChatV2/Reveal";

interface Suggestion {
  merchant_name: string;
  override_count: number;
  recent_category: string;
  recent_subcategory: string | null;
  last_seen: string;
}

interface Props {
  userId: string;
  onMakeRule: (merchant: string, category: string, subcategory: string | null) => void;
}

const INITIAL_VISIBLE = 5;

export function RulesOverrideSuggestions({ userId, onMakeRule }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const sb = getSupabase();
      if (!sb || !userId) { setLoading(false); return; }
      const { data, error } = await sb.rpc("get_override_suggestions", { p_user_id: userId });
      if (cancelled) return;
      if (error) {
        console.error("[RulesOverrideSuggestions] RPC failed", error);
        setLoading(false);
        return;
      }
      setSuggestions((data ?? []) as Suggestion[]);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading || suggestions.length === 0) return null;

  const visible = showAll ? suggestions : suggestions.slice(0, INITIAL_VISIBLE);

  return (
    <Reveal delay={40}>
      <div
        style={{
          marginBottom: 20,
          padding: "18px 22px",
          borderRadius: 14,
          background: THEME.surface,
          border: `1px solid ${THEME.border}`,
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
            Make rules from your overrides
          </div>
          <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 3 }}>
            {suggestions.length} merchant{suggestions.length !== 1 ? "s" : ""} you've categorized 3+ times without a rule. One click turns each into auto.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map((s) => (
            <div
              key={s.merchant_name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 10,
                background: THEME.bg,
                border: `1px solid ${THEME.border}`,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 200, flexWrap: "wrap" }}>
                <div style={{ minWidth: 44, fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: THEME.cyan, textAlign: "right" }}>
                  {s.override_count}x
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>
                    {s.merchant_name}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 1 }}>
                    {s.recent_category}{s.recent_subcategory ? ` / ${s.recent_subcategory}` : ""}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onMakeRule(s.merchant_name, s.recent_category, s.recent_subcategory)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  background: `${THEME.cyan}18`,
                  border: `1px solid ${THEME.cyan}40`,
                  color: THEME.cyan,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                <Plus size={12} strokeWidth={3} /> Make rule
              </button>
            </div>
          ))}
        </div>

        {suggestions.length > INITIAL_VISIBLE && (
          <button
            onClick={() => setShowAll(v => !v)}
            style={{
              marginTop: 12,
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              background: "none",
              border: `1px solid ${THEME.border}`,
              color: THEME.textMuted,
              cursor: "pointer",
              width: "100%",
            }}
          >
            {showAll ? "Show fewer" : `Show all ${suggestions.length}`}
          </button>
        )}
      </div>
    </Reveal>
  );
}
