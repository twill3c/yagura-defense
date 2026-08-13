// 状態差分からのイベント抽出(F-12 の音・演出のトリガー)。純関数。
// UI は step のバッチ実行前後の状態を渡すだけでよく、シムはイベントを持たない。
import type { GameState } from "./types";

export type GameEvent =
  | { type: "shot" }
  | { type: "kill"; count: number }
  | { type: "leak"; livesLost: number }
  | { type: "waveStart"; wave: number }
  | { type: "waveClear"; wave: number }
  | { type: "won" }
  | { type: "lost" };

export function diffEvents(prev: GameState, next: GameState): GameEvent[] {
  const events: GameEvent[] = [];

  const prevReady = new Map(prev.towers.map((t) => [t.id, t.readyAtTick]));
  if (
    next.towers.some((t) => {
      const r = prevReady.get(t.id);
      return r !== undefined && r !== t.readyAtTick;
    })
  ) {
    events.push({ type: "shot" });
  }

  if (next.kills > prev.kills) {
    events.push({ type: "kill", count: next.kills - prev.kills });
  }
  if (next.lives < prev.lives) {
    events.push({ type: "leak", livesLost: prev.lives - next.lives });
  }
  if (prev.status === "building" && next.status === "wave") {
    events.push({ type: "waveStart", wave: next.waveIndex + 1 });
  }
  if (next.waveIndex > prev.waveIndex) {
    events.push({ type: "waveClear", wave: next.waveIndex });
  }
  if (prev.status !== "won" && next.status === "won") {
    events.push({ type: "won" });
  }
  if (prev.status !== "lost" && next.status === "lost") {
    events.push({ type: "lost" });
  }

  return events;
}
