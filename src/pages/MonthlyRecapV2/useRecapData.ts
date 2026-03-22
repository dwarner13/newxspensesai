import { useState, useEffect } from "react";
import type { RecapEpisode } from "./recapConfig";

export interface RecapData {
  episodes: RecapEpisode[];
  totalEpisodes: number;
  totalDuration: string;
  pendingRecaps: number;
  loading: boolean;
}

export function useRecapData(): RecapData {
  const [data, setData] = useState<RecapData>({ episodes: [], totalEpisodes: 0, totalDuration: "0h", pendingRecaps: 0, loading: true });

  useEffect(() => {
    setData({
      episodes: [
        { id: "1", title: "February 2026 Recap", month: "Feb 2026", duration: "4:32", date: "Mar 1", income: 6500, expenses: 8416, net: -1916, healthGrade: "C", agentHighlights: [
          { agent: "Prime", color: "#c8a64e", text: "Identified $420 in new deductions" },
          { agent: "Tag", color: "#22d3ee", text: "Categorized 184 transactions at 96% confidence" },
          { agent: "Crystal", color: "#a78bfa", text: "Dining spend up 39% — delivery apps driving it" },
        ], hasAudio: true },
        { id: "2", title: "January 2026 Recap", month: "Jan 2026", duration: "3:58", date: "Feb 1", income: 6500, expenses: 7200, net: -700, healthGrade: "C", agentHighlights: [
          { agent: "Byte", color: "#34d399", text: "Processed 3 statements with 99.7% accuracy" },
          { agent: "Tag", color: "#22d3ee", text: "Flagged 5 potential miscategorizations" },
          { agent: "Prime", color: "#c8a64e", text: "Net cash flow improved vs December" },
        ], hasAudio: true },
        { id: "3", title: "December 2025 Recap", month: "Dec 2025", duration: "5:12", date: "Jan 1", income: 6500, expenses: 9100, net: -2600, healthGrade: "D", agentHighlights: [
          { agent: "Crystal", color: "#a78bfa", text: "Holiday spending spike detected" },
          { agent: "Goalie", color: "#fbbf24", text: "Emergency fund goal paused — recommend resuming" },
          { agent: "Prime", color: "#c8a64e", text: "Highest expense month in 6 months" },
        ], hasAudio: false },
      ],
      totalEpisodes: 3,
      totalDuration: "13:42",
      pendingRecaps: 1,
      loading: false,
    });
  }, []);

  return data;
}
