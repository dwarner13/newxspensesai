import { useState, useEffect, useRef } from "react";
import { THEME } from "./categoryConfig";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";
import type { AgentName } from "../PrimeChatV2/agentConfig";
// TODO: import { useUnifiedChatEngine } from hooks for Tag chat

const CYAN = "#22d3ee";

interface TagCopilotPanelProps {
  onClose: () => void;
  flaggedCount: number;
  categorizedCount: number;
  totalCount: number;
  avgConfidence: number;
  rulesCount: number;
}

interface FlaggedTx {
  merchant: string;
  amount: string;
  issue: string;
  action: string;
}

interface SubcategorySuggestion {
  parentCategory: string;
  parentColor: string;
  subcategories: { name: string; amount: string; count: number; topMerchant: string }[];
}

interface LearnedRule {
  merchant: string;
  category: string;
  confidence: number;
}

export function TagCopilotPanel({
  onClose,
  flaggedCount,
  categorizedCount,
  totalCount,
  avgConfidence,
  rulesCount,
}: TagCopilotPanelProps) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setOpen(true));
  }, []);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 300);
  };

  const statusText = `I've categorized ${categorizedCount} out of ${totalCount} transactions across your categories. Confidence is high overall \u2014 ${avgConfidence}% average. ${flaggedCount} transactions flagged for your review. I also spotted patterns that suggest subcategory splits worth considering.`;
  const [typed, typeDone] = useTypewriter(statusText, 14, 500);

  // TODO: Replace with real data from Supabase
  const flaggedTxns: FlaggedTx[] = [
    { merchant: "Netflix", amount: "$15.99", issue: "Possible duplicate \u2014 charged Mar 3 and Mar 5", action: "Remove Duplicate" },
    { merchant: "PAYPAL *UNKNWN", amount: "$42.00", issue: "New merchant \u2014 I'm 68% sure this is Shopping", action: "Confirm Shopping" },
    { merchant: "SQ *MARKETPLACE", amount: "$28.50", issue: "Could be Dining or Shopping \u2014 need your call", action: "Choose Category" },
  ];

  const subcategorySuggestions: SubcategorySuggestion[] = [
    {
      parentCategory: "Personal Care",
      parentColor: "#f472b6",
      subcategories: [
        { name: "Hair & Salon", amount: "$1,800", count: 12, topMerchant: "Q Hair Design" },
        { name: "Skincare & Beauty", amount: "$1,240", count: 28, topMerchant: "Sephora, Shoppers" },
        { name: "Spa & Wellness", amount: "$640", count: 8, topMerchant: "Body Blitz, Hammam" },
      ],
    },
    {
      parentCategory: "Subscriptions",
      parentColor: "#60a5fa",
      subcategories: [
        { name: "Digital Services", amount: "$1,200", count: 24, topMerchant: "Netflix, Spotify, iCloud" },
        { name: "Physical Subscriptions", amount: "$719", count: 15, topMerchant: "HelloFresh, Fab Fit Fun" },
      ],
    },
  ];

  const learnedRules: LearnedRule[] = [
    { merchant: "Q HAIR DESIGN", category: "Personal Care", confidence: 100 },
    { merchant: "NETFLIX", category: "Subscriptions", confidence: 100 },
    { merchant: "UBER *TRIP", category: "Transportation", confidence: 98 },
    { merchant: "UBER *EATS", category: "Dining", confidence: 95 },
    { merchant: "AMZN MKTP", category: "Shopping", confidence: 92 },
    { merchant: "SPOTIFY", category: "Subscriptions", confidence: 100 },
  ];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [typed, typeDone]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          opacity: open ? 1 : 0, transition: "opacity 0.3s", zIndex: 998,
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 520,
        background: THEME.bg, borderLeft: `1px solid ${THEME.border}`,
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)",
        zIndex: 999, display: "flex", flexDirection: "column",
      }}>

        {/* Header */}
        <div style={{
          padding: "20px 24px 16px", borderBottom: `1px solid ${THEME.border}`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: `linear-gradient(135deg, ${CYAN}30, ${CYAN}10)`,
            border: `1.5px solid ${CYAN}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700, color: CYAN,
            boxShadow: `0 0 16px ${CYAN}33`,
          }}>T</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text }}>
              Tag <span style={{ fontWeight: 400, color: THEME.textMuted }}>Copilot</span>
            </div>
            <div style={{ fontSize: 11, color: THEME.textDim }}>Your categorization assistant</div>
          </div>
          <div style={{
            padding: "4px 10px", borderRadius: 20,
            background: `${THEME.green}0e`, border: `1px solid ${THEME.green}22`,
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: THEME.green, boxShadow: `0 0 8px ${THEME.green}66` }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: THEME.green }}>Online</span>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: THEME.surface, border: `1px solid ${THEME.border}`,
              color: THEME.textMuted, fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >{"\u2715"}</button>
        </div>

        {/* Scrollable body */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px 140px" }}>

          {/* Tag status typewriter */}
          <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: `${CYAN}20`, border: `1.5px solid ${CYAN}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, color: CYAN,
            }}>T</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: CYAN }}>Tag</span>
                <span style={{ fontSize: 10, color: THEME.textDim }}>just now</span>
              </div>
              <div style={{
                fontSize: 13, color: THEME.textMuted, lineHeight: 1.6,
                padding: "12px 14px", borderRadius: 14,
                background: `${CYAN}06`, borderLeft: `3px solid ${CYAN}44`,
              }}>
                {typed}
                <span style={{ opacity: !typeDone ? 1 : 0, transition: "opacity 0.3s", color: CYAN }}>{"\u2588"}</span>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          {typeDone && (
            <Reveal delay={0} style={{ marginLeft: 38, marginTop: 16, marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { label: "Categorized", value: `${categorizedCount}/${totalCount}`, color: THEME.green },
                  { label: "Confidence", value: `${avgConfidence}%`, color: CYAN },
                  { label: "Flagged", value: `${flaggedCount}`, color: "#fb923c" },
                  { label: "Rules", value: `${rulesCount}`, color: "#a78bfa" },
                ].map(s => (
                  <div key={s.label} style={{
                    flex: 1, padding: "10px 12px", borderRadius: 12,
                    background: THEME.surface, border: `1px solid ${THEME.border}`,
                    textAlign: "center", boxShadow: `0 4px 16px ${s.color}08`,
                  }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: THEME.textDim, fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {/* Flagged transactions */}
          {typeDone && flaggedTxns.length > 0 && (
            <Reveal delay={200} style={{ marginLeft: 38, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: "#fb923c" }} />
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, color: "#fb923c" }}>Needs Your Review</span>
                <div style={{ flex: 1, height: 1, background: THEME.border }} />
              </div>
              {flaggedTxns.map((f, i) => (
                <div key={i} style={{
                  padding: "14px 16px", borderRadius: 14,
                  background: THEME.surface, border: `1px solid ${THEME.border}`,
                  marginBottom: 8, boxShadow: `0 4px 16px rgba(251,146,60,0.05)`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{f.merchant}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>{f.amount}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: THEME.textMuted, marginBottom: 10 }}>{f.issue}</div>
                  <button style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: `${CYAN}12`, border: `1px solid ${CYAN}28`,
                    color: CYAN, cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = `${CYAN}22`}
                  onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.background = `${CYAN}12`}
                  >{f.action} {"\u2192"}</button>
                </div>
              ))}
            </Reveal>
          )}

          {/* Subcategory suggestions */}
          {typeDone && subcategorySuggestions.length > 0 && (
            <Reveal delay={400} style={{ marginLeft: 38, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: "#a78bfa" }} />
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, color: "#a78bfa" }}>Suggested Subcategories</span>
                <div style={{ flex: 1, height: 1, background: THEME.border }} />
              </div>
              {subcategorySuggestions.map((sg, idx) => (
                <div key={idx} style={{
                  padding: "16px 18px", borderRadius: 14,
                  background: "rgba(167,139,250,0.04)", border: "1px solid rgba(167,139,250,0.1)",
                  marginBottom: 10, boxShadow: "0 4px 20px rgba(167,139,250,0.05)",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text, marginBottom: 4 }}>
                    Split "{sg.parentCategory}" into {sg.subcategories.length} subcategories
                  </div>
                  <div style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 12 }}>
                    Distinct spending patterns detected:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                    {sg.subcategories.map(s => (
                      <div key={s.name} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 14px", borderRadius: 10,
                        background: THEME.surface, border: `1px solid ${THEME.border}`,
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: sg.parentColor }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: THEME.text }}>{s.name}</div>
                          <div style={{ fontSize: 10.5, color: THEME.textDim }}>{s.count} txns \u2022 Top: {s.topMerchant}</div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>{s.amount}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={{
                      flex: 1, padding: "9px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: `linear-gradient(135deg, ${CYAN}, #0891b2)`,
                      border: "none", color: "#0b1220", cursor: "pointer",
                      boxShadow: `0 2px 12px ${CYAN}33`,
                    }}>Approve Split</button>
                    <button style={{
                      padding: "9px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: THEME.surface, border: `1px solid ${THEME.border}`,
                      color: THEME.textMuted, cursor: "pointer",
                    }}>Dismiss</button>
                  </div>
                </div>
              ))}
            </Reveal>
          )}

          {/* Learned rules */}
          {typeDone && (
            <Reveal delay={600} style={{ marginLeft: 38, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: THEME.green }} />
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, color: THEME.green }}>Rules I've Learned</span>
                <div style={{ flex: 1, height: 1, background: THEME.border }} />
              </div>
              <div style={{
                padding: "14px 16px", borderRadius: 14,
                background: THEME.surface, border: `1px solid ${THEME.border}`,
                boxShadow: `0 4px 16px ${THEME.green}06`,
              }}>
                {learnedRules.map((r, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 0",
                    borderBottom: i < learnedRules.length - 1 ? `1px solid ${THEME.border}` : "none",
                  }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: THEME.text, flex: 1, fontFamily: "monospace" }}>{r.merchant}</span>
                    <span style={{ fontSize: 11, color: THEME.textMuted }}>{"\u2192"}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: CYAN, minWidth: 100 }}>{r.category}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: THEME.green }}>{r.confidence}%</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: THEME.textDim, marginTop: 8 }}>
                {rulesCount} rules total \u2022 <span style={{ color: CYAN, cursor: "pointer" }}>View all rules {"\u2192"}</span>
              </div>
            </Reveal>
          )}

          {/* Tag's recommendation */}
          {typeDone && (
            <Reveal delay={800} style={{ marginLeft: 38 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: CYAN }} />
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, color: CYAN }}>Tag's Recommendation</span>
                <div style={{ flex: 1, height: 1, background: THEME.border }} />
              </div>
              <div style={{
                fontSize: 13, color: THEME.textMuted, lineHeight: 1.6,
                padding: "14px 16px", borderRadius: 14,
                background: `linear-gradient(135deg, ${CYAN}08, transparent)`,
                border: `1px solid ${CYAN}15`,
                boxShadow: `0 4px 20px ${CYAN}06`,
              }}>
                Approve the Personal Care split first \u2014 it'll give Crystal better data for trend analysis and help Prime identify more tax deductions in the Spa & Wellness subcategory. Then knock out the {flaggedCount} flagged items. Total time: about 4 minutes.
              </div>
            </Reveal>
          )}
        </div>

        {/* Input */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: `linear-gradient(0deg, ${THEME.bg} 75%, transparent)`,
          padding: "32px 24px 16px",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: THEME.surface, borderRadius: 14,
            border: `1px solid ${THEME.border}`, padding: "4px 6px 4px 16px",
          }}>
            <input
              type="text"
              placeholder="Ask Tag anything about categories..."
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: THEME.text, fontSize: 13, padding: "10px 0", fontFamily: "inherit",
              }}
            />
            <button style={{
              width: 34, height: 34, borderRadius: 10,
              background: `linear-gradient(135deg, ${CYAN}, #0891b2)`,
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 2px 12px ${CYAN}33`,
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill="#0b1220" />
              </svg>
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: THEME.green, boxShadow: `0 0 8px ${THEME.green}66` }} />
            <span style={{ fontSize: 10, color: THEME.textDim }}>Tag Copilot \u2022 Powered by AI categorization engine</span>
          </div>
        </div>
      </div>
    </>
  );
}
