import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { THEME } from "../PrimeChatV2/agentConfig";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { id: "account", label: "Account", icon: "\uD83D\uDC64" },
  { id: "preferences", label: "Preferences", icon: "\u2699\uFE0F" },
  { id: "ai-team", label: "AI Team", icon: "\uD83E\uDD16" },
  { id: "security", label: "Security", icon: "\uD83D\uDD12" },
  { id: "notifications", label: "Notifications", icon: "\uD83D\uDD14" },
  { id: "data", label: "Data & Privacy", icon: "\uD83D\uDEE1\uFE0F" },
];

const AGENTS_CONFIG = [
  { name: "Prime", color: "#c8a64e", role: "Financial Advisor", tasks: 128, active: true },
  { name: "Byte", color: "#34d399", role: "Smart Import", tasks: 14, active: true },
  { name: "Tag", color: "#22d3ee", role: "Categorizer", tasks: 184, active: true },
  { name: "Crystal", color: "#a78bfa", role: "Analytics", tasks: 42, active: true },
  { name: "Goalie", color: "#fbbf24", role: "Goals Coach", tasks: 8, active: true },
  { name: "Ledger", color: "#34d399", role: "Tax Organizer", tasks: 12, active: true },
];

export default function SettingsPageV2() {
  const { userId, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState("account");

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => { const h = () => setIsMobile(window.innerWidth <= 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const InputRow = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${THEME.border}` }}>
      <span style={{ fontSize: 13, color: THEME.textMuted }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{value}</span>
    </div>
  );

  const Toggle = ({ on }: { on: boolean }) => (
    <div style={{ width: 40, height: 22, borderRadius: 11, background: on ? "#34d399" : THEME.border, position: "relative", cursor: "pointer", transition: "background 0.2s" }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: on ? 20 : 2, transition: "left 0.2s" }} />
    </div>
  );

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", background: THEME.bg, color: THEME.text, minHeight: "100vh", padding: "28px 36px" }}>
      <Reveal delay={0}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0, marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 13, color: THEME.textMuted, marginBottom: 24 }}>Manage your XspensesAI experience</p>
      </Reveal>

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 16 : 24 }}>
        {/* Left nav */}
        <Reveal delay={100} style={{ width: isMobile ? "100%" : 220, flexShrink: 0 }}>
          <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: "8px", position: "sticky", top: 80 }}>
            {NAV_ITEMS.map(item => (
              <div key={item.id} onClick={() => setActiveSection(item.id)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10,
                background: activeSection === item.id ? THEME.accentGlow : "transparent",
                borderLeft: activeSection === item.id ? `3px solid ${THEME.accent}` : "3px solid transparent",
                cursor: "pointer", transition: "all 0.15s", marginBottom: 2,
              }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ fontSize: 13, fontWeight: activeSection === item.id ? 700 : 500, color: activeSection === item.id ? THEME.accent : THEME.textMuted }}>{item.label}</span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Right content */}
        <div style={{ flex: 1 }}>
          {activeSection === "account" && (
            <Reveal delay={200}>
              <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18, padding: "28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${THEME.border}` }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${THEME.accent}30, ${THEME.accent}10)`, border: `1.5px solid ${THEME.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: THEME.accent }}>D</div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>Darrell</div>
                    <div style={{ fontSize: 12, color: THEME.textDim }}>darrell.warner13@gmail.com</div>
                  </div>
                  <div style={{ marginLeft: "auto", padding: "4px 14px", borderRadius: 8, background: `${THEME.accent}12`, border: `1px solid ${THEME.accent}22`, fontSize: 11, fontWeight: 700, color: THEME.accent }}>Free Plan</div>
                </div>
                <InputRow label="Display Name" value="darrell" />
                <InputRow label="Primary Mode" value="Personal Finances" />
                <InputRow label="Guidance Style" value="Explain Everything" />
                <InputRow label="Business Name" value="no personal" />
                <InputRow label="Currency" value="CAD" />
              </div>
            </Reveal>
          )}

          {activeSection === "ai-team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {AGENTS_CONFIG.map((a, i) => (
                <Reveal key={a.name} delay={100 + i * 60}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 22px", background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${a.color}20`, border: `1.5px solid ${a.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: a.color }}>{a.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: THEME.textDim }}>{a.role} {"\u2022"} {a.tasks} tasks completed</div>
                    </div>
                    <Toggle on={a.active} />
                  </div>
                </Reveal>
              ))}
            </div>
          )}

          {activeSection === "preferences" && (
            <Reveal delay={200}><div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18, padding: "28px" }}>
              {[
                { label: "Dark Mode", on: true },
                { label: "Auto-sync Statements", on: true },
                { label: "AI Notifications", on: true },
                { label: "Sound Effects", on: false },
              ].map(p => (
                <div key={p.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${THEME.border}` }}>
                  <span style={{ fontSize: 13, color: THEME.text }}>{p.label}</span>
                  <Toggle on={p.on} />
                </div>
              ))}
            </div></Reveal>
          )}

          {activeSection === "security" && (
            <Reveal delay={200}><div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18, padding: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d39966" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#34d399" }}>Guardrails + PII Protection Active</span>
              </div>
              <InputRow label="Password" value="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" />
              <InputRow label="Two-Factor Auth" value="Enabled" />
              <InputRow label="Active Sessions" value="2 devices" />
              <InputRow label="Last Login" value="Today, 4:32 PM" />
            </div></Reveal>
          )}

          {activeSection === "notifications" && (
            <Reveal delay={200}><div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18, padding: "28px" }}>
              {[
                { label: "Import Complete", on: true },
                { label: "Categorization Done", on: true },
                { label: "Prime Insights", on: true },
                { label: "Score Changes", on: true },
                { label: "Weekly Recap", on: false },
                { label: "Goal Milestones", on: true },
              ].map(n => (
                <div key={n.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: `1px solid ${THEME.border}` }}>
                  <span style={{ fontSize: 13, color: THEME.text }}>{n.label}</span>
                  <Toggle on={n.on} />
                </div>
              ))}
            </div></Reveal>
          )}

          {activeSection === "data" && (
            <Reveal delay={200}><div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18, padding: "28px" }}>
              <InputRow label="Data Stored" value="14 statements, 184 transactions" />
              <InputRow label="Storage Used" value="12.4 MB" />
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={() => toast("Data export coming soon")} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, color: THEME.textMuted, cursor: "pointer" }}>Export All Data</button>
                <button onClick={() => toast("Contact support to delete account")} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.22)", color: "#f87171", cursor: "pointer" }}>Delete Account</button>
              </div>

              {/* Nuke Data */}
              <div style={{ marginTop: 24, padding: "20px", borderRadius: 14, background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.15)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>{"\u26A0\uFE0F"} Reset All Financial Data</div>
                <div style={{ fontSize: 12, color: THEME.textMuted, lineHeight: 1.5, marginBottom: 14 }}>
                  This will permanently delete ALL your transactions, statements, import summaries, chat history, goals, debts, and score history. Your account and profile will be preserved. This cannot be undone.
                </div>
                <button
                  onClick={async () => {
                    if (!window.confirm("Are you SURE? This deletes ALL your financial data. This cannot be undone.")) return;
                    if (!window.confirm("LAST CHANCE. All transactions, statements, imports, chats, goals, and scores will be permanently deleted.")) return;
                    try {
                      const { getSupabase } = await import("@/lib/supabase");
                      const supabase = getSupabase();
                      if (!supabase || !userId) { toast.error("Not authenticated"); return; }
                      const uid = userId;
                      // Delete in dependency order — children before parents
                      const tables = [
                        "chat_messages", "chat_sessions", "chat_threads",
                        "score_history", "goals", "debts",
                        "transactions_staging", "transactions",
                        "import_summaries", "ai_activity_events", "user_documents", "imports",
                      ];
                      for (const table of tables) {
                        const { error } = await supabase.from(table).delete().eq("user_id", uid); if (error) console.warn(`Nuke: ${table} failed:`, error.message);
                      }
                      toast.success("All financial data deleted.");
                      // page stays on Data & Privacy tab
                    } catch (err) {
                      console.error("Nuke failed:", err);
                      toast.error("Failed to delete some data. Check console.");
                    }
                  }}
                  style={{
                    padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)",
                    color: "#f87171", cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.12)"; }}
                >{"\u2622\uFE0F"} Nuke All Financial Data</button>
              </div>
            </div></Reveal>
          )}
        </div>
      </div>
    </div>
  );
}
