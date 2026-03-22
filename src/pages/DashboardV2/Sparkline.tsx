interface SparklineProps {
  data: number[];
  color: string;
  w?: number;
  h?: number;
}

export function Sparkline({ data, color, w = 72, h = 24 }: SparklineProps) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h * 0.8 - h * 0.1}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={w} cy={h - ((data[data.length - 1] - min) / range) * h * 0.8 - h * 0.1} r={2.5} fill={color} />
    </svg>
  );
}
