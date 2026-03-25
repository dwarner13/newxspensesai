import { useState, useEffect } from "react";

export function useTypewriter(
  text: string,
  speed: number = 18,
  startDelay: number = 300,
  enabled: boolean = true,
  instant: boolean = false
): [string, boolean] {
  const [display, setDisplay] = useState(instant ? text : "");
  const [done, setDone] = useState(instant);

  useEffect(() => {
    if (!enabled) return;
    if (instant) {
      setDisplay(text);
      setDone(true);
      return;
    }
    setDisplay("");
    setDone(false);
    let i = 0;
    let interval: ReturnType<typeof setInterval>;

    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        if (i <= text.length) {
          setDisplay(text.slice(0, i));
          i++;
        } else {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, speed, startDelay, enabled, instant]);

  return [display, done];
}
