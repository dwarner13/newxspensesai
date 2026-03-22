import { useState, useEffect, type CSSProperties, type ReactNode } from "react";

interface RevealProps {
  delay?: number;
  children: ReactNode;
  style?: CSSProperties;
}

export function Reveal({ delay = 0, children, style = {} }: RevealProps) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(14px)",
        transition: "all 0.55s cubic-bezier(0.16,1,0.3,1)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
