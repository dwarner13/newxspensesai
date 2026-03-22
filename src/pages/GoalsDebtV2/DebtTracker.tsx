import { THEME, GOALIE_COLOR, type DebtData } from "./goalsConfig";
import { Reveal } from "../PrimeChatV2/Reveal";

interface DebtTrackerProps {
  debts: DebtData[];
  debtFreeMonths: number;
}

export function DebtTracker({ debts, debtFreeMonths }: DebtTrackerProps) {
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);

  return (
    <div>
      {/* Strategy recommendation */}
      <Reveal delay={100}>
        <div style={{
          padding: "20px 24px", borderRadius: 16, marginBottom: 20,
          background: `${GOALIE_COLOR}06`, border: `1px solid ${GOALIE_COLOR}15`,
          display: "flex", gap: 14, alignItems: "flex-start",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: `${GOALIE_COLOR}25`, border: `1.5px solid ${GOALIE_COLOR}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: GOALIE_COLOR,
            boxShadow: `0 0 12px ${GOALIE_COLOR}25`,
          }}>G</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.text, marginBottom: 6 }}>Goalie Recommends: Avalanche Method</div>
            <div style={{ fontSize: 12.5, color: THEME.textMuted, lineHeight: 1.5, marginBottom: 12 }}>
              Pay minimums on everything, then throw all extra cash at the highest-APR debt first. This saves the most in interest over time. At $500/mo extra, you're debt-free in {debtFreeMonths} months.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: `linear-gradient(135deg, ${GOALIE_COLOR}, #d4a017)`, border: "none", color: "#0b1220", cursor: "pointer", boxShadow: `0 2px 12px ${GOALIE_COLOR}33` }}>Apply Avalanche Plan</button>
              <button style={{ padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.textMuted, cursor: "pointer" }}>Show Snowball Instead</button>
              <button style={{ padding: "8px 18px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.textMuted, cursor: "pointer" }}>Custom Plan</button>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Debt cards */}
      {debts.map((d, i) => {
        const monthlyInterest = d.balance * (d.rate / 100 / 12);
        const totalIfMin = Math.round(d.balance * 1.3);
        return (
          <Reveal key={d.name} delay={200 + i * 80}>
            <div style={{
              background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16,
              padding: "20px 24px", marginBottom: 10, boxShadow: `0 2px 12px ${d.color}04`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `${d.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{"\uD83D\uDCB3"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: THEME.text }}>{d.name}</span>
                    <span style={{ fontSize: 10, color: THEME.textDim, padding: "2px 8px", borderRadius: 6, background: THEME.bg, border: `1px solid ${THEME.border}` }}>{d.type}</span>
                  </div>
                  <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 2 }}>{d.rate}% APR \u2022 Min payment: ${d.minPayment}/mo</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: d.color }}>${d.balance.toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: THEME.textDim }}>{Math.ceil(d.balance / (d.minPayment * 2))} months to payoff</div>
                </div>
              </div>
              <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, background: `${d.color}06`, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: THEME.textMuted }}>Monthly interest: <span style={{ fontWeight: 700, color: d.color }}>${monthlyInterest.toFixed(2)}</span></span>
                <span style={{ fontSize: 10, color: THEME.textDim }}>{"\u2022"}</span>
                <span style={{ fontSize: 11, color: THEME.textMuted }}>Total if min only: <span style={{ fontWeight: 700, color: d.color }}>${totalIfMin.toLocaleString()}</span></span>
              </div>
            </div>
          </Reveal>
        );
      })}

      {/* Debt freedom countdown */}
      <Reveal delay={500}>
        <div style={{
          marginTop: 20, padding: "20px 24px", borderRadius: 16,
          background: "linear-gradient(135deg, rgba(52,211,153,0.06), rgba(52,211,153,0.02))",
          border: "1px solid rgba(52,211,153,0.12)", textAlign: "center",
        }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, color: "#34d399", fontWeight: 700, marginBottom: 8 }}>Debt Freedom Countdown</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: THEME.text }}>{debtFreeMonths} months</div>
          <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 4 }}>At current pace \u2022 <span style={{ color: "#34d399", fontWeight: 600 }}>Save $340 in interest with Avalanche</span></div>
        </div>
      </Reveal>
    </div>
  );
}
