import { useState, useEffect, useRef } from "react";
import { THEME } from "./categoryConfig";
import { Reveal } from "../PrimeChatV2/Reveal";
import { useTypewriter } from "../PrimeChatV2/useTypewriter";
import { getSupabase } from "@/lib/supabase";
import type { FlaggedTransaction, SubcategorySuggestion } from "./useCategoriesData";

const CYAN = "#22d3ee";

interface TagCopilotPanelProps {
  onClose: () => void;
  flaggedCount: number;
  categorizedCount: number;
  totalCount: number;
  avgConfidence: number;
  rulesCount: number;
  flaggedTransactions?: FlaggedTransaction[];
  subcategorySuggestions?: SubcategorySuggestion[];
}

interface LearnedRule {
  merchant: string;
  category: string;
  confidence: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function TagCopilotPanel({
  onClose,
  flaggedCount,
  categorizedCount,
  totalCount,
  avgConfidence,
  rulesCount,
  flaggedTransactions = [],
  subcategorySuggestions = [],
}: TagCopilotPanelProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [learnedRules, setLearnedRules] = useState<LearnedRule[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setOpen(true));
  }, []);

  // Fetch real learned rules from vendor_category_memory
  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("vendor_category_memory")
          .select("vendor_key, category")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(8);
        if (data?.length) {
          setLearnedRules(data.map(r => ({
            merchant: r.vendor_key.toUpperCase(),
            category: r.category,
            confidence: 100,
          })));
        }
      } catch { /* silent */ }
    })();
  }, []);

  const handleClose = () => {
    setOpen(false);
    setTimeout(onClose, 300);
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? inputValue).trim();
    if (!text || isLoading) return;
    setInputValue("");

    const userMsg: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Scroll to bottom after user message
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token;

      const res = await fetch("/.netlify/functions/tag-copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          history: updatedMessages.slice(0, -1),
        }),
      });

      if (!res.ok) throw new Error(`tag-chat ${res.status}`);

      const assistantMsg: ChatMessage = { role: "assistant", content: "" };
      setMessages(prev => [...prev, assistantMsg]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (raw === "[DONE]") break;
            try {
              const parsed = JSON.parse(raw);
              const delta = parsed?.choices?.[0]?.delta?.content ?? parsed?.delta?.text ?? "";
              if (delta) {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: updated[updated.length - 1].content + delta,
                  };
                  return updated;
                });
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            } catch { /* skip malformed chunk */ }
          }
        }
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I ran into an issue. Try again in a moment." },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 50);
    }
  };

  const statusText = `I have categorized ${categorizedCount} out of ${totalCount} transactions across your categories. Confidence is high overall \u2014 ${avgConfidence}% average. ${flaggedCount} transactions flagged for your review.${subcategorySuggestions.length > 0 ? ` I also spotted ${subcategorySuggestions.length} categories with distinct spending patterns worth splitting.` : ""}`;
  const [typed, typeDone] = useTypewriter(statusText, 14, 500);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [typed, typeDone]);

  return (
    <>
      <div onClick={handleClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", opacity: open ? 1 : 0, transition: "opacity 0.3s", zIndex: 998, backdropFilter: "blur(4px)" }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 520, background: THEME.bg, borderLeft: `1px solid ${THEME.border}`, transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)", zIndex: 999, display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${THEME.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${CYAN}30, ${CYAN}10)`, border: `1.5px solid ${CYAN}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: CYAN, boxShadow: `0 0 16px ${CYAN}33` }}>T</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text }}>Tag <span style={{ fontWeight: 400, color: THEME.textMuted }}>Copilot</span></div>
            <div style={{ fontSize: 11, color: THEME.textDim }}>Your categorization assistant</div>
          </div>
          <div style={{ padding: "4px 10px", borderRadius: 20, background: `${THEME.green}0e`, border: `1px solid ${THEME.green}22`, display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: THEME.green, boxShadow: `0 0 8px ${THEME.green}66` }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: THEME.green }}>Online</span>
          </div>
          <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 8, background: THEME.surface, border: `1px solid ${THEME.border}`, color: THEME.textMuted, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
        </div>

        {/* Body */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px 140px" }}>

          {/* Typewriter */}
          <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: `${CYAN}20`, border: `1.5px solid ${CYAN}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: CYAN }}>T</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: CYAN }}>Tag</span>
                <span style={{ fontSize: 10, color: THEME.textDim }}>just now</span>
              </div>
              <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.6, padding: "12px 14px", borderRadius: 14, background: `${CYAN}06`, borderLeft: `3px solid ${CYAN}44` }}>
                {typed}<span style={{ opacity: !typeDone ? 1 : 0, transition: "opacity 0.3s", color: CYAN }}>{"\u2588"}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          {typeDone && (
            <Reveal delay={0} style={{ marginLeft: 38, marginTop: 16, marginBottom: 24 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { label: "Categorized", value: `${categorizedCount}/${totalCount}`, color: THEME.green },
                  { label: "Confidence", value: `${avgConfidence}%`, color: CYAN },
                  { label: "Flagged", value: `${flaggedCount}`, color: "#fb923c" },
                  { label: "Rules", value: `${learnedRules.length || rulesCount}`, color: "#a78bfa" },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, padding: "10px 12px", borderRadius: 12, background: THEME.surface, border: `1px solid ${THEME.border}`, textAlign: "center" }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: THEME.textDim, fontWeight: 700, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {/* Real flagged transactions */}
          {typeDone && flaggedTransactions.length > 0 && (
            <Reveal delay={200} style={{ marginLeft: 38, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: "#fb923c" }} />
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, color: "#fb923c" }}>Needs Your Review</span>
                <div style={{ flex: 1, height: 1, background: THEME.border }} />
              </div>
              {flaggedTransactions.map((f, i) => (
                <div key={f.id || i} style={{ padding: "14px 16px", borderRadius: 14, background: THEME.surface, border: `1px solid ${THEME.border}`, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{f.merchant}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>{f.amount}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: THEME.textMuted, marginBottom: 10 }}>{f.issue}</div>
                  <button
                    onClick={() => handleSend(`Help me categorize ${f.merchant} ${f.amount}`)}
                    style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, background: `${CYAN}12`, border: `1px solid ${CYAN}28`, color: CYAN, cursor: "pointer" }}
                  >Ask Tag {"\u2192"}</button>
                </div>
              ))}
            </Reveal>
          )}

          {/* Real subcategory suggestions */}
          {typeDone && subcategorySuggestions.length > 0 && (
            <Reveal delay={400} style={{ marginLeft: 38, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: "#a78bfa" }} />
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, color: "#a78bfa" }}>Subcategory Splits Detected</span>
                <div style={{ flex: 1, height: 1, background: THEME.border }} />
              </div>
              {subcategorySuggestions.map((sg, idx) => (
                <div key={idx} style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(167,139,250,0.04)", border: "1px solid rgba(167,139,250,0.1)", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text, marginBottom: 4 }}>Split "{sg.parentCategory}" into {sg.subcategories.length} subcategories</div>
                  <div style={{ fontSize: 12, color: THEME.textMuted, marginBottom: 12 }}>Distinct spending patterns detected:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                    {sg.subcategories.map(s => (
                      <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: THEME.surface, border: `1px solid ${THEME.border}` }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: sg.parentColor }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: THEME.text }}>{s.name}</div>
                          <div style={{ fontSize: 10.5, color: THEME.textDim }}>{s.count} txns · Top: {s.topMerchant}</div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text }}>{s.amount}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleSend(`Split my ${sg.parentCategory} category into subcategories: ${sg.subcategories.map(s => s.name).join(", ")}`)}
                    style={{ width: "100%", padding: "9px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: `linear-gradient(135deg, ${CYAN}, #0891b2)`, border: "none", color: "#0b1220", cursor: "pointer", boxShadow: `0 2px 12px ${CYAN}33` }}
                  >Ask Tag to Apply Split</button>
                </div>
              ))}
            </Reveal>
          )}

          {/* Real learned rules */}
          {typeDone && learnedRules.length > 0 && (
            <Reveal delay={600} style={{ marginLeft: 38, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: THEME.green }} />
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, color: THEME.green }}>Rules I Have Learned</span>
                <div style={{ flex: 1, height: 1, background: THEME.border }} />
              </div>
              <div style={{ padding: "14px 16px", borderRadius: 14, background: THEME.surface, border: `1px solid ${THEME.border}` }}>
                {learnedRules.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < learnedRules.length - 1 ? `1px solid ${THEME.border}` : "none" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: THEME.text, flex: 1, fontFamily: "monospace" }}>{r.merchant}</span>
                    <span style={{ fontSize: 11, color: THEME.textMuted }}>{"\u2192"}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: CYAN, minWidth: 100 }}>{r.category}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: THEME.green }}>{r.confidence}%</span>
                  </div>
                ))}
              </div>
            </Reveal>
          )}

          {/* Tag recommendation */}
          {typeDone && messages.length === 0 && (
            <Reveal delay={800} style={{ marginLeft: 38 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 14, height: 2, borderRadius: 1, background: CYAN }} />
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: 700, color: CYAN }}>Tag Recommends</span>
                <div style={{ flex: 1, height: 1, background: THEME.border }} />
              </div>
              <div style={{ fontSize: 13, color: THEME.textMuted, lineHeight: 1.6, padding: "14px 16px", borderRadius: 14, background: `linear-gradient(135deg, ${CYAN}08, transparent)`, border: `1px solid ${CYAN}15` }}>
                {flaggedCount > 0
                  ? `Start with the ${flaggedCount} flagged transaction${flaggedCount !== 1 ? "s" : ""} \u2014 once those are categorized, your spending totals will be accurate and Prime can give you a better summary.`
                  : subcategorySuggestions.length > 0
                    ? `All transactions look good. Consider approving the subcategory splits \u2014 it will give Crystal better data for trend analysis.`
                    : `Everything looks clean. Your categories are well organized and Tag confidence is high.`
                }
              </div>
            </Reveal>
          )}

          {/* Inline conversation thread */}
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginTop: 16, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
              {msg.role === "assistant" && (
                <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: `${CYAN}20`, border: `1.5px solid ${CYAN}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: CYAN }}>T</div>
              )}
              <div style={{
                maxWidth: "78%",
                padding: "10px 14px",
                borderRadius: 14,
                fontSize: 13,
                lineHeight: 1.6,
                ...(msg.role === "user"
                  ? { background: `${CYAN}14`, border: `1px solid ${CYAN}28`, color: THEME.text, borderBottomRightRadius: 4 }
                  : { background: `${CYAN}06`, borderLeft: `3px solid ${CYAN}44`, color: THEME.textMuted, borderBottomLeftRadius: 4 }
                ),
              }}>
                {msg.content}
                {msg.role === "assistant" && i === messages.length - 1 && isLoading && (
                  <span style={{ color: CYAN, marginLeft: 2 }}>{"\u2588"}</span>
                )}
              </div>
            </div>
          ))}

          {/* Loading dots while waiting for first token */}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: `${CYAN}20`, border: `1.5px solid ${CYAN}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: CYAN }}>T</div>
              <div style={{ padding: "10px 14px", borderRadius: 14, background: `${CYAN}06`, borderLeft: `3px solid ${CYAN}44`, display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map(d => (
                  <div key={d} style={{ width: 6, height: 6, borderRadius: "50%", background: CYAN, opacity: 0.5, animation: `pulse 1.2s ease-in-out ${d * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input — wired directly to tag-chat API */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: `linear-gradient(0deg, ${THEME.bg} 75%, transparent)`, padding: "32px 24px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: THEME.surface, borderRadius: 14, border: `1px solid ${THEME.border}`, padding: "4px 6px 4px 16px" }}>
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Ask Tag anything about categories..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: THEME.text, fontSize: 13, padding: "10px 0", fontFamily: "inherit" }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              style={{ width: 34, height: 34, borderRadius: 10, background: inputValue.trim() && !isLoading ? `linear-gradient(135deg, ${CYAN}, #0891b2)` : THEME.surface, border: `1px solid ${inputValue.trim() && !isLoading ? "transparent" : THEME.border}`, cursor: inputValue.trim() && !isLoading ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: inputValue.trim() && !isLoading ? `0 2px 12px ${CYAN}33` : "none" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" fill={inputValue.trim() && !isLoading ? "#0b1220" : THEME.textDim} />
              </svg>
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 8 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: THEME.green, boxShadow: `0 0 8px ${THEME.green}66` }} />
            <span style={{ fontSize: 10, color: THEME.textDim }}>Tag Copilot · Powered by AI categorization engine</span>
          </div>
        </div>
      </div>
    </>
  );
}
