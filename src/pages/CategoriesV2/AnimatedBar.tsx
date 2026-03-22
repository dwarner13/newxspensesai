import { useState, useEffect } from "react";

interface AnimatedBarProps {
  pct: number;
  color: string;
  height?: number;
}

export function AnimatedBar({ pct, color, height = 6 }: AnimatedBarProps) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(pct, 100)), 200);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div style={{
      height, borderRadius: height / 2, background: "#1e2d4a", overflow: "hidden", width: "100%",
    }}>
      <div style={{
        height: "100%", borderRadius: height / 2, background: color,
        width: `${width}%`, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)",
      }} />
    </div>
  );
}
