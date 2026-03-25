import { useState, useEffect, type CSSProperties, type ReactNode } from "react";

interface RevealProps {
  delay?: number;
  children: ReactNode;
  style?: CSSProperties;
  instant?: boolean;
}

export function Reveal({ delay = 0, children, style = {}, instant = false }: RevealProps) {
  const [show, setShow] = useState(instant);
  useEffect(() => {
    if (instant || show) return;
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay, instant, show]);

  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(14px)",
        transition: instant ? "none" : "all 0.55s cubic-bezier(0.16,1,0.3,1)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
