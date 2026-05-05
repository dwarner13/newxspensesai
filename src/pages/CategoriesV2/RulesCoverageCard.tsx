import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { THEME } from "./categoryConfig";
import { Reveal } from "../PrimeChatV2/Reveal";

interface CoverageData {
  total: number;
  rule: number;
  hardcoded: number;
  aiLearned: number;
  override: number;
  pending: number;
  autoPct: number;
  rulePct: number;
  hardcodedPct: number;
  aiLearnedPct: number;
  overridePct: number;
}

export function RulesCoverageCard({ userId }: { userId: string }) {
  const [data, setData] = useState<CoverageData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const sb = getSupabase();
      if (!sb || !userId) return;
      const { data: raw, error } = await sb.rpc("get_rules_coverage", { p_user_id: userId });
      if (cancelled) return;
      if (error) {
        console.error("[RulesCoverageCard] RPC failed", error);
        return;
      }
      const counts = (raw ?? {}) as Record<string, number>;
      const get = (k: string) => counts[k] ?? 0;

      const rule = get("tag_rule");
      const hardcoded = get("hardcoded");
      const aiLearned = get("ai") + get("learned") + get("tag_chat");
      const override = get("user_override") + get("user_type_fix");
      const pending = get("_null") + get("needs_review");
      const total = rule + hardcoded + aiLearned + override + pending;
      const auto = rule + hardcoded + aiLearned;
      const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

      setData({
        total, rule, hardcoded, aiLearned, override, pending,
        autoPct: pct(auto),
        rulePct: pct(rule),
        hardcodedPct: pct(hardcoded),
        aiLearnedPct: pct(aiLearned),
        overridePct: pct(override),
      });
    };
    load();
    return () => { cancelled = true; };
  }, [userId]);

  if (!data || data.total === 0) return null;

  const fmtPct = (p: number) => (p < 1 ? "<1%" : `${p}%`);
  const fmtNum = (n: number) => n.toLocaleString();
  const headline = data.autoPct >= 50 ? "Rules are working" : "Rule coverage";

  return (
    <Reveal delay={25}>
      <div
        style={{
          marginBottom: 20,
          padding: "20px 22px",
          borderRadius: 14,
          background: `linear-gradient(135deg, ${THEME.cyan}12 0%, ${THEME.cyan}04 100%)`,
          border: `1px solid ${THEME.cyan}28`,
          borderLeft: `3px solid ${THEME.cyan}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, flexWrap: "wrap" }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: THEME.cyan, lineHeight: 1 }}>
            {data.autoPct}%
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 4 }}>
              {headline}
            </div>
            <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.5 }}>
              of your {fmtNum(data.total)} transactions are auto-categorized by Tag - you didn't have to touch them.
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 22,
            marginTop: 16,
            paddingTop: 12,
            borderTop: `1px solid ${THEME.cyan}18`,
            fontSize: 12,
            color: THEME.textMuted,
            flexWrap: "wrap",
          }}
        >
          <span>
            <span style={{ color: THEME.cyan, fontWeight: 700 }}>{fmtPct(data.rulePct)}</span>{" "}
            Tag rules ({fmtNum(data.rule)})
          </span>
          <span>
            <span style={{ color: THEME.cyan, fontWeight: 700 }}>{fmtPct(data.hardcodedPct)}</span>{" "}
            Built-in defaults ({fmtNum(data.hardcoded)})
          </span>
          <span>
            <span style={{ color: THEME.cyan, fontWeight: 700 }}>{fmtPct(data.aiLearnedPct)}</span>{" "}
            AI / learned ({fmtNum(data.aiLearned)})
          </span>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: THEME.textDim }}>
          You manually categorized {fmtPct(data.overridePct)} ({fmtNum(data.override)}).
        </div>
      </div>
    </Reveal>
  );
}
