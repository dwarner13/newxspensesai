import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { THEME } from "../PrimeChatV2/agentConfig";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { getSupabase } from "@/lib/supabase";
import { AgentFloatingBubble } from "@/components/ui/AgentFloatingBubble";
import { CustodianPanel } from "@/components/onboarding/CustodianPanelChat";

const NAV_ITEMS = [
  { id: "account", label: "Account", icon: "\uD83D\uDC64" },
  { id: "preferences", label: "Preferences", icon: "\u2699\uFE0F" },
  { id: "ai-team", label: "AI Team", icon: "\uD83E\uDD16" },
  { id: "notifications", label: "Notifications", icon: "\uD83D\uDD14" },
  { id: "security", label: "Security", icon: "\uD83D\uDD12" },
  { id: "data", label: "Data & Privacy", icon: "\uD83D\uDEE1\uFE0F" },
  { id: "billing", label: "Billing", icon: "\uD83D\uDCB3" },
];

const AGENTS_CONFIG = [
  { name: "Prime", color: "#c8a64e", role: "Financial Advisor", active: true },
  { name: "Byte", color: "#34d399", role: "Smart Import", active: true },
  { name: "Tag", color: "#22d3ee", role: "Categorizer", active: true },
  { name: "Crystal", color: "#a78bfa", role: "Analytics", active: true },
  { name: "Goalie", color: "#fbbf24", role: "Goals Coach", active: true },
  { name: "Ledger", color: "#34d399", role: "Tax Organizer", active: true },
];

const Toggle = ({ on, onToggle }: { on: boolean; onToggle?: () => void }) => (
  <div onClick={onToggle} style={{ width: 40, height: 22, borderRadius: 11, background: on ? "#34d399" : THEME.border, position: "relative", cursor: onToggle ? "pointer" : "default", transition: "background 0.2s", flexShrink: 0 }}>
    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: on ? 20 : 2, transition: "left 0.2s" }} />
  </div>
);

export default function SettingsPageV2() {
  const { userId, signOut } = useAuth();
  const { fullName, email, plan, avatarInitials } = useProfile();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("account");
  const [custodianOpen, setCustodianOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);

  // Editable name
  const [editName, setEditName] = useState('');
  const [editNameSaving, setEditNameSaving] = useState(false);
  const [nameLoaded, setNameLoaded] = useState(false);
  useEffect(() => { if (fullName && !nameLoaded) { setEditName(fullName); setNameLoaded(true); } }, [fullName, nameLoaded]);

  const saveDisplayName = async () => {
    if (!editName.trim() || editNameSaving) return;
    setEditNameSaving(true);
    try {
      const sb = getSupabase(); if (!sb || !userId) return;
      await sb.auth.updateUser({ data: { display_name: editName.trim() } });
      await sb.from('profiles').upsert({ id: userId, display_name: editName.trim() });
      toast.success('Name updated');
    } catch { toast.error('Could not save - try again'); }
    finally { setEditNameSaving(false); }
  };

  // Preferences
  const [prefs, setPrefs] = useState({ aiNotifications: true, importComplete: true, weeklyRecap: false, goalMilestones: true });
  const togglePref = async (key: string, value: boolean) => {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    try { const sb = getSupabase(); if (sb && userId) await sb.from('profiles').upsert({ id: userId, preferences: newPrefs }); } catch { /* silent */ }
  };

  // Data stats
  const [dataStats, setDataStats] = useState("Loading...");
  useEffect(() => {
    (async () => {
      try {
        const sb = getSupabase(); if (!sb || !userId) return;
        const [{ count: docs }, { count: txns }] = await Promise.all([
          sb.from("user_documents").select("*", { count: "exact", head: true }).eq("user_id", userId),
          sb.from("transactions").select("*", { count: "exact", head: true }).eq("user_id", userId),
        ]);
        setDataStats(`${docs || 0} statements, ${txns || 0} transactions`);
      } catch { setDataStats("Unable to load"); }
    })();
  }, [userId]);

  useEffect(() => { const h = () => setIsMobile(window.innerWidth <= 768); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);

  return (
    <>
    <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", background: THEME.bg, color: THEME.text, minHeight: "100vh", padding: isMobile ? "20px 16px" : "28px 36px" }}>
      <Reveal delay={0}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, margin: 0, marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 14, color: THEME.textMuted, marginBottom: 24 }}>Manage your XspensesAI experience</p>
      </Reveal>

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 16 : 24 }}>
        {/* Left nav */}
        <Reveal delay={100} style={{ width: isMobile ? "100%" : 220, flexShrink: 0 }}>
          {isMobile ? (
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" as any }}>
              {NAV_ITEMS.map(item => (
                <button key={item.id} onClick={() => setActiveSection(item.id)} style={{
                  flexShrink: 0, padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: activeSection === item.id ? `linear-gradient(135deg, ${THEME.accent}, #a08030)` : THEME.surface,
                  border: `1px solid ${activeSection === item.id ? 'transparent' : THEME.border}`,
                  color: activeSection === item.id ? '#0b1220' : THEME.textMuted, cursor: "pointer", whiteSpace: "nowrap",
                }}>{item.icon} {item.label}</button>
              ))}
            </div>
          ) : (
            <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: "8px", position: "sticky", top: 80 }}>
              {NAV_ITEMS.map(item => (
                <div key={item.id} onClick={() => setActiveSection(item.id)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderRadius: 10,
                  background: activeSection === item.id ? THEME.accentGlow : "transparent",
                  borderLeft: activeSection === item.id ? `3px solid ${THEME.accent}` : "3px solid transparent",
                  cursor: "pointer", transition: "all 0.15s", marginBottom: 2,
                }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: activeSection === item.id ? 700 : 500, color: activeSection === item.id ? THEME.accent : THEME.textMuted }}>{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </Reveal>

        {/* Right content */}
        <div style={{ flex: 1 }}>

          {/* ── ACCOUNT ── */}
          {activeSection === "account" && (
            <Reveal delay={200}>
              <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18, padding: isMobile ? "20px 16px" : "28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${THEME.border}` }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${THEME.accent}30, ${THEME.accent}10)`, border: `1.5px solid ${THEME.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: THEME.accent, flexShrink: 0 }}>{avatarInitials || '?'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: THEME.text }}>{fullName || 'My Account'}</div>
                    <div style={{ fontSize: 13, color: THEME.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email || ''}</div>
                  </div>
                  <div style={{ flexShrink: 0, padding: "4px 14px", borderRadius: 8, background: `${THEME.accent}12`, border: `1px solid ${THEME.accent}22`, fontSize: 12, fontWeight: 700, color: THEME.accent }}>{plan || 'Free'}</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: THEME.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Display Name</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void saveDisplayName(); }} placeholder="Your name" style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${THEME.border}`, color: THEME.text, fontSize: 15, fontFamily: 'inherit', outline: 'none' }} />
                    <button onClick={() => void saveDisplayName()} disabled={editNameSaving || editName.trim() === fullName} style={{ padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700, background: editName.trim() !== fullName ? `linear-gradient(135deg, ${THEME.accent}, #a08030)` : THEME.surface, border: `1px solid ${editName.trim() !== fullName ? 'transparent' : THEME.border}`, color: editName.trim() !== fullName ? '#0b1220' : THEME.textDim, cursor: editName.trim() !== fullName ? 'pointer' : 'default' }}>{editNameSaving ? 'Saving...' : 'Save'}</button>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: THEME.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Email</label>
                  <input value={email || ''} disabled style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: `1px solid ${THEME.border}`, color: THEME.textDim, fontSize: 15, fontFamily: 'inherit', outline: 'none', cursor: 'not-allowed', boxSizing: 'border-box' as const }} />
                  <div style={{ fontSize: 12, color: THEME.textDim, marginTop: 4 }}>Contact support to change your email</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: THEME.textDim, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Password</label>
                  <button onClick={async () => { try { const sb = getSupabase(); if (!sb || !email) return; await sb.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback` }); toast.success('Password reset email sent'); } catch { toast.error('Could not send reset email'); } }} style={{ padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.textMuted, cursor: 'pointer' }}>Send Reset Email</button>
                </div>
                <div style={{ paddingTop: 16, borderTop: `1px solid ${THEME.border}` }}>
                  <button onClick={async () => { if (!window.confirm('Sign out of XspensesAI?')) return; await signOut(); }} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.22)', color: '#f87171', cursor: 'pointer' }}>Sign Out</button>
                </div>
              </div>
            </Reveal>
          )}

          {/* ── AI TEAM ── */}
          {activeSection === "ai-team" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {AGENTS_CONFIG.map((a, i) => (
                <Reveal key={a.name} delay={100 + i * 60}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 22px", background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${a.color}20`, border: `1.5px solid ${a.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: a.color }}>{a.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.text }}>{a.name}</div>
                      <div style={{ fontSize: 13, color: THEME.textDim }}>{a.role} {"\u2022"} Active</div>
                    </div>
                    {/* TODO: wire agent enable/disable when agent control API is available */}
                    <Toggle on={a.active} />
                  </div>
                </Reveal>
              ))}
            </div>
          )}

          {/* ── PREFERENCES ── */}
          {activeSection === "preferences" && (
            <Reveal delay={200}><div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18, padding: isMobile ? "20px 16px" : "28px" }}>
              {[
                { label: "AI Notifications", key: "aiNotifications", desc: "Prime and Tag notify you when work is done" },
                { label: "Import Complete Alerts", key: "importComplete", desc: "Byte notifies you when a statement finishes processing" },
                { label: "Weekly Recap", key: "weeklyRecap", desc: "Prime sends a Sunday summary of your week" },
                { label: "Goal Milestones", key: "goalMilestones", desc: "Goalie celebrates when you hit a savings target" },
              ].map(p => (
                <div key={p.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: `1px solid ${THEME.border}` }}>
                  <div>
                    <div style={{ fontSize: 15, color: THEME.text, fontWeight: 600 }}>{p.label}</div>
                    <div style={{ fontSize: 13, color: THEME.textDim, marginTop: 2 }}>{p.desc}</div>
                  </div>
                  <Toggle on={prefs[p.key as keyof typeof prefs]} onToggle={() => void togglePref(p.key, !prefs[p.key as keyof typeof prefs])} />
                </div>
              ))}
            </div></Reveal>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeSection === "notifications" && (
            <Reveal delay={200}><div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18, padding: isMobile ? "20px 16px" : "28px" }}>
              {[
                { label: "Import Complete", key: "importComplete", desc: "When Byte finishes processing a statement" },
                { label: "Categorization Done", key: "aiNotifications", desc: "When Tag finishes categorizing" },
                { label: "Weekly Recap", key: "weeklyRecap", desc: "Sunday summary from Prime" },
                { label: "Goal Milestones", key: "goalMilestones", desc: "When you hit a savings target" },
              ].map(n => (
                <div key={n.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: `1px solid ${THEME.border}` }}>
                  <div>
                    <div style={{ fontSize: 15, color: THEME.text, fontWeight: 600 }}>{n.label}</div>
                    <div style={{ fontSize: 13, color: THEME.textDim, marginTop: 2 }}>{n.desc}</div>
                  </div>
                  <Toggle on={prefs[n.key as keyof typeof prefs]} onToggle={() => void togglePref(n.key, !prefs[n.key as keyof typeof prefs])} />
                </div>
              ))}
            </div></Reveal>
          )}

          {/* ── SECURITY ── */}
          {activeSection === "security" && (
            <Reveal delay={200}><div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18, padding: isMobile ? "20px 16px" : "28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d39966" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#34d399" }}>Guardrails + PII Protection Active</span>
              </div>
              <div style={{ fontSize: 14, color: THEME.textMuted, lineHeight: 1.7, marginBottom: 16 }}>
                All AI agents run through XspensesAI guardrails - PII masking (32+ detectors), content moderation, and jailbreak detection. Your financial data never leaves the secure pipeline.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Encryption", value: "AES-256 at rest, TLS 1.3 in transit" },
                  { label: "Authentication", value: "Supabase Auth + JWT" },
                  { label: "PII Detectors", value: "32 active patterns" },
                  { label: "Data Location", value: "Canada (Supabase)" },
                ].map(r => (
                  <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${THEME.border}` }}>
                    <span style={{ fontSize: 14, color: THEME.textMuted }}>{r.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div></Reveal>
          )}

          {/* ── DATA & PRIVACY ── */}
          {activeSection === "data" && (
            <Reveal delay={200}><div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18, padding: isMobile ? "20px 16px" : "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${THEME.border}` }}>
                <span style={{ fontSize: 14, color: THEME.textMuted }}>Data Stored</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>{dataStats}</span>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button onClick={() => toast("Data export coming soon")} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: THEME.surfaceLight, border: `1px solid ${THEME.border}`, color: THEME.textMuted, cursor: "pointer" }}>Export All Data</button>
                <button onClick={() => toast("Contact support to delete account")} style={{ padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.22)", color: "#f87171", cursor: "pointer" }}>Delete Account</button>
              </div>
              <div style={{ marginTop: 24, padding: "20px", borderRadius: 14, background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.15)" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>{"\u26A0\uFE0F"} Reset All Financial Data</div>
                <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.6, marginBottom: 14 }}>Permanently deletes ALL transactions, statements, imports, chat history, goals, debts, and scores. Your account and profile are preserved. Cannot be undone.</div>
                <button onClick={async () => { if (!window.confirm("Are you SURE? This deletes ALL your financial data.")) return; if (!window.confirm("LAST CHANCE. This cannot be undone.")) return; try { const sb = getSupabase(); if (!sb || !userId) return; for (const t of ["chat_messages","chat_sessions","chat_threads","score_history","goals","debts","transactions_staging","transactions","import_summaries","ai_activity_events","user_documents","imports"]) { await sb.from(t).delete().eq("user_id", userId).catch(() => {}); } toast.success("All financial data deleted."); setDataStats("0 statements, 0 transactions"); } catch { toast.error("Failed to delete some data."); } }} style={{ padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", cursor: "pointer" }}>{"\u2622\uFE0F"} Nuke All Financial Data</button>
              </div>
            </div></Reveal>
          )}

          {/* ── BILLING ── */}
          {activeSection === "billing" && (
            <Reveal delay={200}>
              <div style={{ background: THEME.surface, border: `1px solid ${THEME.border}`, borderRadius: 18, padding: isMobile ? "20px 16px" : "28px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingBottom: 20, borderBottom: `1px solid ${THEME.border}` }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text }}>Current Plan</div>
                    <div style={{ fontSize: 14, color: THEME.textDim, marginTop: 2 }}>XspensesAI {plan || 'Free'}</div>
                  </div>
                  <div style={{ padding: "6px 16px", borderRadius: 8, background: `${THEME.accent}12`, border: `1px solid ${THEME.accent}22`, fontSize: 13, fontWeight: 700, color: THEME.accent }}>{plan || 'Free'}</div>
                </div>
                <div style={{ padding: "20px", borderRadius: 14, background: `${THEME.accent}06`, border: `1px solid ${THEME.accent}15`, marginBottom: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text, marginBottom: 4 }}>Pro Plan - $29.99/mo</div>
                  <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.6 }}>Unlimited statements, all AI agents, priority processing, tax workspace, and accountant sharing.</div>
                  <button onClick={() => toast("Stripe billing coming soon - contact hello@xspensesai.com to upgrade")} style={{ marginTop: 14, padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700, background: `linear-gradient(135deg, ${THEME.accent}, #a08030)`, border: "none", color: "#0b1220", cursor: "pointer" }}>Upgrade to Pro {'\u2192'}</button>
                </div>
                <div style={{ fontSize: 12, color: THEME.textDim }}>Billing management via Stripe coming soon. Questions? Email hello@xspensesai.com</div>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </div>
    {!custodianOpen && location.pathname.includes('/settings') && createPortal(
      <AgentFloatingBubble letter={'\uD83D\uDEE1\uFE0F'} color="#7c3aed" colorTo="#6d28d9" onClick={() => setCustodianOpen(true)} label="Open Custodian" />,
      document.body
    )}
    {custodianOpen && createPortal(
      <CustodianPanel onClose={() => setCustodianOpen(false)} />,
      document.body
    )}
    </>
  );
}
