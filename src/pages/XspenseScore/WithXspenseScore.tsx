/**
 * Score hold, full (owner 2026-11-26: "keep it hidden; stop the hidden background calculation").
 * Places that show the score render through this wrapper, so useXspenseScore (legacy rules, AR-1b
 * FR-006) only runs when the score is visible. While held, nothing mounts and nothing is computed.
 * The score infrastructure itself is kept (owner: do not delete it yet).
 */
import type { ReactNode } from "react";
import { useXspenseScore } from "./useXspenseScore";
import { isXspenseScoreVisible } from "./scoreDisplay";

type ScoreData = ReturnType<typeof useXspenseScore>;

function ScoreInner({ render }: { render: (d: ScoreData) => ReactNode }) {
  const d = useXspenseScore();
  return d.loading ? null : <>{render(d)}</>;
}

export function WithXspenseScore({ render }: { render: (d: ScoreData) => ReactNode }) {
  return isXspenseScoreVisible() ? <ScoreInner render={render} /> : null;
}
